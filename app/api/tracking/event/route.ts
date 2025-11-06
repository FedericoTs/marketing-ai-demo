import { NextRequest, NextResponse } from "next/server";
import { trackEvent, getCampaignRecipientByTrackingCode } from "@/lib/database/campaign-supabase-queries";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

/**
 * POST /api/tracking/event
 * Track user events (page views, clicks, interactions)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trackingId, eventType, eventData } = body;

    // Validation
    if (!trackingId || typeof trackingId !== "string") {
      return NextResponse.json(
        errorResponse("Missing or invalid tracking ID", "INVALID_TRACKING_ID"),
        { status: 400 }
      );
    }

    if (!eventType || typeof eventType !== "string") {
      return NextResponse.json(
        errorResponse("Missing or invalid event type", "INVALID_EVENT_TYPE"),
        { status: 400 }
      );
    }

    // Validate event type against Supabase schema
    const validEventTypes = [
      "qr_scan",
      "page_view",
      "button_click",
      "form_view",
      "form_submit",
      "email_open",
      "email_click",
    ] as const;

    if (!validEventTypes.includes(eventType as typeof validEventTypes[number])) {
      return NextResponse.json(
        errorResponse(
          `Invalid event type. Must be one of: ${validEventTypes.join(", ")}`,
          "INVALID_EVENT_TYPE"
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

    // Extract IP address and user agent from request
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      undefined;

    const userAgent = request.headers.get("user-agent") || undefined;
    const referrer = request.headers.get("referer") || request.headers.get("referrer") || undefined;

    // Track the event with Supabase
    const event = await trackEvent({
      campaignId: campaignRecipient.campaign_id,
      trackingCode: trackingId,
      eventType: eventType as typeof validEventTypes[number],
      eventData: eventData || undefined,
      ipAddress,
      userAgent,
      referrer,
    });

    return NextResponse.json(
      successResponse(
        {
          eventId: event.id,
          trackingCode: event.tracking_code,
          eventType: event.event_type,
          timestamp: event.created_at,
        },
        "Event tracked successfully"
      )
    );
  } catch (error) {
    console.error("Error tracking event:", error);
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to track event",
        "TRACKING_ERROR"
      ),
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/tracking/event
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
