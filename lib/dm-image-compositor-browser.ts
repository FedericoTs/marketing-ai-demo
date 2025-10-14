import { RecipientData } from "@/types/dm-creative";

export interface DMCompositeOptions {
  backgroundImage: string; // base64 data URL
  recipient: RecipientData;
  message: string;
  qrCodeDataUrl: string;
  companyName: string;
}

/**
 * Browser-based image composition using Canvas API
 * This runs client-side to avoid native module issues in Next.js
 */
export async function composeDMImageBrowser(
  options: DMCompositeOptions
): Promise<string> {
  const { backgroundImage, recipient, message, qrCodeDataUrl, companyName } = options;

  return new Promise((resolve, reject) => {
    // Create an offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    // Load background image
    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';

    bgImg.onload = () => {
      try {
        // Draw background
        ctx.drawImage(bgImg, 0, 0, 1024, 1024);

        // Left panel configuration
        const leftPanelWidth = 340;
        const padding = 30;
        const textX = padding;
        const maxTextWidth = leftPanelWidth - (padding * 2);

        // Company name
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 32px sans-serif';
        ctx.fillText(companyName, textX, 60);

        // Decorative line
        ctx.strokeStyle = '#FF6B35';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(textX, 80);
        ctx.lineTo(textX + 120, 80);
        ctx.stroke();

        // Marketing message
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px sans-serif';
        const messageLines = wrapText(ctx, message, maxTextWidth);
        let yPos = 150;
        messageLines.slice(0, 6).forEach((line) => {
          ctx.fillText(line, textX, yPos);
          yPos += 35;
        });

        // Personalized greeting
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 28px sans-serif';
        const greeting = `Dear ${recipient.name} ${recipient.lastname},`;
        yPos = Math.max(yPos + 60, 450);
        const greetingLines = wrapText(ctx, greeting, maxTextWidth);
        greetingLines.forEach((line) => {
          ctx.fillText(line, textX, yPos);
          yPos += 40;
        });

        // Address
        if (recipient.address || recipient.city || recipient.zip) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.font = '18px sans-serif';
          yPos += 20;
          if (recipient.address) {
            ctx.fillText(recipient.address, textX, yPos);
            yPos += 25;
          }
          if (recipient.city && recipient.zip) {
            ctx.fillText(`${recipient.city}, ${recipient.zip}`, textX, yPos);
          }
        }

        // CTA
        ctx.fillStyle = '#FF6B35';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText('Scan the QR code', textX, 880);
        ctx.fillText('to learn more →', textX, 910);

        // Load and draw QR code
        const qrImg = new Image();
        qrImg.onload = () => {
          const qrSize = 140;
          const qrX = 1024 - qrSize - 40;
          const qrY = 1024 - qrSize - 40;

          // White background for QR
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);

          // Draw QR code
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

          // Border
          ctx.strokeStyle = '#FF6B35';
          ctx.lineWidth = 3;
          ctx.strokeRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);

          // Convert to data URL
          const finalImage = canvas.toDataURL('image/png');
          resolve(finalImage);
        };

        qrImg.onerror = () => reject(new Error('Failed to load QR code'));
        qrImg.src = qrCodeDataUrl;

      } catch (error) {
        reject(error);
      }
    };

    bgImg.onerror = () => reject(new Error('Failed to load background image'));
    bgImg.src = backgroundImage;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

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
