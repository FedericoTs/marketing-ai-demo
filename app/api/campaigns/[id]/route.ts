import { NextResponse } from "next/server";
import {
  getCampaignById,
  updateCampaignStatus,
  deleteCampaign,
  duplicateCampaign,
} from "@/lib/database/tracking-queries";

// PATCH: Update campaign status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !["active", "paused", "completed"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid status. Must be 'active', 'paused', or 'completed'",
        },
        { status: 400 }
      );
    }

    const updated = updateCampaignStatus(id, status);

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          error: "Campaign not found or failed to update",
        },
        { status: 404 }
      );
    }

    // Get updated campaign
    const campaign = getCampaignById(id);

    return NextResponse.json({
      success: true,
      data: campaign,
      message: `Campaign status updated to ${status}`,
    });
  } catch (error) {
    console.error("Error updating campaign status:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update campaign status",
      },
      { status: 500 }
    );
  }
}

// DELETE: Delete campaign
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const campaign = getCampaignById(id);
    if (!campaign) {
      return NextResponse.json(
        {
          success: false,
          error: "Campaign not found",
        },
        { status: 404 }
      );
    }

    const deleted = deleteCampaign(id);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete campaign",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Campaign "${campaign.name}" deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete campaign",
      },
      { status: 500 }
    );
  }
}
