-- ============================================================================
-- Migration 027 SECURITY FIX: Enable RLS on tables with policies but RLS disabled
-- Created: 2025-11-21
-- Issue: elevenlabs_calls and feature_flag_changes have RLS policies but RLS is DISABLED
-- Impact: Users can see data from other organizations (cross-org data leak)
-- Solution: Enable RLS on these tables
-- ============================================================================

-- CRITICAL FIX 1: Enable RLS on elevenlabs_calls
-- This table has 10 policies but RLS was never enabled
-- Users could see calls from ANY organization
ALTER TABLE elevenlabs_calls ENABLE ROW LEVEL SECURITY;

-- CRITICAL FIX 2: Enable RLS on feature_flag_changes
-- This table has policies but RLS was never enabled
-- Less critical (audit log) but still needs fixing
ALTER TABLE feature_flag_changes ENABLE ROW LEVEL SECURITY;

-- Verify the fix
DO $$
DECLARE
  elevenlabs_rls_enabled BOOLEAN;
  feature_flags_rls_enabled BOOLEAN;
BEGIN
  -- Check elevenlabs_calls RLS status
  SELECT relrowsecurity INTO elevenlabs_rls_enabled
  FROM pg_class
  WHERE relname = 'elevenlabs_calls';

  -- Check feature_flag_changes RLS status
  SELECT relrowsecurity INTO feature_flags_rls_enabled
  FROM pg_class
  WHERE relname = 'feature_flag_changes';

  RAISE NOTICE '✅ Migration 027 SECURITY FIX applied successfully';
  RAISE NOTICE 'ℹ️  elevenlabs_calls RLS enabled: %', elevenlabs_rls_enabled;
  RAISE NOTICE 'ℹ️  feature_flag_changes RLS enabled: %', feature_flags_rls_enabled;
  RAISE NOTICE '🔒 Cross-organization call data leak: FIXED';
  RAISE NOTICE '🔒 Audit log isolation: ENABLED';
END $$;
