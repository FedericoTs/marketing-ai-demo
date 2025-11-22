# Testing Guide: Credit Purchase & Vendor Tracking System

## Overview

This guide covers end-to-end testing of the credit purchase and vendor tracking system implemented in Phase 9.2.16.

**System Components:**
- One-time credit purchases via Stripe Checkout
- Webhook processing for credit grants
- Vendor cost tracking (Data Axle + PostGrid)
- Automatic margin calculations

---

## Prerequisites

Before testing, ensure:

1. **Environment Variables Set** (`.env.local`):
   ```bash
   # Stripe
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://egccqmlhzqiirovstpal.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...

   # App
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

2. **Stripe CLI Installed**:
   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe  # macOS

   # Or download from: https://stripe.com/docs/stripe-cli
   ```

3. **Database Migration Applied**:
   ```bash
   # Verify vendor_costs table exists
   # Already applied via Supabase MCP in previous session ✅
   ```

4. **Dev Server Running**:
   ```bash
   npm run dev
   ```

---

## Test 1: Credit Purchase Flow (End-to-End)

### Goal
Verify users can purchase credits and receive them automatically via webhook.

### Steps

#### 1.1 Start Webhook Listener

Open a new terminal and run:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**Expected Output:**
```
> Ready! Your webhook signing secret is whsec_... (^C to quit)
```

**⚠️ IMPORTANT:** Copy the webhook signing secret and update `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

Restart your dev server after updating.

---

#### 1.2 Login and Navigate to Settings

1. Open browser: `http://localhost:3000`
2. Sign in with test account
3. Navigate to **Settings** tab
4. Scroll to **"Purchase Additional Credits"** card

---

#### 1.3 Initiate Credit Purchase

1. Enter amount: `$100`
2. Click **"Purchase"** button

**Expected Behavior:**
- Browser redirects to Stripe Checkout page
- Page shows: "Purchase $100.00"
- Product: "DropLab Credits - 100"
- Description: "Purchase 100 in platform credits..."

---

#### 1.4 Complete Test Payment

Use Stripe test card:
```
Card Number: 4242 4242 4242 4242
Expiry: Any future date (e.g., 12/34)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)
```

Click **"Pay $100.00"**

**Expected Behavior:**
- Redirects to: `http://localhost:3000/settings?purchase=success&amount=100`
- Toast notification: "Successfully purchased $100 in credits! Your balance has been updated."
- Credit balance updates immediately (may need refresh)

---

#### 1.5 Verify Webhook Processing

Check terminal running Stripe CLI:

**Expected Logs:**
```
2025-01-22 14:32:10   --> checkout.session.completed [evt_...]
2025-01-22 14:32:10  <--  [200] POST http://localhost:3000/api/stripe/webhook [evt_...]
```

Check application console:

**Expected Logs:**
```
[Webhook] ✅ Received verified event: checkout.session.completed
[Webhook] Checkout session completed: cs_test_...
[Webhook] Processing credit purchase: $100.00 for organization <UUID>
[Webhook] ✅ Granted $100.00 credits from one-time purchase (new balance: $<new_balance>)
```

---

#### 1.6 Verify Database Records

**Query 1: Check Credit Transaction**

```sql
SELECT
  transaction_type,
  amount,
  balance_before,
  balance_after,
  description,
  created_at
FROM credit_transactions
WHERE reference_type = 'credit_purchase'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Result:**
```
transaction_type | amount  | balance_before | balance_after | description
-----------------|---------|----------------|---------------|---------------------------
purchase         | 100.00  | <old_balance>  | <new_balance> | Credit purchase via Stripe
```

**Query 2: Check Organization Credits**

```sql
SELECT id, name, credits, updated_at
FROM organizations
WHERE id = '<your_org_id>';
```

**Expected Result:**
- `credits` column increased by $100

---

### ✅ Test 1 Success Criteria

- [ ] Stripe Checkout session created successfully
- [ ] Payment completed with test card
- [ ] Webhook received and verified
- [ ] Credits added to organization
- [ ] Credit transaction logged in database
- [ ] UI shows success message and updated balance

---

## Test 2: Vendor Cost Tracking (Data Axle)

### Goal
Verify vendor costs are tracked when purchasing Data Axle contacts.

### Steps

#### 2.1 Purchase Audience Contacts

1. Navigate to **Audience** page
2. Configure audience filters (any settings)
3. Set max contacts: `1000`
4. Click **"Purchase Contacts"**

**Expected Behavior:**
- Credits deducted from balance
- Recipient list created
- Contacts imported

---

#### 2.2 Verify Vendor Cost Record

**Query:**

```sql
SELECT
  vendor_name,
  service_type,
  cost_amount,
  credits_charged,
  margin_amount,
  margin_percentage,
  quantity,
  unit_cost,
  payment_status,
  payment_method,
  internal_reference_type,
  created_at
FROM vendor_costs
WHERE vendor_name = 'data_axle'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Result:**

```
vendor_name  | data_axle
service_type | contacts
cost_amount  | 100.00          (wholesale: $0.10/contact × 1000)
credits_charged | 180.00       (user price: $0.18/contact × 1000)
margin_amount | 80.00          (auto-calculated: 180 - 100)
margin_percentage | 44.44      (auto-calculated: 80/180 × 100)
quantity     | 1000
unit_cost    | 0.10
payment_status | pending
payment_method | invoice
internal_reference_type | contact_purchase
```

**Margin Validation:**
- Data Axle wholesale: $0.10-$0.20/contact
- User pricing: $0.18-$0.35/contact
- Expected margins: 40-70%

---

### ✅ Test 2 Success Criteria

- [ ] Contact purchase completes successfully
- [ ] Vendor cost record created in `vendor_costs` table
- [ ] `margin_amount` calculated correctly (credits_charged - cost_amount)
- [ ] `margin_percentage` calculated correctly ((margin / credits_charged) × 100)
- [ ] `payment_status` set to 'pending'
- [ ] `internal_reference_id` links to `contact_purchases.id`

---

## Test 3: Vendor Cost Tracking (PostGrid)

### Goal
Verify vendor costs are tracked when printing postcards via PostGrid.

### Steps

#### 3.1 Create and Generate Campaign

1. Create campaign with template
2. Add recipients (or use existing list)
3. Generate PDFs for all recipients
4. Campaign status = "completed"

---

#### 3.2 Submit Print Job

1. Navigate to campaign details
2. Click **"Print Campaign"**
3. Configure print settings:
   - Environment: `test`
   - Mail type: `usps_first_class`
4. Submit print job

**Expected Behavior:**
- Print job created
- Credits deducted
- PostGrid API called (or mocked in test mode)

---

#### 3.3 Verify Vendor Cost Record

**Query:**

```sql
SELECT
  vendor_name,
  service_type,
  cost_amount,
  credits_charged,
  margin_amount,
  margin_percentage,
  quantity,
  unit_cost,
  payment_status,
  payment_method,
  metadata,
  created_at
FROM vendor_costs
WHERE vendor_name = 'postgrid'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Result:**

```
vendor_name  | postgrid
service_type | printing
cost_amount  | 42.50          (wholesale: $0.85 × 50 postcards)
credits_charged | 50.00       (user price: $1.00 × 50 postcards)
margin_amount | 7.50          (auto-calculated: 50 - 42.50)
margin_percentage | 15.00     (auto-calculated: 7.50/50 × 100)
quantity     | 50
unit_cost    | 0.85
payment_status | pending
payment_method | prepaid_wallet (test) or invoice (live)
metadata     | {"campaign_id": "...", "mail_type": "usps_first_class", ...}
```

**Margin Validation:**
- PostGrid wholesale: $0.85/postcard (fixed)
- User pricing: $1.00/postcard (fixed)
- Expected margin: 15% exactly

---

### ✅ Test 3 Success Criteria

- [ ] Print job completes successfully
- [ ] Vendor cost record created in `vendor_costs` table
- [ ] `cost_amount` = $0.85 × quantity
- [ ] `credits_charged` = $1.00 × quantity
- [ ] `margin_percentage` = 15.00 (exactly)
- [ ] `payment_status` set to 'pending'
- [ ] `metadata` includes campaign details

---

## Test 4: Edge Cases & Error Handling

### 4.1 Insufficient Credits

**Test:**
1. Set organization credits to $5
2. Try to purchase 1000 Data Axle contacts ($180)

**Expected Behavior:**
- API returns 402 Payment Required
- Error message: "Insufficient credits. Need $180.00, have $5.00"
- No vendor cost record created
- Credits unchanged

---

### 4.2 Invalid Credit Purchase Amount

**Test:**
1. Try to purchase $5 (below minimum)
2. Try to purchase $15000 (above maximum)

**Expected Behavior:**
- API returns 400 Bad Request
- Error message: "Amount must be between $10 and $10,000"
- No Stripe Checkout session created

---

### 4.3 Webhook Signature Verification Failure

**Test:**
1. Send invalid webhook request:
   ```bash
   curl -X POST http://localhost:3000/api/stripe/webhook \
     -H "Content-Type: application/json" \
     -H "stripe-signature: invalid" \
     -d '{"type": "checkout.session.completed"}'
   ```

**Expected Behavior:**
- Returns 400 Bad Request
- Error message: "Invalid signature"
- No credits granted

---

### 4.4 Duplicate Webhook Event

**Test:**
1. Complete credit purchase
2. Replay webhook event manually

**Expected Behavior:**
- Credits granted only once
- Second webhook processes but doesn't duplicate credits
- Use idempotency keys to prevent duplication

**Note:** Stripe automatically prevents duplicate events, but verify this behavior.

---

### ✅ Test 4 Success Criteria

- [ ] Insufficient credits error handled correctly
- [ ] Invalid amounts rejected with clear messages
- [ ] Invalid webhook signatures rejected
- [ ] Duplicate webhooks don't grant credits twice

---

## Test 5: Admin Margin Analysis

### Goal
Verify margin calculations are accurate and queryable for business intelligence.

### SQL Queries for Admin Dashboard

#### 5.1 Total Vendor Costs by Vendor

```sql
SELECT
  vendor_name,
  COUNT(*) as transaction_count,
  SUM(quantity) as total_units,
  SUM(cost_amount) as total_vendor_cost,
  SUM(credits_charged) as total_user_revenue,
  SUM(margin_amount) as total_profit,
  ROUND(AVG(margin_percentage), 2) as avg_margin_percentage
FROM vendor_costs
GROUP BY vendor_name
ORDER BY total_profit DESC;
```

**Expected Output:**
```
vendor_name | transaction_count | total_units | total_vendor_cost | total_user_revenue | total_profit | avg_margin_percentage
------------|-------------------|-------------|-------------------|--------------------|--------------|-----------------------
data_axle   | 5                 | 10000       | 1000.00           | 1800.00            | 800.00       | 44.44
postgrid    | 3                 | 500         | 425.00            | 500.00             | 75.00        | 15.00
```

---

#### 5.2 Pending Vendor Payments

```sql
SELECT
  vendor_name,
  service_type,
  SUM(cost_amount) as amount_owed,
  COUNT(*) as pending_transactions,
  MIN(created_at) as oldest_pending
FROM vendor_costs
WHERE payment_status = 'pending'
GROUP BY vendor_name, service_type
ORDER BY amount_owed DESC;
```

**Expected Output:**
```
vendor_name | service_type | amount_owed | pending_transactions | oldest_pending
------------|--------------|-------------|----------------------|-------------------
data_axle   | contacts     | 500.00      | 8                    | 2025-01-15 10:23:41
postgrid    | printing     | 127.50      | 3                    | 2025-01-18 14:56:12
```

---

#### 5.3 Monthly Margin Report

```sql
SELECT
  DATE_TRUNC('month', created_at) as month,
  vendor_name,
  SUM(cost_amount) as vendor_cost,
  SUM(credits_charged) as user_revenue,
  SUM(margin_amount) as profit,
  ROUND(AVG(margin_percentage), 2) as avg_margin
FROM vendor_costs
GROUP BY DATE_TRUNC('month', created_at), vendor_name
ORDER BY month DESC, vendor_name;
```

---

### ✅ Test 5 Success Criteria

- [ ] Margin calculations accurate across all records
- [ ] Aggregation queries return correct totals
- [ ] GENERATED columns update automatically
- [ ] Margin percentage rounds to 2 decimal places

---

## Test 6: Webhook Event Types (Comprehensive)

### 6.1 Test All Webhook Handlers

Use Stripe CLI to trigger test events:

#### Credit Purchase (One-Time)
```bash
stripe trigger checkout.session.completed \
  --add checkout_session:metadata.type=credits \
  --add checkout_session:metadata.organization_id=<org_id> \
  --add checkout_session:metadata.amount=250
```

**Expected:** Credits added, transaction logged

---

#### Subscription Payment (Monthly)
```bash
stripe trigger invoice.payment_succeeded
```

**Expected:** Credits added based on subscription tier

---

#### Subscription Canceled
```bash
stripe trigger customer.subscription.deleted
```

**Expected:** `billing_status` updated to 'cancelled'

---

#### Payment Failed
```bash
stripe trigger invoice.payment_failed
```

**Expected:** `billing_status` updated to 'past_due'

---

### ✅ Test 6 Success Criteria

- [ ] `checkout.session.completed` grants credits for one-time purchases
- [ ] `invoice.payment_succeeded` grants credits for subscriptions
- [ ] `customer.subscription.deleted` updates billing_status
- [ ] `invoice.payment_failed` updates billing_status
- [ ] All events logged correctly in console

---

## Troubleshooting

### Issue: Webhook Not Receiving Events

**Solution:**
1. Verify Stripe CLI is running: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
2. Check webhook secret in `.env.local` matches CLI output
3. Restart dev server after updating `.env.local`
4. Check firewall isn't blocking localhost:3000

---

### Issue: Credits Not Updating After Payment

**Solution:**
1. Check webhook logs: `[Webhook] ✅ Granted $X credits...`
2. Verify `checkout_session:metadata.type=credits` is set
3. Check `credit_transactions` table for new record
4. Query `organizations` table directly to confirm balance
5. Refresh browser (UI may be cached)

---

### Issue: Vendor Cost Not Created

**Solution:**
1. Check API logs for errors during purchase
2. Verify service role key has INSERT permissions
3. Check RLS policies on `vendor_costs` table:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'vendor_costs';
   ```
4. Verify migration applied: `SELECT * FROM vendor_costs LIMIT 1;`

---

### Issue: Margin Calculations Incorrect

**Solution:**
1. GENERATED columns don't update on existing rows - only new rows
2. Manually verify calculation:
   ```sql
   SELECT
     credits_charged - cost_amount as expected_margin_amount,
     margin_amount,
     ((credits_charged - cost_amount) / credits_charged * 100) as expected_margin_percentage,
     margin_percentage
   FROM vendor_costs
   WHERE id = '<problematic_record_id>';
   ```
3. If mismatch, recreate record or update migration

---

## Production Testing Checklist

Before deploying to production:

- [ ] Replace Stripe test keys with live keys
- [ ] Configure production webhook endpoint in Stripe Dashboard
- [ ] Update `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Test with real credit card (refund immediately)
- [ ] Monitor webhook delivery in Stripe Dashboard
- [ ] Set up Stripe webhook retry logic
- [ ] Configure webhook endpoint authentication (beyond signature verification)
- [ ] Test production Data Axle API (not mock mode)
- [ ] Test production PostGrid API with real print job
- [ ] Set up monitoring for failed vendor payments
- [ ] Configure alerts for margin anomalies (<10% or >80%)

---

## Summary

**Critical Test Paths:**
1. ✅ Credit Purchase → Webhook → Database Update
2. ✅ Data Axle Purchase → Vendor Cost Tracking → Margin Calculation
3. ✅ PostGrid Print → Vendor Cost Tracking → Margin Calculation

**Database Verification:**
- `credit_transactions` - tracks all credit movements
- `vendor_costs` - tracks all vendor expenses and margins
- `organizations.credits` - current credit balance

**Expected Margins:**
- Data Axle: 40-70% (varies by tier)
- PostGrid: 15% (fixed)

**Key Metrics to Monitor:**
- Total credits purchased vs. total credits spent
- Total vendor costs vs. total user revenue
- Average margin percentage by vendor
- Pending vendor payments (cash flow)

---

## Next Steps

After successful testing:

1. **Create Admin Dashboard** to view:
   - Real-time vendor cost tracking
   - Margin analysis charts
   - Pending payment alerts

2. **Automate Vendor Payments**:
   - Schedule monthly PostGrid invoice payments
   - Schedule monthly Data Axle invoice payments
   - Mark records as 'paid' automatically

3. **Set Up Monitoring**:
   - Alert if margin drops below threshold
   - Alert if vendor payment fails
   - Track webhook delivery success rate

4. **Production Deployment**:
   - Deploy webhook endpoint
   - Configure Stripe production webhook
   - Test with small real purchase

---

**Questions or Issues?**
- Check application logs: `npm run dev`
- Check Stripe webhook logs: Stripe Dashboard → Developers → Webhooks
- Check database directly: Supabase SQL Editor
- Review code: Search for `[Webhook]` console.log statements
