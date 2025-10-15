import { NextResponse } from "next/server";
import { getAllCampaignsWithStats } from "@/lib/database/tracking-queries";
import { generateAllCampaignsCSV } from "@/lib/export/csv-exporter";

// GET: Export all campaigns overview
export async function GET() {
  try {
    const campaigns = getAllCampaignsWithStats();
    const csvContent = generateAllCampaignsCSV(campaigns);
    const filename = `all_campaigns_${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting campaigns:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to export campaigns data",
      },
      { status: 500 }
    );
  }
}
