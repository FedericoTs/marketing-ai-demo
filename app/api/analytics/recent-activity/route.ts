import { NextResponse } from "next/server";
import { getRecentActivity } from "@/lib/database/tracking-queries";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const activities = getRecentActivity(limit);

    return NextResponse.json(
      successResponse(activities, "Recent activity retrieved successfully")
    );
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    return NextResponse.json(
      errorResponse("Failed to fetch recent activity", "FETCH_ERROR"),
      { status: 500 }
    );
  }
}
