
-- Fix external_posts INSERT: require authenticated user
DROP POLICY "Authenticated can insert external posts" ON public.external_posts;
CREATE POLICY "Authenticated can insert external posts"
  ON public.external_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix post_versions INSERT: require creator match
DROP POLICY "Authenticated can insert post versions" ON public.post_versions;
CREATE POLICY "Authenticated can insert post versions"
  ON public.post_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);
