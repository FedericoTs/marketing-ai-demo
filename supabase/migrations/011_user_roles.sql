-- Migration 011: Add role-based access control to user_profiles
-- Created: 2025-11-06
-- Purpose: Replace hardcoded admin emails with database-driven role system
-- Note: Using 'platform_role' to distinguish from existing 'role' column (org-level)

-- ============================================================================
-- PART 1: Add platform_role column to user_profiles
-- ============================================================================

-- Add platform_role column with default 'user'
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS platform_role TEXT DEFAULT 'user' NOT NULL;

-- Add constraint to ensure valid roles only
ALTER TABLE user_profiles
ADD CONSTRAINT valid_platform_role
CHECK (platform_role IN ('user', 'admin', 'super_admin'));

-- Create index for fast platform_role lookups (used in auth checks)
CREATE INDEX IF NOT EXISTS idx_user_profiles_platform_role ON user_profiles(platform_role);

-- Add audit columns for platform_role changes
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS platform_role_updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS platform_role_updated_by UUID REFERENCES auth.users(id);

-- ============================================================================
-- PART 2: Set initial admin user (Federico)
-- ============================================================================

-- First, get Federico's user ID from auth.users
DO $$
DECLARE
  federico_user_id UUID;
BEGIN
  -- Find Federico's user ID in auth.users
  SELECT id INTO federico_user_id
  FROM auth.users
  WHERE email = 'federicosciuca@gmail.com';

  IF federico_user_id IS NOT NULL THEN
    -- Set Federico as platform admin if he exists in user_profiles
    UPDATE user_profiles
    SET
      platform_role = 'admin',
      platform_role_updated_at = NOW()
    WHERE id = federico_user_id;

    RAISE NOTICE 'Set Federico (%) as platform admin', federico_user_id;
  ELSE
    RAISE NOTICE 'Federico not found in auth.users yet (will be set on first login)';
  END IF;
END $$;

-- If Federico doesn't exist yet, we'll set his role on first login via trigger
-- (handled by existing user creation flow)

-- ============================================================================
-- PART 3: Create function to auto-set admin platform_role for Federico on signup
-- ============================================================================

-- This ensures Federico gets platform admin role even on fresh signup
CREATE OR REPLACE FUNCTION set_initial_platform_admin_role()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.id;

  -- Auto-promote Federico to platform admin on account creation
  IF user_email = 'federicosciuca@gmail.com' THEN
    NEW.platform_role := 'admin';
    NEW.platform_role_updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run on user_profiles insert
DROP TRIGGER IF EXISTS trigger_set_initial_platform_admin_role ON user_profiles;
CREATE TRIGGER trigger_set_initial_platform_admin_role
  BEFORE INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_initial_platform_admin_role();

-- ============================================================================
-- PART 4: Create function to update platform_role_updated_at on role change
-- ============================================================================

CREATE OR REPLACE FUNCTION update_platform_role_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.platform_role IS DISTINCT FROM OLD.platform_role THEN
    NEW.platform_role_updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_platform_role_timestamp ON user_profiles;
CREATE TRIGGER trigger_update_platform_role_timestamp
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_role_timestamp();

-- ============================================================================
-- PART 5: Grant necessary permissions
-- ============================================================================

-- Service role needs to read/update roles for admin management
GRANT SELECT, UPDATE ON user_profiles TO service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  admin_count INTEGER;
  federico_platform_role TEXT;
  federico_user_id UUID;
BEGIN
  -- Count total platform admins
  SELECT COUNT(*) INTO admin_count
  FROM user_profiles
  WHERE platform_role = 'admin' OR platform_role = 'super_admin';

  RAISE NOTICE 'Total platform admin users: %', admin_count;

  -- Check Federico's platform role
  SELECT id INTO federico_user_id
  FROM auth.users
  WHERE email = 'federicosciuca@gmail.com';

  IF federico_user_id IS NOT NULL THEN
    SELECT platform_role INTO federico_platform_role
    FROM user_profiles
    WHERE id = federico_user_id;

    IF federico_platform_role IS NOT NULL THEN
      RAISE NOTICE 'Federico platform_role: %', federico_platform_role;
    ELSE
      RAISE NOTICE 'Federico found in auth.users but not in user_profiles yet';
    END IF;
  ELSE
    RAISE NOTICE 'Federico not found in auth.users (will be set on first login)';
  END IF;
END $$;
