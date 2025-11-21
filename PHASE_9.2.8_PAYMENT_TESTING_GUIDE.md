# Phase 9.2.8: End-to-End Payment Flow Testing Guide

**Date**: November 21, 2025
**Status**: Ready for Testing
**Branch**: `feature/supabase-parallel-app`

---

## 🎯 Objective

Comprehensive guide for testing the complete Stripe payment integration end-to-end, from user signup to feature unlock, covering all edge cases and webhook scenarios.

---

## 📋 Prerequisites

### 1. Environment Variables

Verify all Stripe environment variables are configured in `.env.local`:

```bash
# Required Stripe Variables
STRIPE_SECRET_KEY=sk_test_...              # Stripe test secret key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Stripe test publishable key
STRIPE_PRICE_ID=price_...                  # Monthly subscription price ID ($499/month)
STRIPE_WEBHOOK_SECRET=whsec_...            # Webhook signing secret

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3001  # App base URL for redirects
```

**Verification**:
```bash
# Check if variables are loaded
grep STRIPE .env.local

# Verify Stripe CLI is installed
stripe --version

# Login to Stripe
stripe login
```

### 2. Database Migration Status

Ensure Migration 023 is applied (sets new signups to billing_status='incomplete'):

```sql
-- Check migration status
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 5;

-- Should include: 023_update_signup_credits_to_zero.sql
```

###3. Stripe Test Mode Configuration

**Stripe Dashboard → Developers → Webhooks**:
1. Create webhook endpoint: `https://your-domain.com/api/stripe/webhook`
2. Select events:
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
3. Copy webhook signing secret → `STRIPE_WEBHOOK_SECRET`

### 4. Test Card Numbers

Stripe provides test cards for different scenarios:

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0341` | Requires 3D Secure authentication |
| `4000 0025 0000 3155` | Payment requires authentication (fails) |
| `4000 0000 0000 9995` | Payment declined (insufficient funds) |
| `4000 0000 0000 0069` | Charge succeeds but fails later (async) |

**Expiry**: Any future date (e.g., `12/34`)
**CVC**: Any 3 digits (e.g., `123`)
**ZIP**: Any 5 digits (e.g., `12345`)

---

## 🧪 Testing Scenarios

### Test Scenario 1: New User Signup → Payment → Feature Unlock

**Objective**: Verify complete happy path from signup to payment to feature access

#### Steps:

**1. Sign Up**
```bash
# Navigate to app
open http://localhost:3001/auth/signup

# Create account
Email: test+$(date +%s)@example.com
Password: TestPassword123!
Organization: Test Org $(date +%s)
```

**2. Verify Initial State**
```sql
-- Check organization created with incomplete status
SELECT id, name, billing_status, credits, stripe_customer_id, stripe_subscription_id
FROM organizations
WHERE name LIKE 'Test Org%'
ORDER BY created_at DESC
LIMIT 1;

-- Expected:
-- billing_status = 'incomplete'
-- credits = 0.00
-- stripe_customer_id = NULL (created on first payment attempt)
-- stripe_subscription_id = NULL (created with customer)
```

**3. Navigate to Dashboard**
```bash
# Should see orange payment banner
open http://localhost:3001/dashboard
```

**Expected UI**:
- ⚠️ Orange banner: "Complete your subscription to access all features"
- "Complete Payment" button prominently displayed
- Credits: $0.00
- Organization info displayed

**4. Attempt to Access Locked Features**

```bash
# Try to create campaign
open http://localhost:3001/campaigns/create

# Try to save template
open http://localhost:3001/templates
```

**Expected Behavior**:
- 🔒 **Modal/card displayed**: "Subscription Required"
- ✅ Message: "Complete your subscription to create campaigns"
- ✅ "Complete Payment" CTA button
- ✅ Features blocked (no form displayed)

**5. Click "Complete Payment"**

**Expected Flow**:
1. ✅ Button shows loading spinner
2. ✅ API call to `/api/stripe/create-checkout-session`
3. ✅ Creates Stripe Customer (if not exists)
4. ✅ Creates Stripe Subscription with status='incomplete'
5. ✅ Redirects to Stripe Checkout page
6. ✅ Displays $499/month subscription details

**6. Complete Payment in Stripe Checkout**

**Card Details**:
- Card: `4242 4242 4242 4242`
- Expiry: `12/34`
- CVC: `123`
- Name: `Test User`
- Email: Same as signup

**Expected**:
- ✅ Payment processes successfully
- ✅ Redirects to `/dashboard/payment-success?session_id=cs_test_...`

**7. Payment Success Page**

**Expected UI**:
- ✅ Success message: "Payment Successful!"
- ✅ Credits granted: "$499.00"
- ✅ Subscription status: "active"
- ✅ "Go to Dashboard" button

**8. Verify Database State**

```sql
-- Check organization after payment
SELECT id, name, billing_status, credits, stripe_customer_id, stripe_subscription_id
FROM organizations
WHERE name LIKE 'Test Org%'
ORDER BY created_at DESC
LIMIT 1;

-- Expected:
-- billing_status = 'active'
-- credits = 499.00
-- stripe_customer_id = 'cus_...' (populated)
-- stripe_subscription_id = 'sub_...' (populated)
```

**9. Verify Webhooks Were Received**

```bash
# Check server logs (should show):
[Webhook] ✅ Received verified event: customer.subscription.created
[Webhook] ✅ Received verified event: invoice.payment_succeeded
[Webhook] Billing cycle: Month 1 (reason: subscription_create)
[Credits] Month 1 payment: Granting full amount $499.00
[Credits] ✅ Successfully added $499.00 credits to [Org Name]
```

**10. Verify Feature Unlock**

```bash
# Dashboard - No payment banner
open http://localhost:3001/dashboard
```

**Expected**:
- ✅ **NO orange payment banner**
- ✅ Credits displayed: "$499.00"
- ✅ Full dashboard access

```bash
# Try to create campaign again
open http://localhost:3001/campaigns/create
```

**Expected**:
- ✅ **Campaign creation form loads**
- ✅ No payment modal/lock
- ✅ All fields accessible

```bash
# Try to save template
open http://localhost:3001/templates
```

**Expected**:
- ✅ **Template editor loads**
- ✅ "Save Template" button enabled
- ✅ No payment lock

**11. Test Audience Features**

```bash
# Try to save audience
open http://localhost:3001/audiences
```

**Expected**:
- ✅ **Audience builder accessible**
- ✅ Save/purchase buttons enabled

---

### Test Scenario 2: Recurring Payment (Month 2)

**Objective**: Verify recurring billing grants capped $99 credits

#### Steps:

**1. Simulate Recurring Billing**

```bash
# Use Stripe CLI to trigger next billing cycle
stripe trigger invoice.payment_succeeded \
  --override customer=cus_[from_database] \
  --override subscription=sub_[from_database] \
  --override amount_paid=49900 \
  --override billing_reason=subscription_cycle
```

**2. Verify Webhook Logs**

```bash
# Server logs should show:
[Webhook] ✅ Received verified event: invoice.payment_succeeded
[Webhook] Billing cycle: Month 2 (reason: subscription_cycle)
[Credits] Month 2 payment: Granting capped amount $99.00
[Credits] ✅ Successfully added $99.00 credits
```

**3. Verify Database**

```sql
SELECT name, credits
FROM organizations
WHERE id = '[org_id]';

-- Expected:
-- credits = 598.00 ($499 + $99)
```

**4. Verify Dashboard**

```bash
open http://localhost:3001/dashboard
```

**Expected**:
- ✅ Credits: "$598.00"
- ✅ Still active, no payment banner

---

### Test Scenario 3: Payment Failure

**Objective**: Verify failed payment updates status to 'past_due'

#### Steps:

**1. Simulate Payment Failure**

```bash
stripe trigger invoice.payment_failed \
  --override customer=cus_[from_database] \
  --override subscription=sub_[from_database]
```

**2. Verify Webhook Logs**

```bash
# Server logs:
[Webhook] ⚠️  Payment failed for organization [org_id] - status updated to past_due
```

**3. Verify Database**

```sql
SELECT name, billing_status, credits
FROM organizations
WHERE id = '[org_id]';

-- Expected:
-- billing_status = 'past_due'
-- credits = 598.00 (unchanged)
```

**4. Verify Feature Gating**

```bash
open http://localhost:3001/campaigns/create
```

**Expected (per feature gating rules)**:
- 🔒 **Campaign creation locked** (past_due restricts campaign sending)
- ✅ Dashboard accessible
- ✅ Templates accessible (past_due allows template viewing)

---

### Test Scenario 4: Subscription Cancellation

**Objective**: Verify subscription cancellation locks all features

#### Steps:

**1. Cancel Subscription via Stripe**

```bash
# Via Stripe CLI
stripe subscriptions cancel sub_[from_database]

# OR via Dashboard: Customers → [Customer] → Subscriptions → Cancel
```

**2. Verify Webhook Triggered**

```bash
stripe trigger customer.subscription.deleted \
  --override customer=cus_[from_database] \
  --override id=sub_[from_database]
```

**3. Verify Webhook Logs**

```bash
[Webhook] ✅ Subscription cancelled for organization [org_id] - features locked
```

**4. Verify Database**

```sql
SELECT name, billing_status, credits
FROM organizations
WHERE id = '[org_id]';

-- Expected:
-- billing_status = 'cancelled'
-- credits = 598.00 (retained but unusable)
```

**5. Verify Feature Locking**

```bash
open http://localhost:3001/dashboard
```

**Expected**:
- ⚠️ **Red/orange banner**: "Subscription cancelled"
- ✅ Credits still displayed: "$598.00"
- ✅ "Reactivate Subscription" button

```bash
open http://localhost:3001/campaigns/create
```

**Expected**:
- 🔒 **All features locked** (cancelled status locks everything)
- ✅ Modal: "Subscription Required - Your subscription has been cancelled"
- ✅ CTA: "Reactivate Subscription"

---

### Test Scenario 5: Subscription Reactivation

**Objective**: Verify reactivation restores access

#### Steps:

**1. Reactivate Subscription**

```bash
# Via Stripe Dashboard or CLI
stripe subscriptions update sub_[id] --cancel_at_period_end=false
```

**2. Trigger Webhook**

```bash
stripe trigger customer.subscription.updated \
  --override id=sub_[from_database] \
  --override status=active
```

**3. Verify Webhook Logs**

```bash
[Webhook] ✅ Updated billing_status to 'active' for organization [org_id]
```

**4. Verify Database**

```sql
SELECT name, billing_status
FROM organizations
WHERE id = '[org_id]';

-- Expected:
-- billing_status = 'active'
```

**5. Verify Features Unlocked**

```bash
open http://localhost:3001/campaigns/create
```

**Expected**:
- ✅ **Campaign form loads**
- ✅ No payment modal
- ✅ Full access restored

---

## 🛠️ Local Webhook Testing with Stripe CLI

### Setup

```bash
# Install Stripe CLI (if not already)
brew install stripe/stripe-cli/stripe  # macOS
# OR download from: https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to http://localhost:3001/api/stripe/webhook
```

**Output**:
```
> Ready! Your webhook signing secret is whsec_... (^C to quit)
```

**Copy webhook secret to `.env.local`**:
```
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Triggering Test Events

```bash
# Successful payment (Month 1)
stripe trigger invoice.payment_succeeded

# Recurring payment (Month 2)
stripe trigger invoice.payment_succeeded --override billing_reason=subscription_cycle

# Payment failure
stripe trigger invoice.payment_failed

# Subscription created
stripe trigger customer.subscription.created

# Subscription updated
stripe trigger customer.subscription.updated

# Subscription cancelled
stripe trigger customer.subscription.deleted
```

### Monitoring Webhooks

```bash
# View recent webhook deliveries
stripe events list --limit 10

# View specific webhook delivery
stripe events retrieve evt_...

# View webhook logs
stripe listen --print-json
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Webhook Signature Verification Failed

**Error**: `Invalid signature`

**Causes**:
1. Wrong `STRIPE_WEBHOOK_SECRET` in `.env.local`
2. Not using raw body for signature verification
3. Webhook secret from wrong endpoint (production vs test)

**Solutions**:
1. Verify webhook secret matches Stripe Dashboard
2. Ensure Next.js route uses `request.text()` for raw body
3. Use `stripe listen` secret for local testing

### Issue 2: Credits Not Granted After Payment

**Error**: Payment succeeds but credits remain $0.00

**Debugging**:
```sql
-- Check webhook receipt
SELECT * FROM stripe_webhook_logs  -- If logging implemented
ORDER BY created_at DESC;

-- Check subscription status
SELECT billing_status, stripe_subscription_id
FROM organizations
WHERE id = '[org_id]';
```

**Causes**:
1. Webhook not delivered (Stripe CLI not running locally)
2. Webhook handler error (check server logs)
3. `billing_reason` not recognized

**Solutions**:
1. Run `stripe listen --forward-to http://localhost:3001/api/stripe/webhook`
2. Check server console for webhook errors
3. Verify `getBillingCycleFromInvoice()` logic

### Issue 3: Features Still Locked After Payment

**Error**: billing_status='active' but features show locked

**Debugging**:
```sql
-- Verify organization state
SELECT id, name, billing_status, credits
FROM organizations
WHERE id = '[org_id]';
```

**Causes**:
1. Frontend cache not refreshed
2. useBillingStatus() hook not re-fetching
3. Feature gating logic incorrect

**Solutions**:
1. Hard refresh browser (Ctrl+Shift+R)
2. Call `refresh()` from billing hook
3. Verify `isFeatureLocked()` logic in `lib/hooks/use-billing-status.ts`

### Issue 4: Duplicate Credit Grants

**Error**: Credits doubled ($998 instead of $499)

**Causes**:
1. Webhook delivered twice (Stripe retry)
2. `invoice.payment_succeeded` and `customer.subscription.created` both granting credits

**Solutions**:
1. Implement idempotency key checks (future enhancement)
2. Only grant credits on `invoice.payment_succeeded`
3. Add webhook event log table to track processed events

### Issue 5: Stripe Customer/Subscription Not Created

**Error**: `stripe_customer_id` is NULL after payment attempt

**Debugging**:
```bash
# Check server logs for errors
tail -f .next/trace

# Check Stripe Dashboard
# Customers → Search by email
```

**Causes**:
1. `STRIPE_SECRET_KEY` not configured
2. API route error before customer creation
3. Network error to Stripe API

**Solutions**:
1. Verify `.env.local` has correct `STRIPE_SECRET_KEY`
2. Check `/api/stripe/create-checkout-session` logs
3. Test Stripe connection: `stripe customers list`

---

## ✅ Success Criteria Checklist

### New User Flow
- [ ] User signs up → billing_status='incomplete'
- [ ] Dashboard shows payment banner
- [ ] Features locked (campaigns, templates, audiences)
- [ ] "Complete Payment" button redirects to Stripe
- [ ] Payment succeeds → redirects to success page
- [ ] Credits granted: $499.00
- [ ] billing_status updated to 'active'
- [ ] Payment banner disappears
- [ ] All features unlocked

### Recurring Billing
- [ ] Month 2 payment grants $99 (capped)
- [ ] Credits accumulate correctly ($499 + $99 = $598)
- [ ] billing_status remains 'active'
- [ ] No feature changes

### Payment Failure
- [ ] Failed payment → billing_status='past_due'
- [ ] Campaign creation locked
- [ ] Templates/audiences still accessible
- [ ] Warning banner displayed

### Subscription Management
- [ ] Cancellation → billing_status='cancelled'
- [ ] All features locked
- [ ] Credits retained but unusable
- [ ] Reactivation → billing_status='active'
- [ ] Features restored

### Webhooks
- [ ] All webhooks verified with signature
- [ ] Correct handlers called for each event
- [ ] Database updated correctly
- [ ] Logs show successful processing
- [ ] No duplicate processing

---

## 📊 Testing Checklist Summary

| Test | Status | Notes |
|------|--------|-------|
| New signup → incomplete status | ⏳ | |
| Payment banner displays | ⏳ | |
| Features locked before payment | ⏳ | |
| Create checkout session | ⏳ | |
| Stripe Checkout flow | ⏳ | |
| Payment success redirect | ⏳ | |
| Webhook: invoice.payment_succeeded | ⏳ | |
| Credits granted ($499 Month 1) | ⏳ | |
| billing_status → active | ⏳ | |
| Features unlocked | ⏳ | |
| Recurring payment ($99 Month 2+) | ⏳ | |
| Payment failure → past_due | ⏳ | |
| Subscription cancellation | ⏳ | |
| Subscription reactivation | ⏳ | |
| Webhook signature verification | ⏳ | |

---

## 🎯 Next Steps After Testing

1. **Document Test Results** - Update checklist with ✅ or ❌
2. **Fix Any Issues Found** - Create tickets for bugs
3. **Deploy to Staging** - Test with production-like environment
4. **Configure Production Webhooks** - Use live Stripe keys
5. **Monitor First Real Payment** - Ensure webhook delivery in production
6. **Add Monitoring** - Set up alerts for webhook failures
7. **Implement Enhancements**:
   - Payment history table
   - Email notifications
   - Admin billing dashboard

---

**Testing Status**: ⏳ **READY TO BEGIN**

---

*Last Updated: 2025-11-21*
*Prepared By: Claude Code*
*Purpose: Comprehensive Payment Flow Verification*
