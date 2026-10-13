CREATE OR REPLACE FUNCTION public.reset_demo_allowances()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _bytes bigint;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Owners and admins only'; END IF;
  IF (SELECT billing_status FROM public.workspace_billing LIMIT 1) <> 'internal' THEN RAISE EXCEPTION 'Demo reset is only available on internal demo instances'; END IF;
  SELECT coalesce(sum((metadata->>'size')::bigint),0) INTO _bytes FROM storage.objects WHERE bucket_id IN ('source-assets','generated-assets');
  UPDATE public.workspace_billing SET media_credits_used=0, text_drafts_used=0, x_spend_cents=0, storage_bytes=_bytes,
    paused_buckets='{}', level2_degraded=false, anomaly_counters='{}'::jsonb, updated_at=now()
  WHERE id = true;
  UPDATE public.guardrail_alerts SET status='cleared_by_reset', resumed_by=auth.uid(), resumed_at=now() WHERE status='open';
  DELETE FROM public.usage_events WHERE created_at > now() - interval '8 days';
  PERFORM public.log_activity('demo_allowances_reset', NULL, jsonb_build_object('storage_bytes',_bytes));
END $function$;