# Stripe Webhook Setup Guide - Development & Production

**Issue Discovered**: November 21, 2025
**Problem**: Payments succeed but credits not granted automatically
**Root Cause**: Webhooks not delivered to localhost

---

## 🚨 **Problem Summary**

**Symptoms**:
- ✅ Payment succeeds in Stripe
- ✅ User redirected to success page
- ❌ Credits remain $0.00
- ❌ billing_status still 'incomplete'
- ❌ Features still locked

**Root Cause**:
- Stripe webhooks cannot reach `localhost:3001`
- Webhook handler never called
- Database never updated

**Affected User**: test-nov20-3@gmail.com (fixed manually)

---

## 🛠️ **Solution: Local Development Setup**

### Option 1: Stripe CLI (Recommended for Development)

#### Step 1: Install Stripe CLI

**macOS**:
```bash
brew install stripe/stripe-cli/stripe
```

**Windows**:
```bash
# Download from: https://github.com/stripe/stripe-cli/releases/latest
# Extract and add to PATH
```

**Linux**:
```bash
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_x86_64.tar.gz
tar -xvf stripe_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

**Verify Installation**:
```bash
stripe --version
# Should show: stripe version X.X.X
```

#### Step 2: Login to Stripe

```bash
stripe login
```

**This will**:
1. Open browser to Stripe Dashboard
2. Ask you to confirm CLI access
3. Generate API key pairing

#### Step 3: Start Webhook Forwarding

```bash
# Forward webhooks to your local server
stripe listen --forward-to http://localhost:3001/api/stripe/webhook
```

**Output**:
```
> Ready! Your webhook signing secret is whsec_... (^C to quit)
```

#### Step 4: Update .env.local

Copy the webhook secret and update `.env.local`:

```bash
# OLD (placeholder)
STRIPE_WEBHOOK_SECRET=whsec_61fbe09f2a552b16b7e35fe83987fb625aeba26c6bc067e3fd49b9da9115ee6c

# NEW (from stripe listen output)
STRIPE_WEBHOOK_SECRET=whsec_[your_new_secret_from_cli]
```

#### Step 5: Restart Next.js Server

```bash
# Kill current server (Ctrl+C)
# Start again
npm run dev
```

#### Step 6: Test Payment Flow

1. Sign up new user
2. Click "Complete Payment"
3. Use test card: `4242 4242 4242 4242`
4. Complete payment

**Expected Webhook Logs** (in `stripe listen` terminal):
```
2025-11-21 10:00:00   --> customer.subscription.created [evt_...]
2025-11-21 10:00:01   --> invoice.payment_succeeded [evt_...]
2025-11-21 10:00:01  <--  [200] POST http://localhost:3001/api/stripe/webhook
```

**Expected Server Logs** (in `npm run dev` terminal):
```
[Webhook] ✅ Received verified event: customer.subscription.created
[Webhook] ✅ Received verified event: invoice.payment_succeeded
[Webhook] Billing cycle: Month 1 (reason: subscription_create)
[Credits] Month 1 payment: Granting full amount $499.00
[Credits] ✅ Successfully added $499.00 credits
```

**Expected Database State**:
```sql
SELECT billing_status, credits FROM organizations WHERE ...;
-- billing_status = 'active'
-- credits = 499.00
```

---

### Option 2: Manual Webhook Simulator (One-Off Fixes)

**Use Case**: Payment already succeeded but webhook wasn't delivered

#### Usage:

```bash
# Run simulator with payment intent ID
npx tsx scripts/manual-webhook-simulator.ts pi_3SVljdFwuMff93IL0Qnosqgp
```

**Output**:
```
[Manual Webhook] Starting manual payment processing...
[Manual Webhook] Payment Intent: pi_3SVljdFwuMff93IL0Qnosqgp

[Manual Webhook] Step 1: Retrieving payment intent...
[Manual Webhook] Payment Status: succeeded
[Manual Webhook] Amount: $499.00

[Manual Webhook] Step 2: Retrieving invoice...
[Manual Webhook] Invoice: in_...
[Manual Webhook] Customer: cus_...
[Manual Webhook] Subscription: sub_...
[Manual Webhook] Billing Reason: subscription_create

[Manual Webhook] Step 3: Finding organization...
[Manual Webhook] Organization ID: 65d5967b-...

[Manual Webhook] Step 4: Retrieving subscription...
[Manual Webhook] Subscription Status: active

[Manual Webhook] Step 5: Determining billing cycle...
[Manual Webhook] Billing Cycle: Month 1
[Manual Webhook] Credits to Grant: $499.00

[Manual Webhook] Step 6: Granting credits...
[Manual Webhook] ✅ Credits Granted: $499.00
[Manual Webhook] ✅ New Balance: $499.00

[Manual Webhook] Step 7: Updating billing status...
[Manual Webhook] ✅ Billing Status Updated: active

[Manual Webhook] ========================================
[Manual Webhook] ✅ PAYMENT PROCESSING COMPLETE
[Manual Webhook] ========================================
```

**How to Find Payment Intent ID**:
1. Go to Stripe Dashboard → Payments
2. Find the payment
3. Click to view details
4. Payment Intent ID shown at top (starts with `pi_`)

---

## 🚀 **Production Setup**

### Step 1: Deploy Application

Deploy to a platform with public URL (Vercel, Railway, AWS, etc.)

**Example**: `https://your-app.vercel.app`

### Step 2: Create Production Webhook Endpoint

**Stripe Dashboard → Developers → Webhooks → Add Endpoint**:

**Settings**:
- **Endpoint URL**: `https://your-app.vercel.app/api/stripe/webhook`
- **Description**: Production webhook for DropLab
- **Events to send**:
  - ✅ `invoice.payment_succeeded`
  - ✅ `invoice.payment_failed`
  - ✅ `customer.subscription.created`
  - ✅ `customer.subscription.updated`
  - ✅ `customer.subscription.deleted`
- **API Version**: Latest (2024-11-20.acacia or newer)

**Click "Add Endpoint"**

### Step 3: Get Webhook Signing Secret

After creating endpoint:
1. Click on the endpoint
2. Click "Reveal" under "Signing secret"
3. Copy the secret (starts with `whsec_`)

### Step 4: Update Production Environment Variables

**Vercel**:
```bash
vercel env add STRIPE_WEBHOOK_SECRET
# Paste the webhook secret when prompted
```

**Railway/Render/AWS**:
- Go to Environment Variables section
- Add: `STRIPE_WEBHOOK_SECRET=whsec_[your_production_secret]`

### Step 5: Switch to Live Mode Keys

**Update Environment Variables**:
```bash
# Replace test keys with live keys
STRIPE_SECRET_KEY=sk_live_... # From Stripe Dashboard
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... # From Stripe Dashboard
STRIPE_PRICE_ID=price_1SYbTzRO5P6SOwyWe5qDXgsX # DropLab Pro $499/month
```

### Step 6: Test Production Webhooks

**Stripe Dashboard → Webhooks → Your Endpoint → Send Test Webhook**:

1. Select event: `invoice.payment_succeeded`
2. Click "Send test webhook"
3. Check "Response" tab - should show 200 OK

---

## 🔍 **Troubleshooting**

### Issue 1: Webhook Signature Verification Failed

**Error**: `Invalid signature`

**Causes**:
- Wrong `STRIPE_WEBHOOK_SECRET` in environment variables
- Using production secret with test webhooks (or vice versa)
- Webhook secret changed in Stripe Dashboard

**Solutions**:
1. Regenerate webhook secret in Stripe Dashboard
2. Update `.env.local` with new secret
3. Restart Next.js server
4. Ensure `stripe listen` is using same secret

### Issue 2: Stripe CLI Not Forwarding Webhooks

**Error**: `stripe listen` shows no events

**Causes**:
- Wrong forward URL
- Next.js server not running
- Firewall blocking port 3001

**Solutions**:
```bash
# Check Next.js is running
curl http://localhost:3001/api/stripe/webhook
# Should return: Method not allowed (GET not supported)

# Check stripe listen command
stripe listen --forward-to http://localhost:3001/api/stripe/webhook

# Try different port if 3001 blocked
npm run dev -- -p 3002
stripe listen --forward-to http://localhost:3002/api/stripe/webhook
```

### Issue 3: Payment Succeeds But No Webhook Received

**Error**: Payment works, user redirected, but no logs in `stripe listen`

**Causes**:
- `stripe listen` not running
- Payment made before `stripe listen` started
- Test vs live mode mismatch

**Solutions**:
1. Ensure `stripe listen` is running BEFORE payment
2. Use manual simulator for past payments:
   ```bash
   npx tsx scripts/manual-webhook-simulator.ts pi_[payment_id]
   ```
3. Verify test mode matches:
   - Test payment → Test webhook secret
   - Live payment → Live webhook secret

### Issue 4: Credits Not Granted After Webhook

**Error**: Webhook received (200 OK) but credits still $0.00

**Debugging**:
```bash
# Check server logs for errors
grep "Credits" .next/trace | tail -20

# Check database state
npx tsx scripts/check-org-status.ts test-nov20-3@gmail.com

# Manually verify invoice
stripe invoices retrieve in_[invoice_id]
```

**Causes**:
- `getBillingCycleFromInvoice()` returned wrong value
- Database update failed (check RLS policies)
- Credits function error (check logs)

**Solutions**:
1. Check server console for credit granting errors
2. Verify organization exists in database
3. Run manual simulator with `--verbose` flag (if added)

---

## 📊 **Webhook Testing Checklist**

### Development Testing

- [ ] Stripe CLI installed and logged in
- [ ] `stripe listen` running and showing events
- [ ] Webhook secret from CLI added to `.env.local`
- [ ] Next.js server restarted after secret update
- [ ] Test payment succeeds
- [ ] Webhook logs appear in `stripe listen` terminal
- [ ] Credits granted ($499 for Month 1)
- [ ] billing_status updated to 'active'
- [ ] Features unlocked in UI

### Production Testing

- [ ] Application deployed with public URL
- [ ] Production webhook endpoint created in Stripe Dashboard
- [ ] Production webhook secret added to environment variables
- [ ] Live API keys configured
- [ ] Test webhook sent from Dashboard (200 OK response)
- [ ] Real payment test completed
- [ ] Webhook received and processed
- [ ] Credits granted correctly
- [ ] No errors in production logs

---

## 🛡️ **Security Best Practices**

### Webhook Secret Management

**DO**:
- ✅ Store webhook secrets in environment variables (never in code)
- ✅ Use different secrets for test and live mode
- ✅ Regenerate secrets if leaked
- ✅ Always verify webhook signatures

**DON'T**:
- ❌ Commit webhook secrets to git
- ❌ Share webhook secrets in public docs
- ❌ Reuse same secret across environments
- ❌ Disable signature verification (even in dev)

### API Key Management

**DO**:
- ✅ Use test keys for development
- ✅ Restrict API key permissions
- ✅ Rotate keys periodically
- ✅ Monitor for unauthorized usage

**DON'T**:
- ❌ Use live keys in development
- ❌ Share API keys via email/chat
- ❌ Commit keys to version control
- ❌ Use same keys across multiple apps

---

## 📝 **Quick Reference**

### Stripe CLI Commands

```bash
# Login
stripe login

# Forward webhooks to localhost
stripe listen --forward-to http://localhost:3001/api/stripe/webhook

# Trigger test event
stripe trigger invoice.payment_succeeded

# View recent events
stripe events list --limit 10

# View specific event
stripe events retrieve evt_[event_id]

# View webhooks
stripe webhooks list

# Test webhook endpoint
stripe webhooks test --endpoint https://your-app.com/api/stripe/webhook
```

### Manual Simulator Commands

```bash
# Process single payment
npx tsx scripts/manual-webhook-simulator.ts pi_[payment_id]

# Example with actual ID
npx tsx scripts/manual-webhook-simulator.ts pi_3SVljdFwuMff93IL0Qnosqgp
```

### Database Queries

```sql
-- Check organization billing status
SELECT
  o.name,
  o.billing_status,
  o.credits,
  o.stripe_customer_id,
  o.stripe_subscription_id
FROM organizations o
JOIN user_profiles up ON up.organization_id = o.id
JOIN auth.users u ON u.id = up.id
WHERE u.email = 'user@example.com';

-- Check recent payments
SELECT * FROM stripe_payments -- If logging implemented
ORDER BY created_at DESC
LIMIT 5;
```

---

## ✅ **Resolution for test-nov20-3@gmail.com**

**Issue**: Payment succeeded but credits not granted

**Action Taken**: Manual database update

```sql
UPDATE organizations
SET
  stripe_subscription_id = 'sub_1SVljcFwuMff93ILRxd3lP34',
  billing_status = 'active',
  credits = 499.00,
  updated_at = NOW()
WHERE id = '65d5967b-571a-408d-a8ae-5bad2aaae7c8';
```

**Result**: ✅ Account fixed, features unlocked

**Next Payment**: Will be processed automatically once Stripe CLI is running

---

## 🎯 **Recommended Setup for Future Developers**

1. **Install Stripe CLI** immediately after cloning repo
2. **Run `stripe listen`** in separate terminal before any testing
3. **Keep webhook secret in sync** between CLI and `.env.local`
4. **Test payment flow** with CLI running to verify webhooks work
5. **Use manual simulator** only for fixing past payments

---

**Documentation Created**: November 21, 2025
**Issue**: Webhook delivery failure in development mode
**Resolution**: Stripe CLI setup + manual simulator for fixes
**Status**: Production-ready with proper webhook configuration
