import { NextRequest, NextResponse } from "next/server";
import { getRecipientJourney } from "@/lib/database/tracking-queries";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

/**
 * GET /api/tracking/journey/[trackingId]
 * Get complete recipient journey (events, conversions, analytics)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  try {
    const { trackingId } = await params;

    if (!trackingId) {
      return NextResponse.json(
        errorResponse("Missing tracking ID", "MISSING_TRACKING_ID"),
        { status: 400 }
      );
    }

    const journey = getRecipientJourney(trackingId);

    if (!journey) {
      return NextResponse.json(
        errorResponse("Recipient not found", "NOT_FOUND"),
        { status: 404 }
      );
    }

    // Parse JSON data from events and conversions
    const parsedJourney = {
      ...journey,
      events: journey.events.map((event) => ({
        ...event,
        event_data: event.event_data
          ? JSON.parse(event.event_data)
          : undefined,
      })),
      conversions: journey.conversions.map((conversion) => ({
        ...conversion,
        conversion_data: conversion.conversion_data
          ? JSON.parse(conversion.conversion_data)
          : undefined,
      })),
    };

    return NextResponse.json(
      successResponse(parsedJourney, "Journey retrieved successfully")
    );
  } catch (error) {
    console.error("Error fetching recipient journey:", error);
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to fetch journey",
        "FETCH_ERROR"
      ),
      { status: 500 }
    );
  }
}
