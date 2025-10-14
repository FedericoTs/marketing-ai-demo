import { NextResponse } from "next/server";
import { getCampaignAnalytics, getRecipientsByCampaign, getRecipientJourney } from "@/lib/database/tracking-queries";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get campaign analytics
    const analytics = getCampaignAnalytics(id);

    if (!analytics) {
      return NextResponse.json(
        {
          success: false,
          error: "Campaign not found",
        },
        { status: 404 }
      );
    }

    // Get all recipients with their journey data
    const recipients = getRecipientsByCampaign(id);
    const recipientsWithJourney = recipients.map((recipient) => {
      const journey = getRecipientJourney(recipient.tracking_id);
      return {
        ...recipient,
        pageViews: journey?.pageViews || 0,
        hasConverted: journey?.hasConverted || false,
        eventsCount: journey?.events.length || 0,
        conversionsCount: journey?.conversions.length || 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        ...analytics,
        recipients: recipientsWithJourney,
      },
    });
  } catch (error) {
    console.error("Error fetching campaign analytics:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch campaign analytics",
      },
      { status: 500 }
    );
  }
}
