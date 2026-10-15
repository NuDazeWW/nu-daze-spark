ALTER TABLE public.workspace_settings
  ADD COLUMN IF NOT EXISTS post_approval_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preflight_mode text NOT NULL DEFAULT 'advisory'
    CHECK (preflight_mode IN ('off','advisory','strict'));