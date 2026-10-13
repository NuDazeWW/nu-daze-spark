CREATE TABLE public.ai_provider_credentials (
  provider text PRIMARY KEY,
  api_key text NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ai_provider_credentials TO service_role;
ALTER TABLE public.ai_provider_credentials ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.workspace_settings
  ADD COLUMN ai_image_provider text NOT NULL DEFAULT 'builtin',
  ADD COLUMN ai_video_provider text NOT NULL DEFAULT 'builtin';

CREATE OR REPLACE FUNCTION public.ai_provider_status()
RETURNS TABLE(provider text, configured boolean, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.provider, true, c.updated_at FROM public.ai_provider_credentials c
  WHERE public.is_workspace_member(auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.ai_provider_status() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.ai_provider_status() TO authenticated;