import { NextResponse } from "next/server";
import { duplicateCampaign } from "@/lib/database/tracking-queries";

// POST: Duplicate campaign
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const newCampaign = duplicateCampaign(id);

    if (!newCampaign) {
      return NextResponse.json(
        {
          success: false,
          error: "Campaign not found or failed to duplicate",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: newCampaign,
      message: `Campaign duplicated as "${newCampaign.name}"`,
    });
  } catch (error) {
    console.error("Error duplicating campaign:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to duplicate campaign",
      },
      { status: 500 }
    );
  }
}
