
CREATE TABLE public.account_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  handle text NOT NULL UNIQUE,
  display_name text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

ALTER TABLE public.account_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view account tags"
  ON public.account_tags FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert account tags"
  ON public.account_tags FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update account tags"
  ON public.account_tags FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete account tags"
  ON public.account_tags FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_account_tags_updated_at
  BEFORE UPDATE ON public.account_tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default tag
INSERT INTO public.account_tags (handle, display_name, is_default)
VALUES ('@nudazeworldwide', 'NuDaze Worldwide', true);
