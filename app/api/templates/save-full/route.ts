import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignData, dmData } = body;

    // Validate required fields
    if (!campaignData || !dmData) {
      return NextResponse.json(
        errorResponse("Both campaign and DM data are required", "MISSING_DATA"),
        { status: 400 }
      );
    }

    // Validate campaign data
    if (!campaignData.name || !campaignData.message) {
      return NextResponse.json(
        errorResponse("Campaign name and message are required", "MISSING_CAMPAIGN_FIELDS"),
        { status: 400 }
      );
    }

    // Validate DM data
    if (!dmData.canvasJSON || !dmData.backgroundImage) {
      return NextResponse.json(
        errorResponse("Canvas JSON and background image are required", "MISSING_DM_FIELDS"),
        { status: 400 }
      );
    }

    console.log("💾 Creating full template (campaign + DM design)...");

    const supabase = createServiceClient();
    const campaignTemplateId = `ct_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const dmTemplateId = `dm_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const now = new Date().toISOString();

    // Step 1: Create campaign template (message/copy)
    const { error: campaignError } = await supabase
      .from('campaign_templates')
      .insert({
        id: campaignTemplateId,
        name: campaignData.name,
        description: campaignData.description || null,
        category: campaignData.category || "general",
        template_data: {
          message: campaignData.message,
          targetAudience: campaignData.targetAudience,
          tone: campaignData.tone,
          industry: campaignData.industry,
        },
        is_system_template: false,
        use_count: 0,
        created_at: now,
        updated_at: now,
      });

    if (campaignError) {
      throw new Error(`Failed to create campaign template: ${campaignError.message}`);
    }

    console.log(`✅ Campaign template created: ${campaignTemplateId}`);

    // Step 2: Create DM template (design) linked to campaign template
    const { error: dmError } = await supabase
      .from('dm_templates')
      .insert({
        id: dmTemplateId,
        campaign_id: dmData.campaignId || null,
        canvas_session_id: dmData.canvasSessionId || null,
        name: dmData.name || campaignData.name,
        canvas_json: dmData.canvasJSON,
        background_image: dmData.backgroundImage,
        canvas_width: dmData.canvasWidth,
        canvas_height: dmData.canvasHeight,
        preview_image: dmData.previewImage || null,
        variable_mappings: dmData.variableMappings || null,
        campaign_template_id: campaignTemplateId,
        created_at: now,
        updated_at: now,
      });

    if (dmError) {
      // Rollback campaign template
      await supabase.from('campaign_templates').delete().eq('id', campaignTemplateId);
      throw new Error(`Failed to create DM template: ${dmError.message}`);
    }

    console.log(`✅ DM template created: ${dmTemplateId}`);

    return NextResponse.json(
      successResponse(
        {
          campaignTemplateId: campaignTemplateId,
          dmTemplateId: dmTemplateId,
        },
        "Template saved successfully"
      )
    );
  } catch (error) {
    console.error("Error creating full template:", error);
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to save template",
        "SAVE_ERROR"
      ),
      { status: 500 }
    );
  }
}
