import { NextResponse } from "next/server";
import {
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  duplicateCampaign,
} from "@/lib/database/tracking-queries";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { createServiceClient } from '@/lib/supabase/service-client';
import { createClient } from '@/lib/supabase/server';

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
// Supports both SQLite (legacy) and Supabase (new) databases
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, message, status } = body;

    // Validate status if provided (supports both old and new status values)
    const validStatuses = [
      'active', 'paused', 'completed', // Old SQLite statuses
      'draft', 'scheduled', 'sending', 'sent', 'failed' // New Supabase statuses
    ];

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        errorResponse(
          `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          "INVALID_STATUS"
        ),
        { status: 400 }
      );
    }

    console.log('🔄 [Campaign PATCH] Updating campaign:', id, { name, message, status });

    // Try Supabase first (new database)
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Use Supabase
        const serviceClient = createServiceClient();
        const updateData: any = { updated_at: new Date().toISOString() };

        if (name !== undefined) updateData.name = name;
        if (message !== undefined) updateData.description = message; // Note: message → description
        if (status !== undefined) updateData.status = status;

        const { data: campaign, error: updateError } = await serviceClient
          .from('campaigns')
          .update(updateData)
          .eq('id', id)
          .select('*')
          .single();

        if (updateError) {
          console.error('Supabase update error:', updateError);
          throw updateError;
        }

        console.log('✅ [Campaign PATCH] Campaign updated successfully (Supabase):', id);
        return NextResponse.json(
          successResponse(campaign, "Campaign updated successfully")
        );
      }
    } catch (supabaseError) {
      console.log('Supabase update failed, falling back to SQLite:', supabaseError);
    }

    // Fallback to SQLite (legacy database)
    const updated = updateCampaign(id, { name, message, status });

    if (!updated) {
      console.warn('⚠️  [Campaign PATCH] Campaign not found:', id);
      return NextResponse.json(
        errorResponse("Campaign not found", "CAMPAIGN_NOT_FOUND"),
        { status: 404 }
      );
    }

    console.log('✅ [Campaign PATCH] Campaign updated successfully (SQLite):', id);

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
