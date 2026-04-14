
-- Add is_active and is_system columns to account_tags
ALTER TABLE public.account_tags
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

-- Mark @nudazeworldwide as system-protected
UPDATE public.account_tags
SET is_system = true, is_default = true
WHERE handle = '@nudazeworldwide';

-- Create trigger function to prevent deletion of system tags
CREATE OR REPLACE FUNCTION public.prevent_system_tag_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.is_system = true THEN
    RAISE EXCEPTION 'Cannot delete system-protected account tag: %', OLD.handle;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER protect_system_tags
BEFORE DELETE ON public.account_tags
FOR EACH ROW
EXECUTE FUNCTION public.prevent_system_tag_delete();
