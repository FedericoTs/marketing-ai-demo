import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/lib/supabase/server';
import {
  getDashboardStats,
  getOverallEngagementMetrics,
} from "@/lib/database/analytics-supabase-queries";
import { formatEngagementTime } from "@/lib/format-time";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

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

    // Get dashboard stats for this organization
    const stats = await getDashboardStats(profile.organization_id, startDate, endDate);
    const engagementMetrics = await getOverallEngagementMetrics(profile.organization_id, startDate, endDate);

    // Get REAL call metrics from ElevenLabs calls (Supabase)
    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabaseService = createServiceClient();

    let callQuery = supabaseService
      .from('elevenlabs_calls')
      .select('call_successful, call_duration_seconds, appointment_booked')
      .eq('organization_id', profile.organization_id);

    if (startDate) {
      callQuery = callQuery.gte('start_time', startDate);
    }
    if (endDate) {
      callQuery = callQuery.lte('start_time', endDate);
    }

    const { data: calls } = await callQuery;

    const totalCalls = calls?.length || 0;
    const successfulCalls = calls?.filter(c => c.call_successful).length || 0;
    const appointmentsBooked = calls?.filter(c => c.appointment_booked).length || 0;
    const totalDuration = calls?.reduce((sum, c) => sum + (c.call_duration_seconds || 0), 0) || 0;
    const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
    const conversionRate = totalCalls > 0 ? Number(((appointmentsBooked / totalCalls) * 100).toFixed(1)) : 0;

    const callMetrics = {
      total_calls: totalCalls,
      successful_calls: successfulCalls,
      failed_calls: calls?.filter(c => !c.call_successful).length || 0,
      unknown_calls: 0,
      conversions: appointmentsBooked,
      conversion_rate: conversionRate,
      average_duration: avgDuration,
      calls_today: 0, // TODO: Implement time-based filters
      calls_this_week: 0,
      calls_this_month: 0,
    };

    return NextResponse.json(
      successResponse(
        {
          ...stats,
          callMetrics,
          engagementMetrics: {
            avgTimeToFirstView: formatEngagementTime(engagementMetrics.avg_time_to_first_view_seconds),
            avgTimeToConversion: formatEngagementTime(engagementMetrics.avg_time_to_conversion_seconds),
            avgTotalTimeToConversion: formatEngagementTime(engagementMetrics.avg_total_time_seconds),
            avgTimeToAppointment: formatEngagementTime(engagementMetrics.avg_time_to_appointment_seconds),
          },
        },
        "Analytics data retrieved successfully"
      )
    );
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      errorResponse("Failed to fetch dashboard statistics", "ANALYTICS_ERROR"),
      { status: 500 }
    );
  }
}
