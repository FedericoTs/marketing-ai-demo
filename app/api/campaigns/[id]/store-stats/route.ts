import { NextRequest, NextResponse } from "next/server";

// Dynamic import of retail queries (optional feature)
function getRetailQueries() {
  try {
    return require("@/lib/database/retail-queries");
  } catch (e) {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await context.params;

    // Check if retail module is available
    const retail = getRetailQueries();

    if (!retail) {
      // Retail module not enabled, return empty result
      return NextResponse.json({
        success: true,
        data: [],
        message: "Retail module not enabled",
      });
    }

    // Get deployment stats for this campaign
    const stats = retail.getDeploymentStats(campaignId);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error: unknown) {
    console.error("Error fetching store stats:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch store stats: ${errorMessage}`,
        data: [],
      },
      { status: 500 }
    );
  }
}
