/**
 * Stripe Customer Creation Endpoint
 *
 * Creates a Stripe customer for an organization after signup.
 * This is called asynchronously after user signup to avoid blocking
 * the signup flow if Stripe API is slow or unavailable.
 *
 * Phase 9.2.2 - Customer Creation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createStripeCustomerForOrganization } from '@/lib/stripe/customer';

export async function POST(request: NextRequest) {
  try {
    console.log('[Stripe API] Create customer endpoint called');

    // Extract JWT token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      console.error('[Stripe API] No authorization token provided');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Create anon client to verify JWT
    const anonClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Verify token and get user
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser();

    if (authError || !user) {
      console.error('[Stripe API] Authentication failed:', authError?.message);
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[Stripe API] Authenticated user: ${user.email}`);

    // Use service client for database operations (bypasses RLS)
    const supabase = createServiceClient();

    // Get user's organization from user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id, organizations(id, name, slug)')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.organizations) {
      console.error('[Stripe API] User profile or organization not found:', profileError);
      return NextResponse.json(
        {
          success: false,
          error: 'Organization not found. Please complete signup first.',
        },
        { status: 404 }
      );
    }

    const org = profile.organizations as any;
    const organizationId = org.id;

    console.log(`[Stripe API] Creating customer for organization: ${org.name} (${organizationId})`);

    // Create Stripe customer (idempotent)
    const result = await createStripeCustomerForOrganization(organizationId, {
      id: organizationId,
      name: org.name,
      email: user.email,
      slug: org.slug,
    });

    if (result.skipped) {
      // Stripe not configured - return success but indicate it was skipped
      console.log('[Stripe API] Stripe not configured, customer creation skipped');
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'Stripe not configured',
      });
    }

    if (!result.success) {
      console.error('[Stripe API] Failed to create customer:', result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to create Stripe customer',
        },
        { status: 500 }
      );
    }

    console.log(`[Stripe API] ✅ Customer created successfully: ${result.customerId}`);

    return NextResponse.json({
      success: true,
      customerId: result.customerId,
      message: 'Stripe customer created successfully',
    });
  } catch (error) {
    console.error('[Stripe API] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected error',
      },
      { status: 500 }
    );
  }
}
