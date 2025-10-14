import { NextRequest, NextResponse } from "next/server";
import { getBrandProfile, saveBrandProfile } from "@/lib/database/tracking-queries";

/**
 * GET /api/brand/profile?companyName=xxx
 * Get brand profile by company name
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyName = searchParams.get("companyName");

    if (!companyName) {
      return NextResponse.json(
        { success: false, error: "Company name is required" },
        { status: 400 }
      );
    }

    const profile = getBrandProfile(companyName);

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Brand profile not found" },
        { status: 404 }
      );
    }

    // Parse JSON strings
    const parsedProfile = {
      ...profile,
      keyPhrases: profile.key_phrases ? JSON.parse(profile.key_phrases) : [],
      values: profile.brand_values ? JSON.parse(profile.brand_values) : [],
    };

    return NextResponse.json({
      success: true,
      data: parsedProfile,
    });
  } catch (error: unknown) {
    console.error("Error fetching brand profile:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch brand profile: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/brand/profile
 * Save or update brand profile manually
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyName, brandVoice, tone, keyPhrases, values, targetAudience, industry } = body;

    if (!companyName) {
      return NextResponse.json(
        { success: false, error: "Company name is required" },
        { status: 400 }
      );
    }

    const profile = saveBrandProfile({
      companyName,
      brandVoice,
      tone,
      keyPhrases,
      values,
      targetAudience,
      industry,
    });

    // Parse JSON strings for response
    const parsedProfile = {
      ...profile,
      keyPhrases: profile.key_phrases ? JSON.parse(profile.key_phrases) : [],
      values: profile.brand_values ? JSON.parse(profile.brand_values) : [],
    };

    return NextResponse.json({
      success: true,
      data: parsedProfile,
    });
  } catch (error: unknown) {
    console.error("Error saving brand profile:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        error: `Failed to save brand profile: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
