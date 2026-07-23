ALTER TABLE public.post_cards
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS import_source text;

CREATE INDEX IF NOT EXISTS post_cards_scheduled_for_idx
  ON public.post_cards (scheduled_for);