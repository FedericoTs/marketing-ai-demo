/**
 * Stripe Subscription Management
 *
 * Functions for creating and managing Stripe subscriptions
 * for DropLab organizations.
 *
 * Phase 9.2.3 - Subscription Management
 */

import { getStripeClient, isStripeConfigured } from './client';
import { createServiceClient } from '@/lib/supabase/server';

export interface CreateSubscriptionResult {
  success: boolean;
  subscriptionId?: string;
  error?: string;
  skipped?: boolean; // True if subscription not configured
}

/**
 * Check if subscription is configured
 * Requires both Stripe client AND price ID
 */
export function isSubscriptionConfigured(): boolean {
  return isStripeConfigured() && !!process.env.STRIPE_PRICE_ID;
}

/**
 * Create Stripe subscription for a customer
 *
 * This function is idempotent - it will:
 * 1. Check if subscription already exists (stripe_subscription_id set)
 * 2. If exists, return existing subscription ID
 * 3. If not exists, create new subscription and update database
 *
 * @param customerId - Stripe customer ID (cus_xxx)
 * @param organizationId - UUID of the organization
 * @returns Result object with success status and subscription ID or error
 */
export async function createSubscriptionForCustomer(
  customerId: string,
  organizationId: string
): Promise<CreateSubscriptionResult> {
  try {
    // Check if subscription is configured
    if (!isSubscriptionConfigured()) {
      console.log('[Stripe Subscription] Not configured, skipping subscription creation');
      return {
        success: false,
        skipped: true,
        error: 'Subscription product not configured (STRIPE_PRICE_ID missing)',
      };
    }

    const supabase = createServiceClient();

    // STEP 1: Check if organization already has a subscription (idempotent check)
    const { data: org, error: fetchError } = await supabase
      .from('organizations')
      .select('id, name, stripe_subscription_id')
      .eq('id', organizationId)
      .single();

    if (fetchError || !org) {
      console.error('[Stripe Subscription] Organization not found:', organizationId);
      return {
        success: false,
        error: 'Organization not found',
      };
    }

    // Idempotent check: return existing subscription
    if (org.stripe_subscription_id) {
      console.log(
        `[Stripe Subscription] Subscription already exists for org ${org.name}: ${org.stripe_subscription_id}`
      );
      return {
        success: true,
        subscriptionId: org.stripe_subscription_id,
      };
    }

    // STEP 2: Create Stripe subscription
    const stripe = getStripeClient();
    const priceId = process.env.STRIPE_PRICE_ID!;

    console.log(`[Stripe Subscription] Creating subscription for customer: ${customerId}`);

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: priceId, // $499/month recurring price
        },
      ],
      payment_behavior: 'default_incomplete', // Recommended: creates invoice, doesn't charge immediately
      payment_settings: {
        payment_method_types: ['card'], // Accept card payments
        save_default_payment_method: 'on_subscription', // Save for future charges
      },
      metadata: {
        organization_id: organizationId,
        platform: 'droplab',
        environment: process.env.NODE_ENV || 'development',
      },
      // Note: In test mode with test cards, payment succeeds immediately
      // In production, payment will be processed and webhooks will fire
    });

    console.log(`[Stripe Subscription] Created subscription ${subscription.id} for customer ${customerId}`);

    // STEP 3: Store subscription ID in database
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        stripe_subscription_id: subscription.id,
        billing_status: subscription.status, // 'active', 'past_due', 'canceled', etc.
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId);

    if (updateError) {
      console.error('[Stripe Subscription] Failed to update organization with subscription ID:', updateError);
      // Subscription was created in Stripe but failed to save to DB
      // This is recoverable - we can update the DB later
      return {
        success: false,
        subscriptionId: subscription.id,
        error: 'Created subscription but failed to update database',
      };
    }

    console.log(
      `[Stripe Subscription] ✅ Successfully linked subscription ${subscription.id} to org ${organizationId}`
    );

    return {
      success: true,
      subscriptionId: subscription.id,
    };
  } catch (error) {
    console.error('[Stripe Subscription] Error creating subscription:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get subscription status for an organization
 *
 * @param organizationId - UUID of the organization
 * @returns Subscription status or null if not found
 */
export async function getSubscriptionStatus(organizationId: string): Promise<string | null> {
  try {
    if (!isStripeConfigured()) {
      return null;
    }

    const supabase = createServiceClient();

    const { data: org, error } = await supabase
      .from('organizations')
      .select('stripe_subscription_id')
      .eq('id', organizationId)
      .single();

    if (error || !org || !org.stripe_subscription_id) {
      return null;
    }

    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);

    return subscription.status; // 'active', 'past_due', 'canceled', etc.
  } catch (error) {
    console.error('[Stripe Subscription] Error getting subscription status:', error);
    return null;
  }
}
