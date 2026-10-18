
-- Clip and add-on balances
ALTER TABLE public.workspace_billing
  ADD COLUMN IF NOT EXISTS video_draft_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_premium_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_draft_rollover integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_premium_rollover integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_text_drafts integer NOT NULL DEFAULT 0;

ALTER TABLE public.workspace_settings
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'production';

ALTER TABLE public.post_cards ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

ALTER TABLE public.publish_attempts DROP CONSTRAINT IF EXISTS publish_attempts_status_check;
ALTER TABLE public.publish_attempts ADD CONSTRAINT publish_attempts_status_check
  CHECK (status = ANY (ARRAY['success','failed','retrying','skipped','staged']));
ALTER TABLE public.publish_attempts ADD COLUMN IF NOT EXISTS run_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS publish_attempts_run_post_account_uidx
  ON public.publish_attempts (run_id, post_card_id, coalesce(social_account_id, '00000000-0000-0000-0000-000000000000'::uuid)) WHERE run_id IS NOT NULL;

CREATE TABLE public.addon_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('media_credits','ai_drafts','draft_clips','premium_clips')),
  packs integer NOT NULL CHECK (packs BETWEEN 1 AND 50),
  quantity integer NOT NULL,
  remaining integer NOT NULL,
  price_cents integer NOT NULL,
  expires_at timestamptz,
  request_key text NOT NULL UNIQUE,
  note text,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.addon_grants TO authenticated;
GRANT ALL ON public.addon_grants TO service_role;
ALTER TABLE public.addon_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view add-on grants" ON public.addon_grants FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid()));

CREATE TABLE public.publish_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  posts_processed integer NOT NULL DEFAULT 0,
  channels_staged integer NOT NULL DEFAULT 0,
  channels_skipped integer NOT NULL DEFAULT 0,
  backlog_remaining integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running',
  error_message text
);
GRANT SELECT ON public.publish_runs TO authenticated;
GRANT ALL ON public.publish_runs TO service_role;
ALTER TABLE public.publish_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view publish runs" ON public.publish_runs FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid()));

-- Add-on catalog (single source for prices and sizes)
CREATE OR REPLACE FUNCTION public.addon_catalog()
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT '{
    "media_credits": {"quantity":100,"price_cents":400,"valid_months":null},
    "ai_drafts": {"quantity":100,"price_cents":200,"valid_months":null},
    "draft_clips": {"quantity":10,"price_cents":1900,"valid_months":12},
    "premium_clips": {"quantity":10,"price_cents":3900,"valid_months":12}
  }'::jsonb
$$;

-- Admin-granted add-ons: idempotent on request_key
CREATE OR REPLACE FUNCTION public.grant_addon(_kind text, _packs integer, _request_key text, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c jsonb; q integer; g public.addon_grants%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Only owners and admins can grant add-ons'; END IF;
  c := public.addon_catalog()->_kind;
  IF c IS NULL THEN RAISE EXCEPTION 'Unknown add-on'; END IF;
  IF _packs IS NULL OR _packs < 1 OR _packs > 50 THEN RAISE EXCEPTION 'Packs must be between 1 and 50'; END IF;
  IF coalesce(trim(_request_key),'') = '' THEN RAISE EXCEPTION 'Missing request key'; END IF;
  SELECT * INTO g FROM public.addon_grants WHERE request_key = _request_key;
  IF FOUND THEN RETURN jsonb_build_object('ok',true,'duplicate',true,'id',g.id); END IF;
  q := (c->>'quantity')::int * _packs;
  INSERT INTO public.addon_grants(kind,packs,quantity,remaining,price_cents,expires_at,request_key,note,granted_by)
  VALUES (_kind,_packs,q,q,(c->>'price_cents')::int*_packs,
    CASE WHEN c->>'valid_months' IS NULL THEN NULL ELSE now() + ((c->>'valid_months')||' months')::interval END,
    _request_key, _note, auth.uid())
  ON CONFLICT (request_key) DO NOTHING RETURNING * INTO g;
  IF g.id IS NULL THEN RETURN jsonb_build_object('ok',true,'duplicate',true); END IF;
  IF _kind = 'media_credits' THEN
    UPDATE public.workspace_billing SET bonus_credits = bonus_credits + q, updated_at = now();
  ELSIF _kind = 'ai_drafts' THEN
    UPDATE public.workspace_billing SET bonus_text_drafts = bonus_text_drafts + q, updated_at = now();
  END IF;
  PERFORM public.log_activity('addon_granted', _kind, jsonb_build_object('packs',_packs,'quantity',q,'price_cents',g.price_cents,'note',_note));
  RETURN jsonb_build_object('ok',true,'duplicate',false,'id',g.id,'quantity',q);
END $$;

-- Usage: hard stop at 100%; video uses clip buckets, never media credits
CREATE OR REPLACE FUNCTION public.consume_usage(_bucket text, _capability text, _quantity integer DEFAULT 1, _client_id uuid DEFAULT NULL::uuid, _dry_run boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE b public.workspace_billing%ROWTYPE; a jsonb; need integer := 0; have integer := 0; cost numeric := 0; w integer;
  incl integer := 0; packs integer := 0; take integer; r record;
BEGIN
  IF NOT public.can_create_content(auth.uid()) THEN RAISE EXCEPTION 'You do not have permission to create content'; END IF;
  SELECT * INTO b FROM public.workspace_billing LIMIT 1 FOR UPDATE;
  SELECT allowances INTO a FROM public.subscription_tier_definitions WHERE tier_slug = b.tier_slug AND version = b.tier_definition_version;
  IF _bucket = ANY(b.paused_buckets) THEN RETURN jsonb_build_object('ok', false, 'reason', 'paused', 'bucket', _bucket); END IF;
  IF _bucket = 'credits' THEN
    IF _capability LIKE 'video%' THEN RETURN jsonb_build_object('ok',false,'reason','video_uses_clips'); END IF;
    IF b.payment_method_status NOT IN ('valid','internal') THEN RETURN jsonb_build_object('ok',false,'reason','payment_method_required'); END IF;
    SELECT credits, unit_cost_cents INTO w, cost FROM public.credit_weight_definitions WHERE capability = _capability;
    IF w IS NULL THEN RAISE EXCEPTION 'Unknown capability %', _capability; END IF;
    need := w * _quantity; cost := cost * _quantity;
    have := (a->>'media_credits')::int + b.bonus_credits - b.media_credits_used;
  ELSIF _bucket = 'text_drafts' THEN
    need := _quantity; cost := 0.5 * _quantity;
    have := (a->>'text_drafts')::int + b.bonus_text_drafts - b.text_drafts_used;
  ELSIF _bucket IN ('video_draft','video_premium') THEN
    need := _quantity;
    cost := CASE WHEN _bucket='video_draft' THEN 40 ELSE 250 END * _quantity;
    IF _bucket = 'video_draft' THEN
      incl := coalesce((a->>'video_draft_clips')::int,0) + b.video_draft_rollover - b.video_draft_used;
    ELSE
      incl := coalesce((a->>'video_premium_clips')::int,0) + b.video_premium_rollover - b.video_premium_used;
    END IF;
    incl := greatest(incl,0);
    SELECT coalesce(sum(remaining),0) INTO packs FROM public.addon_grants
      WHERE kind = CASE WHEN _bucket='video_draft' THEN 'draft_clips' ELSE 'premium_clips' END
        AND remaining > 0 AND (expires_at IS NULL OR expires_at > now());
    IF incl = 0 AND packs = 0 AND NOT (a->'features') ? 'ai_video' THEN
      RETURN jsonb_build_object('ok',false,'reason','not_in_tier','bucket',_bucket);
    END IF;
    have := incl + packs;
  ELSIF _bucket = 'x_spend' THEN
    IF (a->>'x_cap_cents')::int = 0 THEN RETURN jsonb_build_object('ok',false,'reason','not_in_tier'); END IF;
    IF b.payment_method_status NOT IN ('valid','internal') THEN RETURN jsonb_build_object('ok',false,'reason','payment_method_required'); END IF;
    need := CASE WHEN _capability = 'x_link_post' THEN 20 ELSE 2 END * _quantity; cost := need;
    have := (a->>'x_cap_cents')::int - b.x_spend_cents;
  ELSE RAISE EXCEPTION 'Unknown bucket %', _bucket; END IF;
  IF need > have THEN
    RETURN jsonb_build_object('ok',false,'reason','insufficient','bucket',_bucket,'required',need,'balance',greatest(have,0),'shortfall',need-greatest(have,0));
  END IF;
  IF _dry_run THEN RETURN jsonb_build_object('ok',true,'required',need,'balance',have,'after',have-need); END IF;
  IF _bucket IN ('video_draft','video_premium') THEN
    take := least(need, incl);
    UPDATE public.workspace_billing SET
      video_draft_used = video_draft_used + CASE WHEN _bucket='video_draft' THEN take ELSE 0 END,
      video_premium_used = video_premium_used + CASE WHEN _bucket='video_premium' THEN take ELSE 0 END,
      updated_at = now();
    take := need - take;
    FOR r IN SELECT id, remaining FROM public.addon_grants
      WHERE kind = CASE WHEN _bucket='video_draft' THEN 'draft_clips' ELSE 'premium_clips' END
        AND remaining > 0 AND (expires_at IS NULL OR expires_at > now())
      ORDER BY expires_at NULLS LAST, created_at FOR UPDATE LOOP
      EXIT WHEN take <= 0;
      UPDATE public.addon_grants SET remaining = remaining - least(take, r.remaining) WHERE id = r.id;
      take := take - least(take, r.remaining);
    END LOOP;
  ELSE
    UPDATE public.workspace_billing SET
      media_credits_used = media_credits_used + CASE WHEN _bucket='credits' THEN need ELSE 0 END,
      text_drafts_used = text_drafts_used + CASE WHEN _bucket='text_drafts' THEN need ELSE 0 END,
      x_spend_cents = x_spend_cents + CASE WHEN _bucket='x_spend' THEN need ELSE 0 END,
      updated_at = now();
  END IF;
  INSERT INTO public.usage_events (bucket, capability, quantity, credits, cost_cents, client_id, actor_id)
  VALUES (_bucket, _capability, _quantity, need, cost, _client_id, auth.uid());
  PERFORM public.evaluate_anomalies(_bucket);
  RETURN jsonb_build_object('ok',true,'required',need,'balance',have,'after',have-need);
END $function$;

-- Alerts: notification only, never pause. 60% of monthly = progress; 80% within 24h = velocity.
CREATE OR REPLACE FUNCTION public.evaluate_anomalies(_bucket text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE b public.workspace_billing%ROWTYPE; a jsonb; allowance numeric; cycle_units numeric; day_units numeric;
BEGIN
  SELECT * INTO b FROM public.workspace_billing LIMIT 1;
  SELECT allowances INTO a FROM public.subscription_tier_definitions WHERE tier_slug=b.tier_slug AND version=b.tier_definition_version;
  allowance := CASE _bucket WHEN 'credits' THEN (a->>'media_credits')::numeric
    WHEN 'text_drafts' THEN (a->>'text_drafts')::numeric
    WHEN 'x_spend' THEN (a->>'x_cap_cents')::numeric
    WHEN 'video_draft' THEN coalesce((a->>'video_draft_clips')::numeric,0)
    WHEN 'video_premium' THEN coalesce((a->>'video_premium_clips')::numeric,0) ELSE 0 END;
  IF allowance IS NULL OR allowance <= 0 THEN RETURN; END IF;
  SELECT coalesce(sum(credits),0) INTO cycle_units FROM public.usage_events WHERE bucket=_bucket AND credits > 0 AND created_at >= b.cycle_start;
  SELECT coalesce(sum(credits),0) INTO day_units FROM public.usage_events WHERE bucket=_bucket AND credits > 0 AND created_at > now() - interval '24 hours';
  IF cycle_units >= allowance * 0.6 AND NOT EXISTS (SELECT 1 FROM public.guardrail_alerts WHERE bucket=_bucket AND threshold_type='progress' AND created_at >= b.cycle_start) THEN
    INSERT INTO public.guardrail_alerts (bucket, threshold_type, threshold_label, spend_cents, projected_month_end_cents, trip_number, requires_owner, status)
    VALUES (_bucket,'progress','60% of monthly allowance used', cycle_units, NULL, 1, false, 'notice');
  END IF;
  IF day_units >= allowance * 0.8 AND NOT EXISTS (SELECT 1 FROM public.guardrail_alerts WHERE bucket=_bucket AND threshold_type='velocity' AND created_at > now() - interval '24 hours') THEN
    INSERT INTO public.guardrail_alerts (bucket, threshold_type, threshold_label, spend_cents, projected_month_end_cents, trip_number, requires_owner, status)
    VALUES (_bucket,'velocity','80% of monthly allowance used within 24 hours', day_units, NULL, 1, false, 'notice');
  END IF;
END $function$;

-- Staged scheduled delivery: no platform calls
CREATE OR REPLACE FUNCTION public.process_scheduled_posts(_cap integer DEFAULT 25)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE run_id uuid; p record; acc record; n_posts int := 0; n_staged int := 0; n_skipped int := 0; backlog int; any_acc boolean;
BEGIN
  IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Scheduled delivery runs automatically'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.post_cards WHERE publishing_status='scheduled' AND scheduled_for <= now()) THEN
    RETURN jsonb_build_object('processed',0);
  END IF;
  INSERT INTO public.publish_runs DEFAULT VALUES RETURNING id INTO run_id;
  FOR p IN SELECT id, client_id, platform, target_account_ids FROM public.post_cards
    WHERE publishing_status='scheduled' AND scheduled_for <= now()
    ORDER BY scheduled_for LIMIT least(greatest(_cap,1),25) FOR UPDATE SKIP LOCKED LOOP
    any_acc := false;
    FOR acc IN SELECT id, platform::text AS platform, connection_status FROM public.social_accounts s
      WHERE (coalesce(array_length(p.target_account_ids,1),0) > 0 AND s.id = ANY(p.target_account_ids))
         OR (coalesce(array_length(p.target_account_ids,1),0) = 0 AND s.client_id IS NOT DISTINCT FROM p.client_id AND s.platform = p.platform AND s.is_active) LOOP
      any_acc := true;
      INSERT INTO public.publish_attempts(post_card_id, client_id, social_account_id, platform, status, error_code, error_message, attempt_number, run_id)
      VALUES (p.id, p.client_id, acc.id, acc.platform,
        CASE WHEN acc.connection_status='connected' THEN 'staged' ELSE 'skipped' END,
        CASE WHEN acc.connection_status='connected' THEN NULL ELSE 'not_connected' END,
        CASE WHEN acc.connection_status='connected' THEN 'Staged: live sending activates when this instance connects approved platform apps.' ELSE 'Skipped: channel not connected.' END,
        1, run_id) ON CONFLICT DO NOTHING;
      IF acc.connection_status='connected' THEN n_staged := n_staged + 1; ELSE n_skipped := n_skipped + 1; END IF;
    END LOOP;
    IF NOT any_acc THEN
      INSERT INTO public.publish_attempts(post_card_id, client_id, platform, status, error_code, error_message, attempt_number, run_id)
      VALUES (p.id, p.client_id, p.platform::text, 'skipped', 'not_connected', 'Skipped: no account on this channel.', 1, run_id) ON CONFLICT DO NOTHING;
      n_skipped := n_skipped + 1;
    END IF;
    UPDATE public.post_cards SET publishing_status='published', delivered_at=now() WHERE id=p.id;
    n_posts := n_posts + 1;
  END LOOP;
  SELECT count(*) INTO backlog FROM public.post_cards WHERE publishing_status='scheduled' AND scheduled_for <= now();
  UPDATE public.publish_runs SET finished_at=now(), posts_processed=n_posts, channels_staged=n_staged, channels_skipped=n_skipped, backlog_remaining=backlog, status='completed' WHERE id=run_id;
  RETURN jsonb_build_object('processed',n_posts,'staged',n_staged,'skipped',n_skipped,'backlog',backlog);
EXCEPTION WHEN OTHERS THEN
  IF run_id IS NOT NULL THEN
    UPDATE public.publish_runs SET finished_at=now(), status='failed', error_message=SQLERRM WHERE id=run_id;
  END IF;
  RAISE;
END $function$;
REVOKE ALL ON FUNCTION public.process_scheduled_posts(integer) FROM PUBLIC, anon, authenticated;

-- Monthly clip rollover (one month only), called at cycle renewal
CREATE OR REPLACE FUNCTION public.roll_clip_allowances()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE b public.workspace_billing%ROWTYPE; a jsonb; d int; pr int;
BEGIN
  SELECT * INTO b FROM public.workspace_billing LIMIT 1 FOR UPDATE;
  SELECT allowances INTO a FROM public.subscription_tier_definitions WHERE tier_slug=b.tier_slug AND version=b.tier_definition_version;
  d := coalesce((a->>'video_draft_clips')::int,0); pr := coalesce((a->>'video_premium_clips')::int,0);
  -- Unused this month's grant carries one month; older rollover expires.
  UPDATE public.workspace_billing SET
    video_draft_rollover = least(d, greatest(d + video_draft_rollover - video_draft_used, 0)),
    video_premium_rollover = least(pr, greatest(pr + video_premium_rollover - video_premium_used, 0)),
    video_draft_used = 0, video_premium_used = 0, updated_at = now();
END $function$;
REVOKE ALL ON FUNCTION public.roll_clip_allowances() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.billing_snapshot()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
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
    'clip_packs', jsonb_build_object(
      'draft', (SELECT coalesce(sum(remaining),0) FROM public.addon_grants WHERE kind='draft_clips' AND remaining>0 AND (expires_at IS NULL OR expires_at>now())),
      'premium', (SELECT coalesce(sum(remaining),0) FROM public.addon_grants WHERE kind='premium_clips' AND remaining>0 AND (expires_at IS NULL OR expires_at>now()))),
    'role', public.workspace_role(auth.uid()),
    'can_control_spend', public.can_control_spend(auth.uid())
  );
END $function$;
