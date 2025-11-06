/**
 * Migration 017: Fix user_profiles RLS for organization-wide visibility
 *
 * Problem: Users could only see their own profile (id = auth.uid())
 * This broke API queries that join recipient_lists with user_profiles to get creator names
 *
 * Solution: Create SECURITY DEFINER function to avoid infinite recursion
 *
 * CRITICAL: The original approach caused infinite recursion:
 * - RLS policy on user_profiles queried user_profiles
 * - Creating a circular dependency: user_profiles → user_profiles → user_profiles...
 *
 * Fix: SECURITY DEFINER function bypasses RLS, then policy uses function result
 */

-- Step 1: Create SECURITY DEFINER function to get user's organization (bypasses RLS)
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

-- Step 2: Drop old recursive policy if it exists
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON user_profiles;

-- Step 3: Create safe RLS policy using the SECURITY DEFINER function (no recursion)
CREATE POLICY "Users can view profiles in their organization"
ON user_profiles
FOR SELECT
TO public
USING (
  organization_id = public.get_user_organization_id()
);
