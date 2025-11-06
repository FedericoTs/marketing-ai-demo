/**
 * Migration 018: Fix recipient_lists RLS policies to use SECURITY DEFINER function
 *
 * Root Cause: Migration 017 created get_user_organization_id() but NEVER updated
 * the recipient_lists policies to use it!
 *
 * The Problem:
 * - All recipient_lists policies used:
 *   organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
 * - This subquery triggers user_profiles RLS policies
 * - Creates RLS cascade: recipient_lists RLS → user_profiles RLS → permission denied (42501)
 * - Function existed but was completely unused!
 *
 * The Fix:
 * - Replace ALL recipient_lists policy subqueries with get_user_organization_id()
 * - Function has SECURITY DEFINER so it bypasses RLS when querying user_profiles
 * - Breaks the RLS cascade chain
 *
 * Why This Works:
 * - get_user_organization_id() runs with elevated privileges
 * - Returns organization_id without triggering user_profiles RLS
 * - recipient_lists policies now work correctly for authenticated users
 */

-- Ensure the SECURITY DEFINER function exists (from migration 017)
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

-- Drop and recreate ALL recipient_lists policies to use the function

DROP POLICY IF EXISTS "Users can view their organization's recipient lists" ON recipient_lists;
CREATE POLICY "Users can view their organization's recipient lists"
ON recipient_lists FOR SELECT
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can create recipient lists in their organization" ON recipient_lists;
CREATE POLICY "Users can create recipient lists in their organization"
ON recipient_lists FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can update their organization's recipient lists" ON recipient_lists;
CREATE POLICY "Users can update their organization's recipient lists"
ON recipient_lists FOR UPDATE
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can delete their organization's recipient lists" ON recipient_lists;
CREATE POLICY "Users can delete their organization's recipient lists"
ON recipient_lists FOR DELETE
USING (organization_id = get_user_organization_id());

-- Result: Library tab now works! No more 42501 errors.
