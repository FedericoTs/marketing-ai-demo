import { NextRequest, NextResponse } from "next/server";

// Dynamic import of retail queries (optional feature)
function getRetailQueries() {
  try {
    return require("@/lib/database/retail-queries");
  } catch (e) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const retail = getRetailQueries();

    if (!retail) {
      return NextResponse.json({
        success: false,
        error: "Retail module not enabled",
        data: [],
      });
    }

    // Get regional performance
    const regions = retail.getRegionalPerformance();

    return NextResponse.json({
      success: true,
      data: regions,
      count: regions.length,
    });
  } catch (error: unknown) {
    console.error("Error fetching regional performance:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch regional performance: ${errorMessage}`,
        data: [],
      },
      { status: 500 }
    );
  }
}
