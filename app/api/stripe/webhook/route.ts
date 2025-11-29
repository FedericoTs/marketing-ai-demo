/**
 * Stripe Webhook Handler
 *
 * Receives and processes webhook events from Stripe:
 * - invoice.payment_succeeded → Grant credits to organization (subscriptions)
 * - checkout.session.completed → Grant credits from one-time purchases
 * - customer.subscription.created → Log subscription creation
 * - customer.subscription.updated → Update subscription status
 * - customer.subscription.deleted → Handle subscription cancellation
 * - invoice.payment_failed → Update billing status to past_due
 *
 * Phase 9.2.3 - Webhook Integration
 * Phase 9.2.16 - One-Time Credit Purchase System
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeClient } from '@/lib/stripe/client';
import { createServiceClient } from '@/lib/supabase/server';
import {
  addCreditsToOrganization,
  getOrganizationFromCustomer,
  getBillingCycleFromInvoice,
} from '@/lib/stripe/credits';

/**
 * Verify Stripe webhook signature
 *
 * This is critical for security - ensures the webhook is actually from Stripe
 * and hasn't been tampered with.
 */
async function verifyWebhookSignature(
  body: string,
  signature: string
): Promise<Stripe.Event | null> {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('[Webhook] STRIPE_WEBHOOK_SECRET not configured');
      return null;
    }

    const stripe = getStripeClient();

    // Construct event from raw body and signature
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    return event;
  } catch (error) {
    console.error('[Webhook] Signature verification failed:', error);
    return null;
  }
}

/**
 * Handle invoice.payment_failed event
 *
 * When a payment fails:
 * - Update billing_status to 'past_due'
 * - Subscription will be retried by Stripe automatically
 * - Features may be restricted based on billing rules
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    console.log(`[Webhook] Payment failed: ${invoice.id}`);

    // Get customer ID from invoice
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

    if (!customerId) {
      console.error('[Webhook] No customer ID in invoice');
      return;
    }

    // Get organization from customer
    const organizationId = await getOrganizationFromCustomer(customerId);

    if (!organizationId) {
      console.error('[Webhook] No organization found for customer:', customerId);
      return;
    }

    // Get service client for admin access
    const supabase = createServiceClient();

    // Update billing_status to 'past_due'
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        billing_status: 'past_due',
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId);

    if (updateError) {
      console.error('[Webhook] Failed to update billing_status to past_due:', updateError);
      return;
    }

    console.log(
      `[Webhook] ⚠️  Payment failed for organization ${organizationId} - status updated to past_due`
    );

    // TODO: Send notification email to organization owner
    // TODO: Log payment failure event for analytics
    // Note: Stripe will automatically retry the payment
  } catch (error) {
    console.error('[Webhook] Error handling payment failed:', error);
  }
}

/**
 * Handle invoice.payment_succeeded event
 *
 * This is the most important event - it's when we grant credits to the organization
 * based on their subscription payment.
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    console.log(`[Webhook] Processing payment succeeded: ${invoice.id}`);

    // Get customer ID from invoice
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

    if (!customerId) {
      console.error('[Webhook] No customer ID in invoice');
      return;
    }

    // Get subscription ID (Stripe v20 types don't include subscription on Invoice)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoiceData = invoice as any;
    const subscriptionId =
      typeof invoiceData.subscription === 'string' ? invoiceData.subscription : invoiceData.subscription?.id;

    if (!subscriptionId) {
      console.error('[Webhook] No subscription ID in invoice');
      return;
    }

    // Get organization from customer
    const organizationId = await getOrganizationFromCustomer(customerId);

    if (!organizationId) {
      console.error('[Webhook] No organization found for customer:', customerId);
      return;
    }

    // Get amount paid (in cents)
    const amountPaid = invoice.amount_paid;

    console.log(
      `[Webhook] Payment: $${(amountPaid / 100).toFixed(2)} from customer ${customerId}`
    );

    // Determine billing cycle using invoice billing_reason (accurate method)
    const billingCycleCount = await getBillingCycleFromInvoice(invoice);

    console.log(`[Webhook] Billing cycle: Month ${billingCycleCount} (reason: ${invoice.billing_reason})`);

    // Add credits to organization
    const result = await addCreditsToOrganization(organizationId, amountPaid, billingCycleCount);

    if (result.success) {
      console.log(
        `[Webhook] ✅ Granted $${result.creditsAdded?.toFixed(2)} credits (new balance: $${result.newBalance?.toFixed(2)})`
      );
    } else {
      console.error('[Webhook] ❌ Failed to grant credits:', result.error);
    }
  } catch (error) {
    console.error('[Webhook] Error handling payment succeeded:', error);
  }
}

/**
 * Handle customer.subscription.created event
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    console.log(`[Webhook] Subscription created: ${subscription.id}`);
    console.log(`[Webhook] Customer: ${subscription.customer}`);
    console.log(`[Webhook] Status: ${subscription.status}`);

    // Just log for now - subscription is already stored in database
    // by the createSubscriptionForCustomer function
  } catch (error) {
    console.error('[Webhook] Error handling subscription created:', error);
  }
}

/**
 * Handle customer.subscription.updated event
 *
 * Updates the organization's billing_status when subscription state changes:
 * - active → User has paid, features unlocked
 * - past_due → Payment failed, some features may be restricted
 * - canceled → Subscription ended, features locked
 * - trialing → Free trial period, features unlocked
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    console.log(`[Webhook] Subscription updated: ${subscription.id}`);
    console.log(`[Webhook] Status: ${subscription.status}`);

    // Get customer ID
    const customerId =
      typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;

    if (!customerId) {
      console.error('[Webhook] No customer ID in subscription');
      return;
    }

    // Get organization from customer
    const organizationId = await getOrganizationFromCustomer(customerId);

    if (!organizationId) {
      console.error('[Webhook] No organization found for customer:', customerId);
      return;
    }

    // Get service client for admin access
    const supabase = createServiceClient();

    // Update billing_status in database
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        billing_status: subscription.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId);

    if (updateError) {
      console.error('[Webhook] Failed to update billing_status:', updateError);
      return;
    }

    console.log(
      `[Webhook] ✅ Updated billing_status to '${subscription.status}' for organization ${organizationId}`
    );
  } catch (error) {
    console.error('[Webhook] Error handling subscription updated:', error);
  }
}

/**
 * Handle customer.subscription.deleted event
 *
 * When a subscription is canceled or deleted:
 * - Update billing_status to 'cancelled'
 * - Features will be locked by feature gating system
 * - Organization retains their existing credits but can't use them
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    console.log(`[Webhook] Subscription deleted: ${subscription.id}`);

    // Get customer ID
    const customerId =
      typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;

    if (!customerId) {
      console.error('[Webhook] No customer ID in subscription');
      return;
    }

    // Get organization from customer
    const organizationId = await getOrganizationFromCustomer(customerId);

    if (!organizationId) {
      console.error('[Webhook] No organization found for customer:', customerId);
      return;
    }

    // Get service client for admin access
    const supabase = createServiceClient();

    // Update billing_status to 'cancelled'
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        billing_status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId);

    if (updateError) {
      console.error('[Webhook] Failed to update billing_status to cancelled:', updateError);
      return;
    }

    console.log(
      `[Webhook] ✅ Subscription cancelled for organization ${organizationId} - features locked`
    );

    // TODO: Send notification email to organization owner
    // TODO: Log subscription cancellation event for analytics
  } catch (error) {
    console.error('[Webhook] Error handling subscription deleted:', error);
  }
}

/**
 * Handle checkout.session.completed event for one-time credit purchases
 *
 * When a user purchases additional credits (NOT subscription):
 * - Verify payment_status is 'paid'
 * - Check metadata.type === 'credits' to distinguish from subscriptions
 * - Add credits to organization (1:1 dollar to credit ratio)
 * - Log transaction in credit_transactions table
 *
 * Phase 9.2.16 - One-Time Credit Purchase System
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log(`[Webhook] Checkout session completed: ${session.id}`);

    // Only process credit purchases (not subscriptions)
    if (session.metadata?.type !== 'credits') {
      console.log('[Webhook] Not a credit purchase - skipping');
      return;
    }

    // Verify payment was successful
    if (session.payment_status !== 'paid') {
      console.error('[Webhook] Payment not completed:', session.payment_status);
      return;
    }

    // Get organization ID from metadata
    const organizationId = session.metadata?.organization_id;

    if (!organizationId) {
      console.error('[Webhook] No organization_id in session metadata');
      return;
    }

    // Get amount from metadata (in dollars)
    const amount = parseFloat(session.metadata?.amount || '0');

    if (!amount || amount <= 0) {
      console.error('[Webhook] Invalid amount in metadata:', session.metadata?.amount);
      return;
    }

    console.log(
      `[Webhook] Processing credit purchase: $${amount.toFixed(2)} for organization ${organizationId}`
    );

    // Convert dollars to cents for addCreditsToOrganization function
    const amountCents = Math.round(amount * 100);

    // Add credits to organization
    // billingCycleCount = 0 for one-time purchases (not subscription billing)
    const result = await addCreditsToOrganization(organizationId, amountCents, 0);

    if (result.success) {
      console.log(
        `[Webhook] ✅ Granted $${result.creditsAdded?.toFixed(2)} credits from one-time purchase (new balance: $${result.newBalance?.toFixed(2)})`
      );
    } else {
      console.error('[Webhook] ❌ Failed to grant credits:', result.error);
    }
  } catch (error) {
    console.error('[Webhook] Error handling checkout session completed:', error);
  }
}

/**
 * POST /api/stripe/webhook
 *
 * Stripe webhook endpoint - receives events from Stripe
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body as text (required for signature verification)
    const body = await request.text();

    // Get Stripe signature from headers
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('[Webhook] No stripe-signature header');
      return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
    }

    // Verify webhook signature
    const event = await verifyWebhookSignature(body, signature);

    if (!event) {
      console.error('[Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log(`[Webhook] ✅ Received verified event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    // Return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Unexpected error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unexpected error',
      },
      { status: 500 }
    );
  }
}
