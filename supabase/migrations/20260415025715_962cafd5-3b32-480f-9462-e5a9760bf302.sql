
-- 1. Fix connected_sources: change {public} policies to {authenticated}
DROP POLICY IF EXISTS "Admins can insert connected sources" ON public.connected_sources;
DROP POLICY IF EXISTS "Admins can update connected sources" ON public.connected_sources;
DROP POLICY IF EXISTS "Admins can delete connected sources" ON public.connected_sources;
DROP POLICY IF EXISTS "Admins can view connected sources" ON public.connected_sources;

CREATE POLICY "Admins can insert connected sources" ON public.connected_sources FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update connected sources" ON public.connected_sources FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete connected sources" ON public.connected_sources FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view connected sources" ON public.connected_sources FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Fix user_roles: change {public} mutation policies to {authenticated}
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Add INSERT policy for repurpose_suggestions (server-side via service role, but add explicit authenticated+admin policy)
CREATE POLICY "Admins can insert repurpose suggestions" ON public.repurpose_suggestions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update repurpose suggestions" ON public.repurpose_suggestions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
