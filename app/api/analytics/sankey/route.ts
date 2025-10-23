import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getSankeyChartData } from "@/lib/database/tracking-queries";

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

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[Sankey API] ❌ Error fetching Sankey chart data:", error);
    console.error("[Sankey API] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch Sankey chart data",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
