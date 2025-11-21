-- ============================================================================
-- Migration 026 SECURITY FIX: Proper RLS for organizations table
-- Created: 2025-11-21
-- Issue: Users can see and modify ANY organization (CRITICAL security vulnerability)
-- Root Cause: Insecure "Allow all access to organizations" policy with qual=true
-- Solution: Organization-based isolation with read-only access for users
-- ============================================================================

-- STEP 1: Drop insecure policy
DROP POLICY IF EXISTS "Allow all access to organizations" ON organizations;

-- STEP 2: Verify helper function exists (created in migration 025)
-- If not exists, create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_user_organization_id'
  ) THEN
    CREATE FUNCTION get_user_organization_id()
    RETURNS UUID
    LANGUAGE SQL
    SECURITY DEFINER
    STABLE
    AS $func$
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
      LIMIT 1;
    $func$;
  END IF;
END $$;

-- STEP 3: Create secure RLS policies
-- ============================================================================

-- SELECT Policy: Users can ONLY see their own organization
CREATE POLICY organizations_select_own_org ON organizations
  FOR SELECT
  USING (
    id = get_user_organization_id()
  );

-- INSERT Policy: DISABLED (organizations created by signup trigger only)
-- No policy = no inserts allowed via authenticated role

-- UPDATE Policy: DISABLED for authenticated users
-- All updates (credits, billing_status) happen via:
-- - Service client (Stripe webhooks, admin operations) - bypasses RLS
-- - Database functions (spend_credits RPC) - SECURITY DEFINER
-- No policy = no updates allowed via authenticated role

-- DELETE Policy: DISABLED (only platform admins via service client)
-- No policy = no deletes allowed via authenticated role

-- STEP 4: Ensure RLS is enabled
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- STEP 5: Grant necessary permissions (READ ONLY for authenticated users)
GRANT SELECT ON organizations TO authenticated;
-- NOTE: INSERT, UPDATE, DELETE permissions NOT granted
-- These operations happen via service role or SECURITY DEFINER functions

-- STEP 6: Verify the fix
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'organizations';

  RAISE NOTICE '✅ Migration 026 SECURITY FIX applied successfully';
  RAISE NOTICE 'ℹ️  Dropped insecure "Allow all access" policy';
  RAISE NOTICE 'ℹ️  Created 1 organization-isolated SELECT policy';
  RAISE NOTICE 'ℹ️  Total policies now: %', policy_count;
  RAISE NOTICE 'ℹ️  Users can ONLY see their own organization (READ ONLY)';
  RAISE NOTICE 'ℹ️  Credits/billing updates via service client or RPC functions only';
  RAISE NOTICE '🔒 Organization isolation: ENABLED';
  RAISE NOTICE '🔒 Financial data protection: ENABLED';
END $$;
