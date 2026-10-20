ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS workspace_id uuid NOT NULL DEFAULT gen_random_uuid(), ADD COLUMN IF NOT EXISTS governance_revision integer NOT NULL DEFAULT 1;
ALTER TABLE public.post_cards ADD COLUMN IF NOT EXISTS readiness_revision integer NOT NULL DEFAULT 1, ADD COLUMN IF NOT EXISTS readiness_changed_at timestamptz NOT NULL DEFAULT '-infinity', ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'idle', ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS confirmation_source text, ADD COLUMN IF NOT EXISTS confirmed_by uuid, ADD COLUMN IF NOT EXISTS confirmed_at timestamptz, ADD COLUMN IF NOT EXISTS scheduled_by uuid;
ALTER TABLE public.preflight_reviews ADD COLUMN IF NOT EXISTS readiness_revision integer, ADD COLUMN IF NOT EXISTS governance_revision integer, ADD COLUMN IF NOT EXISTS acknowledged_findings jsonb;
ALTER TABLE public.external_posts ADD COLUMN IF NOT EXISTS confirmation_source text, ADD COLUMN IF NOT EXISTS confirmed_by uuid, ADD COLUMN IF NOT EXISTS confirmed_at timestamptz, ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS confirmation_source text, ADD COLUMN IF NOT EXISTS confirmed_by uuid, ADD COLUMN IF NOT EXISTS confirmed_at timestamptz, ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
CREATE TABLE public.delivery_operations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL, client_id uuid NOT NULL REFERENCES public.clients(id), post_card_id uuid NOT NULL REFERENCES public.post_cards(id), revision integer NOT NULL, social_account_id uuid NOT NULL REFERENCES public.social_accounts(id), platform text NOT NULL, intent text NOT NULL, intended_at timestamptz, status text NOT NULL DEFAULT 'scheduled', reason text, platform_post_id text, created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(workspace_id,post_card_id,revision,social_account_id,intent));
GRANT SELECT ON public.delivery_operations TO authenticated; GRANT ALL ON public.delivery_operations TO service_role;
ALTER TABLE public.delivery_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY delivery_operations_read ON public.delivery_operations FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid()) AND public.user_can_access_client(auth.uid(),client_id));
CREATE TABLE public.delivery_attempts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), operation_id uuid NOT NULL REFERENCES public.delivery_operations(id), attempt_number integer NOT NULL, status text NOT NULL, reason text, attempted_at timestamptz NOT NULL DEFAULT now(), UNIQUE(operation_id,attempt_number));
GRANT SELECT ON public.delivery_attempts TO authenticated; GRANT ALL ON public.delivery_attempts TO service_role;
ALTER TABLE public.delivery_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY delivery_attempts_read ON public.delivery_attempts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.delivery_operations o WHERE o.id=operation_id));
CREATE TABLE public.delivery_capabilities (platform text PRIMARY KEY, live_enabled boolean NOT NULL DEFAULT false, verified_at timestamptz, dispatch_ready boolean NOT NULL DEFAULT false);
GRANT SELECT ON public.delivery_capabilities TO authenticated; GRANT ALL ON public.delivery_capabilities TO service_role;
ALTER TABLE public.delivery_capabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY delivery_capability_read ON public.delivery_capabilities FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid()));
CREATE OR REPLACE FUNCTION public.current_draft_checksum(_copy text,_tags text[]) RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE s text:=coalesce(_copy,'')||chr(1)||coalesce(array_to_string(_tags,','),''); h bigint:=2166136261; v integer; i integer;
BEGIN
FOR i IN 1..length(s) LOOP v:=CASE WHEN i=length(coalesce(_copy,''))+1 THEN 0 ELSE ascii(substr(s,i,1)) END;
IF v>65535 THEN h:=((h # (55296+((v-65536)>>10))) * 16777619) & 4294967295; v:=56320+((v-65536)&1023); END IF;
h:=((h # v)*16777619)&4294967295; END LOOP; RETURN lpad(to_hex(h),8,'0'); END $$;
CREATE OR REPLACE FUNCTION public.delivery_readiness_internal(_post uuid,_actor uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.post_cards; w public.workspace_settings; r public.preflight_reviews; n integer; a integer; label text; allowed boolean:=false; tone text:='pending'; fresh boolean; ack boolean;
BEGIN
SELECT * INTO p FROM public.post_cards WHERE id=_post;
IF p.id IS NULL OR NOT public.is_workspace_member(_actor) OR NOT public.user_can_access_client(_actor,p.client_id) THEN RAISE EXCEPTION 'Post not available to this account'; END IF;
SELECT * INTO w FROM public.workspace_settings WHERE id=true;
SELECT * INTO r FROM public.preflight_reviews WHERE post_card_id=p.id ORDER BY created_at DESC LIMIT 1;
SELECT count(*) FILTER(WHERE f->>'severity'='blocking'),count(*) FILTER(WHERE f->>'severity'='advisory') INTO n,a FROM jsonb_array_elements(coalesce(r.findings,'[]')) f;
fresh:=r.id IS NOT NULL AND r.draft_checksum=public.current_draft_checksum(p.draft_copy,p.hashtags) AND r.created_at>=p.readiness_changed_at AND coalesce(r.governance_revision,w.governance_revision)=w.governance_revision;
ack:=fresh AND r.acknowledged_at IS NOT NULL AND r.readiness_revision=p.readiness_revision AND r.governance_revision=w.governance_revision AND r.acknowledged_findings=r.findings AND public.can_edit_content(r.acknowledged_by) AND public.user_can_access_client(r.acknowledged_by,p.client_id);
IF p.approval_status='archived' THEN label:='Archived'; tone:='editorial';
ELSIF w.post_approval_required AND p.approval_status NOT IN ('approved','exported','posted') THEN label:=initcap(replace(p.approval_status::text,'_',' ')); tone:='editorial';
ELSIF w.preflight_mode='off' THEN label:='Ready to publish'; tone:='ready'; allowed:=true;
ELSIF NOT fresh THEN label:='Checks pending'; allowed:=w.preflight_mode='advisory';
ELSIF n>0 THEN label:='Approved · '||n||' required check'||CASE WHEN n=1 THEN ' remains' ELSE 's remain' END; tone:='blocked';
ELSIF r.ai_error IS NOT NULL THEN label:='Checks unavailable'; allowed:=w.preflight_mode='advisory';
ELSIF ack THEN label:='Ready to publish · Warnings acknowledged'; tone:='advisory'; allowed:=true;
ELSIF a>0 THEN label:='Approved · Advisory notes available'; tone:='advisory'; allowed:=w.preflight_mode='advisory';
ELSE label:='Ready to publish'; tone:='ready'; allowed:=true; END IF;
RETURN jsonb_build_object('label',label,'tone',tone,'canDeliver',allowed,'required',coalesce(n,0),'advisory',coalesce(a,0)); END $$;
REVOKE ALL ON FUNCTION public.delivery_readiness_internal(uuid,uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.post_readiness(_post uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.delivery_readiness_internal(_post,auth.uid()) $$;
REVOKE ALL ON FUNCTION public.post_readiness(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.post_readiness(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.acknowledge_preflight(_review uuid,_reason text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.preflight_reviews; p public.post_cards; w public.workspace_settings;
BEGIN
SELECT * INTO r FROM public.preflight_reviews WHERE id=_review FOR UPDATE; SELECT * INTO p FROM public.post_cards WHERE id=r.post_card_id FOR UPDATE; SELECT * INTO w FROM public.workspace_settings WHERE id=true;
IF NOT public.can_edit_content(auth.uid()) OR NOT public.user_can_access_client(auth.uid(),p.client_id) THEN RAISE EXCEPTION 'Your role cannot acknowledge checks'; END IF;
IF r.draft_checksum<>public.current_draft_checksum(p.draft_copy,p.hashtags) OR r.created_at<p.readiness_changed_at OR coalesce(r.governance_revision,w.governance_revision)<>w.governance_revision THEN RAISE EXCEPTION 'Post or governance changed. Run checks again'; END IF;
IF EXISTS(SELECT 1 FROM jsonb_array_elements(r.findings) f WHERE f->>'severity'='blocking') THEN RAISE EXCEPTION 'Required checks cannot be acknowledged or overridden'; END IF;
IF w.preflight_mode='off' THEN RAISE EXCEPTION 'Checks are disabled'; END IF;
PERFORM set_config('app.delivery_authorized','true',true);
UPDATE public.preflight_reviews SET acknowledged_by=auth.uid(),acknowledged_at=now(),acknowledged_findings=findings,readiness_revision=p.readiness_revision,governance_revision=w.governance_revision WHERE id=_review;
INSERT INTO public.approval_log(post_card_id,actor_id,action,notes) VALUES(p.id,auth.uid(),p.approval_status,'Preflight advisory findings acknowledged for revision '||p.readiness_revision);
END $$;
REVOKE ALL ON FUNCTION public.acknowledge_preflight(uuid,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.acknowledge_preflight(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.guard_preflight_integrity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF TG_OP='INSERT' THEN
IF auth.role()='authenticated' THEN RAISE EXCEPTION 'Reviews must be generated by the review service'; END IF;
SELECT readiness_revision INTO NEW.readiness_revision FROM public.post_cards WHERE id=NEW.post_card_id;
SELECT governance_revision INTO NEW.governance_revision FROM public.workspace_settings WHERE id=true;
ELSIF auth.uid() IS NOT NULL AND current_setting('app.delivery_authorized',true) IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Use the validated acknowledgment action'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER preflight_integrity BEFORE INSERT OR UPDATE ON public.preflight_reviews FOR EACH ROW EXECUTE FUNCTION public.guard_preflight_integrity();
CREATE OR REPLACE FUNCTION public.guard_post_delivery() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
IF ROW(NEW.draft_copy,NEW.hashtags,NEW.source_references,NEW.platform,NEW.content_type,NEW.target_account_ids,NEW.apply_ai_disclosure,NEW.first_comment) IS DISTINCT FROM ROW(OLD.draft_copy,OLD.hashtags,OLD.source_references,OLD.platform,OLD.content_type,OLD.target_account_ids,OLD.apply_ai_disclosure,OLD.first_comment) THEN NEW.readiness_revision:=OLD.readiness_revision+1; NEW.readiness_changed_at:=now(); END IF;
IF auth.uid() IS NOT NULL AND current_setting('app.delivery_authorized',true) IS DISTINCT FROM 'true' AND (NEW.delivery_status IS DISTINCT FROM OLD.delivery_status OR NEW.publishing_status IS DISTINCT FROM OLD.publishing_status OR NEW.confirmed_at IS DISTINCT FROM OLD.confirmed_at OR (NEW.approval_status='posted' AND OLD.approval_status<>'posted') OR (OLD.delivery_status='scheduled' AND NEW.scheduled_for IS DISTINCT FROM OLD.scheduled_for)) THEN RAISE EXCEPTION 'Use the Posting Package publishing or confirmation action'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER guard_post_delivery BEFORE UPDATE ON public.post_cards FOR EACH ROW EXECUTE FUNCTION public.guard_post_delivery();
CREATE OR REPLACE FUNCTION public.governance_invalidates_readiness() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF ROW(NEW.preflight_mode,NEW.post_approval_required) IS DISTINCT FROM ROW(OLD.preflight_mode,OLD.post_approval_required) THEN NEW.governance_revision:=OLD.governance_revision+1; UPDATE public.post_cards SET readiness_changed_at=now() WHERE id IS NOT NULL; END IF; RETURN NEW; END $$;
CREATE TRIGGER governance_invalidates_readiness BEFORE UPDATE ON public.workspace_settings FOR EACH ROW EXECUTE FUNCTION public.governance_invalidates_readiness();
CREATE OR REPLACE FUNCTION public.submit_delivery(_post uuid,_accounts uuid[],_when timestamptz DEFAULT NULL,_timezone text DEFAULT 'UTC',_disclosure boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.post_cards; w public.workspace_settings; a public.social_accounts; o public.delivery_operations; cap public.delivery_capabilities; g jsonb; ids uuid[]; result text; intended text; fullcopy text; limit_chars integer;
BEGIN
SELECT * INTO p FROM public.post_cards WHERE id=_post FOR UPDATE;
IF NOT public.can_edit_content(auth.uid()) OR NOT public.is_workspace_member(auth.uid()) OR NOT public.user_can_access_client(auth.uid(),p.client_id) THEN RAISE EXCEPTION 'Your role cannot publish or schedule this post'; END IF;
IF p.id IS NULL OR p.is_sample OR p.client_id IS NULL OR p.approval_status IN ('posted','archived') OR p.delivery_status IN ('platform_confirmed','manual_confirmed') THEN RAISE EXCEPTION 'This post is not eligible for delivery'; END IF;
IF _when IS NOT NULL AND _when<=now()+interval '1 minute' THEN RAISE EXCEPTION 'Pick a future date and time'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=_timezone) THEN RAISE EXCEPTION 'Choose a valid time zone'; END IF;
SELECT array_agg(DISTINCT x ORDER BY x) INTO ids FROM unnest(_accounts) x;
IF coalesce(cardinality(ids),0)=0 THEN RAISE EXCEPTION 'Choose at least one channel'; END IF;
IF EXISTS(SELECT 1 FROM unnest(ids) x LEFT JOIN public.social_accounts s ON s.id=x WHERE s.id IS NULL OR s.client_id IS DISTINCT FROM p.client_id OR NOT s.is_active) THEN RAISE EXCEPTION 'Selected channels must belong to this client'; END IF;
-- Changing reviewable channels or disclosure requires a new review before strict delivery.
PERFORM set_config('app.delivery_authorized','true',true);
IF p.target_account_ids IS DISTINCT FROM ids OR p.apply_ai_disclosure IS DISTINCT FROM _disclosure THEN UPDATE public.post_cards SET target_account_ids=ids,apply_ai_disclosure=_disclosure,ai_assisted=_disclosure WHERE id=p.id RETURNING * INTO p; END IF;
g:=public.delivery_readiness_internal(p.id,auth.uid()); IF NOT (g->>'canDeliver')::boolean THEN RAISE EXCEPTION '%',g->>'label'; END IF;
IF EXISTS(SELECT 1 FROM public.source_assets s WHERE s.id=ANY(p.source_references) AND (s.client_id IS DISTINCT FROM p.client_id OR s.permission_state<>'generation_allowed' OR s.deleted_at IS NOT NULL OR s.expires_at<=coalesce(_when,now()))) THEN RAISE EXCEPTION 'Source media is blocked, expired or belongs to another client'; END IF;
SELECT * INTO w FROM public.workspace_settings WHERE id=true; intended:=CASE WHEN _when IS NULL THEN 'immediate' ELSE 'scheduled' END;
fullcopy:=p.draft_copy||CASE WHEN _disclosure THEN E'\n\n#AIassisted' ELSE '' END||E'\n\n'||coalesce((SELECT string_agg('#'||tag,' ') FROM (SELECT DISTINCT regexp_replace(trim(t),'^#+','') tag FROM unnest(p.hashtags) t WHERE trim(t)<>'' ) ht),'');
FOREACH _post IN ARRAY ids LOOP
SELECT * INTO a FROM public.social_accounts WHERE id=_post;
limit_chars:=CASE a.platform::text WHEN 'x' THEN 280 WHEN 'instagram' THEN 2200 WHEN 'linkedin' THEN 3000 WHEN 'youtube' THEN 5000 ELSE 63206 END;
IF length(fullcopy)>limit_chars THEN RAISE EXCEPTION 'Final copy including hashtags and disclosure exceeds % character limit',a.platform; END IF;
SELECT * INTO cap FROM public.delivery_capabilities WHERE platform=a.platform::text;
IF cap.live_enabled AND cap.verified_at IS NOT NULL AND cap.dispatch_ready THEN RAISE EXCEPTION 'Live provider dispatch is not installed for %. Nothing was sent',a.platform; END IF;
INSERT INTO public.delivery_operations(workspace_id,client_id,post_card_id,revision,social_account_id,platform,intent,intended_at,status,reason,created_by)
VALUES(w.workspace_id,p.client_id,p.id,p.readiness_revision,a.id,a.platform::text,intended,_when,CASE WHEN _when IS NOT NULL THEN 'scheduled' WHEN a.connection_status<>'connected' THEN 'skipped' ELSE 'staged' END,CASE WHEN a.connection_status<>'connected' THEN 'Account not connected' ELSE 'Live sending unavailable; not sent' END,auth.uid()) ON CONFLICT(workspace_id,post_card_id,revision,social_account_id,intent) DO NOTHING RETURNING * INTO o;
IF o.id IS NULL THEN
SELECT * INTO o FROM public.delivery_operations WHERE workspace_id=w.workspace_id AND post_card_id=p.id AND revision=p.readiness_revision AND social_account_id=a.id AND intent=intended FOR UPDATE;
IF o.status='awaiting_confirmation' THEN RAISE EXCEPTION 'Delivery outcome is unknown. Reconcile with the platform before retrying'; END IF;
IF o.status='scheduled' AND _when IS NOT NULL THEN UPDATE public.delivery_operations SET intended_at=_when,updated_at=now() WHERE id=o.id; END IF;
IF o.status='failed' AND _when IS NULL THEN UPDATE public.delivery_operations SET status='staged',reason='Retry staged; not sent',updated_at=now() WHERE id=o.id; INSERT INTO public.delivery_attempts(operation_id,attempt_number,status,reason) SELECT o.id,coalesce(max(attempt_number),0)+1,'staged','Retry staged; not sent' FROM public.delivery_attempts WHERE operation_id=o.id; END IF;
ELSE INSERT INTO public.delivery_attempts(operation_id,attempt_number,status,reason) VALUES(o.id,1,o.status,o.reason); END IF;
END LOOP;
SELECT CASE WHEN bool_and(status='scheduled') THEN 'scheduled' WHEN bool_and(status='platform_confirmed') THEN 'platform_confirmed' WHEN bool_and(status='staged') THEN 'staged' WHEN bool_and(status IN ('failed','skipped')) THEN 'failed' ELSE 'partial' END INTO result FROM public.delivery_operations WHERE post_card_id=p.id AND revision=p.readiness_revision AND social_account_id=ANY(ids) AND intent=intended;
UPDATE public.post_cards SET delivery_status=result,publishing_status=CASE WHEN result='scheduled' THEN 'scheduled' WHEN result='failed' THEN 'failed' ELSE 'idle' END,scheduled_for=_when,timezone=_timezone,scheduled_by=auth.uid() WHERE id=p.id;
RETURN jsonb_build_object('status',result,'operations',(SELECT jsonb_agg(to_jsonb(d)) FROM public.delivery_operations d WHERE post_card_id=p.id AND revision=p.readiness_revision AND social_account_id=ANY(ids) AND intent=intended)); END $$;
REVOKE ALL ON FUNCTION public.submit_delivery(uuid,uuid[],timestamptz,text,boolean) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.submit_delivery(uuid,uuid[],timestamptz,text,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.mark_posted_manual(_post uuid,_url text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE p public.post_cards; BEGIN
SELECT * INTO p FROM public.post_cards WHERE id=_post FOR UPDATE;
IF NOT public.can_edit_content(auth.uid()) OR NOT public.is_workspace_member(auth.uid()) OR NOT public.user_can_access_client(auth.uid(),p.client_id) THEN RAISE EXCEPTION 'Your role cannot confirm this post'; END IF;
IF p.confirmed_at IS NOT NULL THEN RETURN jsonb_build_object('duplicate',true); END IF;
IF p.is_sample OR p.approval_status NOT IN ('approved','exported') THEN RAISE EXCEPTION 'Only approved or exported real posts can be confirmed'; END IF;
IF _url IS NOT NULL AND _url<>'' AND _url !~ '^https?://[^[:space:]]+\.[^[:space:]]+' THEN RAISE EXCEPTION 'Paste a valid full post URL'; END IF;
PERFORM set_config('app.delivery_authorized','true',true);
UPDATE public.post_cards SET approval_status='posted',delivery_status='manual_confirmed',confirmation_source='manual',confirmed_by=auth.uid(),confirmed_at=now(),posted_url=nullif(_url,''),posted_at=now() WHERE id=p.id;
INSERT INTO public.approval_log(post_card_id,actor_id,action,notes) VALUES(p.id,auth.uid(),'posted','Manually confirmed; platform delivery not verified'); RETURN jsonb_build_object('duplicate',false); END $$;
REVOKE ALL ON FUNCTION public.mark_posted_manual(uuid,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.mark_posted_manual(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.mark_commented(_external_post uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE p public.external_posts; c public.comments; w public.workspace_settings; BEGIN
SELECT * INTO p FROM public.external_posts WHERE id=_external_post FOR UPDATE;
IF NOT public.can_edit_content(auth.uid()) OR NOT public.is_workspace_member(auth.uid()) OR NOT public.user_can_access_client(auth.uid(),p.client_id) THEN RAISE EXCEPTION 'Your role cannot confirm this comment'; END IF;
IF p.confirmed_at IS NOT NULL THEN RETURN jsonb_build_object('duplicate',true); END IF;
SELECT * INTO c FROM public.comments WHERE external_post_id=p.id AND NOT is_sample ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
SELECT * INTO w FROM public.workspace_settings WHERE id=true;
IF p.id IS NULL OR p.is_sample OR p.risk_flag='blocked' OR c.id IS NULL OR c.approval_status IN ('archived','needs_revision','in_review') OR (w.post_approval_required AND c.approval_status NOT IN ('approved','exported')) THEN RAISE EXCEPTION 'Review and save an eligible comment before confirming it'; END IF;
PERFORM set_config('app.delivery_authorized','true',true);
UPDATE public.external_posts SET is_commented=true,confirmation_source='manual',confirmed_by=auth.uid(),confirmed_at=now() WHERE id=p.id;
UPDATE public.comments SET approval_status='posted',confirmation_source='manual',confirmed_by=auth.uid(),confirmed_at=now() WHERE id=c.id;
RETURN jsonb_build_object('duplicate',false); END $$;
REVOKE ALL ON FUNCTION public.mark_commented(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.mark_commented(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.comment_counts(_client uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ DECLARE tz text; BEGIN
IF NOT public.is_workspace_member(auth.uid()) OR NOT public.user_can_access_client(auth.uid(),_client) THEN RAISE EXCEPTION 'Client not available'; END IF;
SELECT default_timezone INTO tz FROM public.workspace_settings WHERE id=true;
RETURN coalesce((SELECT jsonb_object_agg(platform,n) FROM (SELECT platform,count(DISTINCT id) n FROM public.external_posts WHERE client_id=_client AND is_commented AND NOT is_sample AND confirmation_source IN ('manual','platform') AND confirmed_at IS NOT NULL AND (confirmed_at AT TIME ZONE tz)::date=(now() AT TIME ZONE tz)::date GROUP BY platform) counts),'{}'); END $$;
REVOKE ALL ON FUNCTION public.comment_counts(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.comment_counts(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.guard_comment_confirmation() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF auth.uid() IS NOT NULL AND current_setting('app.delivery_authorized',true) IS DISTINCT FROM 'true' AND (NEW.confirmed_at IS DISTINCT FROM OLD.confirmed_at OR NEW.confirmation_source IS DISTINCT FROM OLD.confirmation_source OR (TG_TABLE_NAME='external_posts' AND to_jsonb(NEW)->>'is_commented' IS DISTINCT FROM to_jsonb(OLD)->>'is_commented') OR (TG_TABLE_NAME='comments' AND to_jsonb(NEW)->>'approval_status'='posted' AND to_jsonb(OLD)->>'approval_status'<>'posted')) THEN RAISE EXCEPTION 'Use Mark as commented to record a confirmation'; END IF; RETURN NEW; END $$;
CREATE TRIGGER guard_external_confirmation BEFORE UPDATE ON public.external_posts FOR EACH ROW EXECUTE FUNCTION public.guard_comment_confirmation();
CREATE TRIGGER guard_comment_confirmation BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.guard_comment_confirmation();
DO $$ DECLARE def text; BEGIN SELECT pg_get_functiondef('public.consume_usage(text,text,integer,uuid,boolean)'::regprocedure) INTO def; def:=replace(def,'SELECT * INTO b FROM public.workspace_billing LIMIT 1 FOR UPDATE;','IF _quantity IS NULL OR _quantity <= 0 OR _quantity > 10000 THEN RAISE EXCEPTION ''Quantity must be between 1 and 10000''; END IF; IF NOT public.is_workspace_member(auth.uid()) OR (_client_id IS NOT NULL AND (NOT EXISTS(SELECT 1 FROM public.clients WHERE id=_client_id) OR NOT public.user_can_access_client(auth.uid(),_client_id))) THEN RAISE EXCEPTION ''Client not available to this account''; END IF; SELECT * INTO b FROM public.workspace_billing WHERE id=true FOR UPDATE;'); EXECUTE def; END $$;
REVOKE ALL ON FUNCTION public.consume_usage(text,text,integer,uuid,boolean) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.consume_usage(text,text,integer,uuid,boolean) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.process_scheduled_posts(_cap integer DEFAULT 25) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE p public.post_cards; o public.delivery_operations; g jsonb; run uuid; np integer:=0; ns integer:=0; nk integer:=0; outcome text; BEGIN
IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Scheduled delivery runs automatically'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.post_cards WHERE delivery_status='scheduled' AND scheduled_for<=now() AND NOT is_sample) THEN RETURN jsonb_build_object('processed',0); END IF;
INSERT INTO public.publish_runs DEFAULT VALUES RETURNING id INTO run;
FOR p IN SELECT * FROM public.post_cards WHERE delivery_status='scheduled' AND scheduled_for<=now() AND NOT is_sample ORDER BY scheduled_for LIMIT least(greatest(_cap,1),25) FOR UPDATE SKIP LOCKED LOOP
BEGIN g:=public.delivery_readiness_internal(p.id,p.scheduled_by); EXCEPTION WHEN OTHERS THEN g:=jsonb_build_object('canDeliver',false,'label',SQLERRM); END;
FOR o IN SELECT * FROM public.delivery_operations WHERE post_card_id=p.id AND revision=p.readiness_revision AND status='scheduled' FOR UPDATE LOOP
outcome:=CASE WHEN NOT coalesce((g->>'canDeliver')::boolean,false) THEN 'failed' WHEN NOT EXISTS(SELECT 1 FROM public.social_accounts s WHERE s.id=o.social_account_id AND s.client_id=p.client_id AND s.is_active AND s.connection_status='connected') THEN 'skipped' ELSE 'staged' END;
UPDATE public.delivery_operations SET status=outcome,reason=CASE WHEN outcome='failed' THEN g->>'label' WHEN outcome='skipped' THEN 'Account not connected' ELSE 'Staged; not sent to a platform' END,updated_at=now() WHERE id=o.id;
INSERT INTO public.delivery_attempts(operation_id,attempt_number,status,reason) SELECT o.id,coalesce(max(attempt_number),0)+1,outcome,'Scheduled readiness revalidated; no platform call' FROM public.delivery_attempts WHERE operation_id=o.id;
IF outcome='staged' THEN ns:=ns+1; ELSE nk:=nk+1; END IF;
END LOOP;
SELECT CASE WHEN bool_and(status='staged') THEN 'staged' WHEN bool_and(status IN ('failed','skipped')) THEN 'failed' ELSE 'partial' END INTO outcome FROM public.delivery_operations WHERE post_card_id=p.id AND revision=p.readiness_revision;
UPDATE public.post_cards SET delivery_status=coalesce(outcome,'failed'),publishing_status='idle' WHERE id=p.id; np:=np+1;
END LOOP;
UPDATE public.publish_runs SET finished_at=now(),status='completed',posts_processed=np,channels_staged=ns,channels_skipped=nk,backlog_remaining=(SELECT count(*) FROM public.post_cards WHERE delivery_status='scheduled' AND NOT is_sample AND scheduled_for<=now()) WHERE id=run;
RETURN jsonb_build_object('processed',np,'staged',ns,'skipped',nk); END $$;
REVOKE ALL ON FUNCTION public.process_scheduled_posts(integer) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.process_scheduled_posts(integer) TO service_role;
COMMENT ON COLUMN public.post_cards.publishing_status IS 'Legacy status retained; authoritative outcomes use delivery_status and delivery_operations.';
