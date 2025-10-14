import { createCanvas, loadImage, CanvasRenderingContext2D as NodeCanvasRenderingContext2D } from "canvas";
import { RecipientData } from "@/types/dm-creative";

export interface DMCompositeOptions {
  backgroundImage: string; // base64 data URL
  recipient: RecipientData;
  message: string;
  qrCodeDataUrl: string;
  companyName: string;
}

export async function composeDMImage(
  options: DMCompositeOptions
): Promise<string> {
  const { backgroundImage, recipient, message, qrCodeDataUrl, companyName } =
    options;

  // Create canvas (1024x1024 to match DALL-E output)
  const canvas = createCanvas(1024, 1024);
  const ctx = canvas.getContext("2d");

  try {
    // Load and draw background image (AI-generated with left 1/3 blue panel)
    const bgImage = await loadImage(backgroundImage);
    ctx.drawImage(bgImage, 0, 0, 1024, 1024);

    // Left panel is already deep blue from DALL-E
    // We'll add white text on the left 1/3 (approximately 340px width)

    const leftPanelWidth = 340;
    const padding = 30;
    const textX = padding;
    const maxTextWidth = leftPanelWidth - (padding * 2);

    // Company name at top of left panel
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText(companyName, textX, 60);

    // Decorative line under company name
    ctx.strokeStyle = "#FF6B35"; // Orange accent
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(textX, 80);
    ctx.lineTo(textX + 120, 80);
    ctx.stroke();

    // Marketing message in left panel
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 24px sans-serif";
    const messageLines = wrapText(ctx, message, maxTextWidth);
    let yPos = 150;
    messageLines.slice(0, 6).forEach((line) => {
      ctx.fillText(line, textX, yPos);
      yPos += 35;
    });

    // Personalized greeting in left panel (middle section)
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 28px sans-serif";
    const greeting = `Dear ${recipient.name} ${recipient.lastname},`;
    yPos = Math.max(yPos + 60, 450); // Ensure spacing
    const greetingLines = wrapText(ctx, greeting, maxTextWidth);
    greetingLines.forEach((line) => {
      ctx.fillText(line, textX, yPos);
      yPos += 40;
    });

    // Address if available (in left panel)
    if (recipient.address || recipient.city || recipient.zip) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.font = "18px sans-serif";
      yPos += 20;
      if (recipient.address) {
        ctx.fillText(recipient.address, textX, yPos);
        yPos += 25;
      }
      if (recipient.city && recipient.zip) {
        ctx.fillText(`${recipient.city}, ${recipient.zip}`, textX, yPos);
        yPos += 25;
      }
    }

    // Call-to-action at bottom of left panel
    ctx.fillStyle = "#FF6B35"; // Warm orange
    ctx.font = "bold 22px sans-serif";
    ctx.fillText("Scan the QR code", textX, 880);
    ctx.fillText("to learn more →", textX, 910);

    // QR code in bottom right of image
    const qrImage = await loadImage(qrCodeDataUrl);
    const qrSize = 140;
    const qrX = 1024 - qrSize - 40;
    const qrY = 1024 - qrSize - 40;

    // White background for QR code
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);

    // Draw QR code
    ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

    // Border around QR code
    ctx.strokeStyle = "#FF6B35"; // Orange border
    ctx.lineWidth = 3;
    ctx.strokeRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);

    // Convert canvas to base64
    const finalImage = canvas.toDataURL("image/png");
    return finalImage;
  } catch (error) {
    console.error("Error composing DM image:", error);
    throw new Error(`Failed to compose DM image: ${String(error)}`);
  }
}

// Helper function to wrap text
function wrapText(
  ctx: NodeCanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}
