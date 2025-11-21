/**
 * Cancel Subscription API
 *
 * Cancels the organization's Stripe subscription.
 * By default, cancellation happens at period end (immediate=false)
 * to allow users to use remaining paid time.
 *
 * Phase 9.2.10 - Subscription Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient, isStripeConfigured } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Verify Stripe is configured
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 503 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organization and subscription
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, stripe_subscription_id, billing_status')
      .eq('id', profile.organization_id)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    if (!org.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    // Check if already cancelled
    if (org.billing_status === 'cancelled') {
      return NextResponse.json(
        { error: 'Subscription already cancelled' },
        { status: 400 }
      );
    }

    // Get cancellation options from request body
    const body = await request.json();
    const immediate = body.immediate === true; // Default: false (cancel at period end)

    // Cancel subscription in Stripe
    const stripe = getStripeClient();

    console.log(
      `[Cancel Subscription] Cancelling subscription ${org.stripe_subscription_id} for org ${org.name} (immediate: ${immediate})`
    );

    const subscription = await stripe.subscriptions.update(org.stripe_subscription_id, {
      cancel_at_period_end: !immediate, // If immediate=false, set cancel_at_period_end=true
      ...(immediate && { cancel_at: 'now' }), // If immediate=true, cancel now
    });

    console.log(
      `[Cancel Subscription] ✅ Subscription ${immediate ? 'cancelled immediately' : 'will cancel at period end'}: ${subscription.id}`
    );

    // Note: Webhook will handle updating billing_status in database
    // We return the current subscription state for immediate UI update

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_end: subscription.current_period_end,
        cancelled_at: subscription.canceled_at,
      },
      message: immediate
        ? 'Subscription cancelled immediately'
        : 'Subscription will cancel at the end of the billing period',
    });
  } catch (error) {
    console.error('[Cancel Subscription] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to cancel subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
