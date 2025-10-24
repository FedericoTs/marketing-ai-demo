import { NextRequest, NextResponse } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

// Dynamic import of retail queries (optional feature)
function getRetailQueries() {
  try {
    return require("@/lib/database/retail-queries");
  } catch (e) {
    return null;
  }
}

/**
 * GET /api/retail/performance/engagement-metrics
 * Query params:
 * - storeId (optional): Get metrics for specific store
 */
export async function GET(request: NextRequest) {
  try {
    const retail = getRetailQueries();

    if (!retail) {
      return NextResponse.json(
        errorResponse("Retail module not enabled", "MODULE_DISABLED"),
        { status: 503 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get("storeId");

    let metrics;

    if (storeId) {
      // Get metrics for specific store
      metrics = retail.getStoreEngagementMetrics(storeId);

      // Format for display
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
        storeId,
        avgTimeToFirstView: formatTime(metrics.avgTimeToFirstView),
        avgTimeToConversion: formatTime(metrics.avgTimeToConversion),
        avgTotalTimeToConversion: formatTime(metrics.avgTotalTimeToConversion),
        recipientsWithViews: metrics.recipientsWithViews,
        conversionsCount: metrics.conversionsCount,
      };

      return NextResponse.json(
        successResponse(formatted, "Store engagement metrics retrieved successfully")
      );
    } else {
      // Get metrics for all stores
      const allStoresMetrics = retail.getAllStoresEngagementMetrics();

      return NextResponse.json(
        successResponse(allStoresMetrics, "All stores engagement metrics retrieved successfully")
      );
    }
  } catch (error) {
    console.error("Error fetching retail engagement metrics:", error);
    return NextResponse.json(
      errorResponse(
        "Failed to fetch retail engagement metrics",
        "FETCH_ERROR"
      ),
      { status: 500 }
    );
  }
}
