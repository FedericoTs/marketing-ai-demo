import { NextRequest, NextResponse } from "next/server";
import { getDMTemplate, getDMTemplateByCampaignTemplate } from "@/lib/database/template-queries";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("id");
    const campaignTemplateId = searchParams.get("campaignTemplateId");

    console.log('🔍 [DM Template API] GET request:', { templateId, campaignTemplateId });

    // Support both query methods
    if (!templateId && !campaignTemplateId) {
      console.log('❌ [DM Template API] Missing parameters');
      return NextResponse.json(
        errorResponse(
          "Either 'id' or 'campaignTemplateId' is required",
          "MISSING_PARAMETER"
        ),
        { status: 400 }
      );
    }

    let template;

    if (campaignTemplateId) {
      // Fetch by campaign template ID
      console.log('📋 [DM Template API] Fetching by campaignTemplateId:', campaignTemplateId);
      template = getDMTemplateByCampaignTemplate(campaignTemplateId);
    } else if (templateId) {
      // Fetch by DM template ID
      console.log('📋 [DM Template API] Fetching by templateId:', templateId);
      template = getDMTemplate(templateId);
    }

    if (!template) {
      // Not an error - template just doesn't exist yet
      console.log('⚠️ [DM Template API] Template not found');
      return NextResponse.json(
        successResponse(null, "Template not found")
      );
    }

    console.log('✅ [DM Template API] Template found:', {
      id: template.id,
      name: template.name,
      hasPreviewImage: !!template.previewImage,
      previewImageLength: template.previewImage?.length
    });

    return NextResponse.json(
      successResponse(template, "DM template retrieved successfully")
    );
  } catch (error) {
    console.error("❌ [DM Template API] Error fetching DM template:", error);
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : "Unknown error",
        "FETCH_ERROR"
      ),
      { status: 500 }
    );
  }
}
