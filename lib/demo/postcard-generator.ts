/**
 * Demo Postcard Generator
 *
 * Generates personalized demo postcards with QR codes.
 * Returns HTML that can be embedded in emails or converted to images.
 *
 * Phase 9.2.15 - Interactive Demo System
 */

import { generateQRCode } from '@/lib/qr-generator';

export interface PostcardOptions {
  name: string;
  demo_code: string;
  qr_url: string;
}

/**
 * Generate demo postcard HTML
 * Returns HTML string that can be embedded in email or converted to image
 */
export async function generateDemoPostcardHTML(options: PostcardOptions): Promise<string> {
  const { name, demo_code, qr_url } = options;

  // Generate QR code as base64
  const qrCodeDataURL = await generateQRCode(qr_url);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: #f8f9fa;
      padding: 20px;
    }
    .postcard {
      width: 600px;
      height: 400px;
      margin: 0 auto;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      position: relative;
      overflow: hidden;
    }
    .postcard::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      animation: pulse 3s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
    .content {
      position: relative;
      z-index: 1;
      padding: 40px;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      color: white;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-icon {
      width: 40px;
      height: 40px;
      background: white;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-center;
      font-weight: bold;
      color: #667eea;
      font-size: 20px;
    }
    .logo-text {
      font-size: 24px;
      font-weight: bold;
    }
    .message {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .greeting {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 16px;
    }
    .headline {
      font-size: 20px;
      line-height: 1.4;
      opacity: 0.95;
      margin-bottom: 12px;
    }
    .subline {
      font-size: 16px;
      opacity: 0.8;
    }
    .qr-section {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
    }
    .qr-container {
      background: white;
      padding: 12px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    .qr-container img {
      display: block;
      width: 120px;
      height: 120px;
    }
    .qr-label {
      font-size: 12px;
      margin-top: 8px;
      text-align: center;
      opacity: 0.7;
    }
    .demo-code {
      font-size: 14px;
      opacity: 0.7;
      letter-spacing: 2px;
    }
  </style>
</head>
<body>
  <div class="postcard">
    <div class="content">
      <div class="logo">
        <div class="logo-icon">D</div>
        <div class="logo-text">DropLab</div>
      </div>

      <div class="message">
        <div class="greeting">Hey ${escapeHtml(name)}! 👋</div>
        <div class="headline">
          You just experienced DropLab's<br>
          <strong>attribution magic</strong>
        </div>
        <div class="subline">
          Scan the QR code to see your personalized demo landing page
        </div>
      </div>

      <div class="qr-section">
        <div class="demo-code">
          DEMO-${demo_code.toUpperCase()}
        </div>
        <div class="qr-container">
          <img src="${qrCodeDataURL}" alt="QR Code" />
          <div class="qr-label">Scan to continue</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
