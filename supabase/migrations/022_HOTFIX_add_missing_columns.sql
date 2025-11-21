-- ============================================================================
-- HOTFIX for Migration 022: Add Missing Columns to INSERT Statement
-- CRITICAL: Signup is broken without this!
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
  user_email := NEW.email;
  email_domain := lower(split_part(user_email, '@', 2));

  user_full_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
    split_part(user_email, '@', 1)
  );

  is_public_domain := email_domain = ANY(public_domains);

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

  org_slug := generate_org_slug_from_email(user_email);

  BEGIN
    -- HOTFIX: Added monthly_design_limit and monthly_sends_limit
    INSERT INTO organizations (
      name,
      slug,
      email_domain,
      plan_tier,
      billing_status,
      credits,
      monthly_design_limit,    -- ADDED
      monthly_sends_limit,     -- ADDED
      created_at,
      updated_at
    ) VALUES (
      org_name,
      org_slug,
      email_domain,
      'free',
      'incomplete',
      0.00,
      0,                       -- ADDED: 0 until subscription paid
      0,                       -- ADDED: 0 until subscription paid
      NOW(),
      NOW()
    )
    RETURNING id INTO new_org_id;

    RAISE NOTICE 'Created organization % (slug: %, domain: %) for user %',
      org_name, org_slug, COALESCE(email_domain, 'public'), user_email;

  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Organization slug conflict. Please try signing up again.';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to create organization: %', SQLERRM;
  END;

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
      RAISE EXCEPTION 'Failed to link user to organization.';
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

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ HOTFIX applied - signup should now work!';
  RAISE NOTICE 'ℹ️  New users will get: credits=$0, monthly_design_limit=0, monthly_sends_limit=0';
END $$;
