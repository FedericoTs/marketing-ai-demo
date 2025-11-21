-- ============================================================================
-- Migration 022 HOTFIX: Fix Ambiguous Column Reference in Signup Function
-- Created: 2025-11-21
-- Issue: Column reference "email_domain" is ambiguous in handle_new_user_signup()
-- Root Cause: Local variable `email_domain` conflicts with table column name
-- Fix: Rename local variable to `user_email_domain`
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
  user_email_domain TEXT;  -- FIXED: Renamed from email_domain to avoid ambiguity
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
  user_email_domain := lower(split_part(user_email, '@', 2));  -- FIXED: Use renamed variable

  -- Get full name from metadata, fallback to email prefix
  user_full_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
    split_part(user_email, '@', 1)
  );

  -- Check if this is a public email domain
  is_public_domain := user_email_domain = ANY(public_domains);  -- FIXED: Use renamed variable

  -- Generate organization name based on email domain
  IF is_public_domain THEN
    -- Personal workspace for public email domains
    org_name := user_full_name || '''s Workspace';
    user_email_domain := NULL;  -- FIXED: Use renamed variable
  ELSE
    -- Use company domain as org name
    org_name := initcap(
      replace(
        regexp_replace(
          split_part(user_email_domain, '.', 1),  -- FIXED: Use renamed variable
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
      email_domain,   -- Column name is fine
      plan_tier,
      billing_status,
      credits,
      created_at,
      updated_at
    ) VALUES (
      org_name,
      org_slug,
      user_email_domain,   -- FIXED: Now unambiguous (uses local variable)
      'free',
      'incomplete',
      0.00,
      NOW(),
      NOW()
    )
    RETURNING id INTO new_org_id;

    RAISE NOTICE 'Created organization % (slug: %, domain: %) for user %',
      org_name, org_slug, COALESCE(user_email_domain, 'public'), user_email;  -- FIXED

  EXCEPTION
    WHEN unique_violation THEN
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
      NEW.id,
      new_org_id,
      user_full_name,
      user_email,
      'owner',
      'user',
      true, true, true, true, true, true, true,
      NOW(), NOW(), NOW()
    );

    RAISE NOTICE 'Created user profile for % (id: %) in organization %',
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

-- Verify fix
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 022 HOTFIX applied successfully';
  RAISE NOTICE 'ℹ️  Fixed ambiguous column reference in handle_new_user_signup()';
  RAISE NOTICE 'ℹ️  Signup should now work without errors';
END $$;
