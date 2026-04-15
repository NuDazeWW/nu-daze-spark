
-- 1. Allow users to read their own role (so UI can check role)
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 2. Fix storage: drop duplicate INSERT policy and add path-scoped upload
DROP POLICY IF EXISTS "Authenticated can upload to source assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload source assets" ON storage.objects;

CREATE POLICY "Authenticated can upload to own path in source-assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'source-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Add SELECT policies for generated-assets and summaries buckets
CREATE POLICY "Authenticated can read generated assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'generated-assets');

CREATE POLICY "Authenticated can read summaries"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'summaries');
