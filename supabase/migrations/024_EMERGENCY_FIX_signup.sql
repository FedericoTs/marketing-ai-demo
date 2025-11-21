-- ============================================================================
-- Migration 024 EMERGENCY FIX: Auto-approve organization owners on signup
-- Created: 2025-11-21
-- Issue: New users (org owners) see "Waiting for Approval" modal after signup
-- Root Cause: approval_status not set during signup, defaults to NULL/pending
-- Solution: Set approval_status='approved' for organization owners
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
  user_email_domain TEXT;
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
  user_email_domain := lower(split_part(user_email, '@', 2));

  -- Get full name from metadata, fallback to email prefix
  user_full_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
    split_part(user_email, '@', 1)
  );

  -- Check if this is a public email domain
  is_public_domain := user_email_domain = ANY(public_domains);

  -- Generate organization name based on email domain
  IF is_public_domain THEN
    -- Personal workspace for public email domains
    org_name := user_full_name || '''s Workspace';
    user_email_domain := NULL;
  ELSE
    -- Use company domain as org name
    org_name := initcap(
      replace(
        regexp_replace(
          split_part(user_email_domain, '.', 1),
          '-',
          ' ',
          'g'
        ),
        '_',
        ' '
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
      email_domain,
      plan_tier,
      billing_status,
      credits,
      created_at,
      updated_at
    ) VALUES (
      org_name,
      org_slug,
      user_email_domain,
      'free',
      'incomplete',
      0.00,
      NOW(),
      NOW()
    )
    RETURNING id INTO new_org_id;

    RAISE NOTICE 'Created organization % (slug: %, domain: %) for user %',
      org_name, org_slug, COALESCE(user_email_domain, 'public'), user_email;

  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Organization slug conflict. Please try signing up again.';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to create organization: %', SQLERRM;
  END;

  -- STEP 2: Create user profile linked to organization
  -- CRITICAL FIX: Organization owners must be auto-approved (no waiting period)
  BEGIN
    INSERT INTO user_profiles (
      id,
      organization_id,
      full_name,
      role,
      platform_role,
      can_create_designs,
      can_send_campaigns,
      can_manage_billing,
      can_invite_users,
      can_approve_designs,
      can_manage_templates,
      can_access_analytics,
      approval_status,      -- FIXED: Auto-approve owner
      approved_at,          -- FIXED: Set approval timestamp
      approved_by,          -- FIXED: Self-approved
      created_at,
      updated_at,
      last_active_at
    ) VALUES (
      NEW.id,
      new_org_id,
      user_full_name,
      'owner',
      'user',
      true, true, true, true, true, true, true,
      'approved',           -- FIXED: Owner gets immediate access
      NOW(),               -- FIXED: Approved at signup time
      NEW.id,              -- FIXED: Self-approved (owner approves themselves)
      NOW(), NOW(), NOW()
    );

    RAISE NOTICE 'Created user profile for % (id: %) in organization % with APPROVED status',
      user_email, NEW.id, new_org_id;

  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE EXCEPTION 'Failed to link user to organization. Database integrity error.';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to create user profile: %', SQLERRM;
  END;

  -- Success
  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'SIGNUP ERROR for email %: %', user_email, SQLERRM;
    RAISE EXCEPTION 'We encountered an error creating your account. Please try again or contact support@droplab.com if the problem persists.';
END;
$$;

-- Fix existing pending owners (users who signed up before this fix)
UPDATE user_profiles
SET 
  approval_status = 'approved',
  approved_at = created_at,
  approved_by = id
WHERE 
  role = 'owner'
  AND (approval_status IS NULL OR approval_status = 'pending');

-- Verify fix
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM user_profiles
  WHERE role = 'owner' AND approval_status = 'approved';
  
  RAISE NOTICE '✅ Migration 024 EMERGENCY FIX applied successfully';
  RAISE NOTICE 'ℹ️  Organization owners now auto-approved on signup';
  RAISE NOTICE 'ℹ️  Fixed % existing owner(s) with pending status', fixed_count;
  RAISE NOTICE 'ℹ️  Team members (role != owner) still require approval';
END $$;
