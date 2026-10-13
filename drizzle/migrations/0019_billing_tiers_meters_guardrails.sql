
-- ===== Pricing engine config =====
CREATE TABLE public.subscription_tier_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_slug text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  monthly_price_cents integer NOT NULL,
  annual_price_cents integer NOT NULL,
  nonprofit_annual_price_cents integer NOT NULL,
  implementation_fee_cents integer NOT NULL,
  nonprofit_implementation_fee_cents integer NOT NULL,
  allowances jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_current boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tier_slug, version)
);
GRANT SELECT ON public.subscription_tier_definitions TO anon, authenticated;
GRANT ALL ON public.subscription_tier_definitions TO service_role;
ALTER TABLE public.subscription_tier_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tier definitions are public" ON public.subscription_tier_definitions FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.credit_weight_definitions (
  capability text PRIMARY KEY,
  label text NOT NULL,
  credits integer NOT NULL CHECK (credits >= 0),
  unit_cost_cents numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.credit_weight_definitions TO anon, authenticated;
GRANT ALL ON public.credit_weight_definitions TO service_role;
ALTER TABLE public.credit_weight_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Credit weights are public" ON public.credit_weight_definitions FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.pricing_config_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity text NOT NULL,
  entity_key text NOT NULL,
  before jsonb,
  after jsonb,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pricing_config_audit TO authenticated;
GRANT ALL ON public.pricing_config_audit TO service_role;
ALTER TABLE public.pricing_config_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read pricing audit" ON public.pricing_config_audit FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ===== Billing & meters (single row, written only by definer functions / service role) =====
CREATE TABLE public.workspace_billing (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  tier_slug text NOT NULL DEFAULT 'starter',
  tier_definition_version integer NOT NULL DEFAULT 1,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  billing_status text NOT NULL DEFAULT 'trial',
  billing_mode text NOT NULL DEFAULT 'self_serve_card' CHECK (billing_mode IN ('self_serve_card','invoice')),
  price_override_cents integer,
  cycle_start timestamptz NOT NULL DEFAULT date_trunc('month', now()),
  cycle_end timestamptz NOT NULL DEFAULT date_trunc('month', now()) + interval '1 month',
  stripe_customer_id text,
  stripe_subscription_id text,
  payment_method_status text NOT NULL DEFAULT 'missing',
  media_credits_used integer NOT NULL DEFAULT 0,
  bonus_credits integer NOT NULL DEFAULT 0,
  text_drafts_used integer NOT NULL DEFAULT 0,
  x_spend_cents integer NOT NULL DEFAULT 0,
  storage_bytes bigint NOT NULL DEFAULT 0,
  paused_buckets text[] NOT NULL DEFAULT '{}',
  level2_degraded boolean NOT NULL DEFAULT false,
  anomaly_counters jsonb NOT NULL DEFAULT '{}'::jsonb,
  resume_delegate_user_id uuid,
  nonprofit_status text NOT NULL DEFAULT 'none',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.workspace_billing TO authenticated;
GRANT ALL ON public.workspace_billing TO service_role;
ALTER TABLE public.workspace_billing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read billing" ON public.workspace_billing FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid()));

CREATE TABLE public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL,
  capability text,
  quantity integer NOT NULL DEFAULT 1,
  credits integer NOT NULL DEFAULT 0,
  cost_cents numeric NOT NULL DEFAULT 0,
  client_id uuid,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX usage_events_created_idx ON public.usage_events (created_at DESC);
GRANT SELECT ON public.usage_events TO authenticated;
GRANT ALL ON public.usage_events TO service_role;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read usage" ON public.usage_events FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid()));

CREATE TABLE public.guardrail_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL,
  threshold_type text NOT NULL,
  threshold_label text NOT NULL,
  spend_cents numeric NOT NULL DEFAULT 0,
  projected_month_end_cents numeric NOT NULL DEFAULT 0,
  trip_number integer NOT NULL DEFAULT 1,
  requires_owner boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open',
  resumed_by uuid,
  resumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.guardrail_alerts TO authenticated;
GRANT ALL ON public.guardrail_alerts TO service_role;
ALTER TABLE public.guardrail_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read alerts" ON public.guardrail_alerts FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid()));

CREATE TABLE public.stripe_processed_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.stripe_processed_events TO service_role;
ALTER TABLE public.stripe_processed_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.nonprofit_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text NOT NULL,
  ein text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  letter_path text NOT NULL,
  intended_tier text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  verification_method text NOT NULL DEFAULT 'manual_irs',
  reviewer_id uuid,
  decided_at timestamptz,
  reverification_due date,
  review_notes text,
  submitted_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.nonprofit_applications TO authenticated;
GRANT ALL ON public.nonprofit_applications TO service_role;
ALTER TABLE public.nonprofit_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Submit own nonprofit application" ON public.nonprofit_applications FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid() AND status = 'pending' AND reviewer_id IS NULL);
CREATE POLICY "Read own or admin" ON public.nonprofit_applications FOR SELECT TO authenticated
  USING (submitted_by = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ===== Seed =====
INSERT INTO public.subscription_tier_definitions (tier_slug, name, sort_order, monthly_price_cents, annual_price_cents, nonprofit_annual_price_cents, implementation_fee_cents, nonprofit_implementation_fee_cents, allowances) VALUES
('starter','Starter',1, 9900, 7900, 5900, 49900, 37400,
 '{"brands":1,"seats":1,"dispatches":60,"media_credits":300,"text_drafts":300,"x_cap_cents":0,"storage_gb":5,"absolute_daily_alert_cents":1500,"channels":["linkedin","instagram_feed"],"features":["queue","planner","preflight","comments","assets"],"overage_hourly_cents":12500}'),
('team','Team',2, 24900, 19900, 14900, 79500, 59600,
 '{"brands":3,"seats":3,"dispatches":150,"media_credits":600,"text_drafts":600,"x_cap_cents":1500,"storage_gb":15,"absolute_daily_alert_cents":2500,"channels":["facebook","linkedin","x","instagram_feed","instagram_reels"],"features":["queue","planner","preflight","comments","assets","media_studio","brand_kit","split_platforms"],"overage_hourly_cents":13500}'),
('pro','Pro',3, 39900, 31900, 23900, 125000, 93800,
 '{"brands":5,"seats":5,"dispatches":300,"media_credits":1200,"text_drafts":1000,"x_cap_cents":3000,"storage_gb":25,"absolute_daily_alert_cents":4000,"channels":["facebook","linkedin","x","instagram_feed","instagram_reels"],"features":["queue","planner","preflight","comments","assets","media_studio","brand_kit","split_platforms","insights","publishing","bulk_export","voice_profiles","ai_video"],"overage_hourly_cents":15000}'),
('enterprise','Enterprise',4, 119900, 95900, 71900, 349900, 262400,
 '{"brands":10,"seats":10,"dispatches":1500,"media_credits":4000,"text_drafts":3000,"x_cap_cents":5000,"storage_gb":100,"absolute_daily_alert_cents":12000,"channels":["facebook","linkedin","x","instagram_feed","instagram_reels","youtube","tiktok"],"features":["queue","planner","preflight","comments","assets","media_studio","brand_kit","split_platforms","insights","publishing","bulk_export","voice_profiles","ai_video","executive_review","byo_email","custom_domain"],"overage_hourly_cents":20000}');

INSERT INTO public.credit_weight_definitions (capability, label, credits, unit_cost_cents, sort_order) VALUES
('image_fast','AI image — Fast',3,3,1),
('image_standard','AI image — Standard',5,5,2),
('image_premium','AI image — Premium',12,12,3),
('video_6s_draft','AI video 6s — Draft',40,40,4),
('video_6s_premium','AI video 6s — Premium',150,150,5),
('video_8s_premium','AI video 8s 1080p — Premium',250,250,6);

-- NuDaze flagship: internal Enterprise comp
INSERT INTO public.workspace_billing (tier_slug, tier_definition_version, billing_cycle, billing_status, billing_mode, price_override_cents, payment_method_status)
VALUES ('enterprise', 1, 'annual', 'internal', 'invoice', 0, 'internal');

-- ===== Helpers =====
CREATE OR REPLACE FUNCTION public.can_control_spend(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.workspace_role(_user_id) IN ('owner','admin')
      OR EXISTS (SELECT 1 FROM public.workspace_billing WHERE resume_delegate_user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.billing_snapshot()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.workspace_billing%ROWTYPE; t public.subscription_tier_definitions%ROWTYPE; cur integer;
BEGIN
  IF NOT public.is_workspace_member(auth.uid()) THEN RAISE EXCEPTION 'Not a workspace member'; END IF;
  SELECT * INTO b FROM public.workspace_billing LIMIT 1;
  SELECT * INTO t FROM public.subscription_tier_definitions WHERE tier_slug = b.tier_slug AND version = b.tier_definition_version;
  SELECT max(version) INTO cur FROM public.subscription_tier_definitions WHERE tier_slug = b.tier_slug AND is_current;
  RETURN jsonb_build_object(
    'billing', to_jsonb(b) - 'stripe_customer_id' - 'stripe_subscription_id',
    'tier', to_jsonb(t),
    'current_version', cur,
    'storage_bytes_actual', (SELECT coalesce(sum((o.metadata->>'size')::bigint),0) FROM storage.objects o WHERE o.bucket_id IN ('source-assets','generated-assets')),
    'role', public.workspace_role(auth.uid()),
    'can_control_spend', public.can_control_spend(auth.uid())
  );
END $$;

-- Atomic pre-check + deduct. Never partially generates on credit.
CREATE OR REPLACE FUNCTION public.consume_usage(_bucket text, _capability text, _quantity integer DEFAULT 1, _client_id uuid DEFAULT NULL, _dry_run boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.workspace_billing%ROWTYPE; a jsonb; need integer := 0; have integer := 0; cost numeric := 0; w integer;
BEGIN
  IF NOT public.can_create_content(auth.uid()) THEN RAISE EXCEPTION 'You do not have permission to create content'; END IF;
  SELECT * INTO b FROM public.workspace_billing LIMIT 1 FOR UPDATE;
  SELECT allowances INTO a FROM public.subscription_tier_definitions WHERE tier_slug = b.tier_slug AND version = b.tier_definition_version;
  IF _bucket = ANY(b.paused_buckets) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'paused', 'bucket', _bucket);
  END IF;
  IF _bucket = 'credits' THEN
    IF b.payment_method_status NOT IN ('valid','internal') THEN RETURN jsonb_build_object('ok',false,'reason','payment_method_required'); END IF;
    SELECT credits, unit_cost_cents INTO w, cost FROM public.credit_weight_definitions WHERE capability = _capability;
    IF w IS NULL THEN RAISE EXCEPTION 'Unknown capability %', _capability; END IF;
    need := w * _quantity; cost := cost * _quantity;
    have := (a->>'media_credits')::int + b.bonus_credits - b.media_credits_used;
  ELSIF _bucket = 'text_drafts' THEN
    need := _quantity; cost := 0.5 * _quantity;
    have := (a->>'text_drafts')::int - b.text_drafts_used;
  ELSIF _bucket = 'x_spend' THEN
    IF (a->>'x_cap_cents')::int = 0 THEN RETURN jsonb_build_object('ok',false,'reason','not_in_tier'); END IF;
    IF b.payment_method_status NOT IN ('valid','internal') THEN RETURN jsonb_build_object('ok',false,'reason','payment_method_required'); END IF;
    need := CASE WHEN _capability = 'x_link_post' THEN 20 ELSE 2 END * _quantity; cost := need;
    have := (a->>'x_cap_cents')::int - b.x_spend_cents;
  ELSE RAISE EXCEPTION 'Unknown bucket %', _bucket; END IF;
  IF need > have THEN
    RETURN jsonb_build_object('ok',false,'reason','insufficient','required',need,'balance',greatest(have,0),'shortfall',need-greatest(have,0));
  END IF;
  IF _dry_run THEN RETURN jsonb_build_object('ok',true,'required',need,'balance',have,'after',have-need); END IF;
  UPDATE public.workspace_billing SET
    media_credits_used = media_credits_used + CASE WHEN _bucket='credits' THEN need ELSE 0 END,
    text_drafts_used = text_drafts_used + CASE WHEN _bucket='text_drafts' THEN need ELSE 0 END,
    x_spend_cents = x_spend_cents + CASE WHEN _bucket='x_spend' THEN need ELSE 0 END,
    updated_at = now();
  INSERT INTO public.usage_events (bucket, capability, quantity, credits, cost_cents, client_id, actor_id)
  VALUES (_bucket, _capability, _quantity, need, cost, _client_id, auth.uid());
  PERFORM public.evaluate_anomalies(_bucket);
  RETURN jsonb_build_object('ok',true,'required',need,'balance',have,'after',have-need);
END $$;

-- Rolling 24h pace (>20% of allowance), spike (>3x 7-day daily avg), absolute daily $ alert
CREATE OR REPLACE FUNCTION public.evaluate_anomalies(_bucket text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.workspace_billing%ROWTYPE; a jsonb; day_units numeric; day_cost numeric; avg7 numeric; allowance numeric;
  kind text := NULL; label text; trips integer; elapsed numeric; projected numeric; month_cost numeric;
BEGIN
  SELECT * INTO b FROM public.workspace_billing LIMIT 1;
  IF _bucket = ANY(b.paused_buckets) THEN RETURN; END IF;
  SELECT allowances INTO a FROM public.subscription_tier_definitions WHERE tier_slug=b.tier_slug AND version=b.tier_definition_version;
  allowance := CASE _bucket WHEN 'credits' THEN (a->>'media_credits')::numeric WHEN 'text_drafts' THEN (a->>'text_drafts')::numeric ELSE (a->>'x_cap_cents')::numeric END;
  SELECT coalesce(sum(credits),0), coalesce(sum(cost_cents),0) INTO day_units, day_cost FROM public.usage_events WHERE bucket=_bucket AND created_at > now() - interval '24 hours';
  SELECT coalesce(sum(credits),0)/7.0 INTO avg7 FROM public.usage_events WHERE bucket=_bucket AND created_at BETWEEN now() - interval '8 days' AND now() - interval '24 hours';
  SELECT coalesce(sum(cost_cents),0) INTO day_cost FROM public.usage_events WHERE created_at > now() - interval '24 hours';
  IF day_cost > (a->>'absolute_daily_alert_cents')::numeric THEN kind := 'absolute'; label := 'Daily spend over $' || ((a->>'absolute_daily_alert_cents')::numeric/100)::text;
  ELSIF allowance > 0 AND day_units > allowance * 0.2 THEN kind := 'pace'; label := 'Over 20% of monthly allowance in 24 hours';
  ELSIF avg7 > 0 AND day_units > avg7 * 3 THEN kind := 'spike'; label := 'More than 3x the 7-day daily average';
  END IF;
  IF kind IS NULL THEN RETURN; END IF;
  trips := coalesce((b.anomaly_counters->>_bucket)::int,0) + 1;
  SELECT coalesce(sum(cost_cents),0) INTO month_cost FROM public.usage_events WHERE bucket=_bucket AND created_at >= b.cycle_start;
  elapsed := greatest(extract(epoch FROM now()-b.cycle_start)/86400.0, 1);
  projected := month_cost / elapsed * greatest(extract(epoch FROM b.cycle_end-b.cycle_start)/86400.0,1);
  INSERT INTO public.guardrail_alerts (bucket, threshold_type, threshold_label, spend_cents, projected_month_end_cents, trip_number, requires_owner)
  VALUES (_bucket, kind, label, month_cost, projected, trips, trips >= 3);
  UPDATE public.workspace_billing SET paused_buckets = array_append(paused_buckets,_bucket),
    anomaly_counters = anomaly_counters || jsonb_build_object(_bucket, trips), updated_at = now();
  INSERT INTO public.activity_log (actor_id, action, target, details) VALUES (auth.uid(),'guardrail_alert',_bucket,
    jsonb_build_object('type',kind,'label',label,'spend_cents',month_cost,'projected_cents',projected,'trip',trips));
END $$;

CREATE OR REPLACE FUNCTION public.resume_guardrail_bucket(_alert_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE al public.guardrail_alerts%ROWTYPE;
BEGIN
  SELECT * INTO al FROM public.guardrail_alerts WHERE id=_alert_id;
  IF NOT FOUND OR al.status <> 'open' THEN RAISE EXCEPTION 'Alert not open'; END IF;
  IF al.requires_owner AND NOT public.has_role(auth.uid(),'owner') THEN RAISE EXCEPTION 'Third trip this cycle: only the owner can resume this bucket'; END IF;
  IF NOT public.can_control_spend(auth.uid()) THEN RAISE EXCEPTION 'Only owners, admins or the named delegate can resume spend'; END IF;
  UPDATE public.guardrail_alerts SET status='resumed', resumed_by=auth.uid(), resumed_at=now() WHERE bucket=al.bucket AND status='open';
  UPDATE public.workspace_billing SET paused_buckets = array_remove(paused_buckets, al.bucket), updated_at=now();
  PERFORM public.log_activity('guardrail_resumed', al.bucket, jsonb_build_object('alert_id',_alert_id,'projected_cents',al.projected_month_end_cents,'trip',al.trip_number));
END $$;

CREATE OR REPLACE FUNCTION public.set_resume_delegate(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  UPDATE public.workspace_billing SET resume_delegate_user_id=_user_id, updated_at=now();
  PERFORM public.log_activity('resume_delegate_set', coalesce(_user_id::text,'none'), '{}'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.set_billing_mode(_mode text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.workspace_billing%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'owner') THEN RAISE EXCEPTION 'Only the owner can change billing mode'; END IF;
  SELECT * INTO b FROM public.workspace_billing LIMIT 1;
  IF _mode = 'invoice' AND NOT (b.tier_slug='enterprise' OR b.nonprofit_status='verified') THEN
    RAISE EXCEPTION 'Invoice billing is available to Enterprise and verified nonprofits';
  END IF;
  UPDATE public.workspace_billing SET billing_mode=_mode, updated_at=now();
  PERFORM public.log_activity('billing_mode_changed', _mode, '{}'::jsonb);
END $$;

-- ===== Demo controls =====
CREATE OR REPLACE FUNCTION public.reset_demo_allowances()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bytes bigint;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Owners and admins only'; END IF;
  IF (SELECT billing_status FROM public.workspace_billing LIMIT 1) <> 'internal' THEN RAISE EXCEPTION 'Demo reset is only available on internal demo instances'; END IF;
  SELECT coalesce(sum((metadata->>'size')::bigint),0) INTO _bytes FROM storage.objects WHERE bucket_id IN ('source-assets','generated-assets');
  UPDATE public.workspace_billing SET media_credits_used=0, text_drafts_used=0, x_spend_cents=0, storage_bytes=_bytes,
    paused_buckets='{}', level2_degraded=false, anomaly_counters='{}'::jsonb, updated_at=now();
  UPDATE public.guardrail_alerts SET status='cleared_by_reset', resumed_by=auth.uid(), resumed_at=now() WHERE status='open';
  DELETE FROM public.usage_events WHERE created_at > now() - interval '8 days';
  PERFORM public.log_activity('demo_allowances_reset', NULL, jsonb_build_object('storage_bytes',_bytes));
END $$;

CREATE OR REPLACE FUNCTION public.demo_content_counts()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Owners and admins only'; END IF;
  RETURN jsonb_build_object(
    'drafts', (SELECT count(*) FROM public.post_cards WHERE scheduled_for IS NULL AND approval_status NOT IN ('posted','exported')),
    'scheduled', (SELECT count(*) FROM public.post_cards WHERE scheduled_for IS NOT NULL AND approval_status NOT IN ('posted','exported')),
    'published', (SELECT count(*) FROM public.post_cards WHERE approval_status IN ('posted','exported')),
    'media_files', (SELECT count(*) FROM public.source_assets WHERE file_path IS NOT NULL));
END $$;

CREATE OR REPLACE FUNCTION public.clear_demo_content(_confirm text, _purge_media boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE counts jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Owners and admins only'; END IF;
  IF (SELECT billing_status FROM public.workspace_billing LIMIT 1) <> 'internal' THEN RAISE EXCEPTION 'Only available on internal demo instances'; END IF;
  IF upper(trim(_confirm)) <> 'CLEAR DEMO CONTENT' THEN RAISE EXCEPTION 'Type CLEAR DEMO CONTENT to confirm'; END IF;
  counts := public.demo_content_counts();
  DELETE FROM public.preflight_reviews WHERE id IS NOT NULL;
  DELETE FROM public.approval_log WHERE id IS NOT NULL;
  DELETE FROM public.post_versions WHERE id IS NOT NULL;
  DELETE FROM public.publish_attempts WHERE id IS NOT NULL;
  UPDATE public.repurpose_suggestions SET result_post_card_id=NULL, source_post_card_id=NULL WHERE id IS NOT NULL;
  UPDATE public.post_cards SET repurposed_from_id=NULL WHERE repurposed_from_id IS NOT NULL;
  DELETE FROM public.post_cards WHERE id IS NOT NULL;
  IF _purge_media THEN
    DELETE FROM public.asset_summaries WHERE id IS NOT NULL;
    DELETE FROM public.repurpose_suggestions WHERE source_asset_id IS NOT NULL;
    DELETE FROM public.source_assets WHERE file_path IS NOT NULL;
  END IF;
  PERFORM public.log_activity('demo_content_cleared', NULL, counts || jsonb_build_object('purge_media',_purge_media));
  RETURN counts;
END $$;

-- ===== Admin pricing edits (versioned, audited) =====
CREATE OR REPLACE FUNCTION public.update_tier_definition(_slug text, _changes jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old public.subscription_tier_definitions%ROWTYPE; nv integer;
BEGIN
  IF NOT public.has_role(auth.uid(),'owner') THEN RAISE EXCEPTION 'Only the owner can edit pricing'; END IF;
  SELECT * INTO old FROM public.subscription_tier_definitions WHERE tier_slug=_slug AND is_current ORDER BY version DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown tier'; END IF;
  nv := old.version + 1;
  UPDATE public.subscription_tier_definitions SET is_current=false WHERE tier_slug=_slug;
  INSERT INTO public.subscription_tier_definitions (tier_slug, version, name, sort_order, monthly_price_cents, annual_price_cents, nonprofit_annual_price_cents, implementation_fee_cents, nonprofit_implementation_fee_cents, allowances, is_current, created_by)
  VALUES (_slug, nv, coalesce(_changes->>'name', old.name), old.sort_order,
    coalesce((_changes->>'monthly_price_cents')::int, old.monthly_price_cents),
    coalesce((_changes->>'annual_price_cents')::int, old.annual_price_cents),
    coalesce((_changes->>'nonprofit_annual_price_cents')::int, old.nonprofit_annual_price_cents),
    coalesce((_changes->>'implementation_fee_cents')::int, old.implementation_fee_cents),
    coalesce((_changes->>'nonprofit_implementation_fee_cents')::int, old.nonprofit_implementation_fee_cents),
    old.allowances || coalesce(_changes->'allowances','{}'::jsonb), true, auth.uid());
  INSERT INTO public.pricing_config_audit (entity, entity_key, before, after, changed_by)
  VALUES ('tier', _slug || ' v' || nv, to_jsonb(old), (SELECT to_jsonb(t) FROM public.subscription_tier_definitions t WHERE tier_slug=_slug AND version=nv), auth.uid());
  RETURN nv;
END $$;

CREATE OR REPLACE FUNCTION public.update_credit_weight(_capability text, _credits integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old public.credit_weight_definitions%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'owner') THEN RAISE EXCEPTION 'Only the owner can edit credit weights'; END IF;
  IF _credits < 0 THEN RAISE EXCEPTION 'Credits must be zero or more'; END IF;
  SELECT * INTO old FROM public.credit_weight_definitions WHERE capability=_capability;
  UPDATE public.credit_weight_definitions SET credits=_credits, updated_by=auth.uid(), updated_at=now() WHERE capability=_capability;
  INSERT INTO public.pricing_config_audit (entity, entity_key, before, after, changed_by)
  VALUES ('credit_weight', _capability, to_jsonb(old), (SELECT to_jsonb(c) FROM public.credit_weight_definitions c WHERE capability=_capability), auth.uid());
END $$;

-- ===== Nonprofit review =====
CREATE OR REPLACE FUNCTION public.review_nonprofit_application(_id uuid, _decision text, _notes text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF _decision NOT IN ('verified','rejected') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  UPDATE public.nonprofit_applications SET status=_decision, reviewer_id=auth.uid(), decided_at=now(), review_notes=_notes,
    reverification_due = CASE WHEN _decision='verified' THEN (now() + interval '1 year')::date ELSE NULL END WHERE id=_id;
  UPDATE public.workspace_billing SET nonprofit_status=_decision, updated_at=now();
  PERFORM public.log_activity('nonprofit_reviewed', _id::text, jsonb_build_object('decision',_decision,'method','manual_irs'));
END $$;

CREATE OR REPLACE FUNCTION public.submit_nonprofit_flag()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_workspace_member(NEW.submitted_by) THEN
    UPDATE public.workspace_billing SET nonprofit_status='pending', updated_at=now() WHERE nonprofit_status <> 'verified';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER nonprofit_application_pending AFTER INSERT ON public.nonprofit_applications FOR EACH ROW EXECUTE FUNCTION public.submit_nonprofit_flag();

-- Storage: private nonprofit letters (bucket created separately)
CREATE POLICY "Upload own nonprofit letter" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='nonprofit-letters' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Read own or admin nonprofit letter" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='nonprofit-letters' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
