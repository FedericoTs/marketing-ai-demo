import { NextResponse } from "next/server";
import { getCampaignExportData } from "@/lib/database/tracking-queries";
import { generateCampaignRecipientsCSV } from "@/lib/export/csv-exporter";
import { generateCampaignPDF } from "@/lib/export/pdf-exporter";
import { errorResponse } from "@/lib/utils/api-response";

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
        errorResponse("Campaign not found", "CAMPAIGN_NOT_FOUND"),
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
        errorResponse("Invalid format. Use 'csv' or 'pdf'", "INVALID_FORMAT"),
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error exporting campaign:", error);
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to export campaign data",
        "EXPORT_ERROR"
      ),
      { status: 500 }
    );
  }
}
