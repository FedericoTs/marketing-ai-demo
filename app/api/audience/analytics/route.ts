/**
 * API Route: /api/audience/analytics
 * GET - Get audience analytics and performance metrics
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
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

    // Get user's organization
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

    // 1. Count total saved audience filters
    const { count: totalAudiences, error: audiencesError } = await supabase
      .from('audience_filters')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', userProfile.organization_id);

    if (audiencesError) {
      console.error('[Analytics API] Error counting audiences:', audiencesError);
    }

    // 2. Sum total contacts purchased from recipient_lists
    const { data: recipientLists, error: recipientListsError } = await supabase
      .from('recipient_lists')
      .select('total_recipients')
      .eq('organization_id', userProfile.organization_id);

    if (recipientListsError) {
      console.error('[Analytics API] Error fetching recipient lists:', recipientListsError);
    }

    const totalContactsPurchased = recipientLists?.reduce(
      (sum, list) => sum + (list.total_recipients || 0),
      0
    ) || 0;

    // 3. Sum total spent from contact_purchases
    const { data: purchases, error: purchasesError } = await supabase
      .from('contact_purchases')
      .select('total_user_charge')
      .eq('organization_id', userProfile.organization_id);

    if (purchasesError) {
      console.error('[Analytics API] Error fetching purchases:', purchasesError);
    }

    const totalSpent = purchases?.reduce(
      (sum, purchase) => sum + (purchase.total_user_charge || 0),
      0
    ) || 0;

    // 4. Get saved audience names with purchase counts (for future top performers)
    const { data: savedAudiences, error: savedAudiencesError } = await supabase
      .from('audience_filters')
      .select(`
        id,
        name,
        filters,
        created_at
      `)
      .eq('organization_id', userProfile.organization_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (savedAudiencesError) {
      console.error('[Analytics API] Error fetching saved audiences:', savedAudiencesError);
    }

    // Calculate average conversion rate (placeholder until campaign tracking is implemented)
    // TODO: Implement campaign tracking to calculate real conversion rates
    const avgConversionRate = 0;

    // Top performers (empty until campaign tracking is implemented)
    // TODO: Query campaign performance data and rank by conversion rate
    const topPerformers: any[] = [];

    return NextResponse.json({
      success: true,
      analytics: {
        totalAudiences: totalAudiences || 0,
        totalContactsPurchased,
        totalSpent,
        avgConversionRate,
        topPerformers,
        savedAudiences: savedAudiences || [],
      },
    });
  } catch (error: any) {
    console.error('[Analytics API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
