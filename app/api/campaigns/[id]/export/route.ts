import { NextResponse } from "next/server";
import { getCampaignExportData } from "@/lib/database/tracking-queries";
import { generateCampaignRecipientsCSV } from "@/lib/export/csv-exporter";
import { generateCampaignPDF } from "@/lib/export/pdf-exporter";

// GET: Export campaign data
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";

    const data = getCampaignExportData(id);

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: "Campaign not found",
        },
        { status: 404 }
      );
    }

    if (format === "csv") {
      const csvContent = generateCampaignRecipientsCSV(data);
      const filename = `${data.campaign.name.replace(/[^a-z0-9]/gi, "_")}_recipients_${new Date().toISOString().split("T")[0]}.csv`;

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } else if (format === "pdf") {
      const pdf = generateCampaignPDF(data);
      const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));
      const filename = `${data.campaign.name.replace(/[^a-z0-9]/gi, "_")}_report_${new Date().toISOString().split("T")[0]}.pdf`;

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid format. Use 'csv' or 'pdf'",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error exporting campaign:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to export campaign data",
      },
      { status: 500 }
    );
  }
}
