/**
 * Demo Email Sender
 *
 * Sends demo postcard emails using Resend.
 *
 * Phase 9.2.15 - Interactive Demo System
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendDemoEmailOptions {
  to: string;
  name: string;
  postcardHTML: string;
  demo_code: string;
  demo_url: string;
}

/**
 * Send demo postcard email
 */
export async function sendDemoEmail(options: SendDemoEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[sendDemoEmail] RESEND_API_KEY not configured - skipping email');
      return { success: false, error: 'Email service not configured' };
    }

    const { data, error } = await resend.emails.send({
      from: 'DropLab Demo <demo@updates.droplab.app>',
      to: options.to,
      subject: `Your DropLab Demo Postcard Has Arrived! 📬`,
      html: generateEmailHTML(options),
    });

    if (error) {
      console.error('[sendDemoEmail] Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log('[sendDemoEmail] Email sent successfully:', data);
    return { success: true };
  } catch (error) {
    console.error('[sendDemoEmail] Exception:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Generate email HTML with postcard embedded
 */
function generateEmailHTML(options: SendDemoEmailOptions): string {
  const { name, postcardHTML, demo_url } = options;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background-color: #f8f9fa;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .header h1 {
      color: #1e293b;
      font-size: 28px;
      margin: 0 0 12px 0;
    }
    .header p {
      color: #64748b;
      font-size: 16px;
      margin: 0;
    }
    .postcard-container {
      margin: 32px 0;
    }
    .cta-section {
      text-align: center;
      margin: 32px 0;
    }
    .cta-button {
      display: inline-block;
      padding: 16px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
    }
    .instructions {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin: 32px 0;
      border-left: 4px solid #667eea;
    }
    .instructions h2 {
      color: #1e293b;
      font-size: 18px;
      margin: 0 0 16px 0;
    }
    .instructions ol {
      color: #475569;
      margin: 0;
      padding-left: 20px;
    }
    .instructions li {
      margin-bottom: 8px;
    }
    .footer {
      text-align: center;
      color: #94a3b8;
      font-size: 14px;
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Hey ${escapeHtml(name)}! 👋</h1>
      <p>Your demo postcard just landed in your inbox</p>
    </div>

    <div class="postcard-container">
      ${postcardHTML}
    </div>

    <div class="cta-section">
      <a href="${demo_url}" class="cta-button">
        View Your Demo Landing Page →
      </a>
    </div>

    <div class="instructions">
      <h2>What happens next?</h2>
      <ol>
        <li><strong>Click the button above</strong> or scan the QR code with your phone</li>
        <li><strong>Experience the demo landing page</strong> - see how we track every interaction</li>
        <li><strong>Check the analytics</strong> - view real-time attribution data</li>
        <li><strong>Create your first campaign</strong> - start tracking offline marketing</li>
      </ol>
    </div>

    <div class="footer">
      <p>
        This is a simulation of what your customers will receive.<br>
        Real postcards arrive in mailboxes within 3 business days.
      </p>
      <p style="margin-top: 16px;">
        <a href="${demo_url}">View in browser</a> |
        <a href="https://droplab.app">About DropLab</a>
      </p>
      <p style="margin-top: 16px;">
        © 2025 DropLab. All rights reserved.
      </p>
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
