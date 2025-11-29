import jsPDF from "jspdf";
import { CampaignExportData } from "../database/tracking-queries";

/**
 * Generate PDF report for a campaign
 */
export function generateCampaignPDF(data: CampaignExportData): jsPDF {
  const doc = new jsPDF();
  const { campaign, recipients, summary } = data;

  let yPos = 20;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Campaign Report", margin, yPos);
  yPos += 15;

  // Campaign Details Section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Campaign Details", margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${campaign.name}`, margin, yPos);
  yPos += 6;
  doc.text(`Company: ${campaign.company_name}`, margin, yPos);
  yPos += 6;
  doc.text(`Status: ${campaign.status.toUpperCase()}`, margin, yPos);
  yPos += 6;
  doc.text(`Created: ${new Date(campaign.created_at).toLocaleDateString()}`, margin, yPos);
  yPos += 6;

  // Message with text wrapping
  doc.text("Message:", margin, yPos);
  yPos += 6;
  const messageLines = doc.splitTextToSize(campaign.message, contentWidth - 10);
  doc.setFont("helvetica", "italic");
  doc.text(messageLines, margin + 5, yPos);
  yPos += messageLines.length * 5 + 8;

  // Key Metrics Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Key Metrics", margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  // Metrics in a grid
  const col1X = margin;
  const col2X = pageWidth / 2 + 10;

  doc.text(`Total Recipients: ${summary.totalRecipients}`, col1X, yPos);
  doc.text(`Total Events: ${summary.totalEvents}`, col2X, yPos);
  yPos += 6;

  doc.text(`Total Conversions: ${summary.totalConversions}`, col1X, yPos);
  doc.text(`Conversion Rate: ${summary.conversionRate.toFixed(1)}%`, col2X, yPos);
  yPos += 10;

  // Recipients Summary Section
  doc.setFontSize(12);
  doc.text("Recipients Summary", margin, yPos);
  yPos += 8;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");

  // Table header
  const tableStartY = yPos;
  const colWidths = {
    name: 35,
    email: 50,
    phone: 30,
    pageViews: 20,
    conversions: 25,
    status: 25,
  };

  // Header background
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos - 4, contentWidth, 8, "F");

  // Header text
  doc.setFont("helvetica", "bold");
  let xPos = margin + 2;
  doc.text("Name", xPos, yPos);
  xPos += colWidths.name;
  doc.text("Email", xPos, yPos);
  xPos += colWidths.email;
  doc.text("Phone", xPos, yPos);
  xPos += colWidths.phone;
  doc.text("Views", xPos, yPos);
  xPos += colWidths.pageViews;
  doc.text("Conversions", xPos, yPos);
  xPos += colWidths.conversions;
  doc.text("Status", xPos, yPos);
  yPos += 6;

  // Table rows
  doc.setFont("helvetica", "normal");
  const maxRows = 25; // Limit to prevent overflow

  recipients.slice(0, maxRows).forEach((recipient, index) => {
    // Alternate row background
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, yPos - 4, contentWidth, 6, "F");
    }

    xPos = margin + 2;
    const fullName = `${recipient.name} ${recipient.lastname}`;
    doc.text(truncate(fullName, 20), xPos, yPos);
    xPos += colWidths.name;
    doc.text(truncate(recipient.email || "—", 30), xPos, yPos);
    xPos += colWidths.email;
    doc.text(truncate(recipient.phone || "—", 18), xPos, yPos);
    xPos += colWidths.phone;
    doc.text(recipient.page_views.toString(), xPos, yPos);
    xPos += colWidths.pageViews;
    doc.text(recipient.conversions.toString(), xPos, yPos);
    xPos += colWidths.conversions;
    doc.text(recipient.status, xPos, yPos);

    yPos += 6;

    // Check if we need a new page
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
  });

  // If more recipients than displayed
  if (recipients.length > maxRows) {
    yPos += 4;
    doc.setFont("helvetica", "italic");
    doc.text(
      `... and ${recipients.length - maxRows} more recipients (see CSV export for full list)`,
      margin,
      yPos
    );
  }

  // Footer
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    const footerText = `Generated on ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`;
    doc.text(footerText, pageWidth / 2, 285, { align: "center" });
  }

  return doc;
}

/**
 * Truncate text to specified length
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Download PDF file in browser
 */
export function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}
