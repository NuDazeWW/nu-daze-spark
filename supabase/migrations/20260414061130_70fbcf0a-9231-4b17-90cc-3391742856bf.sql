-- Allow authenticated users to insert external posts
CREATE POLICY "Authenticated can insert external posts"
ON public.external_posts
FOR INSERT
TO authenticated
WITH CHECK (true);
