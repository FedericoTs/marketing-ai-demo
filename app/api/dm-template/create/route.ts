import { NextRequest, NextResponse } from "next/server";
import { createDMTemplate } from "@/lib/database/template-queries";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      campaignId,
      canvasSessionId,
      name,
      canvasJSON,
      backgroundImage,
      canvasWidth,
      canvasHeight,
      previewImage,
      variableMappings,
    } = body;

    // Validate required fields
    if (!campaignId || !name || !canvasJSON || !backgroundImage) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }

    // Create template
    const templateId = createDMTemplate({
      campaignId,
      canvasSessionId,
      name,
      canvasJSON,
      backgroundImage,
      canvasWidth,
      canvasHeight,
      previewImage,
      variableMappings,
    });

    console.log(`✅ DM template created: ${templateId}`);

    return NextResponse.json({
      success: true,
      templateId,
    });
  } catch (error) {
    console.error("Error creating DM template:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
