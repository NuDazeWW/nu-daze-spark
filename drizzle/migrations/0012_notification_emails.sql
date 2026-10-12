CREATE TABLE public.email_provider_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  provider text NOT NULL DEFAULT 'none' CHECK (provider IN ('none','sendgrid','gmail','outlook','yahoo','smtp')),
  from_email text, from_name text, smtp_host text, smtp_port integer, smtp_secure boolean NOT NULL DEFAULT true,
  smtp_username text, connected_as text, last_test_at timestamptz, last_test_ok boolean, last_test_error text,
  updated_by uuid, updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.email_provider_settings TO authenticated;
GRANT ALL ON public.email_provider_settings TO service_role;
ALTER TABLE public.email_provider_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read provider" ON public.email_provider_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update provider" ON public.email_provider_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.email_provider_settings (id) VALUES (true);

-- Secret store: no grants to app users at all; only server functions (service role) read/write.
CREATE TABLE public.email_provider_secrets (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  secret text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.email_provider_secrets FROM anon, authenticated;
GRANT ALL ON public.email_provider_secrets TO service_role;
ALTER TABLE public.email_provider_secrets ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  recipient_email text NOT NULL,
  daily_digest boolean NOT NULL DEFAULT true,
  post_went_out boolean NOT NULL DEFAULT true,
  client_ids uuid[] NOT NULL DEFAULT '{}',
  send_time time NOT NULL DEFAULT '07:00',
  time_zone text NOT NULL DEFAULT 'America/New_York',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX notification_preferences_email_uq ON public.notification_preferences (lower(recipient_email));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin read" ON public.notification_preferences FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own or admin insert" ON public.notification_preferences FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own or admin update" ON public.notification_preferences FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own or admin delete" ON public.notification_preferences FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER notification_preferences_updated BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preference_id uuid,
  recipient_email text NOT NULL,
  kind text NOT NULL,
  dedupe_key text NOT NULL UNIQUE,
  post_card_id uuid,
  ok boolean NOT NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notification_log TO authenticated;
GRANT ALL ON public.notification_log TO service_role;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read log" ON public.notification_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.post_cards ADD COLUMN posted_at timestamptz;
CREATE OR REPLACE FUNCTION public.stamp_posted_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.approval_status = 'posted' AND (OLD.approval_status IS DISTINCT FROM 'posted') THEN NEW.posted_at := now(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER post_cards_stamp_posted BEFORE UPDATE ON public.post_cards FOR EACH ROW EXECUTE FUNCTION public.stamp_posted_at();

CREATE OR REPLACE FUNCTION public.prepare_blank_copy(_confirm text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE ws public.workspace_settings%ROWTYPE;
BEGIN
  SELECT * INTO ws FROM public.workspace_settings LIMIT 1;
  IF ws.is_demo_master THEN RAISE EXCEPTION 'This copy is locked: blank-copy preparation has already been completed by the operator.'; END IF;
  IF public.workspace_role(auth.uid()) <> 'owner' THEN RAISE EXCEPTION 'Only the workspace owner can prepare a blank copy.'; END IF;
  IF _confirm IS NULL OR lower(trim(_confirm)) <> lower(trim(ws.company_name)) THEN RAISE EXCEPTION 'Confirmation does not match the company name.'; END IF;
  DELETE FROM public.preflight_reviews; DELETE FROM public.post_cards; DELETE FROM public.master_content_objects;
  DELETE FROM public.campaign_briefs; DELETE FROM public.asset_summaries; DELETE FROM public.source_assets;
  DELETE FROM public.engagement_targets; DELETE FROM public.external_posts; DELETE FROM public.brand_voice_rules;
  DELETE FROM public.platform_rules; DELETE FROM public.audience_definitions; DELETE FROM public.campaign_rules;
  DELETE FROM public.content_pillars; DELETE FROM public.hashtag_banks; DELETE FROM public.cta_banks;
  DELETE FROM public.tagging_preferences; DELETE FROM public.banned_phrases; DELETE FROM public.required_language;
  DELETE FROM public.cadence_targets; DELETE FROM public.social_accounts; DELETE FROM public.clients;
  DELETE FROM public.workspace_invites; DELETE FROM public.activity_log;
  DELETE FROM public.notification_log; DELETE FROM public.notification_preferences; DELETE FROM public.email_provider_secrets;
  UPDATE public.email_provider_settings SET provider='none', from_email=NULL, from_name=NULL, smtp_host=NULL, smtp_port=NULL,
    smtp_username=NULL, connected_as=NULL, last_test_at=NULL, last_test_ok=NULL, last_test_error=NULL;
  DELETE FROM public.user_roles WHERE user_id <> auth.uid();
  DELETE FROM public.profiles WHERE user_id <> auth.uid();
  UPDATE public.workspace_settings SET company_name = '', company_logo_url = NULL, org_type = 'agency',
    entity_label_singular = 'Client', entity_label_plural = 'Clients', setup_progress = '{}'::jsonb,
    auto_admin_domain = NULL, is_demo_master = true;
END;
$function$;