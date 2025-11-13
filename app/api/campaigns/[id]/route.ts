import { NextResponse } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { createServiceClient, createClient } from '@/lib/supabase/server';

// GET: Get campaign details by ID
// Uses ONLY Supabase database
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('📋 [Campaign GET] Fetching campaign from Supabase:', id);

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ [Campaign GET] Auth error:', authError);
      return NextResponse.json(
        errorResponse("Unauthorized", "UNAUTHORIZED"),
        { status: 401 }
      );
    }

    console.log('✅ [Campaign GET] User authenticated:', user.id);

    // Fetch campaign using service client (bypasses RLS)
    const serviceClient = createServiceClient();
    const { data: campaign, error: fetchError } = await serviceClient
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        console.warn('⚠️  [Campaign GET] Campaign not found:', id);
        return NextResponse.json(
          errorResponse("Campaign not found", "CAMPAIGN_NOT_FOUND"),
          { status: 404 }
        );
      }

      console.error('❌ [Campaign GET] Supabase error:', fetchError);
      throw fetchError;
    }

    console.log('✅ [Campaign GET] Campaign fetched successfully:', id);
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
// Uses ONLY Supabase database
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, message, status } = body;

    // Validate status if provided
    const validStatuses = ['draft', 'scheduled', 'sending', 'sent', 'paused', 'completed', 'failed'];

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

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ [Campaign PATCH] Auth error:', authError);
      return NextResponse.json(
        errorResponse("Unauthorized", "UNAUTHORIZED"),
        { status: 401 }
      );
    }

    console.log('✅ [Campaign PATCH] User authenticated:', user.id);

    // Update campaign using service client (bypasses RLS)
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
      if (updateError.code === 'PGRST116') {
        console.warn('⚠️  [Campaign PATCH] Campaign not found:', id);
        return NextResponse.json(
          errorResponse("Campaign not found", "CAMPAIGN_NOT_FOUND"),
          { status: 404 }
        );
      }

      console.error('❌ [Campaign PATCH] Supabase error:', updateError);
      throw updateError;
    }

    console.log('✅ [Campaign PATCH] Campaign updated successfully:', id);
    return NextResponse.json(
      successResponse(campaign, "Campaign updated successfully")
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
// Uses ONLY Supabase database
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('🗑️ [Campaign DELETE] Deleting campaign:', id);

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ [Campaign DELETE] Auth error:', authError);
      return NextResponse.json(
        errorResponse("Unauthorized", "UNAUTHORIZED"),
        { status: 401 }
      );
    }

    console.log('✅ [Campaign DELETE] User authenticated:', user.id);

    // First, fetch the campaign to get its name for success message
    const serviceClient = createServiceClient();
    const { data: campaign, error: fetchError } = await serviceClient
      .from('campaigns')
      .select('name')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        console.warn('⚠️  [Campaign DELETE] Campaign not found:', id);
        return NextResponse.json(
          errorResponse("Campaign not found", "CAMPAIGN_NOT_FOUND"),
          { status: 404 }
        );
      }

      console.error('❌ [Campaign DELETE] Supabase fetch error:', fetchError);
      throw fetchError;
    }

    // Delete the campaign
    const { error: deleteError } = await serviceClient
      .from('campaigns')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('❌ [Campaign DELETE] Supabase delete error:', deleteError);
      throw deleteError;
    }

    console.log('✅ [Campaign DELETE] Campaign deleted successfully:', id);
    return NextResponse.json(
      successResponse(null, `Campaign "${campaign.name}" deleted successfully`)
    );
  } catch (error) {
    console.error("❌ [Campaign DELETE] Error:", error);
    return NextResponse.json(
      errorResponse("Failed to delete campaign", "DELETE_ERROR"),
      { status: 500 }
    );
  }
}
