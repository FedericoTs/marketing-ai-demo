import { NextResponse } from "next/server";
import { getAllCampaigns } from "@/lib/database/tracking-queries";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

/**
 * GET /api/tracking/campaigns
 * Get all campaigns
 */
export async function GET() {
  try {
    const campaigns = getAllCampaigns();

    return NextResponse.json(
      successResponse(campaigns, "Campaigns retrieved successfully")
    );
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to fetch campaigns",
        "FETCH_ERROR"
      ),
      { status: 500 }
    );
  }
}
