ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS app_domain text;
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS weekly_summary boolean NOT NULL DEFAULT false;

CREATE TABLE public.post_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_card_id uuid NOT NULL REFERENCES public.post_cards(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  impressions integer NOT NULL DEFAULT 0,
  reactions integer NOT NULL DEFAULT 0,
  comments integer NOT NULL DEFAULT 0,
  shares integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  saves integer NOT NULL DEFAULT 0,
  notes text,
  recorded_by uuid NOT NULL DEFAULT auth.uid(),
  recorded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.post_results TO authenticated;
GRANT ALL ON public.post_results TO service_role;
ALTER TABLE public.post_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read results" ON public.post_results FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid()) AND (client_id IS NULL OR public.user_can_access_client(auth.uid(), client_id)));
CREATE POLICY "log results" ON public.post_results FOR INSERT TO authenticated
  WITH CHECK (recorded_by = auth.uid() AND public.can_edit_content(auth.uid()) AND (client_id IS NULL OR public.user_can_access_client(auth.uid(), client_id)));
CREATE POLICY "remove own results" ON public.post_results FOR DELETE TO authenticated
  USING (recorded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX post_results_post_idx ON public.post_results(post_card_id, recorded_at DESC);