CREATE OR REPLACE FUNCTION public.reconcile_delivery(_operation uuid,_outcome text,_platform_post_id text DEFAULT NULL,_reason text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE o public.delivery_operations; BEGIN
IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Only verified delivery service results may reconcile outcomes'; END IF;
IF _outcome NOT IN ('platform_confirmed','failed','awaiting_confirmation','sending') THEN RAISE EXCEPTION 'Invalid delivery result'; END IF;
IF _outcome='platform_confirmed' AND nullif(_platform_post_id,'') IS NULL THEN RAISE EXCEPTION 'Platform confirmation requires an external post identifier'; END IF;
SELECT * INTO o FROM public.delivery_operations WHERE id=_operation FOR UPDATE;
IF o.id IS NULL OR o.status='platform_confirmed' THEN RETURN; END IF;
IF EXISTS(SELECT 1 FROM public.post_cards WHERE id=o.post_card_id AND is_sample) THEN RAISE EXCEPTION 'Samples are never dispatched'; END IF;
UPDATE public.delivery_operations SET status=_outcome,platform_post_id=_platform_post_id,reason=_reason,updated_at=now() WHERE id=o.id;
INSERT INTO public.delivery_attempts(operation_id,attempt_number,status,reason) SELECT o.id,coalesce(max(attempt_number),0)+1,_outcome,_reason FROM public.delivery_attempts WHERE operation_id=o.id;
UPDATE public.post_cards SET delivery_status=(SELECT CASE WHEN bool_and(status='platform_confirmed') THEN 'platform_confirmed' WHEN bool_or(status='awaiting_confirmation') THEN 'awaiting_confirmation' WHEN bool_and(status='failed') THEN 'failed' ELSE 'partial' END FROM public.delivery_operations WHERE post_card_id=o.post_card_id AND revision=o.revision),confirmation_source=CASE WHEN _outcome='platform_confirmed' THEN 'platform' ELSE confirmation_source END WHERE id=o.post_card_id;
END $$;
REVOKE ALL ON FUNCTION public.reconcile_delivery(uuid,text,text,text) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.reconcile_delivery(uuid,text,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.invalidate_strategy_readiness() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN UPDATE public.post_cards SET readiness_changed_at=now() WHERE client_id IS NOT DISTINCT FROM coalesce(NEW.client_id,OLD.client_id); RETURN coalesce(NEW,OLD); END $$;
CREATE TRIGGER voice_invalidates_readiness AFTER INSERT OR UPDATE OR DELETE ON public.brand_voice_rules FOR EACH ROW EXECUTE FUNCTION public.invalidate_strategy_readiness();
CREATE TRIGGER platform_invalidates_readiness AFTER INSERT OR UPDATE OR DELETE ON public.platform_rules FOR EACH ROW EXECUTE FUNCTION public.invalidate_strategy_readiness();
CREATE TRIGGER guardrails_invalidate_readiness AFTER INSERT OR UPDATE OR DELETE ON public.guardrail_settings FOR EACH ROW EXECUTE FUNCTION public.invalidate_strategy_readiness();
CREATE OR REPLACE FUNCTION public.guard_review_decision() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF auth.uid() IS NOT NULL AND NEW.approval_status IS DISTINCT FROM OLD.approval_status AND NEW.approval_status IN ('approved','needs_revision') AND NOT public.workspace_role(auth.uid()) IN ('owner','admin','reviewer') THEN RAISE EXCEPTION 'Only an approver or administrator may make a review decision'; END IF;
IF auth.uid() IS NOT NULL AND NEW.approval_status='in_review' AND OLD.approval_status<>'in_review' THEN
IF NOT public.can_create_content(auth.uid()) THEN RAISE EXCEPTION 'Your role cannot submit new work for review'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.workspace_settings WHERE id=true AND post_approval_required) THEN RAISE EXCEPTION 'Executive Review is off in Setup'; END IF;
IF OLD.approval_status IN ('posted','archived') THEN RAISE EXCEPTION 'This record is no longer eligible for review'; END IF;
END IF; RETURN NEW; END $$;
CREATE TRIGGER guard_post_review BEFORE UPDATE ON public.post_cards FOR EACH ROW EXECUTE FUNCTION public.guard_review_decision();
CREATE TRIGGER guard_comment_review BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.guard_review_decision();
CREATE OR REPLACE FUNCTION public.guard_delivery_insert() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF auth.uid() IS NOT NULL AND (NEW.is_sample OR NEW.delivery_status<>'idle' OR NEW.publishing_status<>'idle' OR NEW.confirmed_at IS NOT NULL OR NEW.approval_status='posted') THEN RAISE EXCEPTION 'New posts must start without a delivery or confirmation'; END IF; RETURN NEW; END $$;
CREATE TRIGGER guard_delivery_insert BEFORE INSERT ON public.post_cards FOR EACH ROW EXECUTE FUNCTION public.guard_delivery_insert();
DO $$ DECLARE d text; BEGIN
SELECT pg_get_functiondef('public.notify_post_went_out()'::regprocedure) INTO d;
d:=replace(d,'if NEW.approval_status = ''posted''','if NOT NEW.is_sample and NEW.confirmation_source = ''platform'' and NEW.approval_status = ''posted'''); EXECUTE d;
SELECT pg_get_functiondef('public.process_scheduled_posts(integer)'::regprocedure) INTO d;
d:=replace(d,'WHEN NOT EXISTS(SELECT 1 FROM public.social_accounts','WHEN EXISTS(SELECT 1 FROM public.delivery_capabilities dc WHERE dc.platform=o.platform AND dc.live_enabled AND dc.verified_at IS NOT NULL AND dc.dispatch_ready) THEN ''failed'' WHEN NOT EXISTS(SELECT 1 FROM public.social_accounts'); EXECUTE d;
END $$;
