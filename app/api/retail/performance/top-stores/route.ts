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

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "10");
    const sortBy = (searchParams.get("sortBy") || "conversion_rate") as
      | "conversion_rate"
      | "conversions_count"
      | "recipients_count";

    // Get top performing stores
    const stores = retail.getTopPerformingStores(limit, sortBy);

    return NextResponse.json({
      success: true,
      data: stores,
      count: stores.length,
    });
  } catch (error: unknown) {
    console.error("Error fetching top stores:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch top stores: ${errorMessage}`,
        data: [],
      },
      { status: 500 }
    );
  }
}
