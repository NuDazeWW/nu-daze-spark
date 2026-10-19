CREATE TABLE IF NOT EXISTS public.legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  doc text NOT NULL,
  version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  marketing_email boolean NOT NULL DEFAULT false,
  marketing_sms boolean NOT NULL DEFAULT false
);
GRANT SELECT, INSERT ON public.legal_acceptances TO authenticated;
GRANT ALL ON public.legal_acceptances TO service_role;
ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own acceptances" ON public.legal_acceptances FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Record own acceptance" ON public.legal_acceptances FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS legal_acceptances_user_idx ON public.legal_acceptances(user_id, doc);
ALTER TABLE public.post_cards ADD COLUMN IF NOT EXISTS ai_assisted boolean;