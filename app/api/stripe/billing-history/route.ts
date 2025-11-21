/**
 * Billing History API
 *
 * Fetches invoice history from Stripe for the organization.
 * Returns list of invoices with payment details.
 *
 * Phase 9.2.10 - Subscription Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient, isStripeConfigured } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
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
        { error: 'No Stripe customer found' },
        { status: 400 }
      );
    }

    // Get query parameters for pagination
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Fetch invoices from Stripe
    const stripe = getStripeClient();

    console.log(`[Billing History] Fetching invoices for customer: ${org.stripe_customer_id}`);

    const invoices = await stripe.invoices.list({
      customer: org.stripe_customer_id,
      limit: Math.min(limit, 100), // Cap at 100
    });

    // Format invoice data for frontend
    const formattedInvoices = invoices.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      created: invoice.created,
      period_start: invoice.period_start,
      period_end: invoice.period_end,
      amount_due: invoice.amount_due,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status, // 'draft', 'open', 'paid', 'void', 'uncollectible'
      paid: invoice.paid,
      invoice_pdf: invoice.invoice_pdf, // PDF download URL
      hosted_invoice_url: invoice.hosted_invoice_url, // Stripe-hosted page
      billing_reason: invoice.billing_reason, // 'subscription_create', 'subscription_cycle', etc.
      description: invoice.description,
    }));

    console.log(`[Billing History] ✅ Retrieved ${formattedInvoices.length} invoices`);

    return NextResponse.json({
      success: true,
      invoices: formattedInvoices,
      has_more: invoices.has_more,
    });
  } catch (error) {
    console.error('[Billing History] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch billing history',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
