import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getOrderById, getOrderItems } from '../database/order-queries';
import fs from 'fs';
import path from 'path';

/**
 * Generate PDF for campaign order
 * @param orderId Order ID
 * @returns Public URL to PDF file
 */
export async function generateOrderPDF(orderId: string): Promise<string> {
  const order = getOrderById(orderId);

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const items = getOrderItems(orderId);

  if (items.length === 0) {
    throw new Error(`Order ${order.order_number} has no items`);
  }

  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // ==================== HEADER ====================

  // Company logo/title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Campaign Order', margin, margin + 10);

  // Order number
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`Order #${order.order_number}`, margin, margin + 20);

  // Date
  const orderDate = new Date(order.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.setFontSize(10);
  doc.text(`Date: ${orderDate}`, margin, margin + 27);

  // Status badge
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const statusText = `Status: ${order.status.toUpperCase()}`;
  doc.text(statusText, pageWidth - margin - 40, margin + 10);

  // ==================== SUMMARY SECTION ====================

  const summaryY = margin + 40;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Order Summary', margin, summaryY);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const summaryData = [
    ['Total Stores:', `${order.total_stores}`],
    ['Total Quantity:', `${order.total_quantity} pieces`],
    ['Estimated Cost:', `$${order.estimated_cost.toFixed(2)}`],
    ['Unit Cost:', '$0.25 per piece'],
  ];

  let summaryYPos = summaryY + 7;
  for (const [label, value] of summaryData) {
    doc.text(label, margin, summaryYPos);
    doc.setFont('helvetica', 'bold');
    doc.text(value, margin + 50, summaryYPos);
    doc.setFont('helvetica', 'normal');
    summaryYPos += 6;
  }

  // ==================== ORDER ITEMS TABLE ====================

  const tableY = summaryYPos + 10;

  // Prepare table data
  const tableData = items.map((item, index) => [
    (index + 1).toString(),
    item.store_number || 'N/A',
    item.store_name || 'Unknown Store',
    `${item.city || ''}, ${item.state || ''}`.trim() || 'N/A',
    item.campaign_name || 'Unknown Campaign',
    item.approved_quantity.toString(),
    `$${item.total_cost.toFixed(2)}`,
  ]);

  autoTable(doc, {
    head: [['#', 'Store #', 'Store Name', 'Location', 'Campaign', 'Qty', 'Cost']],
    body: tableData,
    startY: tableY,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 128, 185], // Blue header
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 }, // #
      1: { halign: 'center', cellWidth: 20 }, // Store #
      2: { cellWidth: 40 }, // Store Name
      3: { cellWidth: 35 }, // Location
      4: { cellWidth: 45 }, // Campaign
      5: { halign: 'center', cellWidth: 15 }, // Qty
      6: { halign: 'right', cellWidth: 20 }, // Cost
    },
    margin: { left: margin, right: margin },
    didDrawPage: (data) => {
      // Footer on each page
      const pageCount = (doc as any).internal.getNumberOfPages();
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;

      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        `Page ${currentPage} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );

      doc.text(
        `Generated on ${new Date().toLocaleDateString()}`,
        margin,
        pageHeight - 10
      );
    },
  });

  // ==================== NOTES SECTION ====================

  if (order.notes) {
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', margin, finalY);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(order.notes, pageWidth - 2 * margin);
    doc.text(noteLines, margin, finalY + 6);
  }

  // ==================== FOOTER ====================

  const footerY = pageHeight - 30;
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'italic');

  const footerLines = [
    'This order is subject to availability and pricing confirmation.',
    'Please confirm receipt within 24 hours.',
    'For questions, contact your account manager.',
  ];

  let footerYPos = footerY;
  for (const line of footerLines) {
    doc.text(line, pageWidth / 2, footerYPos, { align: 'center' });
    footerYPos += 4;
  }

  // ==================== SAVE PDF ====================

  const filename = `order-${order.order_number}.pdf`;
  const outputPath = path.join(process.cwd(), 'public', 'orders', filename);

  // Ensure directory exists
  const ordersDir = path.join(process.cwd(), 'public', 'orders');
  if (!fs.existsSync(ordersDir)) {
    fs.mkdirSync(ordersDir, { recursive: true });
  }

  // Save PDF
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  fs.writeFileSync(outputPath, pdfBuffer);

  console.log(`✅ [PDF Generator] Generated order PDF: ${filename}`);

  // Return public URL
  return `/orders/${filename}`;
}

/**
 * Delete order PDF file
 * @param pdfUrl Public URL to PDF file
 */
export function deleteOrderPDF(pdfUrl: string): void {
  try {
    const filename = path.basename(pdfUrl);
    const filePath = path.join(process.cwd(), 'public', 'orders', filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ [PDF Generator] Deleted PDF: ${filename}`);
    }
  } catch (error) {
    console.error('❌ [PDF Generator] Error deleting PDF:', error);
    // Don't throw - deletion failure shouldn't break the flow
  }
}
