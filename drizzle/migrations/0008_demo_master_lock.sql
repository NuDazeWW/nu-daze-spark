ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS is_demo_master boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.protect_demo_master_flag()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.is_demo_master IS DISTINCT FROM OLD.is_demo_master THEN
    RAISE EXCEPTION 'The demo lock can''t be changed from the app';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.protect_demo_master_flag() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER protect_demo_master_flag BEFORE UPDATE ON public.workspace_settings FOR EACH ROW EXECUTE FUNCTION public.protect_demo_master_flag();

CREATE OR REPLACE FUNCTION public.reset_workspace_content(_confirm text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _name text; _locked boolean;
BEGIN
  IF NOT public.has_role(auth.uid(),'owner') THEN RAISE EXCEPTION 'Only the owner can reset the workspace'; END IF;
  SELECT company_name, is_demo_master INTO _name, _locked FROM public.workspace_settings LIMIT 1;
  IF _locked THEN RAISE EXCEPTION 'This is the locked demo workspace. Reset is disabled here.'; END IF;
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

CREATE OR REPLACE FUNCTION public.prepare_blank_copy(_confirm text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _name text; _locked boolean;
BEGIN
  IF NOT public.has_role(auth.uid(),'owner') THEN RAISE EXCEPTION 'Only the owner can prepare a blank copy'; END IF;
  SELECT company_name, is_demo_master INTO _name, _locked FROM public.workspace_settings LIMIT 1;
  IF _locked THEN RAISE EXCEPTION 'This is the locked demo workspace. Blank-copy preparation is disabled here.'; END IF;
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
  DELETE FROM public.brand_voice_rules WHERE id IS NOT NULL;
  DELETE FROM public.platform_rules WHERE id IS NOT NULL;
  DELETE FROM public.audience_definitions WHERE id IS NOT NULL;
  DELETE FROM public.campaign_rules WHERE id IS NOT NULL;
  DELETE FROM public.hashtag_banks WHERE id IS NOT NULL;
  DELETE FROM public.cta_banks WHERE id IS NOT NULL;
  DELETE FROM public.cadence_targets WHERE id IS NOT NULL;
  DELETE FROM public.engagement_targets WHERE id IS NOT NULL;
  DELETE FROM public.connected_sources WHERE id IS NOT NULL;
  DELETE FROM public.account_tags WHERE is_system = false;
  DELETE FROM public.social_accounts WHERE id IS NOT NULL;
  DELETE FROM public.client_members WHERE id IS NOT NULL;
  DELETE FROM public.clients WHERE id IS NOT NULL;
  DELETE FROM public.workspace_invites WHERE id IS NOT NULL;
  DELETE FROM public.user_roles WHERE user_id <> auth.uid();
  DELETE FROM public.activity_log WHERE id IS NOT NULL;
  UPDATE public.workspace_settings SET company_name = 'My Company', company_logo_url = NULL, org_type = 'agency',
    entity_label_singular = 'Client', entity_label_plural = 'Clients', setup_progress = '{}'::jsonb,
    plan_name = 'Unlimited', seat_limit = NULL, client_limit = NULL, auto_admin_domain = NULL
  WHERE id = true;
  PERFORM public.log_activity('blank_copy_prepared', NULL, '{}'::jsonb);
END $$;
REVOKE EXECUTE ON FUNCTION public.prepare_blank_copy(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prepare_blank_copy(text) TO authenticated;