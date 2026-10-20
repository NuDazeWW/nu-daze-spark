ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS executive_review_enabled boolean NOT NULL DEFAULT true;
DO $$ DECLARE d text; BEGIN SELECT pg_get_functiondef('public.guard_review_decision()'::regprocedure) INTO d; d:=replace(d,'AND post_approval_required','AND executive_review_enabled'); EXECUTE d;
SELECT pg_get_functiondef('public.delivery_readiness_internal(uuid,uuid)'::regprocedure) INTO d;
d:=replace(d,'ELSIF NOT fresh THEN','ELSIF n>0 THEN label:=''Approved · ''||n||'' required check''||CASE WHEN n=1 THEN '' remains'' ELSE ''s remain'' END; tone:=''blocked''; ELSIF NOT fresh THEN'); EXECUTE d; END $$;
CREATE OR REPLACE FUNCTION public.corrective_regression_checks() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor uuid:=auth.uid(); cid uuid; acct uuid; post uuid; result jsonb:='{}'; b0 integer; b1 integer; response jsonb; ops integer; caught boolean;
BEGIN
IF NOT public.has_role(actor,'admin') THEN RAISE EXCEPTION 'Administrator test access required'; END IF;
SELECT id INTO cid FROM public.clients ORDER BY created_at LIMIT 1;
SELECT id INTO acct FROM public.social_accounts WHERE client_id=cid AND is_active AND connection_status='connected' LIMIT 1;
SELECT text_drafts_used INTO b0 FROM public.workspace_billing WHERE id=true;
BEGIN
response:=public.consume_usage('text_drafts','repurpose_content',1,cid,false);
IF NOT (response->>'ok')::boolean THEN RAISE EXCEPTION 'Allowance unavailable for authorized usage regression'; END IF;
SELECT text_drafts_used INTO b1 FROM public.workspace_billing WHERE id=true;
IF b1<>b0+1 OR NOT EXISTS(SELECT 1 FROM public.usage_events WHERE actor_id=actor AND client_id=cid AND bucket='text_drafts' AND created_at>=transaction_timestamp()) THEN RAISE EXCEPTION 'Usage accounting regression'; END IF;
RAISE EXCEPTION USING ERRCODE='P9901',MESSAGE='rollback authorized usage';
EXCEPTION WHEN SQLSTATE 'P9901' THEN result:=result||jsonb_build_object('authorized_usage_accounted_and_rolled_back',true); END;
SELECT text_drafts_used INTO b1 FROM public.workspace_billing WHERE id=true; IF b1<>b0 THEN RAISE EXCEPTION 'Regression changed billing'; END IF;
caught:=false; BEGIN PERFORM public.consume_usage('text_drafts','repurpose_content',-1,cid,false); EXCEPTION WHEN OTHERS THEN caught:=true; END;
IF NOT caught THEN RAISE EXCEPTION 'Negative usage accepted'; END IF; result:=result||jsonb_build_object('negative_quantity_rejected',true);
caught:=false; BEGIN PERFORM public.consume_usage('text_drafts','repurpose_content',1,gen_random_uuid(),false); EXCEPTION WHEN OTHERS THEN caught:=true; END;
IF NOT caught THEN RAISE EXCEPTION 'Invalid cross-instance client accepted'; END IF; result:=result||jsonb_build_object('unknown_client_rejected',true);
PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
caught:=false; BEGIN PERFORM public.consume_usage('text_drafts','repurpose_content',1,cid,false); EXCEPTION WHEN OTHERS THEN caught:=true; END;
PERFORM set_config('request.jwt.claim.sub',actor::text,true);
IF NOT caught THEN RAISE EXCEPTION 'Unauthorized caller accepted'; END IF; result:=result||jsonb_build_object('unauthorized_usage_rejected',true);
IF acct IS NOT NULL THEN
BEGIN
INSERT INTO public.post_cards(client_id,created_by,platform,content_type,draft_copy,approval_status,target_account_ids,apply_ai_disclosure) VALUES(cid,actor,'linkedin','post','Authorized rollback-only delivery regression','approved',ARRAY[acct],false) RETURNING id INTO post;
response:=public.submit_delivery(post,ARRAY[acct],NULL,'UTC',false);
PERFORM public.submit_delivery(post,ARRAY[acct],NULL,'UTC',false);
SELECT count(*) INTO ops FROM public.delivery_operations WHERE post_card_id=post;
IF ops<>1 OR (SELECT count(*) FROM public.delivery_attempts a JOIN public.delivery_operations o ON o.id=a.operation_id WHERE o.post_card_id=post)<>1 THEN RAISE EXCEPTION 'Duplicate operation or attempt'; END IF;
UPDATE public.delivery_operations SET status='awaiting_confirmation' WHERE post_card_id=post;
caught:=false; BEGIN PERFORM public.submit_delivery(post,ARRAY[acct],NULL,'UTC',false); EXCEPTION WHEN OTHERS THEN caught:=true; END;
IF NOT caught THEN RAISE EXCEPTION 'Unknown outcome retried'; END IF;
RAISE EXCEPTION USING ERRCODE='P9902',MESSAGE='rollback delivery test';
EXCEPTION WHEN SQLSTATE 'P9902' THEN result:=result||jsonb_build_object('stable_operation_double_submit',true,'unknown_outcome_retry_rejected',true); END;
END IF;
RETURN result; END $$;
REVOKE ALL ON FUNCTION public.corrective_regression_checks() FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.corrective_regression_checks() TO authenticated;
