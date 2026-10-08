ALTER TABLE public.post_cards
  ADD COLUMN IF NOT EXISTS first_comment text,
  ADD COLUMN IF NOT EXISTS posting_notes text,
  ADD COLUMN IF NOT EXISTS package_checksum text,
  ADD COLUMN IF NOT EXISTS package_generated_at timestamptz;