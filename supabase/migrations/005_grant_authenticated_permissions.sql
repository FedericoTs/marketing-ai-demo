-- Migration 005: Grant Permissions to Authenticated Role
-- Fixes "permission denied for table" errors for authenticated users
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/egccqmlhzqiirovstpal/sql/new

-- ============================================================================
-- GRANT SELECT PERMISSIONS
-- ============================================================================
-- Authenticated users need SELECT permission to read data
-- RLS policies will still control WHICH rows they can see

GRANT SELECT ON TABLE organizations TO authenticated;
GRANT SELECT ON TABLE user_profiles TO authenticated;
GRANT SELECT ON TABLE design_templates TO authenticated;
GRANT SELECT ON TABLE design_assets TO authenticated;

-- ============================================================================
-- GRANT INSERT PERMISSIONS
-- ============================================================================
-- Authenticated users need INSERT permission to create data
-- RLS policies will still control WHERE they can insert

GRANT INSERT ON TABLE user_profiles TO authenticated;
GRANT INSERT ON TABLE design_templates TO authenticated;
GRANT INSERT ON TABLE design_assets TO authenticated;

-- ============================================================================
-- GRANT UPDATE PERMISSIONS
-- ============================================================================
-- Authenticated users need UPDATE permission to modify data
-- RLS policies will still control WHICH rows they can update

GRANT UPDATE ON TABLE organizations TO authenticated;
GRANT UPDATE ON TABLE user_profiles TO authenticated;
GRANT UPDATE ON TABLE design_templates TO authenticated;
GRANT UPDATE ON TABLE design_assets TO authenticated;

-- ============================================================================
-- GRANT DELETE PERMISSIONS
-- ============================================================================
-- Authenticated users need DELETE permission to remove data
-- RLS policies will still control WHICH rows they can delete

GRANT DELETE ON TABLE design_templates TO authenticated;
GRANT DELETE ON TABLE design_assets TO authenticated;

-- ============================================================================
-- GRANT USAGE ON SEQUENCES (for auto-increment IDs)
-- ============================================================================
-- Not needed for UUID primary keys, but good practice

-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this query to verify the grants were applied:

-- SELECT
--   grantee,
--   table_name,
--   privilege_type
-- FROM information_schema.table_privileges
-- WHERE table_schema = 'public'
--   AND table_name IN ('design_templates', 'organizations', 'user_profiles', 'design_assets')
--   AND grantee = 'authenticated'
-- ORDER BY table_name, privilege_type;

-- Expected output should show SELECT, INSERT, UPDATE, DELETE permissions
-- for authenticated role on all listed tables.

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================
-- 1. These GRANT statements give TABLE-LEVEL permissions
-- 2. RLS policies provide ROW-LEVEL security (already configured in migrations 001-004)
-- 3. Authenticated users can only see/modify rows allowed by RLS policies
-- 4. Service_role bypasses RLS entirely (admin use only)
-- 5. Anon role has no permissions by default (public endpoints only)

COMMENT ON TABLE organizations IS 'GRANT permissions: authenticated role has SELECT, UPDATE';
COMMENT ON TABLE user_profiles IS 'GRANT permissions: authenticated role has SELECT, INSERT, UPDATE';
COMMENT ON TABLE design_templates IS 'GRANT permissions: authenticated role has SELECT, INSERT, UPDATE, DELETE';
COMMENT ON TABLE design_assets IS 'GRANT permissions: authenticated role has SELECT, INSERT, UPDATE, DELETE';
