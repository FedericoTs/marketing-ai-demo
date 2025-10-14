import { nanoid } from "nanoid";
import { getDatabase } from "./connection";

// ==================== TYPES ====================

export interface Campaign {
  id: string;
  name: string;
  message: string;
  company_name: string;
  created_at: string;
  status: "active" | "paused" | "completed";
}

export interface Recipient {
  id: string;
  campaign_id: string;
  tracking_id: string;
  name: string;
  lastname: string;
  address?: string;
  city?: string;
  zip?: string;
  email?: string;
  phone?: string;
  created_at: string;
}

export interface Event {
  id: string;
  tracking_id: string;
  event_type: "page_view" | "qr_scan" | "button_click" | "form_view" | "external_link";
  event_data?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface Conversion {
  id: string;
  tracking_id: string;
  conversion_type: "form_submission" | "appointment_booked" | "call_initiated" | "download";
  conversion_data?: string;
  created_at: string;
}

// ==================== CAMPAIGNS ====================

/**
 * Create a new campaign
 */
export function createCampaign(data: {
  name: string;
  message: string;
  companyName: string;
}): Campaign {
  const db = getDatabase();
  const id = nanoid(16);
  const created_at = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO campaigns (id, name, message, company_name, created_at, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `);

  stmt.run(id, data.name, data.message, data.companyName, created_at);

  return {
    id,
    name: data.name,
    message: data.message,
    company_name: data.companyName,
    created_at,
    status: "active",
  };
}

/**
 * Get campaign by ID
 */
export function getCampaignById(id: string): Campaign | null {
  const db = getDatabase();
  const stmt = db.prepare("SELECT * FROM campaigns WHERE id = ?");
  return stmt.get(id) as Campaign | null;
}

/**
 * Get all campaigns
 */
export function getAllCampaigns(): Campaign[] {
  const db = getDatabase();
  const stmt = db.prepare("SELECT * FROM campaigns ORDER BY created_at DESC");
  return stmt.all() as Campaign[];
}

/**
 * Update campaign status
 */
export function updateCampaignStatus(
  id: string,
  status: "active" | "paused" | "completed"
): boolean {
  const db = getDatabase();
  const stmt = db.prepare("UPDATE campaigns SET status = ? WHERE id = ?");
  const result = stmt.run(status, id);
  return result.changes > 0;
}

// ==================== RECIPIENTS ====================

/**
 * Create a new recipient with tracking ID
 */
export function createRecipient(data: {
  campaignId: string;
  name: string;
  lastname: string;
  address?: string;
  city?: string;
  zip?: string;
  email?: string;
  phone?: string;
}): Recipient {
  const db = getDatabase();
  const id = nanoid(16);
  const tracking_id = nanoid(12);
  const created_at = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO recipients (
      id, campaign_id, tracking_id, name, lastname,
      address, city, zip, email, phone, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.campaignId,
    tracking_id,
    data.name,
    data.lastname,
    data.address || null,
    data.city || null,
    data.zip || null,
    data.email || null,
    data.phone || null,
    created_at
  );

  return {
    id,
    campaign_id: data.campaignId,
    tracking_id,
    name: data.name,
    lastname: data.lastname,
    address: data.address,
    city: data.city,
    zip: data.zip,
    email: data.email,
    phone: data.phone,
    created_at,
  };
}

/**
 * Get recipient by tracking ID
 */
export function getRecipientByTrackingId(trackingId: string): Recipient | null {
  const db = getDatabase();
  const stmt = db.prepare("SELECT * FROM recipients WHERE tracking_id = ?");
  return stmt.get(trackingId) as Recipient | null;
}

/**
 * Get all recipients for a campaign
 */
export function getRecipientsByCampaign(campaignId: string): Recipient[] {
  const db = getDatabase();
  const stmt = db.prepare(
    "SELECT * FROM recipients WHERE campaign_id = ? ORDER BY created_at DESC"
  );
  return stmt.all(campaignId) as Recipient[];
}

// ==================== EVENTS ====================

/**
 * Track an event
 */
export function trackEvent(data: {
  trackingId: string;
  eventType: Event["event_type"];
  eventData?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Event {
  const db = getDatabase();
  const id = nanoid(16);
  const created_at = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO events (id, tracking_id, event_type, event_data, ip_address, user_agent, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const eventDataJson = data.eventData ? JSON.stringify(data.eventData) : null;

  stmt.run(
    id,
    data.trackingId,
    data.eventType,
    eventDataJson,
    data.ipAddress || null,
    data.userAgent || null,
    created_at
  );

  return {
    id,
    tracking_id: data.trackingId,
    event_type: data.eventType,
    event_data: eventDataJson || undefined,
    ip_address: data.ipAddress,
    user_agent: data.userAgent,
    created_at,
  };
}

/**
 * Get all events for a tracking ID
 */
export function getEventsByTrackingId(trackingId: string): Event[] {
  const db = getDatabase();
  const stmt = db.prepare(
    "SELECT * FROM events WHERE tracking_id = ? ORDER BY created_at DESC"
  );
  return stmt.all(trackingId) as Event[];
}

/**
 * Get event count by type for a tracking ID
 */
export function getEventCountByType(
  trackingId: string,
  eventType: Event["event_type"]
): number {
  const db = getDatabase();
  const stmt = db.prepare(
    "SELECT COUNT(*) as count FROM events WHERE tracking_id = ? AND event_type = ?"
  );
  const result = stmt.get(trackingId, eventType) as { count: number };
  return result.count;
}

// ==================== CONVERSIONS ====================

/**
 * Track a conversion
 */
export function trackConversion(data: {
  trackingId: string;
  conversionType: Conversion["conversion_type"];
  conversionData?: Record<string, unknown>;
}): Conversion {
  const db = getDatabase();
  const id = nanoid(16);
  const created_at = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO conversions (id, tracking_id, conversion_type, conversion_data, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const conversionDataJson = data.conversionData
    ? JSON.stringify(data.conversionData)
    : null;

  stmt.run(
    id,
    data.trackingId,
    data.conversionType,
    conversionDataJson,
    created_at
  );

  return {
    id,
    tracking_id: data.trackingId,
    conversion_type: data.conversionType,
    conversion_data: conversionDataJson || undefined,
    created_at,
  };
}

/**
 * Get all conversions for a tracking ID
 */
export function getConversionsByTrackingId(trackingId: string): Conversion[] {
  const db = getDatabase();
  const stmt = db.prepare(
    "SELECT * FROM conversions WHERE tracking_id = ? ORDER BY created_at DESC"
  );
  return stmt.all(trackingId) as Conversion[];
}

/**
 * Check if tracking ID has converted
 */
export function hasConverted(trackingId: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare(
    "SELECT COUNT(*) as count FROM conversions WHERE tracking_id = ?"
  );
  const result = stmt.get(trackingId) as { count: number };
  return result.count > 0;
}

// ==================== ANALYTICS ====================

/**
 * Get campaign analytics
 */
export interface CampaignAnalytics {
  campaign: Campaign;
  totalRecipients: number;
  totalPageViews: number;
  uniqueVisitors: number;
  totalConversions: number;
  conversionRate: number;
}

export function getCampaignAnalytics(campaignId: string): CampaignAnalytics | null {
  const db = getDatabase();
  const campaign = getCampaignById(campaignId);

  if (!campaign) return null;

  // Total recipients
  const recipientsStmt = db.prepare(
    "SELECT COUNT(*) as count FROM recipients WHERE campaign_id = ?"
  );
  const { count: totalRecipients } = recipientsStmt.get(campaignId) as { count: number };

  // Total page views
  const pageViewsStmt = db.prepare(`
    SELECT COUNT(*) as count FROM events
    WHERE tracking_id IN (
      SELECT tracking_id FROM recipients WHERE campaign_id = ?
    ) AND event_type = 'page_view'
  `);
  const { count: totalPageViews } = pageViewsStmt.get(campaignId) as { count: number };

  // Unique visitors (distinct tracking_ids with page_view events)
  const uniqueVisitorsStmt = db.prepare(`
    SELECT COUNT(DISTINCT tracking_id) as count FROM events
    WHERE tracking_id IN (
      SELECT tracking_id FROM recipients WHERE campaign_id = ?
    ) AND event_type = 'page_view'
  `);
  const { count: uniqueVisitors } = uniqueVisitorsStmt.get(campaignId) as { count: number };

  // Total conversions
  const conversionsStmt = db.prepare(`
    SELECT COUNT(*) as count FROM conversions
    WHERE tracking_id IN (
      SELECT tracking_id FROM recipients WHERE campaign_id = ?
    )
  `);
  const { count: totalConversions } = conversionsStmt.get(campaignId) as { count: number };

  // Conversion rate
  const conversionRate = totalRecipients > 0
    ? (totalConversions / totalRecipients) * 100
    : 0;

  return {
    campaign,
    totalRecipients,
    totalPageViews,
    uniqueVisitors,
    totalConversions,
    conversionRate: Math.round(conversionRate * 100) / 100, // Round to 2 decimals
  };
}

/**
 * Get recipient journey (all events and conversions)
 */
export interface RecipientJourney {
  recipient: Recipient;
  events: Event[];
  conversions: Conversion[];
  pageViews: number;
  hasConverted: boolean;
}

export function getRecipientJourney(trackingId: string): RecipientJourney | null {
  const recipient = getRecipientByTrackingId(trackingId);

  if (!recipient) return null;

  const events = getEventsByTrackingId(trackingId);
  const conversions = getConversionsByTrackingId(trackingId);
  const pageViews = getEventCountByType(trackingId, "page_view");

  return {
    recipient,
    events,
    conversions,
    pageViews,
    hasConverted: conversions.length > 0,
  };
}

// ==================== BRAND PROFILES (Phase 2: Brand Intelligence) ====================

export interface BrandProfile {
  id: string;
  company_name: string;
  brand_voice?: string;
  tone?: string;
  key_phrases?: string; // JSON string of array
  brand_values?: string; // JSON string of array
  target_audience?: string;
  industry?: string;
  extracted_at: string;
  source_content?: string;
  is_active: number; // 1 or 0 (boolean in SQLite)
}

/**
 * Create or update brand profile
 */
export function saveBrandProfile(data: {
  companyName: string;
  brandVoice?: string;
  tone?: string;
  keyPhrases?: string[];
  values?: string[];
  targetAudience?: string;
  industry?: string;
  sourceContent?: string;
}): BrandProfile {
  const db = getDatabase();

  // Check if profile exists
  const existing = db.prepare(
    "SELECT * FROM brand_profiles WHERE company_name = ? AND is_active = 1"
  ).get(data.companyName) as BrandProfile | undefined;

  if (existing) {
    // Update existing profile
    const stmt = db.prepare(`
      UPDATE brand_profiles
      SET brand_voice = ?, tone = ?, key_phrases = ?, brand_values = ?,
          target_audience = ?, industry = ?, extracted_at = ?, source_content = ?
      WHERE id = ?
    `);

    stmt.run(
      data.brandVoice || null,
      data.tone || null,
      data.keyPhrases ? JSON.stringify(data.keyPhrases) : null,
      data.values ? JSON.stringify(data.values) : null,
      data.targetAudience || null,
      data.industry || null,
      new Date().toISOString(),
      data.sourceContent || null,
      existing.id
    );

    return {
      ...existing,
      brand_voice: data.brandVoice,
      tone: data.tone,
      key_phrases: data.keyPhrases ? JSON.stringify(data.keyPhrases) : undefined,
      brand_values: data.values ? JSON.stringify(data.values) : undefined,
      target_audience: data.targetAudience,
      industry: data.industry,
      extracted_at: new Date().toISOString(),
      source_content: data.sourceContent,
    };
  } else {
    // Create new profile
    const id = nanoid(16);
    const extracted_at = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO brand_profiles (
        id, company_name, brand_voice, tone, key_phrases, brand_values,
        target_audience, industry, extracted_at, source_content, is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    stmt.run(
      id,
      data.companyName,
      data.brandVoice || null,
      data.tone || null,
      data.keyPhrases ? JSON.stringify(data.keyPhrases) : null,
      data.values ? JSON.stringify(data.values) : null,
      data.targetAudience || null,
      data.industry || null,
      extracted_at,
      data.sourceContent || null
    );

    return {
      id,
      company_name: data.companyName,
      brand_voice: data.brandVoice,
      tone: data.tone,
      key_phrases: data.keyPhrases ? JSON.stringify(data.keyPhrases) : undefined,
      brand_values: data.values ? JSON.stringify(data.values) : undefined,
      target_audience: data.targetAudience,
      industry: data.industry,
      extracted_at,
      source_content: data.sourceContent,
      is_active: 1,
    };
  }
}

/**
 * Get active brand profile by company name
 */
export function getBrandProfile(companyName: string): BrandProfile | null {
  const db = getDatabase();
  const stmt = db.prepare(
    "SELECT * FROM brand_profiles WHERE company_name = ? AND is_active = 1"
  );
  return stmt.get(companyName) as BrandProfile | null;
}

/**
 * Get all brand profiles
 */
export function getAllBrandProfiles(): BrandProfile[] {
  const db = getDatabase();
  const stmt = db.prepare(
    "SELECT * FROM brand_profiles WHERE is_active = 1 ORDER BY extracted_at DESC"
  );
  return stmt.all() as BrandProfile[];
}

/**
 * Deactivate brand profile
 */
export function deactivateBrandProfile(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare("UPDATE brand_profiles SET is_active = 0 WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}

// ==================== ANALYTICS DASHBOARD ====================

/**
 * Get overall dashboard statistics
 */
export interface DashboardStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalRecipients: number;
  totalPageViews: number;
  totalConversions: number;
  overallConversionRate: number;
  qrScans: number;
  formSubmissions: number;
}

export function getDashboardStats(): DashboardStats {
  const db = getDatabase();

  // Total campaigns
  const totalCampaignsStmt = db.prepare("SELECT COUNT(*) as count FROM campaigns");
  const { count: totalCampaigns } = totalCampaignsStmt.get() as { count: number };

  // Active campaigns
  const activeCampaignsStmt = db.prepare(
    "SELECT COUNT(*) as count FROM campaigns WHERE status = 'active'"
  );
  const { count: activeCampaigns } = activeCampaignsStmt.get() as { count: number };

  // Total recipients
  const totalRecipientsStmt = db.prepare("SELECT COUNT(*) as count FROM recipients");
  const { count: totalRecipients } = totalRecipientsStmt.get() as { count: number };

  // Total page views
  const pageViewsStmt = db.prepare(
    "SELECT COUNT(*) as count FROM events WHERE event_type = 'page_view'"
  );
  const { count: totalPageViews } = pageViewsStmt.get() as { count: number };

  // QR scans
  const qrScansStmt = db.prepare(
    "SELECT COUNT(*) as count FROM events WHERE event_type = 'qr_scan'"
  );
  const { count: qrScans } = qrScansStmt.get() as { count: number };

  // Total conversions
  const totalConversionsStmt = db.prepare("SELECT COUNT(*) as count FROM conversions");
  const { count: totalConversions } = totalConversionsStmt.get() as { count: number };

  // Form submissions
  const formSubmissionsStmt = db.prepare(
    "SELECT COUNT(*) as count FROM conversions WHERE conversion_type = 'form_submission'"
  );
  const { count: formSubmissions } = formSubmissionsStmt.get() as { count: number };

  // Overall conversion rate
  const overallConversionRate = totalRecipients > 0
    ? (totalConversions / totalRecipients) * 100
    : 0;

  return {
    totalCampaigns,
    activeCampaigns,
    totalRecipients,
    totalPageViews,
    totalConversions,
    overallConversionRate: Math.round(overallConversionRate * 100) / 100,
    qrScans,
    formSubmissions,
  };
}

/**
 * Get all campaigns with basic analytics
 */
export interface CampaignWithStats extends Campaign {
  totalRecipients: number;
  uniqueVisitors: number;
  totalConversions: number;
  conversionRate: number;
}

export function getAllCampaignsWithStats(): CampaignWithStats[] {
  const campaigns = getAllCampaigns();

  return campaigns.map((campaign) => {
    const analytics = getCampaignAnalytics(campaign.id);

    return {
      ...campaign,
      totalRecipients: analytics?.totalRecipients || 0,
      uniqueVisitors: analytics?.uniqueVisitors || 0,
      totalConversions: analytics?.totalConversions || 0,
      conversionRate: analytics?.conversionRate || 0,
    };
  });
}

/**
 * Get recent activity (events and conversions combined)
 */
export interface RecentActivity {
  id: string;
  type: "event" | "conversion";
  trackingId: string;
  recipientName: string;
  eventType?: Event["event_type"];
  conversionType?: Conversion["conversion_type"];
  campaignName: string;
  createdAt: string;
}

export function getRecentActivity(limit: number = 20): RecentActivity[] {
  const db = getDatabase();

  // Get recent events with recipient and campaign info
  const eventsStmt = db.prepare(`
    SELECT
      e.id,
      'event' as type,
      e.tracking_id as trackingId,
      r.name || ' ' || r.lastname as recipientName,
      e.event_type as eventType,
      NULL as conversionType,
      c.name as campaignName,
      e.created_at as createdAt
    FROM events e
    JOIN recipients r ON e.tracking_id = r.tracking_id
    JOIN campaigns c ON r.campaign_id = c.id
    ORDER BY e.created_at DESC
    LIMIT ?
  `);

  // Get recent conversions with recipient and campaign info
  const conversionsStmt = db.prepare(`
    SELECT
      cv.id,
      'conversion' as type,
      cv.tracking_id as trackingId,
      r.name || ' ' || r.lastname as recipientName,
      NULL as eventType,
      cv.conversion_type as conversionType,
      c.name as campaignName,
      cv.created_at as createdAt
    FROM conversions cv
    JOIN recipients r ON cv.tracking_id = r.tracking_id
    JOIN campaigns c ON r.campaign_id = c.id
    ORDER BY cv.created_at DESC
    LIMIT ?
  `);

  const events = eventsStmt.all(limit) as RecentActivity[];
  const conversions = conversionsStmt.all(limit) as RecentActivity[];

  // Combine and sort by date
  const combined = [...events, ...conversions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  return combined;
}
