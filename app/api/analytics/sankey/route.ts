import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getSankeyChartData } from "@/lib/database/tracking-queries";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    console.log('[Sankey API] Request received:', {
      startDate,
      endDate,
      hasStartDate: !!startDate,
      hasEndDate: !!endDate
    });

    const data = getSankeyChartData(startDate, endDate);

    console.log('[Sankey API] Data returned:', {
      nodesCount: data.nodes.length,
      linksCount: data.links.length,
      metrics: data.metrics
    });

    if (data.links.length === 0) {
      console.warn('[Sankey API] ⚠️  WARNING: No links generated! This will show "No data" message.');
      console.warn('[Sankey API] Debug info:', {
        nodes: data.nodes.map(n => n.name),
        metrics: data.metrics
      });
    }

    return NextResponse.json(
      successResponse(data, "Sankey chart data retrieved successfully")
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isSQLiteError = errorMessage.includes('invalid ELF header') ||
                          errorMessage.includes('better_sqlite3');

    if (isSQLiteError) {
      console.warn("[Sankey API] SQLite not available - returning empty dataset");
      // Return empty but valid data structure
      return NextResponse.json(
        successResponse(
          {
            nodes: [],
            links: [],
            metrics: {
              total_recipients: 0,
              qr_scans: 0,
              page_views: 0,
              conversions: 0,
              scan_rate: 0,
              conversion_rate: 0,
            },
          },
          "Sankey chart unavailable (requires local database)"
        )
      );
    }

    console.error("[Sankey API] ❌ Error fetching Sankey chart data:", error);
    console.error("[Sankey API] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      errorResponse(
        "Failed to fetch Sankey chart data",
        "FETCH_ERROR"
      ),
      { status: 500 }
    );
  }
}
