
-- Add soft-delete column
ALTER TABLE public.source_assets
ADD COLUMN deleted_at timestamptz DEFAULT NULL;

-- Create index for filtering
CREATE INDEX idx_source_assets_deleted_at ON public.source_assets (deleted_at);

-- Drop old SELECT policy and replace with one that excludes soft-deleted by default
DROP POLICY IF EXISTS "Authenticated can view source assets" ON public.source_assets;

CREATE POLICY "Authenticated can view active source assets"
ON public.source_assets
FOR SELECT
TO authenticated
USING (deleted_at IS NULL);

CREATE POLICY "Authenticated can view trashed source assets"
ON public.source_assets
FOR SELECT
TO authenticated
USING (deleted_at IS NOT NULL AND (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role)));
