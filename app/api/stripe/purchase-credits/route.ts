/**
 * API Route: /api/stripe/purchase-credits
 * POST - Create Stripe Checkout session for one-time credit purchase
 *
 * Allows users to purchase additional DropLab credits beyond their subscription.
 * $1 = 1 credit. Credits can be used for Data Axle contacts and PostGrid printing.
 *
 * Phase 9.2.16 - One-Time Credit Purchase System
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripeClient } from '@/lib/stripe/client';

interface PurchaseCreditsRequest {
  amount: number; // Amount in dollars (e.g., 250 for $250)
}

export async function POST(request: NextRequest) {
  try {
    const body: PurchaseCreditsRequest = await request.json();
    const { amount } = body;

    console.log(`[Purchase Credits] Request for $${amount}`);

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount < 10 || amount > 10000) {
      return NextResponse.json(
        { error: 'Amount must be between $10 and $10,000' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Purchase Credits] Authentication error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      );
    }

    console.log(`[Purchase Credits] User: ${user.email}`);

    // Get user's profile to find organization
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[Purchase Credits] Profile not found:', profileError);
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Get organization with Stripe data
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, stripe_customer_id, credits')
      .eq('id', profile.organization_id)
      .single();

    if (orgError || !org) {
      console.error('[Purchase Credits] Organization not found:', orgError);
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    console.log(`[Purchase Credits] Organization: ${org.name} (Current balance: $${org.credits})`);

    // Get Stripe client
    const stripe = getStripeClient();

    // Auto-create Stripe customer if doesn't exist
    let customerId = org.stripe_customer_id;

    if (!customerId) {
      console.log('[Purchase Credits] No Stripe customer found - creating one automatically');

      try {
        const customer = await stripe.customers.create({
          email: user.email,
          name: org.name,
          metadata: {
            organization_id: org.id,
            organization_name: org.name,
          },
        });

        customerId = customer.id;

        // Save customer ID to database
        const { error: updateError } = await supabase
          .from('organizations')
          .update({ stripe_customer_id: customerId })
          .eq('id', org.id);

        if (updateError) {
          console.error('[Purchase Credits] Failed to save customer ID:', updateError);
        } else {
          console.log(`[Purchase Credits] ✅ Created Stripe customer: ${customerId}`);
        }
      } catch (error) {
        console.error('[Purchase Credits] Failed to create Stripe customer:', error);
        return NextResponse.json(
          { error: 'Failed to set up payment account. Please try again.' },
          { status: 500 }
        );
      }
    }

    // Get app URL from environment
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Ensure customerId is valid before creating session
    if (!customerId) {
      console.error('[Purchase Credits] Customer ID is missing after creation');
      return NextResponse.json(
        { error: 'Failed to set up payment account. Please try again.' },
        { status: 500 }
      );
    }

    // At this point, customerId is guaranteed to be a string
    const validCustomerId: string = customerId;

    // Create Checkout Session for ONE-TIME PAYMENT
    // Using type assertion to handle Stripe SDK v20 type strictness
    const sessionParams = {
      customer: validCustomerId,
      mode: 'payment' as const, // ⚡ ONE-TIME PAYMENT (not subscription)
      payment_method_types: ['card'] as const,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amount * 100, // Convert dollars to cents ($250 → 25000 cents)
            product_data: {
              name: `DropLab Credits - $${amount.toLocaleString()}`,
              description: `Purchase $${amount.toLocaleString()} in platform credits for Data Axle contacts and PostGrid printing.`,
              images: [`${appUrl}/images/logo_icon_tbg.png`], // Optional: Show logo in Stripe Checkout
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        organization_id: org.id,
        organization_name: org.name,
        amount: amount.toString(), // Store for webhook
        type: 'credits', // ⚡ CRITICAL: Distinguish from subscription payments
        user_id: user.id,
        user_email: user.email || '',
      },
      success_url: `${appUrl}/settings?purchase=success&amount=${amount}`,
      cancel_url: `${appUrl}/settings?purchase=canceled`,
      // Optional: Customize checkout page
      custom_text: {
        submit: {
          message: `Complete purchase to add $${amount.toLocaleString()} credits to your account`,
        },
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = await stripe.checkout.sessions.create(sessionParams as any);

    console.log('[Purchase Credits] ✅ Checkout session created:', session.id);
    console.log('[Purchase Credits] Redirect URL:', session.url);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      amount,
    });
  } catch (error) {
    console.error('[Purchase Credits] Error creating checkout session:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create checkout session',
      },
      { status: 500 }
    );
  }
}
