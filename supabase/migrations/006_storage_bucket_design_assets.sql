-- ============================================================================
-- Migration: 006_storage_bucket_design_assets
-- Description: Create Supabase Storage bucket for design assets
-- Created: 2025-11-04
-- ============================================================================

-- Create storage bucket for design assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'design-assets',
  'design-assets',
  false, -- Not public, access controlled by RLS
  10485760, -- 10MB limit per file
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/svg+xml',
    'image/webp',
    'image/gif'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE RLS POLICIES
-- ============================================================================

-- Policy: Allow authenticated users to upload to their organization folder
CREATE POLICY "Users can upload assets to their organization"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'design-assets' AND
  -- Path must match: design-assets/{org_id}/{filename}
  -- User must be member of the organization
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM user_profiles
    WHERE id = auth.uid()
  )
);

-- Policy: Allow authenticated users to read their organization's assets
CREATE POLICY "Users can read their organization assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'design-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM user_profiles
    WHERE id = auth.uid()
  )
);

-- Policy: Allow authenticated users to update their organization's assets
CREATE POLICY "Users can update their organization assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'design-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM user_profiles
    WHERE id = auth.uid()
  )
);

-- Policy: Allow authenticated users to delete their organization's assets
CREATE POLICY "Users can delete their organization assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'design-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM user_profiles
    WHERE id = auth.uid()
  )
);

-- ============================================================================
-- HELPER FUNCTION: Get organization storage usage from storage bucket
-- ============================================================================

CREATE OR REPLACE FUNCTION get_organization_storage_bucket_usage(org_id UUID)
RETURNS TABLE(
  total_files BIGINT,
  total_bytes BIGINT,
  total_mb NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_files,
    COALESCE(SUM((metadata->>'size')::BIGINT), 0) as total_bytes,
    ROUND(COALESCE(SUM((metadata->>'size')::BIGINT), 0) / 1048576.0, 2) as total_mb
  FROM storage.objects
  WHERE bucket_id = 'design-assets'
    AND (storage.foldername(name))[1] = org_id::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_organization_storage_bucket_usage IS 'Calculate total storage usage for an organization in the design-assets bucket (Supabase Storage)';
