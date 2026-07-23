
-- ============ CLIENTS + MEMBERS ============
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can update clients" ON public.clients FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can delete clients" ON public.clients FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.client_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, user_id)
);
GRANT SELECT ON public.client_members TO authenticated;
GRANT ALL ON public.client_members TO service_role;
ALTER TABLE public.client_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memberships or admins all" ON public.client_members
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can insert memberships" ON public.client_members
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can delete memberships" ON public.client_members
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ============ HELPER ============
CREATE OR REPLACE FUNCTION public.user_can_access_client(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _client_id IS NULL
    OR public.has_role(_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.client_members
      WHERE user_id = _user_id AND client_id = _client_id
    )
$$;

-- ============ SEED CLIENTS ============
INSERT INTO public.clients (slug, name) VALUES
  ('nudaze', 'NuDaze'),
  ('psrc', 'Partnership Readiness Standards Council')
ON CONFLICT (slug) DO NOTHING;

-- ============ ADD client_id TO CONTENT TABLES ============
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'source_assets','connected_sources','asset_summaries',
    'brand_voice_rules','platform_rules','audience_definitions','campaign_rules',
    'hashtag_banks','cta_banks','cadence_targets','engagement_targets',
    'post_cards','post_versions','generation_batches','comments',
    'external_posts','repurpose_suggestions','account_tags'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (client_id)', t || '_client_id_idx', t);
  END LOOP;
END $$;

-- ============ BACKFILL EXISTING ROWS TO NUDAZE ============
DO $$
DECLARE
  nudaze_id uuid;
  t text;
  tbls text[] := ARRAY[
    'source_assets','connected_sources','asset_summaries',
    'brand_voice_rules','platform_rules','audience_definitions','campaign_rules',
    'hashtag_banks','cta_banks','cadence_targets','engagement_targets',
    'post_cards','post_versions','generation_batches','comments',
    'external_posts','repurpose_suggestions','account_tags'
  ];
BEGIN
  SELECT id INTO nudaze_id FROM public.clients WHERE slug = 'nudaze';
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('UPDATE public.%I SET client_id = %L WHERE client_id IS NULL', t, nudaze_id);
  END LOOP;
END $$;

-- ============ RESTRICTIVE CLIENT-SCOPE POLICIES ============
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'source_assets','connected_sources','asset_summaries',
    'brand_voice_rules','platform_rules','audience_definitions','campaign_rules',
    'hashtag_banks','cta_banks','cadence_targets','engagement_targets',
    'post_cards','post_versions','generation_batches','comments',
    'external_posts','repurpose_suggestions','account_tags'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS "client_scope" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "client_scope" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated
         USING (client_id IS NULL OR public.user_can_access_client(auth.uid(), client_id))
         WITH CHECK (client_id IS NULL OR public.user_can_access_client(auth.uid(), client_id))',
      t
    );
  END LOOP;
END $$;

-- ============ SEED PSRC ACCOUNT TAGS ============
INSERT INTO public.account_tags (handle, display_name, is_default, is_active, is_system, client_id)
SELECT h, dn, false, true, false, c.id
FROM public.clients c
CROSS JOIN (VALUES
  ('partnership-readiness-standards-council', 'Partnership Readiness Standards Council (LinkedIn)'),
  ('@prscstandards', 'PRSC Standards (Instagram)'),
  ('shirley-johnson-the-storyteller', 'Shirley Johnson (LinkedIn, CEO)')
) AS v(h, dn)
WHERE c.slug = 'psrc'
ON CONFLICT DO NOTHING;

-- ============ GRANT ALL EXISTING ADMINS ACCESS TO BOTH CLIENTS ============
INSERT INTO public.client_members (client_id, user_id)
SELECT c.id, ur.user_id
FROM public.clients c
CROSS JOIN public.user_roles ur
WHERE ur.role = 'admin'
ON CONFLICT DO NOTHING;
