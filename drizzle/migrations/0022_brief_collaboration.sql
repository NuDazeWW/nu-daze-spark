ALTER TABLE public.campaign_briefs
  ADD COLUMN IF NOT EXISTS approval_mode_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS assigned_approver_id uuid;

CREATE TABLE public.brief_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id uuid NOT NULL REFERENCES public.campaign_briefs(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  brief_version integer NOT NULL DEFAULT 1,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX brief_comments_brief_idx ON public.brief_comments(brief_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brief_comments TO authenticated;
GRANT ALL ON public.brief_comments TO service_role;
ALTER TABLE public.brief_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brief comments read" ON public.brief_comments FOR SELECT TO authenticated
  USING (public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "brief comments add" ON public.brief_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "brief comments resolve" ON public.brief_comments FOR UPDATE TO authenticated
  USING (public.user_can_access_client(auth.uid(), client_id) AND coalesce(public.workspace_role(auth.uid()),'viewer') <> 'viewer')
  WITH CHECK (public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "brief comments delete own" ON public.brief_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Keep client/version stamped from the brief, and only allow resolution fields to change.
CREATE OR REPLACE FUNCTION public.stamp_brief_comment() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE b record;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT client_id, version INTO b FROM public.campaign_briefs WHERE id = NEW.brief_id;
    NEW.client_id := b.client_id; NEW.brief_version := b.version;
    NEW.is_resolved := false; NEW.resolved_by := null; NEW.resolved_at := null;
  ELSE
    NEW.body := OLD.body; NEW.author_id := OLD.author_id; NEW.brief_id := OLD.brief_id;
    NEW.client_id := OLD.client_id; NEW.brief_version := OLD.brief_version; NEW.created_at := OLD.created_at;
    IF NEW.is_resolved AND NOT OLD.is_resolved THEN NEW.resolved_by := auth.uid(); NEW.resolved_at := now();
    ELSIF NOT NEW.is_resolved THEN NEW.resolved_by := null; NEW.resolved_at := null; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER brief_comments_stamp BEFORE INSERT OR UPDATE ON public.brief_comments
  FOR EACH ROW EXECUTE FUNCTION public.stamp_brief_comment();

CREATE TABLE public.brief_approval_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id uuid NOT NULL REFERENCES public.campaign_briefs(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('submitted','needs_revision','approved')),
  brief_version integer NOT NULL,
  notes text,
  actor_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX brief_approval_log_brief_idx ON public.brief_approval_log(brief_id, created_at);
GRANT SELECT ON public.brief_approval_log TO authenticated;
GRANT ALL ON public.brief_approval_log TO service_role;
ALTER TABLE public.brief_approval_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brief approval log read" ON public.brief_approval_log FOR SELECT TO authenticated
  USING (public.user_can_access_client(auth.uid(), client_id));

CREATE OR REPLACE FUNCTION public.can_approve_brief(_user_id uuid, _brief_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.campaign_briefs b
    WHERE b.id = _brief_id AND public.user_can_access_client(_user_id, b.client_id)
      AND (
        public.has_role(_user_id,'admin') OR public.has_role(_user_id,'owner')
        OR (public.has_role(_user_id,'reviewer') AND (b.assigned_approver_id IS NULL OR b.assigned_approver_id = _user_id))
      )
  )
$$;

-- Approval-mode briefs can only become approved through decide_brief.
CREATE OR REPLACE FUNCTION public.guard_brief_approval() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.approval_mode_enabled AND NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved'
     AND coalesce(current_setting('app.brief_decision', true), '') <> '1' THEN
    RAISE EXCEPTION 'This brief uses approval mode — send it for approval instead';
  END IF;
  IF NEW.approval_mode_enabled IS DISTINCT FROM OLD.approval_mode_enabled AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins can change approval mode';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER campaign_briefs_guard_approval BEFORE UPDATE ON public.campaign_briefs
  FOR EACH ROW EXECUTE FUNCTION public.guard_brief_approval();

CREATE OR REPLACE FUNCTION public.submit_brief(_brief_id uuid, _approver uuid, _note text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b record;
BEGIN
  SELECT * INTO b FROM public.campaign_briefs WHERE id = _brief_id;
  IF b IS NULL OR NOT public.user_can_access_client(auth.uid(), b.client_id) OR NOT public.can_edit_content(auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF b.status NOT IN ('draft','needs_revision') THEN RAISE EXCEPTION 'Only draft or revised briefs can be sent for approval'; END IF;
  IF _approver IS NOT NULL AND NOT (public.has_role(_approver,'reviewer') OR public.has_role(_approver,'admin')) THEN
    RAISE EXCEPTION 'Pick someone with the Approver or Admin role';
  END IF;
  UPDATE public.campaign_briefs SET status = 'in_review', assigned_approver_id = _approver, updated_by = auth.uid() WHERE id = _brief_id;
  INSERT INTO public.brief_approval_log(brief_id, client_id, action, brief_version, notes, actor_id)
    VALUES (_brief_id, b.client_id, 'submitted', b.version, nullif(trim(_note),''), auth.uid());
END $$;

CREATE OR REPLACE FUNCTION public.decide_brief(_brief_id uuid, _decision text, _notes text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b record;
BEGIN
  SELECT * INTO b FROM public.campaign_briefs WHERE id = _brief_id;
  IF b IS NULL OR NOT public.can_approve_brief(auth.uid(), _brief_id) THEN
    RAISE EXCEPTION 'Only the assigned Approver or an Admin can decide on this brief';
  END IF;
  IF b.status <> 'in_review' THEN RAISE EXCEPTION 'This brief is not waiting for approval'; END IF;
  IF _decision = 'needs_revision' THEN
    IF coalesce(trim(_notes),'') = '' THEN RAISE EXCEPTION 'Add notes explaining what to revise'; END IF;
    UPDATE public.campaign_briefs SET status = 'needs_revision', updated_by = auth.uid() WHERE id = _brief_id;
  ELSIF _decision = 'approved' THEN
    PERFORM set_config('app.brief_decision','1', true);
    UPDATE public.campaign_briefs SET status = 'approved', approved_at = now(), approved_by = auth.uid(), updated_by = auth.uid() WHERE id = _brief_id;
    PERFORM set_config('app.brief_decision','', true);
  ELSE
    RAISE EXCEPTION 'Unknown decision';
  END IF;
  INSERT INTO public.brief_approval_log(brief_id, client_id, action, brief_version, notes, actor_id)
    VALUES (_brief_id, b.client_id, _decision, b.version, nullif(trim(_notes),''), auth.uid());
END $$;

REVOKE EXECUTE ON FUNCTION public.submit_brief(uuid, uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.decide_brief(uuid, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.submit_brief(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_brief(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_approve_brief(uuid, uuid) TO authenticated;