import { NextRequest, NextResponse } from "next/server";
import { generateCopyVariations } from "@/lib/ai/openai";
import { getBrandProfile } from "@/lib/database/tracking-queries";
import { CopywritingRequest, CopywritingResponse, BrandMetadata } from "@/types/copywriting";

export async function POST(request: NextRequest) {
  try {
    const body: CopywritingRequest = await request.json();
    const { prompt, companyContext } = body;

    if (!prompt || !companyContext) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get API key from environment or request (for demo, we'll use env)
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "OpenAI API key not configured. Please add it in Settings.",
        },
        { status: 500 }
      );
    }

    // Check if brand profile exists for enhanced copywriting
    let brandProfile = null;
    let brandMetadata: BrandMetadata = {
      brandVoiceApplied: false,
    };

    try {
      brandProfile = getBrandProfile(companyContext.companyName);
      if (brandProfile) {
        console.log(`✨ Using brand profile for ${companyContext.companyName}`);

        // Parse brand data to create metadata
        const keyPhrases = brandProfile.key_phrases ? JSON.parse(brandProfile.key_phrases) : [];
        const values = brandProfile.brand_values ? JSON.parse(brandProfile.brand_values) : [];

        brandMetadata = {
          brandVoiceApplied: true,
          tone: brandProfile.tone || undefined,
          keyPhrasesCount: keyPhrases.length,
          valuesCount: values.length,
        };
      }
    } catch (error) {
      console.log("No brand profile found, using basic context");
    }

    const variations = await generateCopyVariations(
      prompt,
      companyContext,
      apiKey,
      brandProfile
    );

    const response: CopywritingResponse = {
      success: true,
      variations,
      brandMetadata,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("Error in copywriting API:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        error: `Failed to generate copy variations: ${errorMessage}`,
        variations: [],
      },
      { status: 500 }
    );
  }
}
