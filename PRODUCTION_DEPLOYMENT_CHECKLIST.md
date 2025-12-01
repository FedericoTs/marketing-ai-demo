# DropLab Production Deployment Checklist

**Domain**: www.droplab.io
**Platform**: Vercel
**Date**: November 29, 2025

---

## Pre-Deployment Summary

| Service | Status | Production ID/URL |
|---------|--------|-------------------|
| **Stripe** | Ready | Product: `prod_TVcgGhAdmKwT5a`, Price: `price_1SYbTzRO5P6SOwyWe5qDXgsX` |
| **Supabase** | Ready | Project: `egccqmlhzqiirovstpal` |
| **PostGrid** | Ready | Webhook handler at `/api/webhooks/postgrid` |
| **Vercel** | Ready | Domain: www.droplab.io |

---

## Step 1: Stripe Production Setup

### 1.1 Get Live API Keys

1. Go to [Stripe Dashboard → Developers → API Keys](https://dashboard.stripe.com/apikeys)
2. Toggle to **Live Mode** (top-right switch)
3. Copy:
   - **Publishable key**: `pk_live_...`
   - **Secret key**: Click "Reveal" → `sk_live_...`

### 1.2 Create Production Webhook

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Configure:

   | Field | Value |
   |-------|-------|
   | **Endpoint URL** | `https://www.droplab.io/api/stripe/webhook` |
   | **Description** | DropLab Production Webhook |
   | **Events** | Select these events: |

   **Required Events:**
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `checkout.session.completed`

4. Click **"Add endpoint"**
5. Click on the new endpoint → **"Reveal"** signing secret
6. Copy the **Webhook signing secret**: `whsec_...`

### 1.3 Verify Product/Price Exists

The following are already created in LIVE mode:
- **Product**: DropLab Pro (`prod_TVcgGhAdmKwT5a`)
- **Price**: $499/month (`price_1SYbTzRO5P6SOwyWe5qDXgsX`)

To verify: [Stripe Dashboard → Products](https://dashboard.stripe.com/products)

---

## Step 2: PostGrid Production Setup

### 2.1 Get Live API Key

1. Go to [PostGrid Dashboard](https://dashboard.postgrid.com/)
2. Navigate to **Developers → API Keys**
3. Copy your **Live API Key**: `live_sk_...`

### 2.2 Configure Webhook (Optional but Recommended)

1. In PostGrid Dashboard, go to **Settings → Webhooks**
2. Click **"Add Webhook"**
3. Configure:

   | Field | Value |
   |-------|-------|
   | **Endpoint URL** | `https://www.droplab.io/api/webhooks/postgrid` |
   | **Events** | Select all postcard events |

4. Copy the **Webhook signing secret**: `whsec_...`

### 2.3 PostGrid Events Tracked

Your webhook handler (`/api/webhooks/postgrid`) handles:
- `postcard.processed` - Postcard queued for printing
- `postcard.in_production` - Being printed
- `postcard.in_transit` - Mailed out
- `postcard.delivered` - Delivered
- `postcard.failed` - Failed (address issue, etc.)

---

## Step 3: Supabase Production Configuration

### 3.1 Verify Production Settings

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/egccqmlhzqiirovstpal)
2. Verify **Settings → API**:
   - Project URL: `https://egccqmlhzqiirovstpal.supabase.co`
   - Anon key: Already configured
   - Service role key: Already configured

### 3.2 Update Site URL (Critical!)

1. Go to **Authentication → URL Configuration**
2. Update:
   - **Site URL**: `https://www.droplab.io`
   - **Redirect URLs**: Add `https://www.droplab.io/**`

### 3.3 Email Templates (Optional)

1. Go to **Authentication → Email Templates**
2. Update "Confirm signup" template with DropLab branding
3. Update "Reset Password" template

---

## Step 4: Vercel Environment Variables

### 4.1 Required Environment Variables

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

```bash
# Application URL
NEXT_PUBLIC_APP_URL=https://www.droplab.io

# Supabase (already have these values)
NEXT_PUBLIC_SUPABASE_URL=https://egccqmlhzqiirovstpal.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_SUPABASE_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]

# Stripe (LIVE mode)
STRIPE_SECRET_KEY=sk_live_[YOUR_LIVE_SECRET_KEY]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_[YOUR_LIVE_PUBLISHABLE_KEY]
STRIPE_PRICE_ID=price_1SYbTzRO5P6SOwyWe5qDXgsX
STRIPE_WEBHOOK_SECRET=whsec_[YOUR_PRODUCTION_WEBHOOK_SECRET]

# PostGrid (LIVE mode)
POSTGRID_API_KEY_LIVE=live_sk_[YOUR_LIVE_API_KEY]
POSTGRID_WEBHOOK_SECRET=whsec_[YOUR_POSTGRID_WEBHOOK_SECRET]

# OpenAI (for AI features)
OPENAI_API_KEY=[YOUR_OPENAI_API_KEY]

# Resend (for emails - optional)
RESEND_API_KEY=re_[YOUR_RESEND_API_KEY]

# ElevenLabs (for voice AI - optional)
ELEVENLABS_API_KEY=[YOUR_ELEVENLABS_API_KEY]
```

### 4.2 Using Vercel CLI

Alternatively, use Vercel CLI:

```bash
# Login to Vercel
vercel login

# Link project (if not already linked)
vercel link

# Set environment variables
vercel env add NEXT_PUBLIC_APP_URL production
# Enter: https://www.droplab.io

vercel env add STRIPE_SECRET_KEY production
# Enter: sk_live_...

vercel env add STRIPE_WEBHOOK_SECRET production
# Enter: whsec_...

# Repeat for all variables...
```

---

## Step 5: Deploy to Production

### 5.1 Push to GitHub (Triggers Auto-Deploy)

```bash
git add -A
git commit -m "chore: Prepare for production deployment"
git push origin master
```

### 5.2 Verify Deployment

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Check deployment status
3. Once complete, visit https://www.droplab.io

---

## Step 6: Post-Deployment Verification

### 6.1 Test Stripe Webhook

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click your endpoint → **"Send test webhook"**
3. Select event: `invoice.payment_succeeded`
4. Click **"Send test webhook"**
5. Verify response is `200 OK`

### 6.2 Test Full Payment Flow

1. Visit https://www.droplab.io
2. Sign up with a test email
3. Complete payment with test card: `4242 4242 4242 4242`
4. Verify:
   - [ ] Payment succeeds
   - [ ] Credits allocated (499 for Month 1)
   - [ ] `billing_status` = 'active'
   - [ ] Features unlocked

### 6.3 Test PostGrid (Optional)

1. Create a test campaign with 1 recipient
2. Send to print
3. Check PostGrid Dashboard for job status
4. Verify webhook updates in your database

---

## Step 7: Domain Configuration

### 7.1 Verify Domain in Vercel

1. Go to Vercel Project → Settings → Domains
2. Verify `www.droplab.io` is configured
3. Ensure SSL certificate is active (green lock)

### 7.2 Redirect Configuration

Ensure these redirects are working:
- `droplab.io` → `www.droplab.io` (if using www)
- `http://` → `https://` (automatic with Vercel)

---

## Quick Reference

### Stripe Resources

| Resource | ID | Details |
|----------|-----|---------|
| Product | `prod_TVcgGhAdmKwT5a` | DropLab Pro |
| Price | `price_1SYbTzRO5P6SOwyWe5qDXgsX` | $499/month USD |
| Webhook | `https://www.droplab.io/api/stripe/webhook` | 6 events configured |

### Billing Model

| Period | Payment | Credits | Platform Fee |
|--------|---------|---------|--------------|
| Month 1 | $499 | 499 credits | $0 |
| Month 2+ | $499 | 99 credits | $400 |
| One-time | Variable | 100% | $0 |

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/stripe/webhook` | POST | Stripe events |
| `/api/webhooks/postgrid` | POST | PostGrid events |
| `/api/auth/callback` | GET | Supabase auth |

---

## Troubleshooting

### Webhook Not Receiving Events

1. Verify endpoint URL is correct (no trailing slash)
2. Check Stripe Dashboard → Webhooks → Recent deliveries
3. Verify `STRIPE_WEBHOOK_SECRET` matches production secret
4. Check Vercel logs for errors

### Credits Not Allocated

1. Check webhook is being received (Stripe Dashboard)
2. Verify `invoice.payment_succeeded` event is enabled
3. Check Vercel function logs for errors
4. Manually run: `scripts/manual-webhook-simulator.ts`

### PostGrid Jobs Not Updating

1. Verify PostGrid webhook is configured
2. Check `POSTGRID_WEBHOOK_SECRET` is set
3. Verify print job exists in database
4. Check Vercel logs for webhook errors

---

## Security Checklist

- [ ] All API keys are set as environment variables (not in code)
- [ ] Different keys for test vs production
- [ ] Webhook secrets properly configured
- [ ] Supabase RLS policies active
- [ ] HTTPS enforced on all endpoints
- [ ] Sensitive routes protected by authentication

---

**Documentation Created**: November 29, 2025
**Last Updated**: November 29, 2025
**Status**: Ready for Production
