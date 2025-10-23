import { NextResponse } from "next/server";
import { getAllCampaignsWithStats } from "@/lib/database/tracking-queries";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET() {
  try {
    const campaigns = getAllCampaignsWithStats();

    return NextResponse.json(
      successResponse(campaigns, "Campaigns retrieved successfully")
    );
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      errorResponse("Failed to fetch campaigns", "FETCH_ERROR"),
      { status: 500 }
    );
  }
}
