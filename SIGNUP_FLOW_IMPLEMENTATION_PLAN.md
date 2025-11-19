# Signup Flow Implementation Plan

**Date**: November 19, 2025
**Priority**: P0 - CRITICAL BLOCKER
**Estimated Time**: 4-6 hours
**Status**: PLANNING COMPLETE → READY TO IMPLEMENT

---

## Problem Statement

### Current Broken Behavior
```
User submits signup form
  ↓
supabase.auth.signUp() creates auth.users record ✅
  ↓
Redirects to /dashboard ❌
  ↓
Dashboard tries to fetch organization_id from user_profiles ❌
  ↓
ERROR: user_profiles record doesn't exist ❌
  ↓
Platform is completely non-functional ❌
```

### Root Cause
The signup page (`app/auth/signup/page.tsx`) only creates an `auth.users` record via Supabase Auth. It does **NOT** create:
1. `organizations` table entry (required)
2. `user_profiles` table entry (required)

All platform features require these records to exist.

---

## Architecture Analysis

### Current Database Schema

**Table: `organizations`** (Multi-tenant root)
- `id` (UUID, PK)
- `name` (TEXT, company/workspace name)
- `slug` (TEXT UNIQUE, URL-safe identifier)
- `plan_tier` (TEXT, default: 'free')
- `credits` (NUMERIC, default: 0.00)
- `stripe_customer_id`, `stripe_subscription_id` (for billing)
- Brand kit fields (logo, colors, fonts)
- Metadata (created_at, updated_at)

**Table: `user_profiles`** (Links users to organizations)
- `id` (UUID, PK, REFERENCES auth.users.id)
- `organization_id` (UUID, **NOT NULL**, REFERENCES organizations.id)
- `full_name` (TEXT NOT NULL)
- **Organization-Level Role** (`role`):
  - `owner` - Full org access, billing, user management
  - `admin` - Most access, cannot manage billing
  - `designer` - Can create/edit designs
  - `viewer` - Read-only access
  - `member` - Default (should be set to 'owner' for first user)
- **Platform-Level Role** (`platform_role` from migration 011):
  - `super_admin` - God mode (Federico only)
  - `admin` - Platform admin (can view all orgs)
  - `user` - Regular user (default)
- **Permission Flags** (boolean):
  - `can_create_designs` (default: true)
  - `can_send_campaigns` (default: false)
  - `can_manage_billing` (default: false)
  - `can_invite_users` (default: false)
  - `can_approve_designs` (default: false)
  - `can_manage_templates` (default: true)
  - `can_access_analytics` (default: true)

### Existing Triggers

**Trigger 1: `set_initial_platform_admin_role()`** (Migration 011)
- **When**: BEFORE INSERT ON `user_profiles`
- **What**: Sets `platform_role = 'admin'` for federicosciuca@gmail.com
- **Status**: ACTIVE ✅

**Trigger 2: `handle_new_user()`** (Migration 002)
- **When**: AFTER INSERT ON `auth.users`
- **What**: NOTHING (empty function body)
- **Status**: DISABLED (commented out in migration 002 lines 122-125)

---

## Solution Design

### Approach: Database Trigger (Recommended by Supabase)

**Why Trigger vs API Route?**

| Aspect | Database Trigger | API Route Approach |
|--------|------------------|-------------------|
| **Automatic** | ✅ Works for ALL signup methods (email, OAuth, phone) | ❌ Only works for email signup |
| **Atomic** | ✅ Organization + profile created in same transaction | ❌ Requires multiple API calls |
| **Client Changes** | ✅ Zero code changes needed | ❌ Need to update signup page |
| **Reliability** | ✅ Guaranteed to run | ❌ Can fail if client-side error |
| **Risk** | ⚠️ If trigger fails, signup is blocked | ✅ Signup succeeds, fix later |

**Decision**: Use database trigger for reliability and future OAuth support.

---

## Implementation Design

### Trigger Function Flow

```sql
User submits signup form
  ↓
auth.signUp() creates auth.users record (id, email, raw_user_meta_data)
  ↓
🔥 TRIGGER: on_auth_user_created fires (AFTER INSERT)
  ↓
handle_new_user_signup() function executes:

  1. Extract user data from NEW record:
     - email: NEW.email
     - full_name: NEW.raw_user_meta_data->>'full_name' || email_prefix

  2. Generate unique organization slug:
     - Base: email prefix (before @)
     - Make URL-safe: lowercase, replace non-alphanumeric with '-'
     - Check uniqueness: if exists, append counter (e.g., 'johndoe-2')

  3. CREATE organization:
     INSERT INTO organizations (
       name: "{full_name}'s Workspace"
       slug: unique slug from step 2
       plan_tier: 'free'
       credits: 10000  -- $100 in free credits (Data Axle @ $0.25/contact)
     )
     RETURNING id INTO new_org_id;

  4. CREATE user_profile:
     INSERT INTO user_profiles (
       id: NEW.id (same as auth.users.id)
       organization_id: new_org_id
       full_name: from metadata
       role: 'owner'  -- First user is ALWAYS owner
       platform_role: 'user'  -- Will be overridden to 'admin' for Federico by existing trigger
       can_send_campaigns: true  -- Owner gets full permissions
       can_manage_billing: true
       can_invite_users: true
       can_approve_designs: true
       -- Other permissions use table defaults
     )

  5. Existing trigger fires (BEFORE INSERT on user_profiles):
     - If email = federicosciuca@gmail.com → set platform_role = 'admin'

  6. RETURN NEW (allow signup to complete)

  EXCEPTION:
    - Log error with RAISE WARNING
    - RAISE EXCEPTION with user-friendly message
    - Signup is blocked (rollback transaction)

  ↓
Signup completes successfully
  ↓
User redirected to /dashboard
  ↓
Dashboard loads user_profile with organization_id ✅
  ↓
Platform fully functional ✅
```

---

## Migration File: `022_auto_create_org_profile_on_signup.sql`

```sql
-- ============================================================================
-- Migration 022: Auto-Create Organization & User Profile on Signup
-- Created: 2025-11-19
-- Purpose: Fix broken signup flow - automatically create organization and
--          user profile when a new user signs up via Supabase Auth
-- ============================================================================

-- Function to generate unique organization slug from email
CREATE OR REPLACE FUNCTION generate_org_slug_from_email(email TEXT)
RETURNS TEXT AS $$
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
  IF base_slug = '' THEN
    base_slug := 'workspace';
  END IF;

  final_slug := base_slug;

  -- Check uniqueness, append counter if slug already exists
  WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Main trigger function to create organization and user profile
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  user_full_name TEXT;
  user_email TEXT;
  org_name TEXT;
  org_slug TEXT;
BEGIN
  -- Extract user data from auth.users record
  user_email := NEW.email;
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',  -- From signup form
    split_part(NEW.email, '@', 1)          -- Fallback to email prefix
  );

  -- Generate organization name and slug
  org_name := user_full_name || '''s Workspace';
  org_slug := generate_org_slug_from_email(user_email);

  -- Step 1: Create organization for this user
  INSERT INTO organizations (
    name,
    slug,
    plan_tier,
    billing_status,
    credits,
    created_at,
    updated_at
  ) VALUES (
    org_name,
    org_slug,
    'free',      -- All new users start on free plan
    'trialing',  -- Give them a trial period
    10000.00,    -- $100 in free credits (Data Axle @ $0.25/contact = 400 contacts)
    NOW(),
    NOW()
  )
  RETURNING id INTO new_org_id;

  -- Step 2: Create user profile linked to organization
  INSERT INTO user_profiles (
    id,
    organization_id,
    full_name,
    role,
    platform_role,
    -- Owner permissions (first user gets full access)
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
    NEW.id,              -- Same ID as auth.users
    new_org_id,          -- Link to newly created org
    user_full_name,
    'owner',             -- First user is always organization owner
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

  -- Success - allow signup to proceed
  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error for debugging (visible in Postgres logs)
    RAISE WARNING 'Error in handle_new_user_signup for email %: %', user_email, SQLERRM;

    -- Return user-friendly error (visible to user)
    RAISE EXCEPTION 'Failed to create your account. Please try again or contact support@droplab.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
-- Note: This replaces the disabled trigger from migration 002
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_signup();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION generate_org_slug_from_email(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION handle_new_user_signup() TO service_role;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify trigger exists
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname = 'on_auth_user_created';

  IF trigger_count > 0 THEN
    RAISE NOTICE '✅ Trigger on_auth_user_created is active';
  ELSE
    RAISE WARNING '❌ Trigger on_auth_user_created was not created';
  END IF;
END $$;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION generate_org_slug_from_email IS
'Generates unique URL-safe organization slug from email address. Appends counter if slug already exists.';

COMMENT ON FUNCTION handle_new_user_signup IS
'Automatically creates organization and user_profile when new user signs up via Supabase Auth.
Triggered AFTER INSERT on auth.users. First user becomes organization owner with full permissions.';
```

---

## Testing Plan

### Test Case 1: Normal Signup Flow
```typescript
// Test signup with full name
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'secure123!',
  options: {
    data: {
      full_name: 'Test User',
    },
  },
});

// Verify:
// 1. auth.users record created ✓
// 2. organizations record created with slug 'test' ✓
// 3. user_profiles record created with:
//    - role = 'owner' ✓
//    - platform_role = 'user' ✓
//    - organization_id = new org ✓
//    - can_send_campaigns = true ✓
```

### Test Case 2: Slug Collision Handling
```typescript
// Signup two users with same email prefix
await supabase.auth.signUp({
  email: 'johndoe@gmail.com',
  password: 'password1',
});
// Expected: org slug = 'johndoe'

await supabase.auth.signUp({
  email: 'johndoe@yahoo.com',
  password: 'password2',
});
// Expected: org slug = 'johndoe-1'
```

### Test Case 3: Federico Admin Signup
```typescript
await supabase.auth.signUp({
  email: 'federicosciuca@gmail.com',
  password: 'adminpass',
  options: {
    data: {
      full_name: 'Federico Sciuca',
    },
  },
});

// Verify:
// - platform_role = 'admin' (set by existing trigger) ✓
// - role = 'owner' (first user of org) ✓
```

### Test Case 4: Missing Full Name Fallback
```typescript
await supabase.auth.signUp({
  email: 'nometadata@test.com',
  password: 'password123',
  // No options.data.full_name provided
});

// Verify:
// - full_name = 'nometadata' (from email prefix) ✓
// - org_name = 'nometadata's Workspace' ✓
```

### Test Case 5: Dashboard Access After Signup
```typescript
// 1. Signup
const { data: { session } } = await supabase.auth.signUp({...});

// 2. Navigate to /dashboard
// Expected: Page loads successfully with user data ✓

// 3. Fetch organization
const { data: profile } = await supabase
  .from('user_profiles')
  .select('organization_id, organizations(*)')
  .eq('id', session.user.id)
  .single();

// Expected: profile.organization_id exists ✓
// Expected: profile.organizations.name = "{full_name}'s Workspace" ✓
```

---

## Rollback Plan

If the trigger causes issues, disable it immediately:

```sql
-- Disable trigger (emergency)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Users can still sign up (only auth.users created)
-- Manually create missing org/profile records for affected users
```

---

## Success Criteria

✅ New users can sign up and immediately access dashboard
✅ Organization and user_profile are created automatically
✅ First user gets 'owner' role with full permissions
✅ Org slug is unique and URL-safe
✅ Federico gets platform 'admin' role automatically
✅ No changes needed to signup page code
✅ Works for future OAuth signups (Google, GitHub, etc.)

---

## Next Steps After Implementation

1. **Email Verification Flow** (8 hours)
   - Enable email confirmation in Supabase dashboard
   - Customize email templates with branding

2. **Password Reset Flow** (8 hours)
   - Create forgot-password page
   - Create reset-password page

3. **Rate Limiting** (16 hours)
   - Install @upstash/ratelimit
   - Apply to all API routes

4. **Stripe Billing** (60 hours)
   - Full subscription management
   - Usage metering
   - Credit purchase flow

---

**End of Implementation Plan**
