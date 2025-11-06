/**
 * API Route: /api/organization/credits
 * GET - Fetch current organization's credit balance
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's organization ID
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Get organization credits
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('credits, total_credits_purchased, total_credits_spent')
      .eq('id', userProfile.organization_id)
      .single();

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      credits: Number(organization.credits),
      totalPurchased: Number(organization.total_credits_purchased || 0),
      totalSpent: Number(organization.total_credits_spent || 0),
    });
  } catch (error: any) {
    console.error('Error fetching credits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credit balance', message: error.message },
      { status: 500 }
    );
  }
}
