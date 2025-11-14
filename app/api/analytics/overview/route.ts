import { NextRequest, NextResponse } from "next/server";
import {
  getDashboardStats,
  getOverallEngagementMetrics,
} from "@/lib/database/tracking-queries";
import { getAllCallMetrics } from "@/lib/database/call-tracking-queries";
import { formatEngagementTime } from "@/lib/format-time";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const stats = getDashboardStats(startDate, endDate);
    const engagementMetrics = getOverallEngagementMetrics(startDate, endDate);

    // Get call tracking metrics (with date filtering)
    const callMetrics = getAllCallMetrics(startDate, endDate);

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
