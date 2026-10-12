CREATE TABLE public.workspace_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  company_name text NOT NULL DEFAULT 'My Company',
  company_logo_url text,
  org_type text NOT NULL DEFAULT 'agency' CHECK (org_type IN ('agency','brand')),
  entity_label_singular text NOT NULL DEFAULT 'Client',
  entity_label_plural text NOT NULL DEFAULT 'Clients',
  setup_progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  plan_name text NOT NULL DEFAULT 'Unlimited',
  seat_limit integer CHECK (seat_limit IS NULL OR seat_limit > 0),
  client_limit integer CHECK (client_limit IS NULL OR client_limit > 0),
  auto_admin_domain text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.workspace_settings TO authenticated;
GRANT ALL ON public.workspace_settings TO service_role;
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read workspace settings" ON public.workspace_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins update workspace settings" ON public.workspace_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_workspace_settings_updated_at BEFORE UPDATE ON public.workspace_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.workspace_settings (company_name, org_type, entity_label_singular, entity_label_plural, setup_progress, auto_admin_domain)
VALUES ('NuDaze','agency','Client','Clients',
  '{"company":true,"org_type":true,"first_entity":true,"brand_voice":true,"cadence":true,"team":true}'::jsonb,
  'nudaze.com');

CREATE TABLE public.social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform public.platform_type NOT NULL,
  account_name text NOT NULL,
  handle text,
  profile_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_accounts TO authenticated;
GRANT ALL ON public.social_accounts TO service_role;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read social accounts" ON public.social_accounts FOR SELECT TO authenticated USING (public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "Admins manage social accounts" ON public.social_accounts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_social_accounts_updated_at BEFORE UPDATE ON public.social_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.social_accounts (client_id, platform, account_name)
SELECT c.id, p::public.platform_type, c.name FROM public.clients c, unnest(c.platforms) p;
COMMENT ON COLUMN public.clients.platforms IS 'Summary of platforms; detailed accounts live in social_accounts';

CREATE TABLE public.workspace_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role public.app_role NOT NULL,
  client_ids uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked')),
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);
CREATE UNIQUE INDEX workspace_invites_pending_email ON public.workspace_invites (lower(email)) WHERE status = 'pending';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_invites TO authenticated;
GRANT ALL ON public.workspace_invites TO service_role;
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage invites" ON public.workspace_invites FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  target text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read activity" ON public.activity_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users log own actions" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());

CREATE OR REPLACE FUNCTION public.log_activity(_action text, _target text, _details jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.activity_log (actor_id, action, target, details) VALUES (auth.uid(), _action, _target, COALESCE(_details,'{}'::jsonb));
$$;
REVOKE EXECUTE ON FUNCTION public.log_activity(text,text,jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.workspace_role(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.has_role(_user_id,'owner') THEN 'owner'
    WHEN public.has_role(_user_id,'admin') THEN 'admin'
    WHEN public.has_role(_user_id,'editor') THEN 'editor'
    WHEN public.has_role(_user_id,'reviewer') THEN 'reviewer'
    WHEN public.has_role(_user_id,'viewer') THEN 'viewer'
    WHEN public.has_role(_user_id,'member') THEN 'editor'
    ELSE NULL END
$$;
REVOKE EXECUTE ON FUNCTION public.workspace_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.workspace_role(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_create_content(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.workspace_role(_user_id) IN ('owner','admin','editor')
$$;
CREATE OR REPLACE FUNCTION public.can_edit_content(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.workspace_role(_user_id) IN ('owner','admin','editor','reviewer')
$$;
REVOKE EXECUTE ON FUNCTION public.can_create_content(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_content(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_create_content(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_content(uuid) TO authenticated;

CREATE POLICY "Role guard: create posts" ON public.post_cards AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_create_content(auth.uid()));
CREATE POLICY "Role guard: edit posts" ON public.post_cards AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_edit_content(auth.uid()));
CREATE POLICY "Role guard: delete posts" ON public.post_cards AS RESTRICTIVE FOR DELETE TO authenticated USING (public.can_create_content(auth.uid()));
CREATE POLICY "Role guard: create briefs" ON public.campaign_briefs AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_create_content(auth.uid()));
CREATE POLICY "Role guard: edit briefs" ON public.campaign_briefs AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_edit_content(auth.uid()));
CREATE POLICY "Role guard: create comments" ON public.comments AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_create_content(auth.uid()));
CREATE POLICY "Role guard: edit comments" ON public.comments AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_edit_content(auth.uid()));
CREATE POLICY "Role guard: approvals" ON public.approval_log AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_edit_content(auth.uid()));
CREATE POLICY "Role guard: create assets" ON public.source_assets AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_create_content(auth.uid()));

CREATE OR REPLACE FUNCTION public.enforce_seat_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _limit integer; _used integer;
BEGIN
  SELECT seat_limit INTO _limit FROM public.workspace_settings LIMIT 1;
  IF _limit IS NULL THEN RETURN NEW; END IF;
  SELECT (SELECT count(DISTINCT user_id) FROM public.user_roles)
       + (SELECT count(*) FROM public.workspace_invites WHERE status = 'pending') INTO _used;
  IF _used >= _limit THEN
    RAISE EXCEPTION 'Seat limit reached (% of % seats used). Remove a user or raise the limit.', _used, _limit;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER enforce_seat_limit BEFORE INSERT ON public.workspace_invites FOR EACH ROW EXECUTE FUNCTION public.enforce_seat_limit();

CREATE OR REPLACE FUNCTION public.enforce_client_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _limit integer; _used integer;
BEGIN
  SELECT client_limit INTO _limit FROM public.workspace_settings LIMIT 1;
  IF _limit IS NULL THEN RETURN NEW; END IF;
  SELECT count(*) INTO _used FROM public.clients WHERE is_active;
  IF _used >= _limit THEN
    RAISE EXCEPTION 'Plan limit reached (% of %). Raise the limit to add more.', _used, _limit;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER enforce_client_limit BEFORE INSERT ON public.clients FOR EACH ROW EXECUTE FUNCTION public.enforce_client_limit();

CREATE OR REPLACE FUNCTION public.protect_last_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.role = 'owner' AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'owner' AND id <> OLD.id) THEN
    RAISE EXCEPTION 'The workspace must always have an owner. Transfer ownership first.';
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER protect_last_owner BEFORE DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.protect_last_owner();

CREATE OR REPLACE FUNCTION public.set_workspace_role(_user_id uuid, _role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF _role NOT IN ('admin','editor','reviewer','viewer') THEN RAISE EXCEPTION 'Use transfer ownership to assign the owner role'; END IF;
  IF public.has_role(_user_id,'owner') THEN RAISE EXCEPTION 'Transfer ownership before changing the owner''s role'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','member','editor','reviewer','viewer');
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role);
  IF _role <> 'admin' THEN INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'member') ON CONFLICT DO NOTHING; END IF;
  PERFORM public.log_activity('role_changed', _user_id::text, jsonb_build_object('role', _role));
END $$;

CREATE OR REPLACE FUNCTION public.transfer_ownership(_new_owner uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'owner') THEN RAISE EXCEPTION 'Only the owner can transfer ownership'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _new_owner) THEN RAISE EXCEPTION 'That person is not on the team'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _new_owner AND role IN ('member','editor','reviewer','viewer');
  INSERT INTO public.user_roles (user_id, role) VALUES (_new_owner,'owner') ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (_new_owner,'admin') ON CONFLICT DO NOTHING;
  DELETE FROM public.user_roles WHERE user_id = auth.uid() AND role = 'owner';
  PERFORM public.log_activity('ownership_transferred', _new_owner::text, '{}'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.remove_workspace_user(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF _user_id = auth.uid() THEN RAISE EXCEPTION 'You cannot remove yourself'; END IF;
  IF public.has_role(_user_id,'owner') THEN RAISE EXCEPTION 'Transfer ownership before removing the owner'; END IF;
  DELETE FROM public.client_members WHERE user_id = _user_id;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  PERFORM public.log_activity('user_removed', _user_id::text, '{}'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.list_workspace_users()
RETURNS TABLE (user_id uuid, email text, display_name text, role text, last_sign_in_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  RETURN QUERY
  SELECT u.id, u.email::text, p.display_name, public.workspace_role(u.id), u.last_sign_in_at
  FROM auth.users u
  JOIN (SELECT DISTINCT r.user_id FROM public.user_roles r) r ON r.user_id = u.id
  LEFT JOIN public.profiles p ON p.user_id = u.id
  ORDER BY u.email;
END $$;

CREATE OR REPLACE FUNCTION public.workspace_usage()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _start timestamptz := date_trunc('month', now());
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  RETURN jsonb_build_object(
    'seats_used', (SELECT count(DISTINCT user_id) FROM public.user_roles),
    'pending_invites', (SELECT count(*) FROM public.workspace_invites WHERE status='pending'),
    'clients', (SELECT count(*) FROM public.clients WHERE is_active),
    'social_accounts', (SELECT count(*) FROM public.social_accounts WHERE is_active),
    'drafts_generated', (SELECT count(*) FROM public.post_cards WHERE created_at >= _start),
    'generation_runs', (SELECT count(*) FROM public.generation_batches WHERE created_at >= _start),
    'comments_drafted', (SELECT count(*) FROM public.comments WHERE created_at >= _start),
    'preflight_runs', (SELECT count(*) FROM public.preflight_reviews WHERE created_at >= _start),
    'posts_approved', (SELECT count(*) FROM public.approval_log WHERE action='approved' AND created_at >= _start)
  );
END $$;

CREATE OR REPLACE FUNCTION public.reset_workspace_content(_confirm text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _name text;
BEGIN
  IF NOT public.has_role(auth.uid(),'owner') THEN RAISE EXCEPTION 'Only the owner can reset the workspace'; END IF;
  SELECT company_name INTO _name FROM public.workspace_settings LIMIT 1;
  IF _confirm IS DISTINCT FROM _name THEN RAISE EXCEPTION 'Confirmation text does not match the company name'; END IF;
  DELETE FROM public.preflight_reviews WHERE id IS NOT NULL;
  DELETE FROM public.approval_log WHERE id IS NOT NULL;
  DELETE FROM public.post_versions WHERE id IS NOT NULL;
  DELETE FROM public.repurpose_suggestions WHERE id IS NOT NULL;
  DELETE FROM public.comments WHERE id IS NOT NULL;
  DELETE FROM public.external_posts WHERE id IS NOT NULL;
  DELETE FROM public.post_cards WHERE id IS NOT NULL;
  DELETE FROM public.master_content_objects WHERE id IS NOT NULL;
  DELETE FROM public.campaign_briefs WHERE id IS NOT NULL;
  DELETE FROM public.generation_batches WHERE id IS NOT NULL;
  DELETE FROM public.asset_summaries WHERE id IS NOT NULL;
  DELETE FROM public.source_assets WHERE id IS NOT NULL;
  PERFORM public.log_activity('workspace_reset', NULL, '{}'::jsonb);
END $$;

REVOKE EXECUTE ON FUNCTION public.set_workspace_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.transfer_ownership(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.remove_workspace_user(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_workspace_users() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.workspace_usage() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reset_workspace_content(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_workspace_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_ownership(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_workspace_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_workspace_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.workspace_usage() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_workspace_content(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _inv public.workspace_invites%ROWTYPE; _cid uuid;
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  SELECT * INTO _inv FROM public.workspace_invites WHERE lower(email) = lower(NEW.email) AND status = 'pending' LIMIT 1;
  IF FOUND THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _inv.role) ON CONFLICT DO NOTHING;
    IF _inv.role <> 'admin' THEN INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member') ON CONFLICT DO NOTHING; END IF;
    FOREACH _cid IN ARRAY _inv.client_ids LOOP
      INSERT INTO public.client_members (client_id, user_id) VALUES (_cid, NEW.id) ON CONFLICT DO NOTHING;
    END LOOP;
    UPDATE public.workspace_invites SET status = 'accepted', accepted_at = now() WHERE id = _inv.id;
    INSERT INTO public.activity_log (actor_id, action, target, details) VALUES (NEW.id, 'invite_accepted', NEW.email, jsonb_build_object('role', _inv.role));
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.grant_admin_for_nudaze_domain()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _domain text;
BEGIN
  SELECT lower(auto_admin_domain) INTO _domain FROM public.workspace_settings LIMIT 1;
  IF _domain IS NOT NULL AND _domain <> '' AND NEW.email_confirmed_at IS NOT NULL
     AND lower(split_part(NEW.email, '@', 2)) = _domain THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'::app_role) ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.log_table_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.activity_log (actor_id, action, target, details)
  VALUES (auth.uid(), TG_ARGV[0] || '_' || lower(TG_OP), TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END);
  RETURN COALESCE(NEW, OLD);
END $$;
REVOKE EXECUTE ON FUNCTION public.log_table_activity() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER log_invites AFTER INSERT OR UPDATE ON public.workspace_invites FOR EACH ROW EXECUTE FUNCTION public.log_table_activity('invite');
CREATE TRIGGER log_settings AFTER UPDATE ON public.workspace_settings FOR EACH ROW EXECUTE FUNCTION public.log_table_activity('settings');
CREATE TRIGGER log_clients AFTER INSERT OR DELETE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.log_table_activity('client');
CREATE TRIGGER log_approvals AFTER INSERT ON public.approval_log FOR EACH ROW EXECUTE FUNCTION public.log_table_activity('approval');
CREATE TRIGGER log_social_accounts AFTER INSERT OR DELETE ON public.social_accounts FOR EACH ROW EXECUTE FUNCTION public.log_table_activity('social_account');

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'owner'::public.app_role FROM auth.users WHERE lower(email) = 'shirley.johnson@nudaze.com'
ON CONFLICT DO NOTHING;