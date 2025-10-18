import { NextRequest, NextResponse } from "next/server";
import { createCampaignTemplate } from "@/lib/database/campaign-management";
import { createDMTemplate } from "@/lib/database/template-queries";
import { getDatabase } from "@/lib/database/connection";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignData, dmData } = body;

    // Validate required fields
    if (!campaignData || !dmData) {
      return NextResponse.json(
        {
          success: false,
          error: "Both campaign and DM data are required",
        },
        { status: 400 }
      );
    }

    // Validate campaign data
    if (!campaignData.name || !campaignData.message) {
      return NextResponse.json(
        {
          success: false,
          error: "Campaign name and message are required",
        },
        { status: 400 }
      );
    }

    // Validate DM data
    if (!dmData.canvasJSON || !dmData.backgroundImage) {
      return NextResponse.json(
        {
          success: false,
          error: "Canvas JSON and background image are required",
        },
        { status: 400 }
      );
    }

    console.log("💾 Creating full template (campaign + DM design)...");

    // Use transaction for atomic save
    const db = getDatabase();

    try {
      db.exec("BEGIN TRANSACTION");

      // Step 1: Create campaign template (message/copy)
      const campaignTemplate = createCampaignTemplate({
        name: campaignData.name,
        description: campaignData.description,
        category: campaignData.category || "general",
        templateData: {
          message: campaignData.message,
          targetAudience: campaignData.targetAudience,
          tone: campaignData.tone,
          industry: campaignData.industry,
        },
        isSystemTemplate: false,
      });

      console.log(`✅ Campaign template created: ${campaignTemplate.id}`);

      // Step 2: Create DM template (design) linked to campaign template
      const dmTemplateId = createDMTemplate({
        campaignId: dmData.campaignId,
        canvasSessionId: dmData.canvasSessionId,
        name: dmData.name || campaignData.name,
        canvasJSON: dmData.canvasJSON,
        backgroundImage: dmData.backgroundImage,
        canvasWidth: dmData.canvasWidth,
        canvasHeight: dmData.canvasHeight,
        previewImage: dmData.previewImage,
        variableMappings: dmData.variableMappings,
        campaignTemplateId: campaignTemplate.id, // Link to campaign template
      });

      console.log(`✅ DM template created: ${dmTemplateId}`);

      db.exec("COMMIT");

      return NextResponse.json({
        success: true,
        data: {
          campaignTemplateId: campaignTemplate.id,
          dmTemplateId: dmTemplateId,
        },
        message: "Template saved successfully",
      });
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("Error creating full template:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save template",
      },
      { status: 500 }
    );
  }
}
