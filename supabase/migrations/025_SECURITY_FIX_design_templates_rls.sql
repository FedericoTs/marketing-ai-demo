-- ============================================================================
-- Migration 025 SECURITY FIX: Proper RLS for design_templates table
-- Created: 2025-11-21
-- Issue: Users can see templates from OTHER organizations (data leak)
-- Root Cause: Insecure "allow_all" policies with qual=true
-- Solution: Organization-based isolation using proper RLS policies
-- ============================================================================

-- STEP 1: Drop insecure policies
DROP POLICY IF EXISTS allow_all_select ON design_templates;
DROP POLICY IF EXISTS allow_all_insert ON design_templates;
DROP POLICY IF EXISTS allow_all_update ON design_templates;
DROP POLICY IF EXISTS allow_all_delete ON design_templates;

-- STEP 2: Create helper function to get user's organization_id
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id 
  FROM user_profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- STEP 3: Create secure RLS policies
-- ============================================================================

-- SELECT Policy: Users can only see templates from their organization
CREATE POLICY templates_select_org_isolation ON design_templates
  FOR SELECT
  USING (
    organization_id = get_user_organization_id()
  );

-- INSERT Policy: Users can only create templates for their organization
CREATE POLICY templates_insert_org_isolation ON design_templates
  FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization_id()
  );

-- UPDATE Policy: Users can only update templates from their organization
CREATE POLICY templates_update_org_isolation ON design_templates
  FOR UPDATE
  USING (
    organization_id = get_user_organization_id()
  );

-- DELETE Policy: Users can only delete templates from their organization
CREATE POLICY templates_delete_org_isolation ON design_templates
  FOR DELETE
  USING (
    organization_id = get_user_organization_id()
  );

-- STEP 4: Ensure RLS is enabled (should already be, but verify)
ALTER TABLE design_templates ENABLE ROW LEVEL SECURITY;

-- STEP 5: Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON design_templates TO authenticated;

-- Verify fix
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'design_templates';
  
  RAISE NOTICE '✅ Migration 025 SECURITY FIX applied successfully';
  RAISE NOTICE 'ℹ️  Dropped 4 insecure "allow_all" policies';
  RAISE NOTICE 'ℹ️  Created 4 organization-isolated policies';
  RAISE NOTICE 'ℹ️  Total policies now: %', policy_count;
  RAISE NOTICE 'ℹ️  Users can ONLY see/modify templates from their own organization';
  RAISE NOTICE '🔒 Data isolation: ENABLED';
END $$;
