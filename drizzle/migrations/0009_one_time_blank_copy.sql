-- prepare_blank_copy is a one-time operator step: after it runs, the copy locks itself
-- (is_demo_master = true) so the tool can never run again and buyers never see it.
CREATE OR REPLACE FUNCTION public.prepare_blank_copy(_confirm text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ws public.workspace_settings%ROWTYPE;
BEGIN
  SELECT * INTO ws FROM public.workspace_settings LIMIT 1;
  IF ws.is_demo_master THEN
    RAISE EXCEPTION 'This copy is locked: blank-copy preparation has already been completed by the operator.';
  END IF;
  IF public.workspace_role(auth.uid()) <> 'owner' THEN
    RAISE EXCEPTION 'Only the workspace owner can prepare a blank copy.';
  END IF;
  IF _confirm IS NULL OR lower(trim(_confirm)) <> lower(trim(ws.company_name)) THEN
    RAISE EXCEPTION 'Confirmation does not match the company name.';
  END IF;

  -- Clear all content, strategy, clients, accounts, invites, activity
  DELETE FROM public.preflight_reviews;
  DELETE FROM public.post_cards;
  DELETE FROM public.master_content_objects;
  DELETE FROM public.campaign_briefs;
  DELETE FROM public.asset_summaries;
  DELETE FROM public.source_assets;
  DELETE FROM public.engagement_targets;
  DELETE FROM public.external_posts;
  DELETE FROM public.brand_voice_rules;
  DELETE FROM public.platform_rules;
  DELETE FROM public.audience_definitions;
  DELETE FROM public.campaign_rules;
  DELETE FROM public.content_pillars;
  DELETE FROM public.hashtag_banks;
  DELETE FROM public.cta_banks;
  DELETE FROM public.tagging_preferences;
  DELETE FROM public.banned_phrases;
  DELETE FROM public.required_language;
  DELETE FROM public.cadence_targets;
  DELETE FROM public.social_accounts;
  DELETE FROM public.clients;
  DELETE FROM public.workspace_invites;
  DELETE FROM public.activity_log;

  -- Remove every team member except the operator running this
  DELETE FROM public.user_roles WHERE user_id <> auth.uid();
  DELETE FROM public.profiles WHERE id <> auth.uid();

  -- Reset workspace settings to blank defaults and lock the copy
  UPDATE public.workspace_settings
  SET company_name = '',
      company_logo_url = NULL,
      org_type = 'agency',
      entity_singular = 'Client',
      entity_plural = 'Clients',
      setup_progress = '{}'::jsonb,
      auto_admin_domain = NULL,
      is_demo_master = true;
END;
$$;

-- Allow the function itself to set the lock (trigger only blocks direct app-user updates)
CREATE OR REPLACE FUNCTION public.protect_demo_master_flag()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_demo_master IS DISTINCT FROM OLD.is_demo_master
     AND current_setting('request.jwt.claims', true) IS NOT NULL THEN
    RAISE EXCEPTION 'The demo-master lock cannot be changed from inside the app.';
  END IF;
  RETURN NEW;
END;
$$;