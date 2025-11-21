/**
 * Stripe Webhook Handler
 *
 * Receives and processes webhook events from Stripe:
 * - invoice.payment_succeeded → Grant credits to organization
 * - customer.subscription.created → Log subscription creation
 * - customer.subscription.updated → Update subscription status
 * - customer.subscription.deleted → Handle subscription cancellation
 *
 * Phase 9.2.3 - Webhook Integration
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeClient } from '@/lib/stripe/client';
import {
  addCreditsToOrganization,
  getOrganizationFromCustomer,
  getBillingCycleCount,
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

    // Get subscription ID
    const subscriptionId =
      typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;

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

    // Determine billing cycle (1 = first month, 2+ = recurring)
    const billingCycleCount = await getBillingCycleCount(subscriptionId, organizationId);

    console.log(`[Webhook] Billing cycle: Month ${billingCycleCount}`);

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
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    console.log(`[Webhook] Subscription updated: ${subscription.id}`);
    console.log(`[Webhook] Status: ${subscription.status}`);

    // TODO: Update billing_status in organizations table
    // This would be useful for tracking if subscription is past_due, canceled, etc.
  } catch (error) {
    console.error('[Webhook] Error handling subscription updated:', error);
  }
}

/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    console.log(`[Webhook] Subscription deleted: ${subscription.id}`);

    // TODO: Handle subscription cancellation
    // - Update billing_status to 'canceled'
    // - Send notification to organization
    // - Optionally disable features
  } catch (error) {
    console.error('[Webhook] Error handling subscription deleted:', error);
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
        console.log('[Webhook] ⚠️  Payment failed:', event.data.object);
        // TODO: Handle payment failure
        // - Notify organization
        // - Update billing_status to 'past_due'
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
