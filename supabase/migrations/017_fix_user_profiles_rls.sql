/**
 * Migration 017: Fix user_profiles RLS - INCOMPLETE (See migration 018)
 *
 * Problem: API needed to fetch user_profiles to show creator names in recipient_lists
 *
 * Attempted Solutions:
 * 1. ❌ Added FK hint in Supabase query - Failed (PGRST200: FK not found)
 * 2. ❌ Added RLS policy with subquery - Failed (infinite recursion 42P17)
 * 3. ❌ Added RLS policy with SECURITY DEFINER function - Failed (permission denied 42501)
 * 4. ❌ Used service role client - Failed (still got 42501 on recipient_lists)
 *
 * Root Cause Discovered in Migration 018:
 * - Created get_user_organization_id() function but NEVER updated recipient_lists policies
 * - All recipient_lists policies still used subquery to user_profiles, triggering RLS cascade
 * - Function existed but was unused by the policies that needed it!
 *
 * This migration creates the function but leaves policies broken.
 * See migration 018 for the actual fix.
 */

-- Step 1: Create SECURITY DEFINER function
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

-- Note: This migration is INCOMPLETE - it creates the function but doesn't
-- update recipient_lists policies to use it. They still have the subquery problem!
