import Database from 'better-sqlite3';
import path from 'path';
import { nanoid } from 'nanoid';

const dbPath = path.join(process.cwd(), 'marketing.db');

export interface CanvasSessionData {
  id: string;
  campaignId: string;
  backgroundImage: string;
  qrCodeDataUrl: string;
  trackingId: string;
  landingPageUrl: string;
  recipientName: string;
  recipientLastname: string;
  recipientAddress: string;
  recipientCity: string;
  recipientZip: string;
  message: string;
  companyName: string;
  campaignName?: string;
  logoUrl?: string;
  primaryColor?: string;
  textColor?: string;
  canvasWidth: number;
  canvasHeight: number;
  phoneNumber: string;
  dmTemplateId?: string; // NEW: Link to dm_template for loading saved designs
  createdAt?: string;
}

/**
 * Create a new canvas session in the database
 * Returns the session ID to use in the URL
 */
export function createCanvasSession(data: Omit<CanvasSessionData, 'id' | 'createdAt'>): string {
  const db = new Database(dbPath);
  const sessionId = nanoid();

  try {
    const stmt = db.prepare(`
      INSERT INTO canvas_sessions (
        id, campaign_id, background_image, qr_code_data_url, tracking_id,
        landing_page_url, recipient_name, recipient_lastname, recipient_address,
        recipient_city, recipient_zip, message, company_name, campaign_name,
        logo_url, primary_color, text_color, canvas_width, canvas_height, phone_number, dm_template_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      sessionId,
      data.campaignId,
      data.backgroundImage,
      data.qrCodeDataUrl,
      data.trackingId,
      data.landingPageUrl,
      data.recipientName,
      data.recipientLastname,
      data.recipientAddress,
      data.recipientCity,
      data.recipientZip,
      data.message,
      data.companyName,
      data.campaignName || null,
      data.logoUrl || null,
      data.primaryColor || null,
      data.textColor || null,
      data.canvasWidth,
      data.canvasHeight,
      data.phoneNumber,
      data.dmTemplateId || null
    );

    return sessionId;
  } finally {
    db.close();
  }
}

/**
 * Get canvas session data by ID
 */
export function getCanvasSession(sessionId: string): CanvasSessionData | null {
  const db = new Database(dbPath);

  try {
    const stmt = db.prepare(`
      SELECT * FROM canvas_sessions WHERE id = ?
    `);

    const row = stmt.get(sessionId) as any;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      campaignId: row.campaign_id,
      backgroundImage: row.background_image,
      qrCodeDataUrl: row.qr_code_data_url,
      trackingId: row.tracking_id,
      landingPageUrl: row.landing_page_url,
      recipientName: row.recipient_name,
      recipientLastname: row.recipient_lastname,
      recipientAddress: row.recipient_address,
      recipientCity: row.recipient_city,
      recipientZip: row.recipient_zip,
      message: row.message,
      companyName: row.company_name,
      campaignName: row.campaign_name,
      logoUrl: row.logo_url,
      primaryColor: row.primary_color,
      textColor: row.text_color,
      canvasWidth: row.canvas_width,
      canvasHeight: row.canvas_height,
      phoneNumber: row.phone_number,
      dmTemplateId: row.dm_template_id,
      createdAt: row.created_at,
    };
  } finally {
    db.close();
  }
}

/**
 * Delete old canvas sessions (cleanup)
 */
export function cleanupOldSessions(olderThanDays: number = 7): number {
  const db = new Database(dbPath);

  try {
    const stmt = db.prepare(`
      DELETE FROM canvas_sessions
      WHERE created_at < datetime('now', '-' || ? || ' days')
    `);

    const result = stmt.run(olderThanDays);
    return result.changes;
  } finally {
    db.close();
  }
}
