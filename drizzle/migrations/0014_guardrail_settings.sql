CREATE TABLE public.guardrail_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  enabled_tiers jsonb NOT NULL DEFAULT '{"profanity":true,"risky_claims":true,"cliches":true}'::jsonb,
  custom_terms jsonb NOT NULL DEFAULT '{"profanity":[],"risky_claims":[],"cliches":[]}'::jsonb,
  disabled_terms text[] NOT NULL DEFAULT '{}',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guardrail_settings TO authenticated;
GRANT ALL ON public.guardrail_settings TO service_role;
ALTER TABLE public.guardrail_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view guardrails" ON public.guardrail_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert guardrails" ON public.guardrail_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update guardrails" ON public.guardrail_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete guardrails" ON public.guardrail_settings FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY client_scope ON public.guardrail_settings AS RESTRICTIVE FOR ALL TO authenticated
  USING (client_id IS NULL OR public.user_can_access_client(auth.uid(), client_id))
  WITH CHECK (client_id IS NULL OR public.user_can_access_client(auth.uid(), client_id));
CREATE TRIGGER guardrail_settings_updated BEFORE UPDATE ON public.guardrail_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();