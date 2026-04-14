
-- Storage policies for source-assets bucket
CREATE POLICY "Authenticated can read source assets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'source-assets');

CREATE POLICY "Authenticated can upload source assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'source-assets');

CREATE POLICY "Admins can update source assets files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'source-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete source assets files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'source-assets' AND public.has_role(auth.uid(), 'admin'));
