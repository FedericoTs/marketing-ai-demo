import { NextResponse } from "next/server";
import { getRecentCalls } from "@/lib/database/call-tracking-queries";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET() {
  try {
    const calls = getRecentCalls(50);

    return NextResponse.json(
      successResponse(calls, "Recent calls retrieved successfully")
    );
  } catch (error) {
    console.error("Error fetching recent calls:", error);
    return NextResponse.json(
      errorResponse("Failed to fetch recent calls", "FETCH_ERROR"),
      { status: 500 }
    );
  }
}
