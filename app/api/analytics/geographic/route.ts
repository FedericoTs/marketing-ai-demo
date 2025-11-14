/**
 * Geographic Analytics API
 * GET /api/analytics/geographic
 *
 * Returns geographic performance metrics by state
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGeographicPerformance } from '@/lib/database/analytics-supabase-queries';
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

    // Get geographic performance data
    const geographicData = await getGeographicPerformance(profile.organization_id);

    return NextResponse.json(
      successResponse(geographicData, 'Geographic data retrieved successfully')
    );
  } catch (error) {
    console.error('[Geographic API] Error:', error);
    return NextResponse.json(
      errorResponse('Failed to load geographic data', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
