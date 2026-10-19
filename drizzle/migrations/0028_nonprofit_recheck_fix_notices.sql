CREATE OR REPLACE FUNCTION public.nonprofit_annual_recheck()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE c int := 0; r int := 0; n int := 0; l int := 0;
BEGIN
  WITH due AS (
    UPDATE public.nonprofit_applications SET status='recheck_due', last_recheck_at=now()
    WHERE status='verified' AND verified_until IS NOT NULL AND verified_until <= current_date + 30
    RETURNING id)
  SELECT count(*) INTO r FROM due;
  WITH ins AS (
    INSERT INTO public.notification_log(recipient_email, kind, dedupe_key, ok)
    SELECT contact_email, 'nonprofit_expiry_notice', 'np-expiry-' || id || '-' || verified_until || '-' || (verified_until - current_date), true
    FROM public.nonprofit_applications WHERE status='recheck_due' AND verified_until IN (current_date + 30, current_date + 7)
    RETURNING 1)
  SELECT count(*) INTO n FROM ins;
  UPDATE public.nonprofit_applications SET grace_until = verified_until + 30
    WHERE status='recheck_due' AND verified_until < current_date AND grace_until IS NULL;
  WITH lapsed AS (
    UPDATE public.nonprofit_applications SET status='lapsed'
    WHERE status='recheck_due' AND grace_until IS NOT NULL AND grace_until < current_date RETURNING id)
  SELECT count(*) INTO l FROM lapsed;
  IF l > 0 THEN UPDATE public.workspace_billing SET nonprofit_status='lapsed', updated_at=now(); END IF;
  SELECT count(*) INTO c FROM public.nonprofit_applications WHERE status IN ('verified','recheck_due');
  INSERT INTO public.nonprofit_recheck_runs(checked, sent_to_review, notices_sent, lapsed) VALUES (c, r, n, l);
  RETURN jsonb_build_object('checked',c,'sent_to_review',r,'notices',n,'lapsed',l);
END $function$;
REVOKE ALL ON FUNCTION public.nonprofit_annual_recheck() FROM PUBLIC, anon, authenticated;