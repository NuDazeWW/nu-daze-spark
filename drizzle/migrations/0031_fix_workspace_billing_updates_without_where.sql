DO $mig$
DECLARE r record; def text; fixed text;
BEGIN
  FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND p.proname IN ('consume_usage','resume_guardrail_bucket','set_resume_delegate','set_billing_mode','review_nonprofit_application','grant_addon','roll_clip_allowances','nonprofit_annual_recheck')
  LOOP
    def := pg_get_functiondef(r.oid);
    -- Add WHERE id = true to single-row workspace_billing updates that lack a WHERE clause.
    fixed := regexp_replace(def, '(UPDATE public\.workspace_billing SET(?:(?!WHERE)[^;])*?)(updated_at\s*=\s*now\(\));', '\1\2 WHERE id = true;', 'g');
    IF fixed <> def THEN EXECUTE fixed; END IF;
  END LOOP;
END $mig$;