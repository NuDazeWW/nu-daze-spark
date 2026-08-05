CREATE OR REPLACE FUNCTION public.grant_admin_for_nudaze_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND lower(split_part(NEW.email, '@', 2)) = 'nudaze.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_nudaze_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_nudaze_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_admin_for_nudaze_domain();

DROP TRIGGER IF EXISTS on_auth_user_confirmed_grant_nudaze_admin ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_grant_nudaze_admin
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_admin_for_nudaze_domain();