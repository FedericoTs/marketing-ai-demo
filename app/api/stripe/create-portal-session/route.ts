/**
 * Stripe Customer Portal Session API
 *
 * Creates a Stripe Customer Portal session for subscription management.
 * The Customer Portal is a Stripe-hosted page where customers can:
 * - Update payment methods
 * - View billing history
 * - Download invoices
 * - Cancel subscriptions (if configured)
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

    // Get user's organization and Stripe customer ID
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
      .select('id, name, stripe_customer_id')
      .eq('id', profile.organization_id)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    if (!org.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer found. Please complete payment setup first.' },
        { status: 400 }
      );
    }

    // Get return URL from request body (where to redirect after portal session)
    const body = await request.json();
    const returnUrl = body.return_url || `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`;

    // Create Stripe Customer Portal session
    const stripe = getStripeClient();

    console.log(`[Customer Portal] Creating portal session for customer: ${org.stripe_customer_id}`);

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: returnUrl,
    });

    console.log(`[Customer Portal] ✅ Portal session created: ${session.id}`);

    return NextResponse.json({
      success: true,
      url: session.url, // Redirect URL to Stripe-hosted portal
    });
  } catch (error) {
    console.error('[Customer Portal] Error creating portal session:', error);
    return NextResponse.json(
      {
        error: 'Failed to create portal session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
