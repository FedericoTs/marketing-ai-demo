# DropLab Credit Purchase & Payment Flow System
**Complete Implementation Plan**
**Date:** November 22, 2025
**Version:** 1.0

---

## 📋 Executive Summary

**Goal:** Enable users to purchase DropLab credits via Stripe ($1 = 1 credit) and use those credits to pay for Data Axle contacts and PostGrid printing, while DropLab autonomously handles vendor payments.

**User Flow:**
```
1. User buys subscription ($499/month) → Receives credits automatically
2. User purchases additional credits ($1 = 1 credit) via Stripe Checkout
3. User spends credits on:
   - Data Axle contacts ($0.18-$0.35/contact)
   - PostGrid printing ($1.00/postcard)
4. DropLab pays vendors autonomously:
   - Data Axle: Monthly invoice (API calls tracked)
   - PostGrid: Prepaid wallet or monthly invoice
```

---

## 🏗️ Current System Architecture (As-Is)

### ✅ Already Implemented

1. **Credits System** (`lib/stripe/credits.ts`)
   - `addCreditsToOrganization()` - Adds credits from subscription payments
   - `getBillingCycleFromInvoice()` - Determines Month 1 vs Month 2+ credits
   - Database: `organizations.credits` column

2. **Credit Transactions** (`supabase/migrations/012_organization_credits.sql`)
   - `credit_transactions` table with full audit trail
   - Database functions: `add_credits()`, `spend_credits()`
   - Automatic balance tracking

3. **Stripe Integration**
   - Webhook handler (`app/api/stripe/webhook/route.ts`)
     - `invoice.payment_succeeded` → Grants subscription credits
     - `invoice.payment_failed` → Updates billing status
   - Checkout session creation (`app/api/stripe/create-checkout-session/route.ts`)
     - Currently only handles subscription payments (mode: 'subscription')

4. **Credit Spending**
   - **Data Axle**: `/api/audience/purchase` deducts credits via `spend_credits()`
   - **PostGrid**: `/api/campaigns/[id]/print` reserves and charges credits

5. **Vendor Integration**
   - **Data Axle API** (`lib/audience/data-axle-client.ts`)
     - Insights API (free counts)
     - Search API (purchase contacts)
     - Currently: Mock mode or API calls with API key
   - **PostGrid API** (`lib/postgrid/client.ts`)
     - Postcard creation
     - Address verification
     - Batch processing

---

## 🎯 What Needs to Be Built

### Missing Component: **One-Time Credit Purchase Flow**

The subscription already grants credits automatically. We need to add:
1. **UI Component**: "Buy More Credits" button in Settings/Billing
2. **API Route**: Create Stripe Checkout session for one-time payments
3. **Webhook Handler Update**: Process `checkout.session.completed` events for credit purchases
4. **Credit Package Options**: Pre-defined amounts ($50, $100, $250, $500, $1000)

---

## 📊 Payment Flow Architecture

### Flow 1: User Purchases Credits

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                │
│  "I need $250 in credits to buy 5,000 Data Axle contacts"  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              DROPLAB SETTINGS PAGE                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Current Balance: $49.00                             │  │
│  │  [Buy $50]  [Buy $100]  [Buy $250]  [Buy $500]      │  │
│  │  [Custom Amount: $____]                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                        │                                    │
│                        │ User clicks "Buy $250"              │
│                        ▼                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  POST /api/stripe/purchase-credits                    │  │
│  │  Body: { amount: 250 }                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                STRIPE CHECKOUT SESSION                      │
│  Creates session with:                                      │
│  - mode: 'payment' (one-time, not recurring)                │
│  - line_items: [{ price_data: { unit_amount: 25000 }}]     │
│  - metadata: { organization_id, amount: 250, type: 'credits' }│
│  - success_url: /settings?purchase=success                  │
│  - cancel_url: /settings?purchase=canceled                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ User completes payment
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              STRIPE WEBHOOK EVENT                           │
│  checkout.session.completed                                 │
│  ├─ payment_status: "paid"                                  │
│  ├─ amount_total: 25000 cents ($250)                        │
│  └─ metadata: { organization_id, amount: 250 }              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│          WEBHOOK HANDLER (Updated)                          │
│  POST /api/stripe/webhook                                   │
│                                                              │
│  1. Verify webhook signature                                │
│  2. Parse event type: checkout.session.completed            │
│  3. Extract metadata.type === 'credits'                     │
│  4. Call addCreditsToOrganization(org_id, $250)             │
│  5. Create credit_transactions record:                      │
│     - transaction_type: 'purchase'                          │
│     - amount: 250                                           │
│     - reference_type: 'stripe_payment'                      │
│     - reference_id: checkout_session.id                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE UPDATE                           │
│  organizations.credits: $49 → $299                          │
│  organizations.total_credits_purchased: +$250               │
│  organizations.last_credit_purchase_at: NOW()               │
│                                                              │
│  credit_transactions INSERT:                                │
│  {                                                           │
│    organization_id: "...",                                  │
│    transaction_type: "purchase",                            │
│    amount: 250.00,                                          │
│    balance_before: 49.00,                                   │
│    balance_after: 299.00,                                   │
│    reference_type: "stripe_payment",                        │
│    reference_id: "cs_xxx",                                  │
│    description: "Purchased $250.00 credits via Stripe"      │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

### Flow 2: User Spends Credits on Data Axle

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                │
│  Campaign Wizard → Audience Selection                       │
│  "Buy 5,000 contacts in California, age 35-55"              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│             DATA AXLE COUNT (FREE)                          │
│  POST /api/audience/count                                   │
│  → Data Axle Insights API (FREE)                            │
│  → Returns: 5,247 contacts available                        │
│  → Pricing: 5,000 × $0.20 = $1,000 (user price)             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ User confirms purchase
                  ▼
┌─────────────────────────────────────────────────────────────┐
│             PURCHASE CONTACTS                               │
│  POST /api/audience/purchase                                │
│  {                                                           │
│    filters: {...},                                          │
│    maxContacts: 5000,                                       │
│    audienceName: "California Homeowners 35-55"              │
│  }                                                           │
│                                                              │
│  STEP 1: Check credits ($299 available >= $1,000 needed)    │
│          ❌ INSUFFICIENT - Show error with "Buy Credits"   │
│                                                              │
│  [User buys $1,000 credits via Flow 1]                      │
│  [Balance now: $1,299]                                      │
│  [User retries purchase]                                    │
│                                                              │
│  STEP 2: Call Data Axle Search API                          │
│          → POST https://api.data-axle.com/v1/people/search  │
│          → Returns: 5,000 contacts (paginated, 400/request) │
│          → DropLab Cost: 5,000 × $0.12 = $600 (wholesale)   │
│                                                              │
│  STEP 3: Store contacts in database                         │
│          → INSERT INTO recipients (5,000 rows)              │
│          → CREATE recipient_list                            │
│                                                              │
│  STEP 4: Deduct user credits                                │
│          → CALL spend_credits(org_id, $1,000)               │
│          → Balance: $1,299 → $299                           │
│                                                              │
│  STEP 5: Record purchase for DropLab accounting             │
│          → INSERT INTO contact_purchases                    │
│          → cost_per_contact: $0.12 (what DropLab pays)      │
│          → total_cost: $600 (DropLab's expense)             │
│          → user_charge_per_contact: $0.20                   │
│          → total_user_charge: $1,000                        │
│          → margin: $400 (40%)                               │
└─────────────────────────────────────────────────────────────┘
```

### Flow 3: User Spends Credits on PostGrid

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                │
│  Campaign Complete → Click "Print & Mail Campaign"          │
│  500 recipients × $1.00/postcard = $500                     │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│             PRINT CAMPAIGN                                  │
│  POST /api/campaigns/[id]/print                             │
│                                                              │
│  STEP 1: Check credits ($299 available < $500 needed)       │
│          ❌ INSUFFICIENT - Show "Buy $250 more credits"    │
│                                                              │
│  [User buys $250 credits]                                   │
│  [Balance now: $549]                                        │
│  [User retries print]                                       │
│                                                              │
│  STEP 2: Reserve credits (prevent double-spending)          │
│          → UPDATE organizations SET credits_reserved = $500 │
│                                                              │
│  STEP 3: Download PDFs from Supabase Storage                │
│          → 500 personalized PDF files                       │
│                                                              │
│  STEP 4: Submit to PostGrid API (batch)                     │
│          → POST https://api.postgrid.com/v1/postcards (×500)│
│          → PostGrid charges DropLab: 500 × $0.85 = $425     │
│          → (Charged to DropLab's PostGrid prepaid wallet)   │
│                                                              │
│  STEP 5: Charge user credits                                │
│          → CALL spend_credits(org_id, $500)                 │
│          → Balance: $549 → $49                              │
│          → Unreserve credits                                │
│                                                              │
│  STEP 6: Record print job for DropLab accounting            │
│          → INSERT INTO print_jobs                           │
│          → estimated_cost_per_piece: $0.85                  │
│          → estimated_total_cost: $425 (DropLab's expense)   │
│          → user_charge_per_piece: $1.00                     │
│          → user_total_charge: $500                          │
│          → margin: $75 (15%)                                │
└─────────────────────────────────────────────────────────────┘
```

### Flow 4: DropLab Pays Vendors

```
┌─────────────────────────────────────────────────────────────┐
│                   DATA AXLE PAYMENT                         │
│                                                              │
│  Payment Model: MONTHLY INVOICE (B2B)                       │
│  ────────────────────────────────────────────────────────   │
│  - Data Axle tracks API calls on their end                  │
│  - Sends monthly invoice to DropLab                         │
│  - Invoice includes: # of contacts purchased × rate         │
│  - DropLab pays via ACH/Wire Transfer                       │
│                                                              │
│  DropLab Tracking (for reconciliation):                     │
│  - contact_purchases table has full history                 │
│  - Query: SUM(total_cost) WHERE created_at >= '2025-11-01'  │
│  - Cross-reference with Data Axle invoice                   │
│                                                              │
│  Example November Invoice:                                  │
│  - Org A: 10,000 contacts × $0.12 = $1,200                  │
│  - Org B: 5,000 contacts × $0.15 = $750                     │
│  - Org C: 50,000 contacts × $0.10 = $5,000                  │
│  - TOTAL: $6,950                                            │
│  - DropLab pays Data Axle $6,950                            │
│  - DropLab collected from users: $12,500 (various tiers)    │
│  - DropLab profit: $5,550 (44% margin)                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  POSTGRID PAYMENT                           │
│                                                              │
│  Payment Model: PREPAID WALLET or MONTHLY INVOICE           │
│  ────────────────────────────────────────────────────────   │
│  Option A - Prepaid Wallet (Recommended):                   │
│    1. DropLab adds funds to PostGrid account                │
│       (e.g., $10,000 prepaid via credit card)               │
│    2. Each API call deducts from wallet                     │
│    3. Auto-reload when balance < $1,000                     │
│    4. DropLab monitors via PostGrid dashboard               │
│                                                              │
│  Option B - Monthly Invoice (Enterprise):                   │
│    1. PostGrid tracks all API calls                         │
│    2. Sends monthly invoice to DropLab                      │
│    3. DropLab pays via ACH/Wire Transfer                    │
│                                                              │
│  DropLab Tracking (for reconciliation):                     │
│  - print_jobs table has full history                        │
│  - Query: SUM(actual_total_cost) WHERE submitted_at >= ...  │
│  - Cross-reference with PostGrid invoice/statement          │
│                                                              │
│  Example November Statement:                                │
│  - Org A: 500 postcards × $0.85 = $425                      │
│  - Org B: 1,200 postcards × $0.85 = $1,020                  │
│  - Org C: 10,000 postcards × $0.85 = $8,500                 │
│  - TOTAL: $9,945                                            │
│  - DropLab collected from users: $11,700 (500+1200+10000)   │
│  - DropLab profit: $1,755 (15% margin)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔨 Implementation Plan

### Phase 1: Credit Purchase UI & API (2 hours)

#### 1.1 Update BillingManager Component

**File:** `components/settings/billing-manager.tsx`

**Add after line 150 (existing credit display):**

```tsx
{/* Credit Purchase Section */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <CreditCard className="w-5 h-5" />
      Purchase Credits
    </CardTitle>
    <CardDescription>
      Buy additional credits for Data Axle contacts and PostGrid printing.
      $1 = 1 credit. No expiration.
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      {[50, 100, 250, 500, 1000].map((amount) => (
        <Button
          key={amount}
          variant="outline"
          onClick={() => handlePurchaseCredits(amount)}
          disabled={isPurchasing}
        >
          ${amount}
        </Button>
      ))}
    </div>

    {/* Custom Amount */}
    <div className="flex gap-2">
      <Input
        type="number"
        placeholder="Custom amount"
        value={customAmount}
        onChange={(e) => setCustomAmount(e.target.value)}
        min="10"
        max="10000"
      />
      <Button
        onClick={() => handlePurchaseCredits(parseInt(customAmount))}
        disabled={isPurchasing || !customAmount}
      >
        Buy ${customAmount}
      </Button>
    </div>
  </CardContent>
</Card>
```

#### 1.2 Create Purchase Credits API Route

**File:** `app/api/stripe/purchase-credits/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getStripeClient } from '@/lib/stripe/client';

export async function POST(request: NextRequest) {
  try {
    const { amount } = await request.json(); // Amount in dollars (e.g., 250)

    // Validate amount
    if (!amount || amount < 10 || amount > 10000) {
      return NextResponse.json(
        { error: 'Amount must be between $10 and $10,000' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    const { data: org } = await supabase
      .from('organizations')
      .select('id, stripe_customer_id')
      .eq('id', profile.organization_id)
      .single();

    if (!org?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Stripe customer not found' },
        { status: 400 }
      );
    }

    const stripe = getStripeClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create Checkout Session for one-time payment
    const session = await stripe.checkout.sessions.create({
      customer: org.stripe_customer_id,
      mode: 'payment', // ONE-TIME PAYMENT (not subscription)
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amount * 100, // Convert dollars to cents
            product_data: {
              name: `DropLab Credits - $${amount}`,
              description: `Purchase $${amount} in platform credits`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        organization_id: org.id,
        amount: amount,
        type: 'credits', // Distinguish from subscription payments
      },
      success_url: `${appUrl}/settings?purchase=success&amount=${amount}`,
      cancel_url: `${appUrl}/settings?purchase=canceled`,
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('[Purchase Credits] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
```

#### 1.3 Update Webhook Handler

**File:** `app/api/stripe/webhook/route.ts`

**Add new event handler (after `handlePaymentSucceeded` function):**

```typescript
/**
 * Handle checkout.session.completed event
 *
 * This handles one-time credit purchases (mode: 'payment')
 * Subscription payments are handled by invoice.payment_succeeded
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log(`[Webhook] Checkout session completed: ${session.id}`);

    // Check if this is a credit purchase (not subscription)
    if (session.metadata?.type !== 'credits') {
      console.log('[Webhook] Not a credit purchase, skipping');
      return;
    }

    const organizationId = session.metadata.organization_id;
    const amount = parseInt(session.metadata.amount);

    if (!organizationId || !amount) {
      console.error('[Webhook] Missing metadata in checkout session');
      return;
    }

    // Verify payment was successful
    if (session.payment_status !== 'paid') {
      console.log(`[Webhook] Payment not completed: ${session.payment_status}`);
      return;
    }

    console.log(`[Webhook] Adding $${amount} credits to organization ${organizationId}`);

    // Use the existing addCreditsToOrganization function
    // Note: For one-time purchases, we use billingCycleCount = 1 (no cap)
    const result = await addCreditsToOrganization(
      organizationId,
      amount * 100, // Convert to cents
      1 // Treat as first payment (no $99 cap)
    );

    if (result.success) {
      console.log(`[Webhook] ✅ Successfully added $${amount} credits`);

      // Create transaction record with Stripe reference
      const supabase = createServiceClient();
      await supabase.rpc('add_credits', {
        org_id: organizationId,
        credit_amount: amount,
        transaction_type: 'purchase',
        transaction_description: `Purchased $${amount} credits via Stripe Checkout`,
        user_id: null
      });
    } else {
      console.error('[Webhook] Failed to add credits:', result.error);
    }
  } catch (error) {
    console.error('[Webhook] Error handling checkout session:', error);
  }
}
```

**Update main webhook handler (in POST function):**

```typescript
// Add this case to the event type switch
case 'checkout.session.completed':
  const checkoutSession = event.data.object as Stripe.Checkout.Session;
  await handleCheckoutSessionCompleted(checkoutSession);
  break;
```

### Phase 2: Vendor Payment Tracking (1 hour)

#### 2.1 Add Vendor Cost Tracking Views

**Create SQL View:** `supabase/migrations/030_vendor_cost_tracking.sql`

```sql
-- View: Monthly Data Axle costs for reconciliation
CREATE OR REPLACE VIEW monthly_data_axle_costs AS
SELECT
  DATE_TRUNC('month', purchased_at) as month,
  COUNT(*) as purchase_count,
  SUM(contact_count) as total_contacts,
  SUM(total_cost) as droplab_cost,
  SUM(total_user_charge) as user_revenue,
  SUM(total_user_charge - total_cost) as gross_profit,
  ROUND(
    (SUM(total_user_charge - total_cost) / SUM(total_user_charge) * 100)::numeric,
    2
  ) as margin_percent
FROM contact_purchases
WHERE status = 'completed'
  AND provider = 'data_axle'
GROUP BY DATE_TRUNC('month', purchased_at)
ORDER BY month DESC;

-- View: Monthly PostGrid costs for reconciliation
CREATE OR REPLACE VIEW monthly_postgrid_costs AS
SELECT
  DATE_TRUNC('month', submitted_at) as month,
  COUNT(*) as print_job_count,
  SUM(total_recipients) as total_postcards,
  SUM(actual_total_cost) as droplab_cost,
  SUM(credits_charged) as user_revenue,
  SUM(credits_charged - actual_total_cost) as gross_profit,
  ROUND(
    (SUM(credits_charged - actual_total_cost) / SUM(credits_charged) * 100)::numeric,
    2
  ) as margin_percent
FROM print_jobs
WHERE status IN ('completed', 'in_transit', 'delivered')
  AND api_environment = 'live' -- Exclude test mode
GROUP BY DATE_TRUNC('month', submitted_at)
ORDER BY month DESC;

-- View: Combined vendor costs
CREATE OR REPLACE VIEW monthly_vendor_costs_summary AS
SELECT
  month,
  COALESCE(da.droplab_cost, 0) as data_axle_cost,
  COALESCE(pg.droplab_cost, 0) as postgrid_cost,
  COALESCE(da.droplab_cost, 0) + COALESCE(pg.droplab_cost, 0) as total_vendor_cost,
  COALESCE(da.user_revenue, 0) + COALESCE(pg.user_revenue, 0) as total_user_revenue,
  (COALESCE(da.user_revenue, 0) + COALESCE(pg.user_revenue, 0)) -
  (COALESCE(da.droplab_cost, 0) + COALESCE(pg.droplab_cost, 0)) as total_gross_profit
FROM (
  SELECT DISTINCT month FROM monthly_data_axle_costs
  UNION
  SELECT DISTINCT month FROM monthly_postgrid_costs
) months
LEFT JOIN monthly_data_axle_costs da USING (month)
LEFT JOIN monthly_postgrid_costs pg USING (month)
ORDER BY month DESC;

-- Grant access
GRANT SELECT ON monthly_data_axle_costs TO authenticated, service_role;
GRANT SELECT ON monthly_postgrid_costs TO authenticated, service_role;
GRANT SELECT ON monthly_vendor_costs_summary TO authenticated, service_role;
```

#### 2.2 Create Admin Dashboard for Cost Reconciliation

**File:** `app/(main)/admin/vendor-costs/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

interface MonthlyCosts {
  month: string;
  data_axle_cost: number;
  postgrid_cost: number;
  total_vendor_cost: number;
  total_user_revenue: number;
  total_gross_profit: number;
}

export default function VendorCostsPage() {
  const [costs, setCosts] = useState<MonthlyCosts[]>([]);

  useEffect(() => {
    loadCosts();
  }, []);

  async function loadCosts() {
    const supabase = createClient();
    const { data } = await supabase
      .from('monthly_vendor_costs_summary')
      .select('*')
      .order('month', { ascending: false })
      .limit(12);

    if (data) setCosts(data);
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Vendor Cost Reconciliation</h1>

      <div className="grid gap-4">
        {costs.map((month) => (
          <Card key={month.month}>
            <CardHeader>
              <CardTitle>{new Date(month.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Data Axle</div>
                  <div className="font-semibold">${month.data_axle_cost.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">PostGrid</div>
                  <div className="font-semibold">${month.postgrid_cost.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total Cost</div>
                  <div className="font-semibold text-red-600">${month.total_vendor_cost.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">User Revenue</div>
                  <div className="font-semibold text-green-600">${month.total_user_revenue.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Gross Profit</div>
                  <div className="font-semibold text-blue-600">${month.total_gross_profit.toFixed(2)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

---

## ✅ Testing Checklist

### Credit Purchase Flow
- [ ] Test $50 credit purchase
- [ ] Test $1,000 credit purchase
- [ ] Test custom amount ($127)
- [ ] Verify credits appear immediately after Stripe webhook
- [ ] Test insufficient credits error on Data Axle purchase
- [ ] Test insufficient credits error on PostGrid print
- [ ] Verify credit_transactions table records all purchases

### Vendor Integration
- [ ] Purchase 100 Data Axle contacts in test mode
- [ ] Verify contact_purchases table has correct costs
- [ ] Print 10 postcards in PostGrid test mode
- [ ] Verify print_jobs table has correct costs
- [ ] Query monthly_data_axle_costs view
- [ ] Query monthly_postgrid_costs view
- [ ] Test admin vendor cost reconciliation page

### Edge Cases
- [ ] User cancels Stripe Checkout (credits not added)
- [ ] Webhook arrives twice (idempotent handling)
- [ ] User has $99.50, tries to buy $100 of contacts
- [ ] Concurrent credit purchases (race condition)

---

## 📊 Success Metrics

**User Experience:**
- Credit purchase completes in < 30 seconds
- Balance updates immediately after payment
- Clear error messages when insufficient credits

**Business Operations:**
- Monthly vendor reconciliation takes < 5 minutes
- Automated tracking matches vendor invoices within 1%
- Gross profit margins maintained (Data Axle: 40%, PostGrid: 15%)

**Technical Performance:**
- Webhook processing < 2 seconds
- Credit deduction is atomic (no double-spending)
- Database queries for cost views < 100ms

---

## 🚀 Deployment Steps

1. **Database Migration**
   ```bash
   supabase migration new 030_vendor_cost_tracking
   # Add SQL views from Phase 2.1
   supabase db push
   ```

2. **Environment Variables**
   ```bash
   # Already configured:
   STRIPE_SECRET_KEY=sk_live_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   POSTGRID_API_KEY_LIVE=live_sk_xxx
   DATA_AXLE_API_KEY=xxx
   ```

3. **Deploy Code**
   ```bash
   git add .
   git commit -m "feat: Add one-time credit purchase system"
   git push origin main
   # Vercel auto-deploys
   ```

4. **Configure Stripe Webhook**
   - Add event: `checkout.session.completed`
   - Webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
   - Verify signature validation works

5. **Test in Production**
   - Purchase $10 in test credits
   - Verify webhook processes correctly
   - Check database for credit_transactions record

---

## 📝 Summary

**What This Achieves:**

✅ **Users can easily purchase credits** - One-click buy $50-$1,000
✅ **$1 = 1 credit** - Simple, transparent pricing
✅ **Credits used for all services** - Data Axle + PostGrid unified
✅ **DropLab pays vendors autonomously** - Monthly invoice reconciliation
✅ **Full audit trail** - Every transaction tracked in database
✅ **Profit margin tracking** - Real-time visibility into costs vs revenue

**Estimated Implementation Time:** 3-4 hours

**Files Created/Modified:**
- `app/api/stripe/purchase-credits/route.ts` (NEW)
- `app/api/stripe/webhook/route.ts` (UPDATED)
- `components/settings/billing-manager.tsx` (UPDATED)
- `supabase/migrations/030_vendor_cost_tracking.sql` (NEW)
- `app/(main)/admin/vendor-costs/page.tsx` (NEW)

**Ready to proceed with implementation?**
