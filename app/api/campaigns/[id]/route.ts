import { NextResponse } from "next/server";
import {
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  duplicateCampaign,
} from "@/lib/database/tracking-queries";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

// GET: Get campaign details by ID
export async function GET(
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

    return NextResponse.json(successResponse(campaign));
  } catch (error) {
    console.error("❌ [Campaign GET] Error:", error);
    return NextResponse.json(
      errorResponse("Failed to fetch campaign", "FETCH_ERROR"),
      { status: 500 }
    );
  }
}

// PATCH: Update campaign (name, message, status)
// Part of Improvement #5: Contextual Quick Actions
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, message, status } = body;

    // Validate status if provided
    if (status && !["active", "paused", "completed"].includes(status)) {
      return NextResponse.json(
        errorResponse(
          "Invalid status. Must be 'active', 'paused', or 'completed'",
          "INVALID_STATUS"
        ),
        { status: 400 }
      );
    }

    console.log('🔄 [Campaign PATCH] Updating campaign:', id, { name, message, status });

    // Update campaign using flexible updateCampaign function
    const updated = updateCampaign(id, { name, message, status });

    if (!updated) {
      console.warn('⚠️  [Campaign PATCH] Campaign not found:', id);
      return NextResponse.json(
        errorResponse("Campaign not found", "CAMPAIGN_NOT_FOUND"),
        { status: 404 }
      );
    }

    console.log('✅ [Campaign PATCH] Campaign updated successfully:', id);

    return NextResponse.json(
      successResponse(updated, "Campaign updated successfully")
    );
  } catch (error) {
    console.error("❌ [Campaign PATCH] Error:", error);
    return NextResponse.json(
      errorResponse("Failed to update campaign", "UPDATE_ERROR"),
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
