import { NextResponse } from "next/server";
import { getAllCampaignsWithStats } from "@/lib/database/tracking-queries";

export async function GET() {
  try {
    const campaigns = getAllCampaignsWithStats();

    return NextResponse.json({
      success: true,
      data: campaigns,
    });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch campaigns",
      },
      { status: 500 }
    );
  }
}
