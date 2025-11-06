-- Migration 016: Feature Flags System
-- Created: 2025-11-06
-- Purpose: Add feature toggle system for admin control over platform features
-- Allows admin to enable/disable features per organization (e.g., CSV export, contact details)

-- ============================================================================
-- 1. ADD FEATURE_FLAGS COLUMN TO ORGANIZATIONS
-- ============================================================================

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{
  "csv_export_enabled": true,
  "contact_details_enabled": true,
  "recipient_list_reuse_enabled": true,
  "audience_analytics_enabled": true,
  "batch_export_enabled": true
}'::jsonb;

-- Add comment explaining the feature flags
COMMENT ON COLUMN organizations.feature_flags IS 'Feature toggles for controlling platform capabilities per organization. Keys: csv_export_enabled, contact_details_enabled, recipient_list_reuse_enabled, audience_analytics_enabled, batch_export_enabled';

-- ============================================================================
-- 2. CREATE HELPER FUNCTION TO CHECK FEATURE FLAGS
-- ============================================================================

CREATE OR REPLACE FUNCTION check_feature_flag(
  org_id UUID,
  flag_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  flag_value BOOLEAN;
BEGIN
  -- Get the feature flag value from organization
  SELECT (feature_flags->>flag_name)::boolean INTO flag_value
  FROM organizations
  WHERE id = org_id;

  -- Return false if flag not found or null
  RETURN COALESCE(flag_value, false);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_feature_flag(UUID, TEXT) TO authenticated, anon;

-- ============================================================================
-- 3. UPDATE EXISTING ORGANIZATIONS WITH DEFAULT FLAGS
-- ============================================================================

-- Set default feature flags for all existing organizations
UPDATE organizations
SET feature_flags = '{
  "csv_export_enabled": true,
  "contact_details_enabled": true,
  "recipient_list_reuse_enabled": true,
  "audience_analytics_enabled": true,
  "batch_export_enabled": true
}'::jsonb
WHERE feature_flags IS NULL;

-- ============================================================================
-- 4. ADD INDEX FOR FEATURE FLAG QUERIES
-- ============================================================================

-- GIN index for fast JSONB queries
CREATE INDEX IF NOT EXISTS idx_organizations_feature_flags
ON organizations USING GIN (feature_flags);

-- ============================================================================
-- 5. CREATE FEATURE FLAGS AUDIT TABLE (OPTIONAL - TRACK CHANGES)
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_flag_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES auth.users(id),

  -- Change Details
  flag_name TEXT NOT NULL,
  old_value BOOLEAN,
  new_value BOOLEAN NOT NULL,
  reason TEXT,

  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_flag_changes_org ON feature_flag_changes(organization_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_changes_flag ON feature_flag_changes(flag_name);

-- RLS Policies
ALTER TABLE feature_flag_changes ENABLE ROW LEVEL SECURITY;

-- Only platform admins can view feature flag change history
CREATE POLICY "Platform admins can view feature flag changes"
  ON feature_flag_changes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'owner'
      AND is_platform_admin = true
    )
  );

-- Service role can insert changes
GRANT ALL ON feature_flag_changes TO service_role;

-- ============================================================================
-- 6. CREATE FUNCTION TO UPDATE FEATURE FLAG WITH AUDIT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_feature_flag(
  org_id UUID,
  flag_name TEXT,
  new_value BOOLEAN,
  changed_by_user_id UUID,
  change_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_value BOOLEAN;
  current_flags JSONB;
BEGIN
  -- Get current flag value
  SELECT
    (feature_flags->>flag_name)::boolean,
    feature_flags
  INTO old_value, current_flags
  FROM organizations
  WHERE id = org_id;

  -- Update the feature flag
  UPDATE organizations
  SET feature_flags = jsonb_set(
    COALESCE(feature_flags, '{}'::jsonb),
    ARRAY[flag_name],
    to_jsonb(new_value)
  )
  WHERE id = org_id;

  -- Log the change
  INSERT INTO feature_flag_changes (
    organization_id,
    changed_by,
    flag_name,
    old_value,
    new_value,
    reason
  ) VALUES (
    org_id,
    changed_by_user_id,
    flag_name,
    old_value,
    new_value,
    change_reason
  );

  RETURN true;
END;
$$;

-- Grant execute permission to service_role only (admin operations)
GRANT EXECUTE ON FUNCTION update_feature_flag(UUID, TEXT, BOOLEAN, UUID, TEXT) TO service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ feature_flags column added to organizations';
  RAISE NOTICE '✅ check_feature_flag() function created';
  RAISE NOTICE '✅ update_feature_flag() function created';
  RAISE NOTICE '✅ feature_flag_changes audit table created';
  RAISE NOTICE '✅ Default flags set for all existing organizations';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Available Feature Flags:';
  RAISE NOTICE '  - csv_export_enabled: Control CSV download access';
  RAISE NOTICE '  - contact_details_enabled: Control viewing contact details';
  RAISE NOTICE '  - recipient_list_reuse_enabled: Control reusing recipient lists';
  RAISE NOTICE '  - audience_analytics_enabled: Control analytics visibility';
  RAISE NOTICE '  - batch_export_enabled: Control batch export functionality';
END $$;
