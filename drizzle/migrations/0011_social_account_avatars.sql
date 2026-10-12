ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS avatar_path text;
CREATE POLICY "Client members read account avatars" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'account-avatars' AND public.user_can_access_client(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "Admins upload account avatars" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'account-avatars' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update account avatars" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'account-avatars' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete account avatars" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'account-avatars' AND public.has_role(auth.uid(), 'admin'));