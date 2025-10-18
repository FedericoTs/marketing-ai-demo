import { NextRequest, NextResponse } from "next/server";
import { getDMTemplate, getDMTemplateByCampaignTemplate } from "@/lib/database/template-queries";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("id");
    const campaignTemplateId = searchParams.get("campaignTemplateId");

    // Support both query methods
    if (!templateId && !campaignTemplateId) {
      return NextResponse.json(
        {
          success: false,
          error: "Either 'id' or 'campaignTemplateId' is required",
        },
        { status: 400 }
      );
    }

    let template;

    if (campaignTemplateId) {
      // Fetch by campaign template ID
      template = getDMTemplateByCampaignTemplate(campaignTemplateId);
    } else if (templateId) {
      // Fetch by DM template ID
      template = getDMTemplate(templateId);
    }

    if (!template) {
      return NextResponse.json({
        success: true,
        data: null, // Not an error - template just doesn't exist yet
      });
    }

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error("Error fetching DM template:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
