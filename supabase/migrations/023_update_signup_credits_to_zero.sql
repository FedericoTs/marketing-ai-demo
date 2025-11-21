-- ============================================================================
-- Migration 023: Update Signup Flow - Set Default Credits to $0
-- Created: 2025-11-20
-- Purpose: Update handle_new_user_signup() to create organizations with $0
--          credits instead of $100, and billing_status='incomplete'
-- Dependencies: Migration 022 (auto signup flow)
-- ============================================================================

-- This migration only updates the trigger function, no schema changes needed

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
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
    split_part(user_email, '@', 1)
  );

  -- Check if this is a public email domain
  is_public_domain := email_domain = ANY(public_domains);

  -- Generate organization name based on email domain
  IF is_public_domain THEN
    org_name := user_full_name || '''s Workspace';
    email_domain := NULL;
  ELSE
    org_name := initcap(
      replace(
        regexp_replace(
          split_part(email_domain, '.', 1),
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
      billing_status,          -- UPDATED: 'incomplete' instead of 'trialing'
      credits,                 -- UPDATED: 0.00 instead of 10000.00
      monthly_design_limit,    -- UPDATED: 0 instead of 100
      monthly_sends_limit,     -- UPDATED: 0 instead of 1000
      created_at,
      updated_at
    ) VALUES (
      org_name,
      org_slug,
      email_domain,
      'free',
      'incomplete',            -- Waiting for subscription payment
      0.00,                    -- $0 credits until subscription is paid
      0,                       -- 0 designs/month until subscription is paid
      0,                       -- 0 sends/month until subscription is paid
      NOW(),
      NOW()
    )
    RETURNING id INTO new_org_id;

    RAISE NOTICE 'Created organization % (slug: %, domain: %) for user % with $0 credits, 0 monthly limits',
      org_name, org_slug, COALESCE(email_domain, 'public'), user_email;

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
      true,
      true,
      true,
      true,
      true,
      true,
      true,
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

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'SIGNUP ERROR for email %: %', user_email, SQLERRM;
    RAISE EXCEPTION 'We encountered an error creating your account. Please try again or contact support@droplab.com if the problem persists.';
END;
$$;

-- Verify function was updated
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 023 completed - handle_new_user_signup() updated';
  RAISE NOTICE 'ℹ️  New users will now start with:';
  RAISE NOTICE '   - credits: $0.00 (instead of $100.00)';
  RAISE NOTICE '   - monthly_design_limit: 0 (instead of 100)';
  RAISE NOTICE '   - monthly_sends_limit: 0 (instead of 1000)';
  RAISE NOTICE '   - billing_status: incomplete (instead of trialing)';
  RAISE NOTICE '   ';
  RAISE NOTICE '   After subscription payment:';
  RAISE NOTICE '   - credits: $499.00 (Month 1) or $99.00 (Month 2+)';
  RAISE NOTICE '   - monthly_design_limit: Should be updated by webhook (TODO)';
  RAISE NOTICE '   - monthly_sends_limit: Should be updated by webhook (TODO)';
END $$;

-- ============================================================================
-- END OF MIGRATION 023
-- ============================================================================
