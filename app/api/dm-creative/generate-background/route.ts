import { NextRequest, NextResponse } from "next/server";
import { generateDMCreativeImageV2, ImageQuality, ImageSize } from "@/lib/ai/openai-v2";

/**
 * API Route for fine-tuning modal: Generate ONLY the background image
 * This allows users to preview and adjust before final composition
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      message,
      companyContext,
      apiKey,
      imageQuality,
      imageAspectRatio,
      layoutTemplate,
      brandConfig,
      // Fine-tuning parameters
      promptStyle,
      noLogoStrength,
      customInstructions,
      customSceneDescription,  // NEW: Optional scene description from user
    } = body;

    if (!message || !apiKey) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log('🔧 Fine-tune API: Generating background with parameters:', {
      layoutTemplate,
      imageQuality,
      imageAspectRatio,
      promptStyle,
      noLogoStrength,
      hasCustomInstructions: !!customInstructions,
      hasCustomScene: !!customSceneDescription,
    });

    // Check if V2 image generation should be used
    const useV2 = process.env.IMAGE_GEN_VERSION === 'v2' && imageQuality && imageAspectRatio;

    let backgroundImage: string;
    let promptUsed: string = '';
    let imageMetadata: any = null;

    if (useV2) {
      console.log(`🎨 Using V2 image generation: ${imageQuality} quality, ${imageAspectRatio} size`);

      try {
        const result = await generateDMCreativeImageV2({
          message,
          context: companyContext,
          apiKey,
          quality: imageQuality as ImageQuality,
          size: imageAspectRatio as ImageSize,
          brandConfig,
          layoutTemplate,
          // Pass fine-tuning parameters
          promptStyle,
          noLogoStrength,
          customInstructions,
          customSceneDescription,  // NEW: Pass custom scene description
        });

        backgroundImage = result.imageUrl;
        promptUsed = result.promptUsed || '';
        imageMetadata = result.metadata;

        console.log(`✅ V2 background generated: ${imageMetadata.quality} quality`);
      } catch (error) {
        console.error("❌ V2 image generation failed, falling back to V1 with dall-e-3:", error);

        // Fallback to V1 with V2 settings
        try {
          const { generateDMCreativeImageV1Fallback } = require("@/lib/ai/openai-v2");
          const result = await generateDMCreativeImageV1Fallback({
            message,
            context: companyContext,
            apiKey,
            quality: imageQuality as ImageQuality,
            size: imageAspectRatio as ImageSize,
            brandConfig,
            layoutTemplate,
            promptStyle,
            noLogoStrength,
            customInstructions,
          });

          backgroundImage = result.imageUrl;
          promptUsed = result.promptUsed || '';
          imageMetadata = result.metadata;
          console.log(`✅ Fallback to dall-e-3 successful: ${imageMetadata.quality} quality`);
        } catch (fallbackError) {
          console.error("❌ dall-e-3 fallback also failed:", fallbackError);
          // Last resort: use old V1 function WITH size parameter
          const { generateDMCreativeImageWithSize } = require("@/lib/ai/openai");
          const legacyResult = await generateDMCreativeImageWithSize(
            message,
            companyContext,
            apiKey,
            imageAspectRatio as string
          );
          backgroundImage = legacyResult.imageUrl;
          promptUsed = legacyResult.promptUsed || '';
          imageMetadata = legacyResult.metadata || {
            quality: 'standard',
            size: imageAspectRatio,
            model: 'gpt-image-1 (legacy fallback)'
          };
          console.log(`✅ Final fallback to legacy V1 successful with ${imageAspectRatio}`);
        }
      }
    } else {
      // Use V1 (existing system)
      console.log("Using V1 image generation (legacy/default)");
      const { generateDMCreativeImage } = require("@/lib/ai/openai");
      backgroundImage = await generateDMCreativeImage(message, companyContext, apiKey);
    }

    return NextResponse.json({
      success: true,
      backgroundImage,
      promptUsed,
      metadata: imageMetadata,
    });
  } catch (error: unknown) {
    console.error("Error generating background:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        error: `Failed to generate background: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
