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
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: #ffffff;
      padding: 0;
      margin: 0;
    }
    .postcard {
      width: 1200px;
      height: 800px;
      margin: 0 auto;
      background: #ffffff;
      position: relative;
      overflow: hidden;
    }

    /* Background gradient pattern */
    .postcard::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%);
      z-index: 0;
    }

    /* Decorative circles */
    .postcard::after {
      content: '';
      position: absolute;
      top: -200px;
      right: -200px;
      width: 600px;
      height: 600px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%);
      z-index: 1;
    }

    .content {
      position: relative;
      z-index: 2;
      height: 100%;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
    }

    /* Left side - Message */
    .left-panel {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      padding: 80px 60px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      color: white;
    }

    .logo-section {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 60px;
    }

    .logo-icon {
      width: 56px;
      height: 56px;
      background: white;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      color: #6366f1;
      font-size: 28px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .logo-text {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }

    .message-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .greeting {
      font-size: 48px;
      font-weight: 800;
      margin-bottom: 24px;
      line-height: 1.2;
    }

    .headline {
      font-size: 36px;
      font-weight: 700;
      line-height: 1.3;
      margin-bottom: 20px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .subline {
      font-size: 20px;
      line-height: 1.5;
      opacity: 0.95;
      font-weight: 400;
    }

    .cta-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.25);
      backdrop-filter: blur(10px);
      padding: 12px 24px;
      border-radius: 100px;
      font-size: 16px;
      font-weight: 600;
      margin-top: 32px;
      border: 2px solid rgba(255, 255, 255, 0.3);
    }

    .arrow {
      font-size: 20px;
    }

    /* Right side - QR Code */
    .right-panel {
      padding: 80px 60px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: white;
      position: relative;
    }

    .demo-badge {
      position: absolute;
      top: 40px;
      right: 40px;
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
      color: #78350f;
      padding: 12px 24px;
      border-radius: 100px;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
    }

    .qr-wrapper {
      text-align: center;
    }

    .qr-container {
      background: white;
      padding: 32px;
      border-radius: 24px;
      box-shadow: 0 20px 60px rgba(99, 102, 241, 0.15);
      border: 4px solid #e0e7ff;
      margin-bottom: 32px;
      display: inline-block;
    }

    .qr-container img {
      display: block;
      width: 280px;
      height: 280px;
    }

    .qr-instructions {
      text-align: center;
      color: #475569;
    }

    .qr-title {
      font-size: 24px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 12px;
    }

    .qr-subtitle {
      font-size: 18px;
      color: #64748b;
      line-height: 1.5;
    }

    .tracking-code {
      position: absolute;
      bottom: 40px;
      right: 40px;
      font-size: 12px;
      color: #94a3b8;
      letter-spacing: 2px;
      font-weight: 600;
    }

    /* Feature badges at bottom */
    .feature-badges {
      margin-top: 40px;
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .feature-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      padding: 8px 16px;
      border-radius: 100px;
      font-size: 14px;
      font-weight: 500;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    .check-icon {
      width: 16px;
      height: 16px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #10b981;
      font-weight: 700;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="postcard">
    <div class="content">
      <!-- Left Panel - Message -->
      <div class="left-panel">
        <div class="logo-section">
          <div class="logo-icon">D</div>
          <div class="logo-text">DropLab</div>
        </div>

        <div class="message-section">
          <div class="greeting">Hey ${escapeHtml(name)}! 👋</div>
          <div class="headline">
            Offline Marketing.<br>
            Online Attribution.
          </div>
          <div class="subline">
            This postcard is being tracked in real-time. Every scan, click, and conversion is measured with pixel-perfect accuracy.
          </div>

          <div class="cta-badge">
            Scan to see your personal demo <span class="arrow">→</span>
          </div>
        </div>

        <div class="feature-badges">
          <div class="feature-badge">
            <div class="check-icon">✓</div>
            <span>Real-Time Tracking</span>
          </div>
          <div class="feature-badge">
            <div class="check-icon">✓</div>
            <span>Full Attribution</span>
          </div>
          <div class="feature-badge">
            <div class="check-icon">✓</div>
            <span>Conversion Data</span>
          </div>
        </div>
      </div>

      <!-- Right Panel - QR Code -->
      <div class="right-panel">
        <div class="demo-badge">DEMO</div>

        <div class="qr-wrapper">
          <div class="qr-container">
            <img src="${qrCodeDataURL}" alt="Scan QR Code" />
          </div>

          <div class="qr-instructions">
            <div class="qr-title">Your Personalized Demo</div>
            <div class="qr-subtitle">
              Scan with your phone camera<br>
              to experience the platform
            </div>
          </div>
        </div>

        <div class="tracking-code">
          ${demo_code.toUpperCase()}
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
