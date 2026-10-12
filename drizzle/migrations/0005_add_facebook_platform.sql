ALTER TYPE public.platform_type ADD VALUE IF NOT EXISTS 'facebook';

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS platforms text[] NOT NULL DEFAULT ARRAY['linkedin', 'instagram', 'facebook'];

ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_platforms_check;

ALTER TABLE public.clients
  ADD CONSTRAINT clients_platforms_check
  CHECK (platforms <@ ARRAY['linkedin', 'instagram', 'facebook']::text[] AND cardinality(platforms) > 0);