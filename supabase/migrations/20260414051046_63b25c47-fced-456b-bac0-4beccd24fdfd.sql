
ALTER TABLE public.source_assets
  ADD COLUMN content_date date,
  ADD COLUMN is_event boolean NOT NULL DEFAULT false,
  ADD COLUMN event_name text,
  ADD COLUMN contributors text[] NOT NULL DEFAULT '{}'::text[];
