import { NextResponse } from "next/server";
import {
  getCampaignById,
  updateCampaignStatus,
  deleteCampaign,
  duplicateCampaign,
} from "@/lib/database/tracking-queries";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

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
        errorResponse(
          "Invalid status. Must be 'active', 'paused', or 'completed'",
          "INVALID_STATUS"
        ),
        { status: 400 }
      );
    }

    const updated = updateCampaignStatus(id, status);

    if (!updated) {
      return NextResponse.json(
        errorResponse("Campaign not found or failed to update", "CAMPAIGN_NOT_FOUND"),
        { status: 404 }
      );
    }

    // Get updated campaign
    const campaign = getCampaignById(id);

    return NextResponse.json(
      successResponse(campaign, `Campaign status updated to ${status}`)
    );
  } catch (error) {
    console.error("Error updating campaign status:", error);
    return NextResponse.json(
      errorResponse("Failed to update campaign status", "UPDATE_ERROR"),
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
        errorResponse("Campaign not found", "CAMPAIGN_NOT_FOUND"),
        { status: 404 }
      );
    }

    const deleted = deleteCampaign(id);

    if (!deleted) {
      return NextResponse.json(
        errorResponse("Failed to delete campaign", "DELETE_ERROR"),
        { status: 500 }
      );
    }

    return NextResponse.json(
      successResponse(null, `Campaign "${campaign.name}" deleted successfully`)
    );
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return NextResponse.json(
      errorResponse("Failed to delete campaign", "DELETE_ERROR"),
      { status: 500 }
    );
  }
}
