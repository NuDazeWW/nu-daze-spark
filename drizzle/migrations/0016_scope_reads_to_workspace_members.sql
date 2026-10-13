CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id) $$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('brand_voice_rules','Authenticated can view brand voice rules'),
    ('engagement_targets','Authenticated can view engagement targets'),
    ('approval_log','Authenticated can view approval log'),
    ('repurpose_suggestions','Authenticated can view repurpose suggestions'),
    ('asset_summaries','Authenticated can view asset summaries'),
    ('generation_batches','Authenticated can view generation batches'),
    ('post_versions','Authenticated can view post versions'),
    ('audience_definitions','Authenticated can view audience definitions'),
    ('guardrail_settings','Authenticated can view guardrails'),
    ('comments','Authenticated can view comments'),
    ('external_posts','Authenticated can view external posts'),
    ('workspace_settings','Signed-in users read workspace settings'),
    ('post_cards','Authenticated can view post cards'),
    ('account_tags','Authenticated can view account tags'),
    ('platform_rules','Authenticated can view platform rules'),
    ('cadence_targets','Authenticated can view cadence targets'),
    ('hashtag_banks','Authenticated can view hashtag banks'),
    ('cta_banks','Authenticated can view cta banks'),
    ('campaign_rules','Authenticated can view campaign rules')
  ) AS t(tbl, pol) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.pol, r.tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid()))', r.pol, r.tbl);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Authenticated can insert external posts" ON public.external_posts;
CREATE POLICY "Authenticated can insert external posts" ON public.external_posts
  FOR INSERT TO authenticated WITH CHECK (public.can_create_content(auth.uid()));