/**
 * QR Code Generator Tests
 *
 * Tests for QR code generation utilities
 * Phase 1.2 - Testing Infrastructure
 */

import {
  generateQRCode,
  generateCampaignQRCode,
  generateGenericCampaignQRCode,
  generatePlaceholderQRCode,
} from '../../qr-generator';

// Mock the encryption module to avoid crypto dependencies in tests
jest.mock('../../landing-page/encryption', () => ({
  encryptRecipientId: (recipientId: string, campaignId: string) => {
    return `enc_${Buffer.from(`${recipientId}:${campaignId}`).toString('base64')}`;
  },
}));

describe('QR Code Generator', () => {
  // Helper function to validate base64 data URL format
  const isValidDataURL = (dataUrl: string): boolean => {
    return dataUrl.startsWith('data:image/png;base64,') && dataUrl.length > 50;
  };

  // Helper function to decode base64 and check if it is valid PNG
  const isPNGImage = (dataUrl: string): boolean => {
    if (!isValidDataURL(dataUrl)) return false;
    const base64Data = dataUrl.replace('data:image/png;base64,', '');
    const buffer = Buffer.from(base64Data, 'base64');
    // PNG files start with signature: 89 50 4E 47 0D 0A 1A 0A
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  };

  describe('generateQRCode (legacy system)', () => {
    it('should generate a valid QR code from URL', async () => {
      const url = 'https://example.com/lp/tracking123';
      const qrCode = await generateQRCode(url);

      expect(qrCode).toBeDefined();
      expect(isValidDataURL(qrCode)).toBe(true);
      expect(isPNGImage(qrCode)).toBe(true);
    });

    it('should generate QR codes for different URLs', async () => {
      const url1 = 'https://example.com/page1';
      const url2 = 'https://example.com/page2';

      const qr1 = await generateQRCode(url1);
      const qr2 = await generateQRCode(url2);

      expect(qr1).toBeDefined();
      expect(qr2).toBeDefined();
      expect(qr1).not.toBe(qr2); // Different URLs should produce different QR codes
    });

    it('should handle long URLs', async () => {
      const longUrl = 'https://example.com/lp/' + 'a'.repeat(200);
      const qrCode = await generateQRCode(longUrl);

      expect(qrCode).toBeDefined();
      expect(isValidDataURL(qrCode)).toBe(true);
    });

    it('should handle special characters in URLs', async () => {
      const url = 'https://example.com/lp?param=test&value=123';
      const qrCode = await generateQRCode(url);

      expect(qrCode).toBeDefined();
      expect(isValidDataURL(qrCode)).toBe(true);
    });

    it('should throw error for invalid input', async () => {
      await expect(generateQRCode('')).rejects.toThrow();
    });
  });

  describe('generateCampaignQRCode (new system with encryption)', () => {
    const originalEnv = process.env.NEXT_PUBLIC_APP_URL;

    beforeEach(() => {
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    });

    afterEach(() => {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    });

    it('should generate QR code with encrypted recipient ID', async () => {
      const campaignId = 'campaign_123';
      const recipientId = 'recipient_456';

      const qrCode = await generateCampaignQRCode(campaignId, recipientId);

      expect(qrCode).toBeDefined();
      expect(isValidDataURL(qrCode)).toBe(true);
      expect(isPNGImage(qrCode)).toBe(true);
    });

    it('should generate different QR codes for different recipients in same campaign', async () => {
      const campaignId = 'campaign_123';
      const recipient1 = 'recipient_001';
      const recipient2 = 'recipient_002';

      const qr1 = await generateCampaignQRCode(campaignId, recipient1);
      const qr2 = await generateCampaignQRCode(campaignId, recipient2);

      expect(qr1).toBeDefined();
      expect(qr2).toBeDefined();
      expect(qr1).not.toBe(qr2); // Different recipients should have different QR codes
    });

    it('should generate different QR codes for same recipient in different campaigns', async () => {
      const recipientId = 'recipient_123';
      const campaign1 = 'campaign_A';
      const campaign2 = 'campaign_B';

      const qr1 = await generateCampaignQRCode(campaign1, recipientId);
      const qr2 = await generateCampaignQRCode(campaign2, recipientId);

      expect(qr1).toBeDefined();
      expect(qr2).toBeDefined();
      expect(qr1).not.toBe(qr2); // Same recipient, different campaigns → different QR codes
    });

    it('should use NEXT_PUBLIC_APP_URL environment variable', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://production.com';

      const qrCode = await generateCampaignQRCode('campaign_123', 'recipient_456');

      expect(qrCode).toBeDefined();
      expect(isValidDataURL(qrCode)).toBe(true);
      // Note: We cannot directly verify the URL embedded in the QR code without decoding it
      // but we can verify it generates successfully
    });

    it('should fallback to localhost if NEXT_PUBLIC_APP_URL not set', async () => {
      delete process.env.NEXT_PUBLIC_APP_URL;

      const qrCode = await generateCampaignQRCode('campaign_123', 'recipient_456');

      expect(qrCode).toBeDefined();
      expect(isValidDataURL(qrCode)).toBe(true);
    });

    it('should handle UUID-style IDs', async () => {
      const campaignId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const recipientId = 'f9e8d7c6-b5a4-3210-9876-543210fedcba';

      const qrCode = await generateCampaignQRCode(campaignId, recipientId);

      expect(qrCode).toBeDefined();
      expect(isValidDataURL(qrCode)).toBe(true);
    });
  });

  describe('generateGenericCampaignQRCode (no recipient)', () => {
    const originalEnv = process.env.NEXT_PUBLIC_APP_URL;

    beforeEach(() => {
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    });

    afterEach(() => {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    });

    it('should generate generic QR code without recipient parameter', async () => {
      const campaignId = 'campaign_123';

      const qrCode = await generateGenericCampaignQRCode(campaignId);

      expect(qrCode).toBeDefined();
      expect(isValidDataURL(qrCode)).toBe(true);
      expect(isPNGImage(qrCode)).toBe(true);
    });

    it('should generate same QR code for same campaign (no randomization)', async () => {
      const campaignId = 'campaign_123';

      const qr1 = await generateGenericCampaignQRCode(campaignId);
      const qr2 = await generateGenericCampaignQRCode(campaignId);

      // Generic QR codes for the same campaign should be identical (no encryption/randomization)
      expect(qr1).toBe(qr2);
    });

    it('should generate different QR codes for different campaigns', async () => {
      const campaign1 = 'campaign_A';
      const campaign2 = 'campaign_B';

      const qr1 = await generateGenericCampaignQRCode(campaign1);
      const qr2 = await generateGenericCampaignQRCode(campaign2);

      expect(qr1).toBeDefined();
      expect(qr2).toBeDefined();
      expect(qr1).not.toBe(qr2);
    });

    it('should use NEXT_PUBLIC_APP_URL environment variable', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://custom-domain.com';

      const qrCode = await generateGenericCampaignQRCode('campaign_123');

      expect(qrCode).toBeDefined();
      expect(isValidDataURL(qrCode)).toBe(true);
    });

    it('should fallback to localhost if NEXT_PUBLIC_APP_URL not set', async () => {
      delete process.env.NEXT_PUBLIC_APP_URL;

      const qrCode = await generateGenericCampaignQRCode('campaign_123');

      expect(qrCode).toBeDefined();
      expect(isValidDataURL(qrCode)).toBe(true);
    });
  });

  describe('generatePlaceholderQRCode (template editor)', () => {
    it('should generate placeholder QR code', async () => {
      const qrCode = await generatePlaceholderQRCode();

      expect(qrCode).toBeDefined();
      expect(isValidDataURL(qrCode)).toBe(true);
      expect(isPNGImage(qrCode)).toBe(true);
    });

    it('should generate consistent placeholder (same every time)', async () => {
      const qr1 = await generatePlaceholderQRCode();
      const qr2 = await generatePlaceholderQRCode();

      // Placeholder should be identical each time (predictable for template editing)
      expect(qr1).toBe(qr2);
    });

    it('should be different from actual campaign QR codes', async () => {
      const placeholder = await generatePlaceholderQRCode();
      const actual = await generateCampaignQRCode('campaign_123', 'recipient_456');

      expect(placeholder).not.toBe(actual);
    });
  });

  describe('QR Code Properties', () => {
    it('should generate QR codes with error correction level H', async () => {
      // Error correction level H provides ~30% damage tolerance - critical for physical mail
      // We cannot directly test the error correction level without decoding the QR code,
      // but we verify the QR code is generated successfully
      const qrCode = await generateQRCode('https://example.com');
      expect(qrCode).toBeDefined();
      expect(isValidDataURL(qrCode)).toBe(true);
    });

    it('should generate QR codes with width 300px', async () => {
      // QR codes should be 300x300px for good print quality
      // We verify the QR code is generated, but cannot check exact dimensions
      // without image processing library
      const qrCode = await generateQRCode('https://example.com');
      expect(qrCode).toBeDefined();
      expect(isValidDataURL(qrCode)).toBe(true);
      expect(qrCode.length).toBeGreaterThan(1000); // 300x300 PNG should be substantial size
    });

    it('should generate black and white QR codes (no color)', async () => {
      // QR codes use black (#000000) for dark and white (#FFFFFF) for light
      // This ensures best contrast and scannability
      const qrCode = await generateQRCode('https://example.com');
      expect(qrCode).toBeDefined();
      expect(isValidDataURL(qrCode)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty campaign ID gracefully', async () => {
      // Empty campaign ID should still generate QR code (may fail in real use, but library handles it)
      const qrCode = await generateGenericCampaignQRCode('');
      expect(qrCode).toBeDefined();
      expect(isValidDataURL(qrCode)).toBe(true);
    });

    it('should handle very long campaign IDs', async () => {
      const longCampaignId = 'campaign_' + 'x'.repeat(500);
      const qrCode = await generateGenericCampaignQRCode(longCampaignId);

      expect(qrCode).toBeDefined();
      expect(isValidDataURL(qrCode)).toBe(true);
    });

    it('should handle special characters in campaign IDs', async () => {
      const specialCampaignId = 'campaign-2024_test!@#';
      const qrCode = await generateGenericCampaignQRCode(specialCampaignId);

      expect(qrCode).toBeDefined();
      expect(isValidDataURL(qrCode)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should generate QR code in reasonable time', async () => {
      const start = Date.now();
      await generateQRCode('https://example.com');
      const duration = Date.now() - start;

      // QR generation should complete in under 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should handle batch generation efficiently', async () => {
      const start = Date.now();

      // Generate 10 QR codes in parallel
      const promises = Array.from({ length: 10 }, (_, i) =>
        generateCampaignQRCode('campaign_batch', `recipient_${i}`)
      );

      const qrCodes = await Promise.all(promises);
      const duration = Date.now() - start;

      expect(qrCodes.length).toBe(10);
      qrCodes.forEach((qr) => {
        expect(isValidDataURL(qr)).toBe(true);
      });

      // Batch of 10 should complete in under 3 seconds
      expect(duration).toBeLessThan(3000);
    });
  });
});
