import { NextRequest, NextResponse } from "next/server";
import {
  getDashboardStats,
  getOverallEngagementMetrics,
  getInvestmentMetrics,
} from "@/lib/database/analytics-supabase-queries";
import { getAllCallMetrics } from "@/lib/database/call-tracking-queries";
import { formatEngagementTime } from "@/lib/format-time";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

/**
 * Analytics Overview API - Supabase Version
 * Phase 5.7 - Advanced DM Analytics
 *
 * Returns comprehensive analytics data including:
 * - Dashboard stats (campaigns, recipients, conversions)
 * - Investment metrics (costs, budget utilization)
 * - Engagement metrics (time-based patterns)
 * - Call tracking metrics (ElevenLabs integration)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const organizationId = searchParams.get("organizationId") || undefined;

    // Fetch all analytics data in parallel for optimal performance
    const [stats, engagementMetrics, investmentMetrics, callMetrics] = await Promise.all([
      getDashboardStats(startDate, endDate, organizationId),
      getOverallEngagementMetrics(startDate, endDate, organizationId),
      getInvestmentMetrics(organizationId),
      Promise.resolve(getAllCallMetrics(startDate, endDate)), // Keep call metrics as-is for now
    ]);

    return NextResponse.json(
      successResponse(
        {
          ...stats,
          investmentMetrics,
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
