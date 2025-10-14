import { jsPDF } from "jspdf";
import { DirectMailData } from "@/types/dm-creative";

export async function generateDirectMailPDF(
  dmData: DirectMailData,
  companyName: string
): Promise<Blob> {
  // Use landscape orientation for better full-bleed image display
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // If we have the AI-generated creative image, use it as the full-page content
  if (dmData.creativeImageUrl) {
    try {
      // Add the full creative image to fill the entire page
      // The creative image is 1024x1024, so we'll scale it to fit the page
      const imageSize = Math.min(pageWidth, pageHeight);
      const xOffset = (pageWidth - imageSize) / 2;
      const yOffset = (pageHeight - imageSize) / 2;

      doc.addImage(
        dmData.creativeImageUrl,
        "PNG",
        xOffset,
        yOffset,
        imageSize,
        imageSize,
        undefined,
        "FAST"
      );

      // Add a small footer with tracking ID (optional, subtle)
      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Tracking: ${dmData.trackingId}`,
        pageWidth - 5,
        pageHeight - 2,
        { align: "right" }
      );
    } catch (error) {
      console.error("Error adding creative image to PDF:", error);
      // Fall back to basic layout if image fails
      return generateBasicPDF(doc, dmData, companyName, pageWidth, pageHeight);
    }
  } else {
    // Fallback: if no creative image, use basic layout
    return generateBasicPDF(doc, dmData, companyName, pageWidth, pageHeight);
  }

  return doc.output("blob");
}

// Fallback basic PDF layout (original design)
function generateBasicPDF(
  doc: jsPDF,
  dmData: DirectMailData,
  companyName: string,
  pageWidth: number,
  pageHeight: number
): Blob {
  // Background
  doc.setFillColor(250, 250, 250);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Header with company name
  doc.setFillColor(0, 62, 126); // Miracle-Ear deep blue
  doc.rect(0, 0, pageWidth, 30, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(companyName, pageWidth / 2, 20, { align: "center" });

  // Recipient address box
  doc.setFillColor(255, 255, 255);
  doc.rect(15, 40, 80, 30, "F");
  doc.setDrawColor(200, 200, 200);
  doc.rect(15, 40, 80, 30, "S");

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  let yPos = 48;
  doc.text(`${dmData.recipient.name} ${dmData.recipient.lastname}`, 18, yPos);
  yPos += 5;
  if (dmData.recipient.address) {
    doc.text(dmData.recipient.address, 18, yPos);
    yPos += 5;
  }
  if (dmData.recipient.city && dmData.recipient.zip) {
    doc.text(`${dmData.recipient.city}, ${dmData.recipient.zip}`, 18, yPos);
  }

  // Main message
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);

  const messageLines = doc.splitTextToSize(dmData.message, pageWidth - 40);
  doc.text(messageLines, 20, 85);

  // QR Code section
  const qrX = pageWidth - 70;
  const qrY = 40;
  doc.setFillColor(255, 255, 255);
  doc.rect(qrX - 5, qrY - 5, 60, 70, "F");
  doc.setDrawColor(0, 62, 126);
  doc.setLineWidth(1);
  doc.rect(qrX - 5, qrY - 5, 60, 70, "S");

  // Add QR code
  try {
    doc.addImage(
      dmData.qrCodeDataUrl,
      "PNG",
      qrX,
      qrY,
      50,
      50,
      undefined,
      "FAST"
    );
  } catch (error) {
    console.error("Error adding QR code to PDF:", error);
  }

  // QR code label
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 107, 53); // Miracle-Ear orange
  doc.text("Scan to Learn More", qrX + 25, qrY + 58, { align: "center" });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Tracking ID: ${dmData.trackingId}`,
    pageWidth / 2,
    pageHeight - 5,
    { align: "center" }
  );

  return doc.output("blob");
}
