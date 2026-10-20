REVOKE ALL ON FUNCTION public.corrective_regression_checks() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.corrective_confirmation_checks() FROM PUBLIC, anon, authenticated;
COMMENT ON FUNCTION public.corrective_regression_checks() IS 'Rollback-only maintenance regression helper; not callable through the application.';
COMMENT ON FUNCTION public.corrective_confirmation_checks() IS 'Rollback-only maintenance regression helper; not callable through the application.';