-- ============================================================================
-- Migration 022: Auto-Create Organization & User Profile on Signup
-- Created: 2025-11-19
-- Purpose: Fix broken signup flow - automatically create organization and
--          user profile when a new user signs up via Supabase Auth
-- Dependencies: Migrations 001 (organizations), 002 (user_profiles), 011 (platform_role)
-- ============================================================================

-- PART 1: Add email_domain column to organizations table for duplicate detection
-- ============================================================================

-- Add email_domain column (NULL for public email domains like Gmail)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS email_domain TEXT;

-- Create index for fast domain lookups (used in Phase 2 for workspace detection)
CREATE INDEX IF NOT EXISTS idx_organizations_email_domain
ON organizations(email_domain);

-- Add documentation comment
COMMENT ON COLUMN organizations.email_domain IS
'Email domain for company workspaces (e.g., ''acme.com'').
NULL for personal workspaces using public email providers (Gmail, Yahoo, etc.).
Used for duplicate organization detection and smart workspace suggestions.';

-- ============================================================================
-- PART 2: Create helper function to generate unique organization slug
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_org_slug_from_email(email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Extract part before @ and make URL-safe
  -- Example: "john.doe+test@example.com" → "johndoe-test"
  base_slug := lower(
    regexp_replace(
      split_part(email, '@', 1),  -- Get part before @
      '[^a-z0-9]+',                -- Find non-alphanumeric chars
      '-',                         -- Replace with dash
      'g'                          -- Global replace
    )
  );

  -- Remove leading/trailing dashes
  base_slug := trim(both '-' from base_slug);

  -- Ensure slug is not empty (fallback to 'workspace')
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'workspace';
  END IF;

  -- Truncate to 50 chars max (slug column might have limits)
  base_slug := substring(base_slug from 1 for 50);

  final_slug := base_slug;

  -- Check uniqueness, append counter if slug already exists
  -- This prevents duplicate slug errors
  WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = final_slug) LOOP
    counter := counter + 1;
    -- Ensure final slug doesn't exceed reasonable length
    final_slug := substring(base_slug from 1 for 45) || '-' || counter;

    -- Safety limit: prevent infinite loop (should never happen)
    IF counter > 1000 THEN
      RAISE EXCEPTION 'Unable to generate unique slug after 1000 attempts';
    END IF;
  END LOOP;

  RETURN final_slug;
END;
$$;

-- Grant permissions to service role (needed for trigger execution)
GRANT EXECUTE ON FUNCTION generate_org_slug_from_email(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION generate_org_slug_from_email(TEXT) TO postgres;

-- Add documentation comment
COMMENT ON FUNCTION generate_org_slug_from_email IS
'Generates unique URL-safe organization slug from email address.
Appends counter (-1, -2, etc.) if slug already exists.
Example: john.doe@test.com → johndoe (or johndoe-1 if taken).';

-- ============================================================================
-- PART 3: Create main trigger function to handle new user signup
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  user_full_name TEXT;
  user_email TEXT;
  email_domain TEXT;
  org_name TEXT;
  org_slug TEXT;
  is_public_domain BOOLEAN;
  public_domains TEXT[] := ARRAY[
    'gmail.com', 'googlemail.com',
    'yahoo.com', 'yahoo.co.uk', 'yahoo.fr',
    'hotmail.com', 'outlook.com', 'live.com',
    'icloud.com', 'me.com', 'mac.com',
    'protonmail.com', 'proton.me',
    'mail.com', 'aol.com', 'zoho.com',
    'yandex.com', 'gmx.com', 'tutanota.com'
  ];
BEGIN
  -- Extract user data from auth.users NEW record
  user_email := NEW.email;
  email_domain := lower(split_part(user_email, '@', 2));

  -- Get full name from metadata, fallback to email prefix
  user_full_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),  -- From signup form
    NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),       -- Alternative metadata field
    split_part(user_email, '@', 1)                           -- Fallback to email prefix
  );

  -- Check if this is a public email domain
  is_public_domain := email_domain = ANY(public_domains);

  -- Generate organization name based on email domain
  IF is_public_domain THEN
    -- Personal workspace for public email domains
    org_name := user_full_name || '''s Workspace';
    email_domain := NULL;  -- Don't store public domains (for privacy + duplicate detection)
  ELSE
    -- Use company domain as org name
    -- Example: "acme-corp.com" → "Acme Corp"
    org_name := initcap(
      replace(
        regexp_replace(
          split_part(email_domain, '.', 1),  -- Get domain without TLD
          '-',
          ' ',                               -- Replace dashes with spaces
          'g'
        ),
        '_',
        ' '                                  -- Replace underscores with spaces
      )
    );
  END IF;

  -- Generate unique slug
  org_slug := generate_org_slug_from_email(user_email);

  -- STEP 1: Create organization for this user
  BEGIN
    INSERT INTO organizations (
      name,
      slug,
      email_domain,   -- NEW: Track which domain this org belongs to (NULL for public domains)
      plan_tier,
      billing_status,
      credits,
      created_at,
      updated_at
    ) VALUES (
      org_name,
      org_slug,
      email_domain,   -- Will be NULL for public domains
      'free',         -- All new users start on free plan
      'incomplete',   -- Waiting for subscription payment
      0.00,           -- $0 credits until subscription is paid
      NOW(),
      NOW()
    )
    RETURNING id INTO new_org_id;

    RAISE NOTICE 'Created organization % (slug: %, domain: %) for user %',
      org_name, org_slug, COALESCE(email_domain, 'public'), user_email;

  EXCEPTION
    WHEN unique_violation THEN
      -- Slug collision despite our check (race condition)
      RAISE EXCEPTION 'Organization slug conflict. Please try signing up again.';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to create organization: %', SQLERRM;
  END;

  -- STEP 2: Create user profile linked to organization
  BEGIN
    INSERT INTO user_profiles (
      id,
      organization_id,
      full_name,
      email,
      role,
      platform_role,
      -- Owner permissions (first user gets full access to their organization)
      can_create_designs,
      can_send_campaigns,
      can_manage_billing,
      can_invite_users,
      can_approve_designs,
      can_manage_templates,
      can_access_analytics,
      created_at,
      updated_at,
      last_active_at
    ) VALUES (
      NEW.id,              -- Same ID as auth.users (foreign key)
      new_org_id,          -- Link to newly created org
      user_full_name,
      user_email,
      'owner',             -- First user is ALWAYS organization owner
      'user',              -- Platform role (will be overridden for Federico by existing trigger)
      -- Grant full permissions to organization owner
      true,  -- can_create_designs
      true,  -- can_send_campaigns
      true,  -- can_manage_billing
      true,  -- can_invite_users
      true,  -- can_approve_designs
      true,  -- can_manage_templates
      true,  -- can_access_analytics
      NOW(),
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Created user profile for % (id: %) in organization %',
      user_email, NEW.id, new_org_id;

  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE EXCEPTION 'Failed to link user to organization. Database integrity error.';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to create user profile: %', SQLERRM;
  END;

  -- Success - allow signup to proceed
  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error for debugging (visible in Postgres logs)
    RAISE WARNING 'SIGNUP ERROR for email %: %', user_email, SQLERRM;

    -- Return user-friendly error (this will block the signup)
    RAISE EXCEPTION 'We encountered an error creating your account. Please try again or contact support@droplab.com if the problem persists.';
END;
$$;

-- Grant permissions to service role (Supabase Auth runs as service role)
GRANT EXECUTE ON FUNCTION handle_new_user_signup() TO service_role;
GRANT EXECUTE ON FUNCTION handle_new_user_signup() TO postgres;

-- Add documentation comment
COMMENT ON FUNCTION handle_new_user_signup IS
'Automatically creates organization and user_profile when new user signs up via Supabase Auth.
Triggered AFTER INSERT on auth.users. First user becomes organization owner with full permissions.
Handles both company emails (creates company workspace) and public emails (creates personal workspace).';

-- ============================================================================
-- PART 4: Create trigger on auth.users table
-- ============================================================================

-- Drop existing trigger if it exists (from migration 002, it was disabled)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_signup();

-- ============================================================================
-- PART 5: Verification
-- ============================================================================

DO $$
DECLARE
  trigger_count INTEGER;
  org_column_exists BOOLEAN;
BEGIN
  -- Verify trigger exists
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname = 'on_auth_user_created'
  AND tgrelid = 'auth.users'::regclass;

  IF trigger_count > 0 THEN
    RAISE NOTICE '✅ Trigger on_auth_user_created is active on auth.users';
  ELSE
    RAISE WARNING '❌ Trigger on_auth_user_created was not created!';
  END IF;

  -- Verify email_domain column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organizations'
    AND column_name = 'email_domain'
  ) INTO org_column_exists;

  IF org_column_exists THEN
    RAISE NOTICE '✅ Column email_domain added to organizations table';
  ELSE
    RAISE WARNING '❌ Column email_domain was not added!';
  END IF;

  -- Show current trigger status
  RAISE NOTICE '✅ Migration 022 completed successfully';
  RAISE NOTICE 'ℹ️  New users will now automatically get an organization and user profile';
  RAISE NOTICE 'ℹ️  Federico will automatically get platform_role=admin (via existing trigger)';
END $$;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (For Emergency Use)
-- ============================================================================

-- If this migration causes issues, run these commands to rollback:
--
-- -- Disable trigger
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--
-- -- Drop functions
-- DROP FUNCTION IF EXISTS handle_new_user_signup();
-- DROP FUNCTION IF EXISTS generate_org_slug_from_email(TEXT);
--
-- -- Optionally remove email_domain column (will lose data!)
-- -- ALTER TABLE organizations DROP COLUMN IF EXISTS email_domain;
--
-- Users can still sign up after rollback (only auth.users created)
-- but will need manual org/profile creation

-- ============================================================================
-- END OF MIGRATION 022
-- ============================================================================
