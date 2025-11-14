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

    // Call metrics temporarily disabled (SQLite dependency)
    const callMetrics = {
      totalCalls: 0,
      successfulCalls: 0,
      avgDuration: 0,
      conversionRate: 0,
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
