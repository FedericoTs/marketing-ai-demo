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

export async function GET(request: NextRequest) {
  try {
    const retail = getRetailQueries();

    if (!retail) {
      return NextResponse.json(
        errorResponse("Retail module not enabled", "MODULE_NOT_ENABLED")
      );
    }

    // Get overall retail stats
    const stats = retail.getOverallRetailStats();

    return NextResponse.json(
      successResponse(stats, "Retail stats retrieved successfully")
    );
  } catch (error: unknown) {
    console.error("Error fetching retail stats:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      errorResponse(
        `Failed to fetch stats: ${errorMessage}`,
        "FETCH_ERROR"
      ),
      { status: 500 }
    );
  }
}
