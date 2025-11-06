import { NextRequest, NextResponse } from "next/server";
import { trackConversion, getCampaignRecipientByTrackingCode } from "@/lib/database/campaign-supabase-queries";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

/**
 * POST /api/tracking/conversion
 * Track conversions (form submissions, appointments, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trackingId, conversionType, conversionData, conversionValue } = body;

    // Validation
    if (!trackingId || typeof trackingId !== "string") {
      return NextResponse.json(
        errorResponse("Missing or invalid tracking ID", "INVALID_TRACKING_ID"),
        { status: 400 }
      );
    }

    if (!conversionType || typeof conversionType !== "string") {
      return NextResponse.json(
        errorResponse("Missing or invalid conversion type", "INVALID_CONVERSION_TYPE"),
        { status: 400 }
      );
    }

    // Validate conversion type against Supabase schema
    const validConversionTypes = [
      "form_submit",
      "appointment",
      "purchase",
      "call",
      "custom",
    ] as const;

    if (!validConversionTypes.includes(conversionType as typeof validConversionTypes[number])) {
      return NextResponse.json(
        errorResponse(
          `Invalid conversion type. Must be one of: ${validConversionTypes.join(", ")}`,
          "INVALID_CONVERSION_TYPE"
        ),
        { status: 400 }
      );
    }

    // Get campaign recipient to extract campaign_id
    const campaignRecipient = await getCampaignRecipientByTrackingCode(trackingId);

    if (!campaignRecipient) {
      return NextResponse.json(
        errorResponse("Invalid tracking code", "INVALID_TRACKING_CODE"),
        { status: 404 }
      );
    }

    // Track the conversion with Supabase
    const conversion = await trackConversion({
      campaignId: campaignRecipient.campaign_id,
      trackingCode: trackingId,
      conversionType: conversionType as typeof validConversionTypes[number],
      conversionValue: conversionValue || undefined,
      conversionData: conversionData || undefined,
    });

    return NextResponse.json(
      successResponse(
        {
          conversionId: conversion.id,
          trackingCode: conversion.tracking_code,
          conversionType: conversion.conversion_type,
          conversionValue: conversion.conversion_value,
          timestamp: conversion.created_at,
        },
        "Conversion tracked successfully"
      )
    );
  } catch (error) {
    console.error("Error tracking conversion:", error);
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to track conversion",
        "TRACKING_ERROR"
      ),
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/tracking/conversion
 * CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
