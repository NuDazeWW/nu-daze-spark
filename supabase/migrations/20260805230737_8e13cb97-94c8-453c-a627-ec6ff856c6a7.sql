-- 1. clients: restrict visibility to members/admins
DROP POLICY IF EXISTS "Authenticated can view clients" ON public.clients;
CREATE POLICY "Members and admins can view their clients"
ON public.clients FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.client_members cm WHERE cm.client_id = clients.id AND cm.user_id = auth.uid()));

-- 2. asset_summaries: ensure client-scope restrictive policy exists (defense in depth)
DROP POLICY IF EXISTS "client_scope" ON public.asset_summaries;
CREATE POLICY "client_scope" ON public.asset_summaries AS RESTRICTIVE FOR ALL TO authenticated
USING (client_id IS NULL OR public.user_can_access_client(auth.uid(), client_id))
WITH CHECK (client_id IS NULL OR public.user_can_access_client(auth.uid(), client_id));

-- 3. storage: ownership / client scoped reads
DROP POLICY IF EXISTS "Authenticated can view storage files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read source assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read generated assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read summaries" ON storage.objects;

CREATE POLICY "Scoped read of app storage buckets"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('source-assets','generated-assets','summaries')
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR owner = auth.uid()
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.source_assets sa
      WHERE sa.file_path = storage.objects.name
        AND public.user_can_access_client(auth.uid(), sa.client_id)
    )
  )
);

-- tighten admin storage policies to authenticated role only
DROP POLICY IF EXISTS "Admins can delete storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update storage objects" ON storage.objects;
CREATE POLICY "Admins can delete storage objects" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('source-assets','generated-assets','summaries') AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update storage objects" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('source-assets','generated-assets','summaries') AND public.has_role(auth.uid(), 'admin'::app_role));

-- 4. move remaining public-role policies to authenticated so anon never needs helper EXECUTE
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete asset summaries" ON public.asset_summaries;
CREATE POLICY "Admins can delete asset summaries" ON public.asset_summaries FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 5. Lock down SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.user_can_access_client(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_can_access_client(uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_admin_for_nudaze_domain() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_system_tag_delete() FROM PUBLIC, anon, authenticated;

-- 6. Prevent self-granted admin escalation (defense in depth)
CREATE OR REPLACE FUNCTION public.prevent_self_admin_grant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NEW.user_id = auth.uid()
     AND NEW.role = 'admin'::app_role
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Users cannot grant themselves the admin role';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.prevent_self_admin_grant() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prevent_self_admin_grant ON public.user_roles;
CREATE TRIGGER prevent_self_admin_grant
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_admin_grant();