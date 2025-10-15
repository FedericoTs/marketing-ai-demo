import { NextRequest, NextResponse } from "next/server";
import {
  getOverallEngagementMetrics,
  getEngagementMetricsForCampaign,
} from "@/lib/database/tracking-queries";

/**
 * GET /api/analytics/engagement-metrics
 * Query params:
 * - campaignId (optional): Get metrics for specific campaign
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const campaignId = searchParams.get("campaignId");

    let metrics;

    if (campaignId) {
      // Get metrics for specific campaign
      metrics = getEngagementMetricsForCampaign(campaignId);
    } else {
      // Get overall metrics across all campaigns
      metrics = getOverallEngagementMetrics();
    }

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

    return NextResponse.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("Error fetching engagement metrics:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch engagement metrics",
      },
      { status: 500 }
    );
  }
}
