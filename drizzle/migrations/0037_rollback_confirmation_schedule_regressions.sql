CREATE OR REPLACE FUNCTION public.corrective_confirmation_checks() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE actor uuid:=auth.uid(); cid uuid; eid uuid; pid uuid; aid uuid; out jsonb:='{}'; baseline integer; after_count integer; caught boolean; old_t timestamptz; BEGIN IF NOT public.has_role(actor,'admin') THEN RAISE EXCEPTION 'Administrator test access required'; END IF; SELECT client_id,id INTO cid,aid FROM public.social_accounts WHERE connection_status='connected' AND is_active LIMIT 1;
BEGIN
SELECT coalesce((public.comment_counts(cid)->>'linkedin')::integer,0) INTO baseline;
INSERT INTO public.external_posts(client_id,platform,external_url,post_content) VALUES(cid,'linkedin','https://example.com/rollback-comment','Rollback-only relevant post') RETURNING id INTO eid;
INSERT INTO public.comments(external_post_id,client_id,draft_copy,approval_status,created_by) VALUES(eid,cid,'Rollback-only approved comment','approved',actor);
PERFORM public.mark_commented(eid); IF NOT (public.mark_commented(eid)->>'duplicate')::boolean THEN RAISE EXCEPTION 'Repeat confirmation counted twice'; END IF;
SELECT coalesce((public.comment_counts(cid)->>'linkedin')::integer,0) INTO after_count;
IF after_count<>baseline+1 THEN RAISE EXCEPTION 'Timezone comment count regression'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.external_posts WHERE id=eid AND confirmation_source='manual' AND confirmed_by=actor AND confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Missing provenance'; END IF;
RAISE EXCEPTION USING ERRCODE='P9903',MESSAGE='rollback comments'; EXCEPTION WHEN SQLSTATE 'P9903' THEN out:=out||jsonb_build_object('comment_once_workspace_timezone',true,'comment_manual_provenance',true); END;
BEGIN
INSERT INTO public.post_cards(client_id,platform,content_type,draft_copy,approval_status,created_by,target_account_ids) VALUES(cid,'linkedin','post','Rollback-only scheduled post','approved',actor,ARRAY[aid]) RETURNING id INTO pid;
PERFORM public.submit_delivery(pid,ARRAY[aid],now()+interval '2 days','America/New_York',false);
PERFORM public.submit_delivery(pid,ARRAY[aid],now()+interval '3 days','America/New_York',false);
IF (SELECT count(*) FROM public.delivery_operations WHERE post_card_id=pid AND status='scheduled')<>1 THEN RAISE EXCEPTION 'Reschedule created duplicate'; END IF;
caught:=false; BEGIN PERFORM public.submit_delivery(pid,ARRAY[aid],now()-interval '1 day','UTC',false); EXCEPTION WHEN OTHERS THEN caught:=true; END; IF NOT caught THEN RAISE EXCEPTION 'Past delivery accepted'; END IF;
PERFORM public.mark_posted_manual(pid); IF NOT (public.mark_posted_manual(pid)->>'duplicate')::boolean THEN RAISE EXCEPTION 'Manual confirmation duplicate'; END IF;
IF EXISTS(SELECT 1 FROM public.delivery_operations WHERE post_card_id=pid AND status='scheduled') THEN RAISE EXCEPTION 'Manual post retained scheduled send'; END IF;
caught:=false; BEGIN PERFORM public.submit_delivery(pid,ARRAY[aid],NULL,'UTC',false); EXCEPTION WHEN OTHERS THEN caught:=true; END; IF NOT caught THEN RAISE EXCEPTION 'Posted item resent'; END IF;
RAISE EXCEPTION USING ERRCODE='P9904',MESSAGE='rollback schedules'; EXCEPTION WHEN SQLSTATE 'P9904' THEN out:=out||jsonb_build_object('reschedule_one_operation',true,'past_time_rejected',true,'manual_confirmation_once',true,'posted_not_resent',true); END;
RETURN out; END $$;
REVOKE ALL ON FUNCTION public.corrective_confirmation_checks() FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.corrective_confirmation_checks() TO authenticated;
DO $$ DECLARE d text; BEGIN SELECT pg_get_functiondef('public.plan_post_date(uuid,timestamptz,public.platform_type)'::regprocedure) INTO d; d:=replace(d,'IF _when IS NULL OR _when<=now() THEN','IF _when IS NOT NULL AND _when<=now() THEN'); d:=replace(d,'IF p.delivery_status=''scheduled'' THEN','IF p.delivery_status=''scheduled'' AND _when IS NULL THEN PERFORM public.cancel_delivery_schedule(p.id); ELSIF p.delivery_status=''scheduled'' THEN'); EXECUTE d; END $$;