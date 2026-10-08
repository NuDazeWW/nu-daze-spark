CREATE TABLE public.campaign_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  campaign_type text NOT NULL DEFAULT 'thought_leadership',
  objective text,
  target_audience text,
  core_message text,
  proof_points text[] NOT NULL DEFAULT '{}',
  primary_cta text,
  destination_url text,
  success_metric text,
  timing_window text,
  constraints text,
  target_channels text[] NOT NULL DEFAULT '{linkedin_post,instagram_feed,instagram_story,instagram_reel}',
  status text NOT NULL DEFAULT 'draft',
  version integer NOT NULL DEFAULT 1,
  approved_at timestamptz,
  approved_by uuid,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_briefs TO authenticated;
GRANT ALL ON public.campaign_briefs TO service_role;
ALTER TABLE public.campaign_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "briefs select" ON public.campaign_briefs FOR SELECT TO authenticated USING (public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "briefs insert" ON public.campaign_briefs FOR INSERT TO authenticated WITH CHECK (public.user_can_access_client(auth.uid(), client_id) AND created_by = auth.uid());
CREATE POLICY "briefs update" ON public.campaign_briefs FOR UPDATE TO authenticated USING (public.user_can_access_client(auth.uid(), client_id)) WITH CHECK (public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "briefs delete" ON public.campaign_briefs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_campaign_briefs_updated_at BEFORE UPDATE ON public.campaign_briefs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.master_content_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  brief_id uuid NOT NULL REFERENCES public.campaign_briefs(id) ON DELETE CASCADE,
  brief_version integer NOT NULL DEFAULT 1,
  title text NOT NULL,
  core_message text NOT NULL,
  proof_points text[] NOT NULL DEFAULT '{}',
  cta text,
  destination_url text,
  rationale text,
  status text NOT NULL DEFAULT 'draft',
  is_stale boolean NOT NULL DEFAULT false,
  owner_id uuid,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.master_content_objects TO authenticated;
GRANT ALL ON public.master_content_objects TO service_role;
ALTER TABLE public.master_content_objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mco select" ON public.master_content_objects FOR SELECT TO authenticated USING (public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "mco insert" ON public.master_content_objects FOR INSERT TO authenticated WITH CHECK (public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "mco update" ON public.master_content_objects FOR UPDATE TO authenticated USING (public.user_can_access_client(auth.uid(), client_id)) WITH CHECK (public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "mco delete" ON public.master_content_objects FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_mco_updated_at BEFORE UPDATE ON public.master_content_objects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.post_cards ADD COLUMN brief_id uuid REFERENCES public.campaign_briefs(id) ON DELETE SET NULL;
ALTER TABLE public.post_cards ADD COLUMN master_content_id uuid REFERENCES public.master_content_objects(id) ON DELETE SET NULL;
CREATE INDEX ON public.post_cards(master_content_id);
CREATE INDEX ON public.master_content_objects(brief_id);

CREATE OR REPLACE FUNCTION public.flag_stale_on_brief_change()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF (NEW.core_message IS DISTINCT FROM OLD.core_message
      OR NEW.proof_points IS DISTINCT FROM OLD.proof_points
      OR NEW.primary_cta IS DISTINCT FROM OLD.primary_cta
      OR NEW.objective IS DISTINCT FROM OLD.objective
      OR NEW.target_audience IS DISTINCT FROM OLD.target_audience) THEN
    NEW.version := OLD.version + 1;
    IF OLD.status = 'approved' THEN
      NEW.status := 'draft';
      NEW.approved_at := NULL;
      NEW.approved_by := NULL;
    END IF;
    UPDATE public.master_content_objects SET is_stale = true WHERE brief_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER brief_versioning BEFORE UPDATE ON public.campaign_briefs FOR EACH ROW EXECUTE FUNCTION public.flag_stale_on_brief_change();