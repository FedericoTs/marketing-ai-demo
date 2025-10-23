import { NextResponse } from "next/server";
import { getAllCallMetrics } from "@/lib/database/call-tracking-queries";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET() {
  try {
    const metrics = getAllCallMetrics();

    return NextResponse.json(
      successResponse(metrics, "Call metrics retrieved successfully")
    );
  } catch (error) {
    console.error("Error fetching call metrics:", error);
    return NextResponse.json(
      errorResponse("Failed to fetch call metrics", "FETCH_ERROR"),
      { status: 500 }
    );
  }
}
