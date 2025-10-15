import { NextRequest, NextResponse } from "next/server";

// Dynamic import of retail queries (optional feature)
function getRetailQueries() {
  try {
    return require("@/lib/database/retail-queries");
  } catch (e) {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const retail = getRetailQueries();

    if (!retail) {
      return NextResponse.json({
        success: false,
        error: "Retail module not enabled",
      });
    }

    // Trigger aggregation for all stores
    console.log("Starting performance aggregation for all stores...");
    retail.aggregateAllStoresPerformance('all_time');
    console.log("Performance aggregation complete!");

    return NextResponse.json({
      success: true,
      message: "Performance aggregation completed successfully",
    });
  } catch (error: unknown) {
    console.error("Error aggregating performance:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        error: `Failed to aggregate performance: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
