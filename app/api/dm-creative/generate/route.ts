import { NextRequest, NextResponse } from "next/server";
import { generateQRCode } from "@/lib/qr-generator";
import { generateTrackingId } from "@/lib/tracking";
import { generateDMCreativeImage } from "@/lib/ai/openai";
// Note: Image composition moved to client-side to avoid native module issues
import {
  DMGenerateRequest,
  DMGenerateResponse,
  DirectMailData,
} from "@/types/dm-creative";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipient, message, companyContext, apiKey } = body;

    if (!recipient || !message) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "OpenAI API key is required" },
        { status: 400 }
      );
    }

    // Generate tracking ID
    const trackingId = generateTrackingId();

    // Generate landing page URL
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const landingPageUrl = `${baseUrl}/lp/${trackingId}`;

    // Generate QR code
    const qrCodeDataUrl = await generateQRCode(landingPageUrl);

    console.log("Generating AI creative image with DALL-E...");

    // Generate AI background image with DALL-E
    const backgroundImage = await generateDMCreativeImage(
      message,
      companyContext,
      apiKey
    );

    console.log("AI background image generated successfully");
    console.log("Note: Final composition will be done client-side");

    // Create direct mail data
    // Note: creativeImageUrl will be composed on client-side to avoid canvas native module issues
    const dmData: DirectMailData = {
      trackingId,
      recipient,
      message,
      qrCodeDataUrl,
      landingPageUrl,
      createdAt: new Date(),
      creativeImageUrl: backgroundImage, // Pass background, client will compose
    };

    const response: DMGenerateResponse = {
      success: true,
      data: dmData,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("Error generating direct mail:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        error: `Failed to generate direct mail: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
