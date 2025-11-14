/**
 * Financial Analytics API
 * GET /api/analytics/financial
 *
 * Returns investment tracking and financial metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFinancialOverview } from '@/lib/database/analytics-supabase-queries';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        errorResponse('Unauthorized', 'AUTH_ERROR'),
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return NextResponse.json(
        errorResponse('Organization not found', 'ORG_ERROR'),
        { status: 404 }
      );
    }

    // Get financial overview
    const financialData = await getFinancialOverview(profile.organization_id);

    return NextResponse.json(
      successResponse(financialData, 'Financial data retrieved successfully')
    );
  } catch (error) {
    console.error('[Financial API] Error:', error);
    return NextResponse.json(
      errorResponse('Failed to load financial data', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
