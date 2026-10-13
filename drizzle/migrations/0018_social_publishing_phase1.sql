ALTER TYPE public.platform_type ADD VALUE IF NOT EXISTS 'youtube';
ALTER TYPE public.platform_type ADD VALUE IF NOT EXISTS 'x';

-- social_accounts: connection metadata (no tokens here)
ALTER TABLE public.social_accounts
  ADD COLUMN IF NOT EXISTS external_account_id text,
  ADD COLUMN IF NOT EXISTS page_id text,
  ADD COLUMN IF NOT EXISTS scopes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS connection_status text NOT NULL DEFAULT 'not_connected',
  ADD COLUMN IF NOT EXISTS connected_at timestamptz,
  ADD COLUMN IF NOT EXISTS connection_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Tokens: service-role only
CREATE TABLE public.social_account_tokens (
  social_account_id uuid PRIMARY KEY REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.social_account_tokens FROM anon, authenticated;
GRANT ALL ON public.social_account_tokens TO service_role;
ALTER TABLE public.social_account_tokens ENABLE ROW LEVEL SECURITY;

-- BYO developer app credentials: service-role only
CREATE TABLE public.publishing_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE CHECK (provider IN ('meta','linkedin','google','x','tiktok')),
  client_id text NOT NULL,
  client_secret text NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.publishing_credentials FROM anon, authenticated;
GRANT ALL ON public.publishing_credentials TO service_role;
ALTER TABLE public.publishing_credentials ENABLE ROW LEVEL SECURITY;

-- Admin-safe status view of which providers are configured
CREATE OR REPLACE FUNCTION public.publishing_credentials_status()
RETURNS TABLE(provider text, configured boolean, client_id_hint text, updated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  RETURN QUERY SELECT c.provider, true, left(c.client_id,4) || '…', c.updated_at FROM public.publishing_credentials c;
END $$;
REVOKE EXECUTE ON FUNCTION public.publishing_credentials_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publishing_credentials_status() TO authenticated, service_role;

-- post_cards publishing fields
ALTER TABLE public.post_cards
  ADD COLUMN IF NOT EXISTS target_account_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS publishing_status text NOT NULL DEFAULT 'idle'
    CHECK (publishing_status IN ('idle','scheduled','publishing','published','failed','partial')),
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/New_York',
  ADD COLUMN IF NOT EXISTS apply_ai_disclosure boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS media_urls text[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS post_cards_publish_due_idx ON public.post_cards (publishing_status, scheduled_for);

-- publish_attempts
CREATE TABLE public.publish_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_card_id uuid NOT NULL REFERENCES public.post_cards(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  social_account_id uuid REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  platform text NOT NULL,
  status text NOT NULL CHECK (status IN ('success','failed','retrying')),
  platform_post_id text,
  error_code text,
  error_message text,
  attempt_number integer NOT NULL DEFAULT 1,
  cost_cents numeric(10,3),
  attempted_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.publish_attempts TO authenticated;
GRANT ALL ON public.publish_attempts TO service_role;
ALTER TABLE public.publish_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read publish attempts for their clients" ON public.publish_attempts
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid()) AND public.user_can_access_client(auth.uid(), client_id));
CREATE INDEX publish_attempts_post_idx ON public.publish_attempts (post_card_id, attempted_at DESC);

-- oauth_states: service-role only
CREATE TABLE public.oauth_states (
  state text PRIMARY KEY,
  user_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  platform text NOT NULL,
  code_verifier text,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.oauth_states FROM anon, authenticated;
GRANT ALL ON public.oauth_states TO service_role;
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

-- generation_counts
CREATE TABLE public.generation_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  year_month text NOT NULL,
  image_count integer NOT NULL DEFAULT 0,
  video_count integer NOT NULL DEFAULT 0,
  UNIQUE (client_id, year_month)
);
GRANT SELECT ON public.generation_counts TO authenticated;
GRANT ALL ON public.generation_counts TO service_role;
ALTER TABLE public.generation_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read generation counts" ON public.generation_counts
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid()) AND public.user_can_access_client(auth.uid(), client_id));

-- notify_me
CREATE TABLE public.notify_me (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature_key text NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (feature_key, email)
);
GRANT SELECT, INSERT, DELETE ON public.notify_me TO authenticated;
GRANT ALL ON public.notify_me TO service_role;
ALTER TABLE public.notify_me ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users add own notify-me" ON public.notify_me FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(auth.uid()));
CREATE POLICY "Users read own or admins all notify-me" ON public.notify_me FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users remove own notify-me" ON public.notify_me FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- brand_kits (per client)
CREATE TABLE public.brand_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  logo_path text,
  colors jsonb NOT NULL DEFAULT '[]'::jsonb,
  fonts text[] NOT NULL DEFAULT '{}',
  product_image_paths text[] NOT NULL DEFAULT '{}',
  tone text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_kits TO authenticated;
GRANT ALL ON public.brand_kits TO service_role;
ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read brand kits" ON public.brand_kits FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid()) AND public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "Creators insert brand kits" ON public.brand_kits FOR INSERT TO authenticated
  WITH CHECK (public.can_create_content(auth.uid()) AND public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "Creators update brand kits" ON public.brand_kits FOR UPDATE TO authenticated
  USING (public.can_create_content(auth.uid()) AND public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "Admins delete brand kits" ON public.brand_kits FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER brand_kits_updated BEFORE UPDATE ON public.brand_kits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- workspace settings additions
ALTER TABLE public.workspace_settings
  ADD COLUMN IF NOT EXISTS default_timezone text NOT NULL DEFAULT 'America/New_York',
  ADD COLUMN IF NOT EXISTS x_monthly_spend_cap_cents integer NOT NULL DEFAULT 5000;

-- Public media bucket policies (bucket created separately)
CREATE POLICY "Creators upload publishing media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'publishing-media' AND public.can_create_content(auth.uid()));
CREATE POLICY "Creators update publishing media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'publishing-media' AND public.can_create_content(auth.uid()));
CREATE POLICY "Admins delete publishing media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'publishing-media' AND public.has_role(auth.uid(),'admin'));