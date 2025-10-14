import { NextResponse } from "next/server";
import { getRecentActivity } from "@/lib/database/tracking-queries";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const activities = getRecentActivity(limit);

    return NextResponse.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch recent activity",
      },
      { status: 500 }
    );
  }
}
