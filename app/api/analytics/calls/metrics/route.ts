import { NextResponse, NextRequest } from "next/server";
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from "@/lib/utils/api-response";

/**
 * GET /api/analytics/calls/metrics
 *
 * MIGRATED TO SUPABASE - NO SQLite dependencies
 *
 * Returns call metrics from ElevenLabs calls table
 */
export async function GET(request: NextRequest) {
  try {
    // Get organization ID from authenticated user
    const supabaseAuth = await createClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        errorResponse('Unauthorized', 'AUTH_ERROR'),
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabaseAuth
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

    // Use service role client to bypass RLS (we manually filter by org_id for security)
    const supabase = createServiceClient();

    // Get all calls for this organization
    const { data: calls, error: callsError } = await supabase
      .from('elevenlabs_calls')
      .select('*')
      .eq('organization_id', profile.organization_id);

    if (callsError) {
      console.error('[Call Metrics API] Error:', callsError);
      return NextResponse.json(
        errorResponse('Failed to fetch call metrics', 'FETCH_ERROR'),
        { status: 500 }
      );
    }

    // Calculate metrics
    const totalCalls = calls?.length || 0;
    const successfulCalls = calls?.filter(c => c.call_successful)?.length || 0;
    const appointmentsBooked = calls?.filter(c => c.appointment_booked)?.length || 0;
    const totalDuration = calls?.reduce((sum, c) => sum + (c.call_duration_seconds || 0), 0) || 0;
    const avgDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;

    const metrics = {
      totalCalls,
      successfulCalls,
      appointmentsBooked,
      successRate: totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0,
      conversionRate: totalCalls > 0 ? (appointmentsBooked / totalCalls) * 100 : 0,
      avgDuration: Math.round(avgDuration),
      totalRevenue: calls?.reduce((sum, c) => sum + (c.conversion_value || 0), 0) || 0,
    };

    return NextResponse.json(
      successResponse(metrics, "Call metrics retrieved successfully")
    );
  } catch (error) {
    console.error("[Call Metrics API] Error:", error);
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to fetch call metrics",
        "FETCH_ERROR"
      ),
      { status: 500 }
    );
  }
}
