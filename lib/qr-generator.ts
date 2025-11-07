import QRCode from "qrcode";
import { encryptRecipientId } from "./landing-page/encryption";

/**
 * OLD SYSTEM: Generate QR code from URL
 *
 * Used for recipient-based landing pages: /lp/{tracking_id}
 * Kept for backward compatibility with existing campaigns
 *
 * @param url - Full landing page URL
 * @returns Base64 data URL of QR code image
 */
export async function generateQRCode(url: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M",
    });

    return dataUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw new Error("Failed to generate QR code");
  }
}

/**
 * NEW SYSTEM: Generate campaign-based QR code with encrypted recipient ID
 *
 * Used for campaign-based landing pages: /lp/campaign/{campaignId}?r={encrypted_id}
 * One landing page per campaign with personalized access via QR code
 *
 * Benefits:
 * - Secure: Encrypted recipient IDs (no PII in URL)
 * - Scalable: One landing page serves entire campaign
 * - Flexible: Works without QR (direct campaign URL)
 * - Trackable: Attribution to specific recipients
 *
 * @param campaignId - Campaign ID
 * @param recipientId - Recipient ID to encrypt
 * @returns Base64 data URL of QR code image
 *
 * @example
 * const qrCode = await generateCampaignQRCode('campaign_123', 'recipient_456');
 * // Generates QR for: /lp/campaign/campaign_123?r=enc_xyz789...
 */
export async function generateCampaignQRCode(
  campaignId: string,
  recipientId: string
): Promise<string> {
  try {
    // Encrypt recipient ID for secure personalization
    const encryptedId = encryptRecipientId(recipientId, campaignId);

    // Build campaign landing page URL with encrypted recipient parameter
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const url = `${baseUrl}/lp/campaign/${campaignId}?r=${encryptedId}`;

    // Generate QR code
    const dataUrl = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M", // Medium error correction (handles ~15% damage)
    });

    return dataUrl;
  } catch (error) {
    console.error("Error generating campaign QR code:", error);
    throw new Error("Failed to generate campaign QR code");
  }
}

/**
 * Generate generic campaign QR code (no recipient personalization)
 *
 * For campaigns without specific recipients or for promotional materials
 * Users land on generic landing page with empty form
 *
 * @param campaignId - Campaign ID
 * @returns Base64 data URL of QR code image
 *
 * @example
 * const qrCode = await generateGenericCampaignQRCode('campaign_123');
 * // Generates QR for: /lp/campaign/campaign_123
 */
export async function generateGenericCampaignQRCode(campaignId: string): Promise<string> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const url = `${baseUrl}/lp/campaign/${campaignId}`;

    const dataUrl = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M",
    });

    return dataUrl;
  } catch (error) {
    console.error("Error generating generic campaign QR code:", error);
    throw new Error("Failed to generate generic campaign QR code");
  }
}

/**
 * Generate dummy/placeholder QR code for template editor
 *
 * Used in the canvas editor to show a placeholder QR code that will be
 * replaced with unique tracking QR codes during campaign generation.
 * The actual content doesn't matter - it's just a visual placeholder.
 *
 * @returns Base64 data URL of placeholder QR code image
 *
 * @example
 * const placeholderQR = await generatePlaceholderQRCode();
 * // Use in template editor as a visual guide for QR position/size
 */
export async function generatePlaceholderQRCode(): Promise<string> {
  try {
    // Generate placeholder with example URL
    const placeholderText = 'https://example.com/scan-here';

    const dataUrl = await QRCode.toDataURL(placeholderText, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M",
    });

    return dataUrl;
  } catch (error) {
    console.error("Error generating placeholder QR code:", error);
    throw new Error("Failed to generate placeholder QR code");
  }
}
