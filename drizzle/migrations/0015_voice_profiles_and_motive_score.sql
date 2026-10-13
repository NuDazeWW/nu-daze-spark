CREATE TABLE public.voice_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  role_title text,
  linkedin_url text,
  sample_posts text[] NOT NULL DEFAULT '{}',
  voice_traits text[] NOT NULL DEFAULT '{}',
  topics text[] NOT NULL DEFAULT '{}',
  banned_phrases text[] NOT NULL DEFAULT '{}',
  pov_statement text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_profiles TO authenticated;
GRANT ALL ON public.voice_profiles TO service_role;
ALTER TABLE public.voice_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read voice profiles" ON public.voice_profiles FOR SELECT TO authenticated USING (client_id IS NULL OR public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "Editors insert voice profiles" ON public.voice_profiles FOR INSERT TO authenticated WITH CHECK (public.can_edit_content(auth.uid()) AND (client_id IS NULL OR public.user_can_access_client(auth.uid(), client_id)));
CREATE POLICY "Editors update voice profiles" ON public.voice_profiles FOR UPDATE TO authenticated USING (public.can_edit_content(auth.uid()) AND (client_id IS NULL OR public.user_can_access_client(auth.uid(), client_id)));
CREATE POLICY "Editors delete voice profiles" ON public.voice_profiles FOR DELETE TO authenticated USING (public.can_edit_content(auth.uid()) AND (client_id IS NULL OR public.user_can_access_client(auth.uid(), client_id)));

ALTER TABLE public.post_cards ADD COLUMN voice_profile_id uuid REFERENCES public.voice_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.preflight_reviews ADD COLUMN motive_score integer;
ALTER TABLE public.preflight_reviews ADD COLUMN motive_breakdown jsonb;