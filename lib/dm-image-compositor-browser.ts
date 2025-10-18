import { RecipientData } from "@/types/dm-creative";
import { CompositionSettings } from "@/types/composition";

export type LayoutTemplate = 'classic' | 'modern' | 'minimal' | 'premium';

export interface DMCompositeOptions {
  backgroundImage: string; // base64 data URL
  recipient: RecipientData;
  message: string;
  qrCodeDataUrl: string;
  companyName: string;
  logoUrl?: string; // Brand logo from database
  layout?: LayoutTemplate; // Layout template to use
  aspectRatio?: string; // e.g., '1536x1024', '1024x1536', '1024x1024'
  headingFont?: string; // Brand heading font from Brand Kit
  bodyFont?: string; // Brand body font from Brand Kit
  compositionSettings?: CompositionSettings; // Custom composition from fine-tune modal
}

export interface LayoutConfig {
  name: string;
  description: string;
  panelPosition: 'left' | 'top' | 'none';
  panelSize: number; // percentage of canvas
  logoPosition: 'top-left' | 'top-center' | 'center';
  textAlignment: 'left' | 'center';
  qrPosition: 'bottom-right' | 'bottom-center' | 'top-right';
}

/**
 * Get layout configuration for each template
 */
export function getLayoutConfig(template: LayoutTemplate): LayoutConfig {
  const configs: Record<LayoutTemplate, LayoutConfig> = {
    classic: {
      name: 'Classic',
      description: 'Left panel with text, image on right',
      panelPosition: 'left',
      panelSize: 33,
      logoPosition: 'top-left',
      textAlignment: 'left',
      qrPosition: 'bottom-right',
    },
    modern: {
      name: 'Modern',
      description: 'Top header with centered text',
      panelPosition: 'top',
      panelSize: 25,
      logoPosition: 'top-center',
      textAlignment: 'center',
      qrPosition: 'bottom-center',
    },
    minimal: {
      name: 'Minimal',
      description: 'Overlay text, no panel',
      panelPosition: 'none',
      panelSize: 0,
      logoPosition: 'top-left',
      textAlignment: 'left',
      qrPosition: 'bottom-right',
    },
    premium: {
      name: 'Premium',
      description: 'Large left panel, centered content',
      panelPosition: 'left',
      panelSize: 40,
      logoPosition: 'center',
      textAlignment: 'center',
      qrPosition: 'top-right',
    },
  };

  return configs[template];
}

/**
 * Browser-based image composition using Canvas API
 * This runs client-side to avoid native module issues in Next.js
 * Now supports dynamic aspect ratios and brand logo integration
 */
export async function composeDMImageBrowser(
  options: DMCompositeOptions
): Promise<string> {
  const {
    backgroundImage,
    recipient,
    message,
    qrCodeDataUrl,
    companyName,
    logoUrl,
    layout = 'classic',
    aspectRatio = '1536x1024',
    headingFont = 'sans-serif',
    bodyFont = 'sans-serif',
    compositionSettings, // Custom settings from fine-tune modal
  } = options;

  // If custom composition settings provided, use them instead of layout templates
  if (compositionSettings) {
    console.log('🎨 Using custom composition settings from fine-tune modal');
    return composeWithCustomSettings(
      backgroundImage,
      recipient,
      qrCodeDataUrl,
      compositionSettings,
      logoUrl
    );
  }

  // Otherwise, use layout-based composition
  const layoutConfig = getLayoutConfig(layout);

  console.log('🔧 Compositor called with:', {
    layout,
    aspectRatio,
    hasLogo: !!logoUrl,
    logoUrl: logoUrl ? logoUrl.substring(0, 50) + '...' : 'none',
    headingFont,
    bodyFont
  });

  return new Promise((resolve, reject) => {
    // Load background image first to get actual dimensions
    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';

    bgImg.onload = () => {
      try {
        // Use actual background image dimensions (respects aspect ratio)
        const canvas = document.createElement('canvas');
        canvas.width = bgImg.width;
        canvas.height = bgImg.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        console.log(`🎨 Compositing image: ${canvas.width}x${canvas.height} (${aspectRatio}), Layout: ${layout}`);

        // Draw background at actual size
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

        // Determine if landscape, portrait, or square
        const isLandscape = canvas.width > canvas.height;
        const isPortrait = canvas.height > canvas.width;
        const isSquare = canvas.width === canvas.height;

        // Scale factors for responsive sizing
        const scaleX = canvas.width / 1024;
        const scaleY = canvas.height / 1024;

        // Panel configuration based on layout template and aspect ratio
        const panelSize = layoutConfig.panelSize / 100; // Convert percentage to decimal
        let panelWidth = 0;
        let panelHeight = 0;

        if (layoutConfig.panelPosition === 'left') {
          panelWidth = canvas.width * panelSize;
        } else if (layoutConfig.panelPosition === 'top') {
          panelHeight = canvas.height * panelSize;
        }

        const padding = 30 * Math.min(scaleX, scaleY);
        const textX = layoutConfig.panelPosition === 'left' ? padding : padding;
        const maxTextWidth = layoutConfig.panelPosition === 'left'
          ? panelWidth - (padding * 2)
          : canvas.width - (padding * 2);

        console.log(`📐 Layout config: ${layoutConfig.name}, Panel: ${layoutConfig.panelPosition}, Size: ${layoutConfig.panelSize}%`);

        // Load and draw logo if available
        if (logoUrl) {
          console.log('🖼️ Loading logo from:', logoUrl.substring(0, 100));

          const logoImg = new Image();
          logoImg.crossOrigin = 'anonymous';
          logoImg.onload = () => {
            // Logo positioning based on layout config
            let logoX = textX;
            let logoY = padding;
            let logoMaxWidth = panelWidth > 0 ? panelWidth * 0.55 : canvas.width * 0.2;
            let logoMaxHeight = 70 * scaleY;

            // Adjust based on logo position in layout
            if (layoutConfig.logoPosition === 'top-center') {
              logoMaxWidth = canvas.width * 0.3;
            } else if (layoutConfig.logoPosition === 'center') {
              logoMaxWidth = panelWidth * 0.6;
            }

            const logoScale = Math.min(logoMaxWidth / logoImg.width, logoMaxHeight / logoImg.height, 1);
            const logoWidth = logoImg.width * logoScale;
            const logoHeight = logoImg.height * logoScale;

            // Center horizontally if needed
            if (layoutConfig.logoPosition === 'top-center' || layoutConfig.logoPosition === 'center') {
              logoX = (panelWidth > 0 ? panelWidth / 2 : canvas.width / 2) - (logoWidth / 2);
            }

            // Center vertically if center position
            if (layoutConfig.logoPosition === 'center' && panelWidth > 0) {
              logoY = (canvas.height / 2) - (logoHeight / 2) - (100 * scaleY); // Offset up a bit
            }

            ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
            console.log(`✅ Logo drawn: ${logoWidth.toFixed(0)}x${logoHeight.toFixed(0)} at ${layoutConfig.logoPosition}`);

            // Continue with text after logo is drawn
            renderTextContent(ctx, {
              canvas,
              textX,
              maxTextWidth,
              padding,
              scaleX,
              scaleY,
              companyName,
              message,
              recipient,
              logoHeight,
              qrCodeDataUrl,
              isLandscape,
              headingFont,
              bodyFont,
              hasLogo: true,
              layoutConfig,
              panelWidth,
              panelHeight,
              resolve,
              reject
            });
          };
          logoImg.onerror = (error) => {
            console.error('❌ Failed to load logo:', error);
            console.warn('⚠️ Continuing without logo, will show company name instead');
            // Continue without logo
            renderTextContent(ctx, {
              canvas,
              textX,
              maxTextWidth,
              padding,
              scaleX,
              scaleY,
              companyName,
              message,
              recipient,
              logoHeight: 0,
              qrCodeDataUrl,
              isLandscape,
              headingFont,
              bodyFont,
              hasLogo: false,
              layoutConfig,
              panelWidth,
              panelHeight,
              resolve,
              reject
            });
          };
          logoImg.src = logoUrl;
        } else {
          console.log('ℹ️ No logo provided, will show company name');
          // No logo, render text immediately
          renderTextContent(ctx, {
            canvas,
            textX,
            maxTextWidth,
            padding,
            scaleX,
            scaleY,
            companyName,
            message,
            recipient,
            logoHeight: 0,
            qrCodeDataUrl,
            isLandscape,
            headingFont,
            bodyFont,
            hasLogo: false,
            layoutConfig,
            panelWidth,
            panelHeight,
            resolve,
            reject
          });
        }
      } catch (error) {
        reject(error);
      }
    };

    bgImg.onerror = () => reject(new Error('Failed to load background image'));
    bgImg.src = backgroundImage;
  });
}

// Helper function to render all text content
function renderTextContent(
  ctx: CanvasRenderingContext2D,
  params: {
    canvas: HTMLCanvasElement;
    textX: number;
    maxTextWidth: number;
    padding: number;
    scaleX: number;
    scaleY: number;
    companyName: string;
    message: string;
    recipient: RecipientData;
    logoHeight: number;
    qrCodeDataUrl: string;
    isLandscape: boolean;
    headingFont: string;
    bodyFont: string;
    hasLogo: boolean;
    layoutConfig: LayoutConfig;
    panelWidth: number;
    panelHeight: number;
    resolve: (value: string) => void;
    reject: (reason?: any) => void;
  }
) {
  const {
    canvas,
    textX,
    maxTextWidth,
    padding,
    scaleX,
    scaleY,
    companyName,
    message,
    recipient,
    logoHeight,
    qrCodeDataUrl,
    isLandscape,
    headingFont,
    bodyFont,
    hasLogo,
    layoutConfig,
    panelWidth,
    panelHeight,
    resolve,
    reject
  } = params;

  console.log(`📝 Rendering text content, hasLogo: ${hasLogo}, layout: ${layoutConfig.name}`);

  // Start text below logo with proper spacing
  // If logo exists, start text well below it to avoid overlap
  let yPos = hasLogo
    ? padding + logoHeight + (50 * scaleY)  // Extra spacing after logo
    : padding + (40 * scaleY);

  // Check if we need contrast enhancement (minimal template with no panel)
  const needsContrast = layoutConfig.panelPosition === 'none';

  // Add text shadow for better contrast on overlay text
  if (needsContrast) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 15 * Math.min(scaleX, scaleY);
    ctx.shadowOffsetX = 2 * scaleX;
    ctx.shadowOffsetY = 2 * scaleY;
  }

  // Company name ONLY if NO logo (avoid redundancy)
  if (!hasLogo) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${32 * Math.min(scaleX, scaleY)}px ${headingFont}`;
    ctx.fillText(companyName, textX, yPos);
    yPos += 30 * scaleY;
    console.log('📝 Company name rendered (no logo present)');
  } else {
    console.log('✅ Skipping company name (logo present)');
  }

  // Decorative line
  ctx.strokeStyle = '#FF6B35';
  ctx.lineWidth = 4 * Math.min(scaleX, scaleY);
  ctx.beginPath();
  ctx.moveTo(textX, yPos);
  ctx.lineTo(textX + 120 * scaleX, yPos);
  ctx.stroke();
  yPos += 40 * scaleY;

  // Marketing message (use heading font for emphasis)
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${24 * Math.min(scaleX, scaleY)}px ${headingFont}`;
  const messageLines = wrapText(ctx, message, maxTextWidth);
  messageLines.slice(0, 6).forEach((line) => {
    ctx.fillText(line, textX, yPos);
    yPos += 35 * scaleY;
  });

  // Personalized greeting (use heading font for recipient name)
  yPos += 60 * scaleY;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${28 * Math.min(scaleX, scaleY)}px ${headingFont}`;
  const greeting = `Dear ${recipient.name} ${recipient.lastname},`;
  const greetingLines = wrapText(ctx, greeting, maxTextWidth);
  greetingLines.forEach((line) => {
    ctx.fillText(line, textX, yPos);
    yPos += 40 * scaleY;
  });

  // Address (use body font for supporting text)
  if (recipient.address || recipient.city || recipient.zip) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = `${18 * Math.min(scaleX, scaleY)}px ${bodyFont}`;
    yPos += 20 * scaleY;
    if (recipient.address) {
      ctx.fillText(recipient.address, textX, yPos);
      yPos += 25 * scaleY;
    }
    if (recipient.city && recipient.zip) {
      ctx.fillText(`${recipient.city}, ${recipient.zip}`, textX, yPos);
    }
  }

  // CTA at bottom (use heading font for emphasis)
  const ctaY = canvas.height - (140 * scaleY);
  ctx.fillStyle = '#FF6B35';
  ctx.font = `bold ${22 * Math.min(scaleX, scaleY)}px ${headingFont}`;
  ctx.fillText('Scan the QR code', textX, ctaY);
  ctx.fillText('to learn more →', textX, ctaY + (30 * scaleY));

  // Load and draw QR code
  const qrImg = new Image();
  qrImg.onload = () => {
    const qrSize = 140 * Math.min(scaleX, scaleY);
    let qrX = canvas.width - qrSize - (40 * scaleX);
    let qrY = canvas.height - qrSize - (40 * scaleY);

    // Position QR based on layout config
    if (layoutConfig.qrPosition === 'bottom-center') {
      qrX = (canvas.width / 2) - (qrSize / 2);
      qrY = canvas.height - qrSize - (40 * scaleY);
    } else if (layoutConfig.qrPosition === 'top-right') {
      qrX = canvas.width - qrSize - (40 * scaleX);
      qrY = 40 * scaleY;
    } else if (layoutConfig.qrPosition === 'bottom-right') {
      qrX = canvas.width - qrSize - (40 * scaleX);
      qrY = canvas.height - qrSize - (40 * scaleY);
    }

    // White background for QR
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);

    // Draw QR code
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    // Border
    ctx.strokeStyle = '#FF6B35';
    ctx.lineWidth = 3 * Math.min(scaleX, scaleY);
    ctx.strokeRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);

    // Convert to data URL
    const finalImage = canvas.toDataURL('image/png');
    console.log(`✅ Final composite complete - Layout: ${layoutConfig.name}, QR: ${layoutConfig.qrPosition}`);
    resolve(finalImage);
  };

  qrImg.onerror = () => reject(new Error('Failed to load QR code'));
  qrImg.src = qrCodeDataUrl;
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

/**
 * Compose DM using custom CompositionSettings from fine-tune modal
 * This gives users full control over element positions, sizes, and styling
 */
async function composeWithCustomSettings(
  backgroundImage: string,
  recipient: RecipientData,
  qrCodeDataUrl: string,
  settings: CompositionSettings,
  logoUrl?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';

    bgImg.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = settings.canvasWidth;
      canvas.height = settings.canvasHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      console.log('🎨 Compositing with custom settings:', {
        canvasSize: `${settings.canvasWidth}x${settings.canvasHeight}`,
        hasLogo: !!logoUrl
      });

      // Draw background
      ctx.drawImage(bgImg, 0, 0, settings.canvasWidth, settings.canvasHeight);

      // Draw logo if available
      if (logoUrl) {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        logoImg.onload = () => {
          ctx.globalAlpha = settings.logo.opacity / 100;
          ctx.drawImage(
            logoImg,
            settings.logo.position.x,
            settings.logo.position.y,
            settings.logo.size.width,
            settings.logo.size.height
          );
          ctx.globalAlpha = 1;

          // Continue with text rendering
          renderTextWithSettings(ctx, settings, recipient, qrCodeDataUrl, resolve);
        };
        logoImg.onerror = () => {
          console.warn('⚠️ Logo failed to load, continuing without it');
          renderTextWithSettings(ctx, settings, recipient, qrCodeDataUrl, resolve);
        };
        logoImg.src = logoUrl;
      } else {
        // No logo, render text immediately
        renderTextWithSettings(ctx, settings, recipient, qrCodeDataUrl, resolve);
      }
    };

    bgImg.onerror = (error) => reject(error);
    bgImg.src = backgroundImage;
  });
}

/**
 * Render all text elements using custom composition settings
 */
function renderTextWithSettings(
  ctx: CanvasRenderingContext2D,
  settings: CompositionSettings,
  recipient: RecipientData,
  qrCodeDataUrl: string,
  resolve: (value: string) => void
) {
  // Draw headline
  ctx.font = `${settings.headline.fontWeight} ${settings.headline.fontSize}px ${settings.headline.fontFamily}`;
  ctx.fillStyle = settings.headline.color;
  ctx.textAlign = settings.headline.textAlign;
  ctx.textBaseline = 'top';

  const headlineX = settings.headline.textAlign === 'center'
    ? settings.headline.position.x
    : settings.headline.textAlign === 'right'
    ? settings.headline.position.x + settings.headline.maxWidth
    : settings.headline.position.x;

  ctx.fillText(settings.headline.content, headlineX, settings.headline.position.y);

  // Draw message with wrapping
  ctx.font = `${settings.message.fontWeight} ${settings.message.fontSize}px ${settings.message.fontFamily}`;
  ctx.fillStyle = settings.message.color;
  ctx.textAlign = settings.message.textAlign;

  const words = settings.message.content.split(' ');
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < settings.message.maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);

  const messageX = settings.message.textAlign === 'center'
    ? settings.message.position.x
    : settings.message.textAlign === 'right'
    ? settings.message.position.x + settings.message.maxWidth
    : settings.message.position.x;

  lines.forEach((line, index) => {
    ctx.fillText(line, messageX, settings.message.position.y + (index * settings.message.fontSize * settings.message.lineHeight));
  });

  // Draw recipient info
  if (settings.recipientInfo.showName || settings.recipientInfo.showAddress) {
    ctx.fillStyle = settings.recipientInfo.color;
    ctx.font = `${settings.recipientInfo.fontSize}px ${settings.recipientInfo.fontFamily}`;
    ctx.textAlign = 'left';

    let yOffset = settings.recipientInfo.position.y;

    if (settings.recipientInfo.showName) {
      const recipientName = `${recipient.name} ${recipient.lastname}`;
      ctx.fillText(recipientName, settings.recipientInfo.position.x, yOffset);
      yOffset += settings.recipientInfo.fontSize * 1.4;
    }

    if (settings.recipientInfo.showAddress) {
      const address = `${recipient.address}, ${recipient.city}, ${recipient.zip}`;
      ctx.fillText(address, settings.recipientInfo.position.x, yOffset);
    }
  }

  // Draw QR code
  const qrImg = new Image();
  qrImg.onload = () => {
    // Draw QR code
    ctx.drawImage(
      qrImg,
      settings.qrCode.position.x,
      settings.qrCode.position.y,
      settings.qrCode.size,
      settings.qrCode.size
    );

    // Draw border
    ctx.strokeStyle = settings.qrCode.borderColor;
    ctx.lineWidth = settings.qrCode.borderWidth;
    ctx.strokeRect(
      settings.qrCode.position.x,
      settings.qrCode.position.y,
      settings.qrCode.size,
      settings.qrCode.size
    );

    // Convert to data URL and resolve
    resolve(ctx.canvas.toDataURL('image/png'));
  };
  qrImg.onerror = () => {
    console.error('❌ Failed to load QR code');
    resolve(ctx.canvas.toDataURL('image/png'));
  };
  qrImg.src = qrCodeDataUrl;
}
