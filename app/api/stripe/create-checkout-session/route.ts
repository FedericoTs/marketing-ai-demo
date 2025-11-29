/**
 * Create Stripe Checkout Session
 *
 * Generates a Stripe Checkout URL for users with incomplete subscriptions
 * to collect payment method and complete their first payment.
 *
 * Phase 9.2.3 - Payment Collection Flow
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripeClient } from '@/lib/stripe/client';

/**
 * POST /api/stripe/create-checkout-session
 *
 * Creates Stripe Checkout session for completing subscription payment
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Checkout] Authentication error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      );
    }

    console.log(`[Checkout] Creating session for user: ${user.email}`);

    // Get user's profile to find organization
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[Checkout] Profile not found:', profileError);
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Get organization with Stripe data
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, stripe_customer_id, stripe_subscription_id, billing_status')
      .eq('id', profile.organization_id)
      .single();

    if (orgError || !org) {
      console.error('[Checkout] Organization not found:', orgError);
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Verify Stripe customer exists
    if (!org.stripe_customer_id) {
      console.error('[Checkout] No Stripe customer ID for organization:', org.id);
      return NextResponse.json(
        { error: 'Stripe customer not created. Please contact support.' },
        { status: 400 }
      );
    }

    // Verify subscription exists
    if (!org.stripe_subscription_id) {
      console.error('[Checkout] No subscription found for organization:', org.id);
      return NextResponse.json(
        { error: 'Subscription not created. Please contact support.' },
        { status: 400 }
      );
    }

    // Get Stripe client
    const stripe = getStripeClient();

    // Fetch subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);

    console.log('[Checkout] Subscription status:', subscription.status);

    // Get app URL from environment
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Handle incomplete_expired subscriptions - need to create a fresh subscription
    if (subscription.status === 'incomplete_expired') {
      console.log('[Checkout] Subscription expired - creating fresh subscription via Checkout');

      // Get the price ID from environment (same as initial subscription)
      const priceId = process.env.STRIPE_PRICE_ID;

      if (!priceId) {
        console.error('[Checkout] STRIPE_PRICE_ID not configured');
        return NextResponse.json(
          { error: 'Subscription product not configured. Please contact support.' },
          { status: 500 }
        );
      }

      // Create Checkout session for a NEW subscription (old one is dead)
      const checkoutSession = await stripe.checkout.sessions.create({
        customer: org.stripe_customer_id,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        subscription_data: {
          metadata: {
            organization_id: org.id,
            replaced_subscription: org.stripe_subscription_id, // Track the old subscription
          },
        },
        success_url: `${appUrl}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/dashboard?payment=canceled`,
        metadata: {
          organization_id: org.id,
          type: 'subscription_replacement', // Mark this as a replacement subscription
        },
      });

      console.log('[Checkout] ✅ Fresh subscription session created:', checkoutSession.id);
      console.log('[Checkout] Redirect URL:', checkoutSession.url);

      return NextResponse.json({
        sessionId: checkoutSession.id,
        url: checkoutSession.url,
      });
    }

    // Only create Checkout session if subscription is incomplete or past_due
    if (subscription.status !== 'incomplete' && subscription.status !== 'past_due') {
      console.log(`[Checkout] Subscription already ${subscription.status} - no payment needed`);
      return NextResponse.json(
        {
          error: `Subscription is already ${subscription.status}`,
          redirectUrl: '/dashboard'
        },
        { status: 400 }
      );
    }

    // Create Checkout Session for the existing incomplete subscription
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: org.stripe_customer_id,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: subscription.items.data[0].price.id, // Use price from existing subscription
          quantity: 1,
        },
      ],
      subscription_data: {
        // Link to existing subscription
        metadata: {
          subscription_id: org.stripe_subscription_id,
          organization_id: org.id,
        },
      },
      success_url: `${appUrl}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard?payment=canceled`,
      metadata: {
        organization_id: org.id,
        subscription_id: org.stripe_subscription_id,
      },
    });

    console.log('[Checkout] ✅ Session created:', checkoutSession.id);
    console.log('[Checkout] Redirect URL:', checkoutSession.url);

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });

  } catch (error) {
    console.error('[Checkout] Error creating session:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create checkout session',
      },
      { status: 500 }
    );
  }
}
