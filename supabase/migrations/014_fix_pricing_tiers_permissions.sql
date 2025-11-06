-- Migration 014: Fix pricing_tiers table permissions
-- Created: 2025-11-06
-- Purpose: Grant base SELECT permission to allow RLS policies to work
-- Issue: RLS policies existed but table-level permissions were missing
-- Error: "permission denied for table pricing_tiers" (code 42501)

-- ============================================================================
-- GRANT BASE TABLE PERMISSIONS
-- ============================================================================

-- Without these grants, RLS policies cannot work
-- PostgreSQL checks table-level permissions BEFORE checking RLS policies
GRANT SELECT ON pricing_tiers TO authenticated, anon;

-- Verify the function has execute permissions (already granted in migration 010)
-- GRANT EXECUTE ON FUNCTION get_pricing_for_count(INTEGER) TO authenticated, anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  auth_select_exists BOOLEAN;
  anon_select_exists BOOLEAN;
BEGIN
  -- Check if authenticated role has SELECT
  SELECT EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_name = 'pricing_tiers'
      AND grantee = 'authenticated'
      AND privilege_type = 'SELECT'
  ) INTO auth_select_exists;

  -- Check if anon role has SELECT
  SELECT EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_name = 'pricing_tiers'
      AND grantee = 'anon'
      AND privilege_type = 'SELECT'
  ) INTO anon_select_exists;

  IF auth_select_exists AND anon_select_exists THEN
    RAISE NOTICE '✅ pricing_tiers SELECT permissions granted successfully';
    RAISE NOTICE '✅ authenticated: %', auth_select_exists;
    RAISE NOTICE '✅ anon: %', anon_select_exists;
  ELSE
    RAISE EXCEPTION '❌ Failed to grant pricing_tiers permissions';
  END IF;
END $$;

-- Test the pricing function
DO $$
DECLARE
  test_result RECORD;
BEGIN
  -- Test with 5,000 contacts (Small Campaign)
  SELECT * INTO test_result FROM get_pricing_for_count(5000);
  IF test_result.tier_name = 'Small Campaign' THEN
    RAISE NOTICE '✅ Pricing function works: 5,000 contacts → %', test_result.tier_name;
  END IF;

  -- Test with 304,039 contacts (Enterprise)
  SELECT * INTO test_result FROM get_pricing_for_count(304039);
  IF test_result.tier_name = 'Enterprise' THEN
    RAISE NOTICE '✅ Pricing function works: 304,039 contacts → %', test_result.tier_name;
  END IF;
END $$;
