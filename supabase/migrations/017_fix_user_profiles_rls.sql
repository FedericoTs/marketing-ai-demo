/**
 * Migration 017: Fix user_profiles RLS - FINAL SOLUTION
 *
 * Problem: API needed to fetch user_profiles to show creator names in recipient_lists
 *
 * Attempted Solutions:
 * 1. ❌ Added FK hint in Supabase query - Failed (PGRST200: FK not found)
 * 2. ❌ Added RLS policy with subquery - Failed (infinite recursion 42P17)
 * 3. ❌ Added RLS policy with SECURITY DEFINER function - Failed (permission denied 42501)
 *
 * Final Solution: Use service role client for user_profiles queries
 * - recipient_lists queries use regular client (RLS enforced)
 * - user_profiles queries for display names use service client (bypass RLS)
 * - Safe because we only fetch profiles for creator_ids from RLS-protected recipient_lists
 *
 * This migration creates a helper function for future use, but the API doesn't use it.
 * The function is kept for potential future needs.
 */

-- Step 1: Create SECURITY DEFINER function (for potential future use)
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT organization_id INTO org_id
  FROM user_profiles
  WHERE id = auth.uid()
  LIMIT 1;

  RETURN org_id;
END;
$$;

-- Step 2: Drop any existing organization-wide viewing policy (causes issues)
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON user_profiles;

-- Note: The existing "Users can view their own profile" policy is sufficient
-- for normal operations. For fetching other users' profiles (e.g., creator names),
-- the API uses service role client which bypasses RLS.
