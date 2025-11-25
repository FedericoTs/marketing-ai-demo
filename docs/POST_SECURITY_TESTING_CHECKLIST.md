# Post-Security Hardening Testing Checklist

**Date**: 2025-11-25
**Purpose**: Verify all functionality works after security fixes

---

## 🎯 Critical Path Testing

### 1. Authentication & Authorization ✅ **TEST FIRST**

**Why Critical**: Security changes modified auth middleware and admin routes

#### Test Cases:

**A. User Login Flow**
```bash
# Test 1: Login with valid credentials
1. Go to: http://localhost:3000/auth/login
2. Login with: owner@acme-corp.test / Test123456!
3. Expected: Redirect to /dashboard
4. Verify: User name appears in header
Status: ___
```

**B. Admin Access**
```bash
# Test 2: Access admin route (authenticated)
1. Login as super_admin (federicosciuca@gmail.com)
2. Go to: http://localhost:3000/api/admin/verify-schema
3. Expected: JSON response with table status
Status: ___

# Test 3: Access admin route (non-admin)
1. Login as regular user (owner@acme-corp.test)
2. Go to: http://localhost:3000/api/admin/verify-schema
3. Expected: 403 Forbidden error
Status: ___

# Test 4: Access admin route (not logged in)
1. Logout
2. Go to: http://localhost:3000/api/admin/verify-schema
3. Expected: 401 Unauthorized error
Status: ___
```

**C. Environment Validation**
```bash
# Test 5: Check server logs
1. Look at terminal where npm run dev is running
2. Expected logs:
   - "🚀 Initializing server..."
   - "✅ Environment validation passed"
   - "✅ Server initialization complete"
3. Expected warning (development only):
   - "[Environment Validation] Warning: Using default encryption key in development"
Status: ___
```

---

### 2. Dashboard & Core UI ✅ **CRITICAL**

**Why Critical**: Main user interface and navigation

#### Test Cases:

**A. Dashboard Loading**
```bash
# Test 6: Dashboard loads correctly
1. Login with any user
2. Go to: http://localhost:3000/dashboard
3. Expected:
   - Organization stats cards load
   - Campaign performance cards display
   - Recent campaigns table shows
   - No console errors
Status: ___
```

**B. Navigation**
```bash
# Test 7: Sidebar navigation works
1. Click each menu item:
   - Dashboard → /dashboard
   - Campaigns → /campaigns
   - Templates → /templates
   - Landing Pages → /landing-pages
   - Analytics → /analytics
   - Settings → /settings
2. Expected: Each page loads without errors
Status: ___
```

---

### 3. Campaign Creation Flow ✅ **HIGH PRIORITY**

**Why Critical**: Core business functionality

#### Test Cases:

**A. Create Campaign**
```bash
# Test 8: Create new campaign
1. Go to: http://localhost:3000/campaigns
2. Click "Create Campaign"
3. Fill in:
   - Campaign name: "Security Test Campaign"
   - Message: "Test message"
   - Select template (if available)
4. Click "Create"
5. Expected: Campaign created successfully
Status: ___
```

**B. Campaign Dashboard**
```bash
# Test 9: View campaign details
1. Click on created campaign
2. Expected:
   - Campaign details load
   - Status displays correctly
   - No errors in console
Status: ___
```

---

### 4. Template System ✅ **CRITICAL**

**Why Critical**: Database functions were modified (template usage tracking)

#### Test Cases:

**A. Template Listing**
```bash
# Test 10: View templates
1. Go to: http://localhost:3000/templates
2. Expected:
   - Templates load and display
   - Thumbnails render
   - No database errors
Status: ___
```

**B. Template Usage Increment**
```bash
# Test 11: Use template in campaign
1. Create new campaign using a template
2. Check browser console for errors
3. Expected:
   - increment_template_usage() function works
   - No "function_search_path_mutable" errors
Status: ___
```

**C. Template Editor**
```bash
# Test 12: Open template editor
1. Go to: http://localhost:3000/dm-creative/editor
2. Try creating/editing a design
3. Expected:
   - Canvas loads
   - Tools work (text, images, QR code)
   - Save functionality works
Status: ___
```

---

### 5. Landing Pages ✅ **HIGH PRIORITY**

**Why Critical**: Encryption key changed, tracking functions modified

#### Test Cases:

**A. Landing Page Manager**
```bash
# Test 13: View landing pages
1. Go to: http://localhost:3000/landing-pages
2. Expected:
   - All landing pages list loads
   - Analytics display (views, scans, conversions)
   - Search works
Status: ___
```

**B. Public Landing Page Access**
```bash
# Test 14: Visit public landing page
1. Get a tracking code from landing pages list
2. Go to: http://localhost:3000/lp/[trackingCode]
3. Expected:
   - Page loads correctly
   - Encryption/decryption works
   - No errors in console
Status: ___
```

**C. Landing Page Tracking**
```bash
# Test 15: Submit form on landing page
1. Visit landing page
2. Fill out form (if present)
3. Submit
4. Go to Analytics
5. Expected:
   - Event tracked correctly
   - Conversion recorded (if applicable)
Status: ___
```

---

### 6. Analytics Dashboard ✅ **MEDIUM PRIORITY**

**Why Critical**: Campaign cost calculation function modified

#### Test Cases:

**A. Analytics Overview**
```bash
# Test 16: View analytics
1. Go to: http://localhost:3000/analytics
2. Expected:
   - Campaign stats load
   - Charts render
   - calculate_campaign_cost_metrics() works
   - No database function errors
Status: ___
```

**B. Campaign Performance**
```bash
# Test 17: Filter by campaign
1. Select a campaign from dropdown
2. Expected:
   - Campaign-specific metrics display
   - Events load correctly
   - Conversion rate calculates
Status: ___
```

---

### 7. Organization & User Management ✅ **CRITICAL**

**Why Critical**: Permission and role functions modified

#### Test Cases:

**A. Organization Settings**
```bash
# Test 18: View organization info
1. Go to: http://localhost:3000/settings
2. Click "Organization" tab
3. Expected:
   - Organization details load
   - get_user_organization() works
   - Storage usage displays
Status: ___
```

**B. User Permissions**
```bash
# Test 19: Check user permissions
1. View team members in dashboard
2. Expected:
   - user_has_permission() works
   - user_has_role() works
   - Role badges display correctly
Status: ___
```

**C. Team Management**
```bash
# Test 20: Manage team (owner only)
1. Login as owner
2. Go to dashboard → Team widget
3. Try changing a user's role
4. Expected:
   - Role update works
   - set_initial_platform_admin_role() if new admin
   - No errors
Status: ___
```

---

### 8. Billing & Credits ✅ **CRITICAL**

**Why Critical**: Credit functions (add_credits, spend_credits) were secured

#### Test Cases:

**A. View Credits**
```bash
# Test 21: Check credit balance
1. Go to: http://localhost:3000/dashboard
2. Look at "Credits" card
3. Expected:
   - Credit balance displays
   - No database errors
Status: ___
```

**B. Credit Deduction** (if you have test campaigns)
```bash
# Test 22: Spend credits
1. Create a campaign that costs credits
2. Check credit balance before and after
3. Expected:
   - spend_credits() function works
   - Balance updates correctly
   - Transaction logged
Status: ___
```

**C. Stripe Integration** (if configured)
```bash
# Test 23: Billing page
1. Go to: http://localhost:3000/settings → Billing tab
2. Expected:
   - Subscription status loads
   - Invoice history displays
   - No errors
Status: ___
```

---

### 9. Feature Flags ✅ **MEDIUM PRIORITY**

**Why Critical**: check_feature_flag and update_feature_flag functions modified

#### Test Cases:

**A. Feature Flag Check**
```bash
# Test 24: Feature flags work
1. Login as admin
2. Go to organization settings
3. Try toggling a feature flag (if UI exists)
4. Expected:
   - check_feature_flag() works
   - update_feature_flag() works
   - No errors
Status: ___
```

---

### 10. Storage & File Uploads ✅ **MEDIUM PRIORITY**

**Why Critical**: Storage functions (get_organization_storage_usage, check_storage_limit) modified

#### Test Cases:

**A. Upload Assets**
```bash
# Test 25: Upload image
1. Go to template editor or asset library
2. Try uploading an image
3. Expected:
   - Upload works
   - check_storage_limit() validates
   - get_organization_storage_usage() updates
Status: ___
```

**B. Storage Limit Display**
```bash
# Test 26: View storage usage
1. Go to organization settings
2. Check storage usage display
3. Expected:
   - get_organization_storage_mb() returns correct value
   - No errors
Status: ___
```

---

### 11. Admin Panel ✅ **CRITICAL FOR ADMINS**

**Why Critical**: All admin routes now require authentication

#### Test Cases:

**A. Seed Data** (admin only)
```bash
# Test 27: Create seed data
1. Login as super_admin
2. POST to: http://localhost:3000/api/admin/seed
3. Expected:
   - Authentication passes
   - Seed data created
   - 200 response
Status: ___

# Test 28: Try as non-admin
1. Login as regular user
2. POST to: http://localhost:3000/api/admin/seed
3. Expected: 403 Forbidden
Status: ___
```

**B. Schema Verification** (admin only)
```bash
# Test 29: Verify schema
1. Login as super_admin
2. GET: http://localhost:3000/api/admin/verify-schema
3. Expected:
   - All tables show as existing
   - RLS enabled status shown
   - 200 response
Status: ___
```

**C. User Management** (admin only)
```bash
# Test 30: List users
1. Login as super_admin
2. GET: http://localhost:3000/api/admin/users
3. Expected:
   - Users list returned
   - Platform roles visible
   - 200 response
Status: ___

# Test 31: Update user role
1. PUT to: http://localhost:3000/api/admin/users/[id]/role
2. Body: {"platform_role": "admin"}
3. Expected:
   - Role updated
   - Audit log created
   - 200 response
Status: ___
```

---

### 12. Database Performance ✅ **VERIFICATION**

**Why Critical**: Ensure search_path fixes didn't break function execution

#### Test Cases:

**A. Function Execution Speed**
```bash
# Test 32: Check query performance
1. Open browser DevTools → Network tab
2. Navigate to dashboard
3. Check API response times
4. Expected:
   - All API calls < 2 seconds
   - No timeout errors
   - Database functions execute normally
Status: ___
```

**B. No Search Path Errors**
```bash
# Test 33: Check server logs
1. Monitor server logs during testing
2. Look for:
   - "search_path" errors → Should be NONE
   - "function does not exist" → Should be NONE
3. Expected: Clean logs
Status: ___
```

---

## 🔍 Supabase Dashboard Verification

### 1. Security Advisors ✅ **MUST CHECK**

```bash
# Test 34: Verify security warnings reduced
1. Go to: https://supabase.com/dashboard/project/egccqmlhzqiirovstpal/database/advisors
2. Check warnings:
   - function_search_path_mutable: Should be 0 (was 34)
   - auth_leaked_password_protection: Still 1 (manual step pending)
3. Expected: Only 1 warning remaining
Status: ___
```

### 2. Database Logs ✅ **RECOMMENDED**

```bash
# Test 35: Check database logs
1. Go to: https://supabase.com/dashboard/project/egccqmlhzqiirovstpal/logs/postgres-logs
2. Look for errors in last 1 hour
3. Expected: No new errors related to functions
Status: ___
```

---

## 🚨 Critical Failure Scenarios to Test

### Test for Breaking Changes:

**Scenario 1: Admin route without auth**
```bash
Expected: 401/403 error
Test: curl http://localhost:3000/api/admin/seed
Status: ___
```

**Scenario 2: Missing environment variable**
```bash
Expected: Server startup fails with clear error
Test: Remove NEXT_PUBLIC_SUPABASE_URL from .env.local, restart server
Status: ___
```

**Scenario 3: Database function calls**
```bash
Expected: All execute successfully with SET search_path
Test: Create campaign, view analytics, manage team
Status: ___
```

---

## ✅ Test Summary

**Total Tests**: 35
**Passed**: ___
**Failed**: ___
**Skipped**: ___

---

## 🐛 Issues Found

If any tests fail, document here:

| Test # | Issue Description | Severity | Notes |
|--------|-------------------|----------|-------|
|        |                   |          |       |
|        |                   |          |       |

---

## 📊 Testing Priority

**Must Test Before Continuing Development**:
1. ✅ Authentication & Authorization (Tests 1-5)
2. ✅ Dashboard Loading (Test 6-7)
3. ✅ Admin Route Protection (Tests 27-31)
4. ✅ Database Functions (Tests 10-11, 15-17, 21-22)
5. ✅ Supabase Advisors (Test 34)

**Should Test**:
- Campaign creation flow (Tests 8-9)
- Template system (Tests 10-12)
- Landing pages (Tests 13-15)
- Analytics (Tests 16-17)

**Nice to Test**:
- Storage/uploads (Tests 25-26)
- Feature flags (Test 24)
- Performance (Tests 32-33)

---

## 🎯 Quick Smoke Test (5 minutes)

If you want a fast verification, run these minimum tests:

```bash
1. Login → Dashboard loads ✅
2. Create campaign → Works ✅
3. View analytics → Loads ✅
4. Access admin route as non-admin → 403 error ✅
5. Check Supabase Advisors → 0 search_path warnings ✅
```

If all 5 pass → **Safe to continue development**

---

**Recommendation**:
- Run **Quick Smoke Test** now (5 min)
- Run **Must Test** items before production deployment
- Run **Full Test Suite** before major releases

**Current Server Status**: ✅ Running on http://localhost:3000
**Security Hardening**: ✅ 98% Complete (1 manual step remaining)
