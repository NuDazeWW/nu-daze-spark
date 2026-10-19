ALTER TABLE public.nonprofit_applications
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS cra_number text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS document_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_route text,
  ADD COLUMN IF NOT EXISTS matched_name text,
  ADD COLUMN IF NOT EXISTS corroboration jsonb,
  ADD COLUMN IF NOT EXISTS verified_until date,
  ADD COLUMN IF NOT EXISTS grace_until date,
  ADD COLUMN IF NOT EXISTS last_recheck_at timestamptz;

CREATE TABLE public.nonprofit_decision_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.nonprofit_applications(id) ON DELETE RESTRICT,
  reviewer_id uuid,
  outcome text NOT NULL,
  notes text,
  irs_result text,
  matched_name text,
  source text,
  source_citation text,
  plan_applied text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.nonprofit_decision_log TO authenticated;
GRANT ALL ON public.nonprofit_decision_log TO service_role;
ALTER TABLE public.nonprofit_decision_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read decision log" ON public.nonprofit_decision_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.nonprofit_recheck_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  checked integer NOT NULL DEFAULT 0,
  sent_to_review integer NOT NULL DEFAULT 0,
  notices_sent integer NOT NULL DEFAULT 0,
  lapsed integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.nonprofit_recheck_runs TO authenticated;
GRANT ALL ON public.nonprofit_recheck_runs TO service_role;
ALTER TABLE public.nonprofit_recheck_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read recheck runs" ON public.nonprofit_recheck_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.review_nonprofit_application(_id uuid, _decision text, _notes text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE a public.nonprofit_applications;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF _decision NOT IN ('verified','rejected','more_info') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  IF _decision IN ('rejected','more_info') AND coalesce(trim(_notes),'') = '' THEN RAISE EXCEPTION 'A reason is required'; END IF;
  SELECT * INTO a FROM public.nonprofit_applications WHERE id=_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF _decision = 'verified' AND a.intended_tier IN ('starter','spark_start') THEN RAISE EXCEPTION 'Non-profit pricing starts at Team Flow'; END IF;
  UPDATE public.nonprofit_applications SET status=_decision, reviewer_id=auth.uid(), decided_at=now(), review_notes=_notes,
    verified_until = CASE WHEN _decision='verified' THEN (now() + interval '1 year')::date ELSE verified_until END,
    reverification_due = CASE WHEN _decision='verified' THEN (now() + interval '1 year')::date ELSE NULL END,
    grace_until = NULL WHERE id=_id;
  IF _decision <> 'more_info' THEN
    UPDATE public.workspace_billing SET nonprofit_status=_decision, updated_at=now();
  END IF;
  INSERT INTO public.nonprofit_decision_log(application_id, reviewer_id, outcome, notes, irs_result, matched_name, source, source_citation, plan_applied)
  VALUES (_id, auth.uid(), _decision, _notes, a.corroboration->>'result', a.matched_name,
    coalesce(a.corroboration->>'source', a.review_route), a.corroboration->>'citation',
    CASE WHEN _decision='verified' THEN a.intended_tier ELSE NULL END);
  PERFORM public.log_activity('nonprofit_reviewed', _id::text, jsonb_build_object('decision',_decision));
END $function$;

CREATE OR REPLACE FUNCTION public.nonprofit_annual_recheck()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE c int := 0; r int := 0; n int := 0; l int := 0;
BEGIN
  -- Within 30 days of anniversary: send to re-check review (US re-lookup runs from the review queue).
  WITH due AS (
    UPDATE public.nonprofit_applications SET status='recheck_due', last_recheck_at=now()
    WHERE status='verified' AND verified_until IS NOT NULL AND verified_until <= current_date + 30
    RETURNING id)
  SELECT count(*) INTO r FROM due;
  -- Notices at 30 and 7 days before expiry.
  SELECT count(*) INTO n FROM public.nonprofit_applications
    WHERE status='recheck_due' AND verified_until IN (current_date + 30, current_date + 7);
  INSERT INTO public.notification_log(event_type, recipient, status, details)
    SELECT 'nonprofit_expiry_notice', contact_email, 'queued', jsonb_build_object('application_id', id, 'verified_until', verified_until)
    FROM public.nonprofit_applications WHERE status='recheck_due' AND verified_until IN (current_date + 30, current_date + 7);
  -- Expired: start 30-day grace.
  UPDATE public.nonprofit_applications SET grace_until = verified_until + 30
    WHERE status='recheck_due' AND verified_until < current_date AND grace_until IS NULL;
  -- Grace over: back to standard pricing.
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