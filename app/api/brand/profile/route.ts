import { NextRequest, NextResponse } from "next/server";
import { getBrandProfile, saveBrandProfile } from "@/lib/database/tracking-queries";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

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
        errorResponse("Company name is required", "MISSING_COMPANY_NAME"),
        { status: 400 }
      );
    }

    const profile = getBrandProfile(companyName);

    if (!profile) {
      return NextResponse.json(
        errorResponse("Brand profile not found", "PROFILE_NOT_FOUND"),
        { status: 404 }
      );
    }

    // Parse arrays (already arrays from stub, may be JSON strings from real DB)
    const parsedProfile = {
      ...profile,
      keyPhrases: Array.isArray(profile.key_phrases)
        ? profile.key_phrases
        : (profile.key_phrases ? JSON.parse(profile.key_phrases as unknown as string) : []),
      values: Array.isArray(profile.brand_values)
        ? profile.brand_values
        : (profile.brand_values ? JSON.parse(profile.brand_values as unknown as string) : []),
    };

    return NextResponse.json(
      successResponse(parsedProfile, "Brand profile retrieved successfully")
    );
  } catch (error: unknown) {
    console.error("Error fetching brand profile:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      errorResponse(
        `Failed to fetch brand profile: ${errorMessage}`,
        "FETCH_ERROR"
      ),
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
        errorResponse("Company name is required", "MISSING_COMPANY_NAME"),
        { status: 400 }
      );
    }

    const profile = saveBrandProfile({
      company_name: companyName,
      brand_voice: brandVoice,
      tone,
      key_phrases: keyPhrases,
      brand_values: values,
      target_audience: targetAudience,
      industry,
    });

    // Parse arrays (already arrays from stub, may be JSON strings from real DB)
    const parsedProfile = {
      ...profile,
      keyPhrases: Array.isArray(profile.key_phrases)
        ? profile.key_phrases
        : (profile.key_phrases ? JSON.parse(profile.key_phrases as unknown as string) : []),
      values: Array.isArray(profile.brand_values)
        ? profile.brand_values
        : (profile.brand_values ? JSON.parse(profile.brand_values as unknown as string) : []),
    };

    return NextResponse.json(
      successResponse(parsedProfile, "Brand profile saved successfully")
    );
  } catch (error: unknown) {
    console.error("Error saving brand profile:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      errorResponse(
        `Failed to save brand profile: ${errorMessage}`,
        "SAVE_ERROR"
      ),
      { status: 500 }
    );
  }
}
