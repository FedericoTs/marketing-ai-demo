/**
 * Composition Settings for DM Creative Fine-Tuning
 * Stores user-defined positions, sizes, and styling for all DM elements
 */

export interface ElementPosition {
  x: number; // X coordinate (pixels)
  y: number; // Y coordinate (pixels)
}

export interface ElementSize {
  width: number;  // Width (pixels)
  height: number; // Height (pixels)
}

export interface LogoSettings {
  position: ElementPosition;
  size: ElementSize;
  variant: 'auto' | 'color' | 'white'; // Auto = AI decides based on background
  opacity: number; // 0-100
}

export interface TextSettings {
  content: string;
  position: ElementPosition;
  fontSize: number; // pixels
  color: string; // hex color
  fontFamily: string;
  fontWeight: 'normal' | 'bold' | '600' | '700';
  textAlign: 'left' | 'center' | 'right';
  maxWidth: number; // pixels (for wrapping)
  lineHeight: number; // multiplier (e.g., 1.5)
}

export interface QRCodeSettings {
  position: ElementPosition;
  size: number; // width = height (square)
  borderColor: string; // hex color
  borderWidth: number; // pixels
}

export interface RecipientInfoSettings {
  position: ElementPosition;
  fontSize: number;
  color: string;
  fontFamily: string;
  showAddress: boolean;
  showName: boolean;
}

/**
 * Complete composition settings for a DM creative
 */
export interface CompositionSettings {
  // Canvas info
  canvasWidth: number;
  canvasHeight: number;
  aspectRatio: string; // e.g., '1536x1024'

  // Elements
  logo: LogoSettings;
  headline: TextSettings;
  message: TextSettings;
  qrCode: QRCodeSettings;
  recipientInfo: RecipientInfoSettings;

  // Metadata
  templateBase: 'classic' | 'modern' | 'minimal' | 'premium'; // Starting template
  customized: boolean; // True if user made manual adjustments
  savedAt?: string; // ISO timestamp
}

/**
 * Default composition settings based on layout template
 * Used as starting point before user customization
 */
export function getDefaultCompositionSettings(
  canvasWidth: number,
  canvasHeight: number,
  aspectRatio: string,
  template: 'classic' | 'modern' | 'minimal' | 'premium',
  companyName: string,
  message: string,
  brandColors?: { primary?: string; text?: string; }
): CompositionSettings {
  const scaleX = canvasWidth / 1024;
  const scaleY = canvasHeight / 1024;
  const basePadding = 30 * Math.min(scaleX, scaleY);

  // Determine panel size based on template
  const panelSizes = {
    classic: canvasWidth * 0.33,
    modern: 0,
    minimal: 0,
    premium: canvasWidth * 0.4,
  };
  const panelWidth = panelSizes[template];

  // Base settings
  const settings: CompositionSettings = {
    canvasWidth,
    canvasHeight,
    aspectRatio,
    templateBase: template,
    customized: false,

    logo: {
      position: { x: basePadding, y: basePadding },
      size: {
        width: panelWidth > 0 ? panelWidth * 0.55 : canvasWidth * 0.2,
        height: 70 * scaleY
      },
      variant: 'auto',
      opacity: 100,
    },

    headline: {
      content: companyName,
      position: {
        x: basePadding,
        y: basePadding + (90 * scaleY) // Below logo
      },
      fontSize: 42 * Math.min(scaleX, scaleY),
      color: brandColors?.primary || '#003E7E',
      fontFamily: 'sans-serif',
      fontWeight: 'bold',
      textAlign: template === 'modern' || template === 'premium' ? 'center' : 'left',
      maxWidth: panelWidth > 0 ? panelWidth - (basePadding * 2) : canvasWidth - (basePadding * 2),
      lineHeight: 1.2,
    },

    message: {
      content: message,
      position: {
        x: basePadding,
        y: basePadding + (180 * scaleY) // Below headline
      },
      fontSize: 20 * Math.min(scaleX, scaleY),
      color: brandColors?.text || '#1F2937',
      fontFamily: 'sans-serif',
      fontWeight: 'normal',
      textAlign: template === 'modern' || template === 'premium' ? 'center' : 'left',
      maxWidth: panelWidth > 0 ? panelWidth - (basePadding * 2) : canvasWidth - (basePadding * 2),
      lineHeight: 1.5,
    },

    qrCode: {
      position: {
        x: canvasWidth - 180 * scaleX - basePadding,
        y: canvasHeight - 180 * scaleY - basePadding
      },
      size: 150 * Math.min(scaleX, scaleY),
      borderColor: '#FF6B35',
      borderWidth: 3,
    },

    recipientInfo: {
      position: {
        x: basePadding,
        y: canvasHeight - 120 * scaleY
      },
      fontSize: 14 * Math.min(scaleX, scaleY),
      color: '#6B7280',
      fontFamily: 'sans-serif',
      showAddress: true,
      showName: true,
    },
  };

  // Template-specific adjustments
  if (template === 'modern') {
    // Center everything horizontally
    settings.logo.position.x = (canvasWidth / 2) - (settings.logo.size.width / 2);
    settings.headline.position.x = canvasWidth / 2;
    settings.message.position.x = canvasWidth / 2;
    settings.qrCode.position.x = (canvasWidth / 2) - (settings.qrCode.size / 2);
  }

  if (template === 'minimal') {
    // Overlay style - position elements over image
    settings.logo.position = { x: basePadding * 2, y: basePadding * 2 };
    settings.headline.position = { x: basePadding * 2, y: canvasHeight / 3 };
    settings.message.position = { x: basePadding * 2, y: canvasHeight / 3 + 80 * scaleY };
    settings.headline.color = '#FFFFFF';
    settings.message.color = '#FFFFFF';
  }

  if (template === 'premium') {
    // Centered in panel
    settings.logo.position.x = (panelWidth / 2) - (settings.logo.size.width / 2);
    settings.logo.position.y = canvasHeight / 2 - 150 * scaleY;
    settings.headline.position.x = panelWidth / 2;
    settings.headline.position.y = canvasHeight / 2 - 50 * scaleY;
    settings.message.position.x = panelWidth / 2;
    settings.message.position.y = canvasHeight / 2 + 30 * scaleY;
  }

  return settings;
}
