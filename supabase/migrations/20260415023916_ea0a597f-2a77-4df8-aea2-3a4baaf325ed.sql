
-- Restrict background_jobs: only admin or job creator can view
DROP POLICY "Authenticated can view background jobs" ON public.background_jobs;

CREATE POLICY "Admin or creator can view background jobs"
  ON public.background_jobs
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = created_by
    OR has_role(auth.uid(), 'admin'::app_role)
  );
