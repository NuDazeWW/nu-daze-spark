REVOKE EXECUTE ON FUNCTION public.grant_admin_for_nudaze_domain() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.prevent_system_tag_delete() FROM anon, authenticated, public;