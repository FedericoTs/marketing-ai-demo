import { NextRequest, NextResponse } from "next/server";

// Dynamic import of retail queries (optional feature)
function getRetailQueries() {
  try {
    return require("@/lib/database/retail-queries");
  } catch (e) {
    return null;
  }
}

// Dynamic import of tracking queries
function getTrackingQueries() {
  try {
    return require("@/lib/database/tracking-queries");
  } catch (e) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if retail module is available
    const retail = getRetailQueries();
    const tracking = getTrackingQueries();

    if (!retail || !tracking) {
      return NextResponse.json({
        success: false,
        error: "Retail module not enabled",
        data: [],
      });
    }

    // Get all campaigns to gather deployments
    const campaigns = tracking.getAllCampaigns();

    // Get deployments for each campaign
    const allDeployments: any[] = [];

    for (const campaign of campaigns) {
      try {
        const deployments = retail.getCampaignDeployments(campaign.id);

        // Add campaign info to each deployment
        const enrichedDeployments = deployments.map((d: any) => ({
          ...d,
          campaign_name: campaign.name,
          campaign_status: campaign.status,
          campaign_created_at: campaign.created_at,
        }));

        allDeployments.push(...enrichedDeployments);
      } catch (error) {
        console.error(`Error getting deployments for campaign ${campaign.id}:`, error);
        // Continue with other campaigns
      }
    }

    // Sort by created_at desc (newest first)
    allDeployments.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({
      success: true,
      data: allDeployments,
      count: allDeployments.length,
    });
  } catch (error: unknown) {
    console.error("Error fetching deployments:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch deployments: ${errorMessage}`,
        data: [],
      },
      { status: 500 }
    );
  }
}
