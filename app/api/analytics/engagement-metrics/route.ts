import { NextRequest, NextResponse } from "next/server";
import {
  getOverallEngagementMetrics,
} from "@/lib/database/analytics-supabase-queries";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { createServerClient } from "@/lib/supabase/server";

/**
 * GET /api/analytics/engagement-metrics
 * Query params:
 * - startDate (optional): Filter by start date
 * - endDate (optional): Filter by end date
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    // Get organization ID from session
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        errorResponse("Not authenticated", "AUTH_ERROR"),
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        errorResponse("Organization not found", "ORG_NOT_FOUND"),
        { status: 404 }
      );
    }

    // Get overall metrics for organization
    const metrics = await getOverallEngagementMetrics(
      profile.organization_id,
      startDate,
      endDate
    );

    // Convert seconds to human-readable format
    const formatTime = (seconds: number | null) => {
      if (!seconds) return null;

      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);

      if (hours > 0) {
        return {
          value: hours + (minutes / 60),
          unit: "hours",
          display: `${hours}h ${minutes}m`,
          seconds: seconds,
        };
      } else if (minutes > 0) {
        return {
          value: minutes + (secs / 60),
          unit: "minutes",
          display: `${minutes}m ${secs}s`,
          seconds: seconds,
        };
      } else {
        return {
          value: seconds,
          unit: "seconds",
          display: `${secs}s`,
          seconds: seconds,
        };
      }
    };

    const formatted = {
      timeToFirstView: formatTime(metrics.avg_time_to_first_view_seconds),
      timeToConversion: formatTime(metrics.avg_time_to_conversion_seconds),
      totalTimeToConversion: formatTime(metrics.avg_total_time_seconds),
      recipientsWithViews: metrics.recipients_with_views || 0,
      recipientsWithConversions: metrics.recipients_with_conversions || metrics.conversions_count || 0,
    };

    return NextResponse.json(
      successResponse(formatted, "Engagement metrics retrieved successfully")
    );
  } catch (error) {
    console.error("Error fetching engagement metrics:", error);
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to fetch engagement metrics",
        "FETCH_ERROR"
      ),
      { status: 500 }
    );
  }
}
