CREATE TABLE public.preflight_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_card_id uuid NOT NULL REFERENCES public.post_cards(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id),
  draft_checksum text NOT NULL,
  overall_status text NOT NULL DEFAULT 'pass',
  voice_score integer,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_error text,
  model text,
  run_by uuid NOT NULL,
  override_reason text,
  overridden_by uuid,
  overridden_at timestamptz,
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX preflight_reviews_card_idx ON public.preflight_reviews(post_card_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.preflight_reviews TO authenticated;
GRANT ALL ON public.preflight_reviews TO service_role;

ALTER TABLE public.preflight_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client members read preflight" ON public.preflight_reviews
  FOR SELECT TO authenticated USING (public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "Client members create preflight" ON public.preflight_reviews
  FOR INSERT TO authenticated WITH CHECK (run_by = auth.uid() AND public.user_can_access_client(auth.uid(), client_id));
CREATE POLICY "Client members acknowledge or override preflight" ON public.preflight_reviews
  FOR UPDATE TO authenticated USING (public.user_can_access_client(auth.uid(), client_id))
  WITH CHECK (public.user_can_access_client(auth.uid(), client_id));