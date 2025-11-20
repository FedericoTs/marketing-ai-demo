import { nanoid } from "nanoid";
import { getDatabase } from "./connection";
import { dbLogger } from "./logger";
import { validateRequired, validateString, validateId, validateEnum } from "./validators";

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
  const operation = 'createCampaign';

  // Validate inputs
  validateString(data.name, 'name', operation, { minLength: 1, maxLength: 255 });
  validateString(data.message, 'message', operation, { minLength: 1 });
  validateString(data.companyName, 'companyName', operation, { minLength: 1, maxLength: 255 });

  const db = createServiceClient();
  const id = nanoid(16);
  const created_at = new Date().toISOString();

  dbLogger.info(operation, 'campaigns', id, { name: data.name });

  const stmt = db.prepare(`
    INSERT INTO campaigns (id, name, message, company_name, created_at, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `);

  try {
    stmt.run(id, data.name, data.message, data.companyName, created_at);
    dbLogger.debug(`${operation} completed`, { id, name: data.name });
  } catch (error) {
    dbLogger.error(operation, error as Error, { id, name: data.name });
    throw error;
  }

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
  const operation = 'getCampaignById';

  // Validate input
  validateId(id, 'id', operation);

  const db = createServiceClient();
  const stmt = db.prepare("SELECT * FROM campaigns WHERE id = ?");

  try {
    const campaign = stmt.get(id) as Campaign | null;
    if (campaign) {
      dbLogger.debug(`${operation} found`, { id, name: campaign.name });
    } else {
      dbLogger.debug(`${operation} not found`, { id });
    }
    return campaign;
  } catch (error) {
    dbLogger.error(operation, error as Error, { id });
    throw error;
  }
}

/**
 * Get all campaigns
 */
export function getAllCampaigns(): Campaign[] {
  const db = createServiceClient();
  const stmt = db.prepare("SELECT * FROM campaigns ORDER BY created_at DESC");
  return stmt.all() as Campaign[];
}

/**
 * Update campaign details
 * Part of Improvement #5: Contextual Quick Actions
 */
export function updateCampaign(
  id: string,
  updates: {
    name?: string;
    message?: string;
    status?: Campaign['status'];
  }
): Campaign | null {
  const db = createServiceClient();

  const updateFields: string[] = [];
  const params: any[] = [];

  if (updates.name !== undefined) {
    updateFields.push('name = ?');
    params.push(updates.name);
  }

  if (updates.message !== undefined) {
    updateFields.push('message = ?');
    params.push(updates.message);
  }

  if (updates.status !== undefined) {
    updateFields.push('status = ?');
    params.push(updates.status);
  }

  if (updateFields.length === 0) {
    // No updates provided, return current campaign
    return getCampaignById(id);
  }

  params.push(id);

  const result = db.prepare(`
    UPDATE campaigns
    SET ${updateFields.join(', ')}
    WHERE id = ?
  `).run(...params);

  if (result.changes === 0) {
    return null;
  }

  return getCampaignById(id);
}

/**
 * Update campaign status
 */
export function updateCampaignStatus(
  id: string,
  status: "active" | "paused" | "completed"
): boolean {
  const db = createServiceClient();
  const stmt = db.prepare("UPDATE campaigns SET status = ? WHERE id = ?");
  const result = stmt.run(status, id);
  return result.changes > 0;
}

/**
 * Delete campaign and all associated data
 */
export function deleteCampaign(id: string): boolean {
  const db = createServiceClient();

  try {
    // Delete in correct order to maintain referential integrity
    // 1. Delete conversions for this campaign's recipients
    db.prepare(`
      DELETE FROM conversions
      WHERE tracking_id IN (
        SELECT tracking_id FROM recipients WHERE campaign_id = ?
      )
    `).run(id);

    // 2. Delete events for this campaign's recipients
    db.prepare(`
      DELETE FROM events
      WHERE tracking_id IN (
        SELECT tracking_id FROM recipients WHERE campaign_id = ?
      )
    `).run(id);

    // 3. Delete recipients
    db.prepare("DELETE FROM recipients WHERE campaign_id = ?").run(id);

    // 4. Delete campaign
    const result = db.prepare("DELETE FROM campaigns WHERE id = ?").run(id);

    return result.changes > 0;
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return false;
  }
}

/**
 * Duplicate campaign (creates a copy with new ID)
 */
export function duplicateCampaign(id: string): Campaign | null {
  const db = createServiceClient();
  const original = getCampaignById(id);

  if (!original) return null;

  const newId = nanoid(16);
  const created_at = new Date().toISOString();
  const newName = `${original.name} (Copy)`;

  const stmt = db.prepare(`
    INSERT INTO campaigns (id, name, message, company_name, created_at, status)
    VALUES (?, ?, ?, ?, ?, 'paused')
  `);

  try {
    stmt.run(newId, newName, original.message, original.company_name, created_at);

    return {
      id: newId,
      name: newName,
      message: original.message,
      company_name: original.company_name,
      created_at,
      status: "paused",
    };
  } catch (error) {
    console.error("Error duplicating campaign:", error);
    return null;
  }
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
  const operation = 'createRecipient';

  // Validate required inputs
  validateId(data.campaignId, 'campaignId', operation);
  validateString(data.name, 'name', operation, { minLength: 1, maxLength: 255 });
  validateString(data.lastname, 'lastname', operation, { minLength: 1, maxLength: 255 });

  const db = createServiceClient();
  const id = nanoid(16);
  const tracking_id = nanoid(12);
  const created_at = new Date().toISOString();

  dbLogger.info(operation, 'recipients', id, {
    campaignId: data.campaignId,
    name: `${data.name} ${data.lastname}`,
    trackingId: tracking_id
  });

  const stmt = db.prepare(`
    INSERT INTO recipients (
      id, campaign_id, tracking_id, name, lastname,
      address, city, zip, email, phone, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
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
    dbLogger.debug(`${operation} completed`, { id, trackingId: tracking_id });
  } catch (error) {
    dbLogger.error(operation, error as Error, { id, campaignId: data.campaignId });
    throw error;
  }

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
  const db = createServiceClient();
  const stmt = db.prepare("SELECT * FROM recipients WHERE tracking_id = ?");
  return stmt.get(trackingId) as Recipient | null;
}

/**
 * Get all recipients for a campaign
 */
export function getRecipientsByCampaign(campaignId: string): Recipient[] {
  const db = createServiceClient();
  const stmt = db.prepare(
    "SELECT * FROM recipients WHERE campaign_id = ? ORDER BY created_at DESC"
  );
  return stmt.all(campaignId) as Recipient[];
}

// ==================== LANDING PAGES ====================

export interface LandingPage {
  id: string;
  tracking_id: string;
  campaign_id: string;
  recipient_id: string;
  page_data: string;
  landing_page_url: string;
  created_at: string;
}

/**
 * Save landing page data to database
 */
export function saveLandingPage(data: {
  trackingId: string;
  campaignId: string;
  recipientId: string;
  pageData: Record<string, unknown>;
  landingPageUrl: string;
}): LandingPage {
  const db = createServiceClient();
  const id = nanoid(16);
  const created_at = new Date().toISOString();
  const page_data = JSON.stringify(data.pageData);

  const stmt = db.prepare(`
    INSERT INTO landing_pages (
      id, tracking_id, campaign_id, recipient_id,
      page_data, landing_page_url, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.trackingId,
    data.campaignId,
    data.recipientId,
    page_data,
    data.landingPageUrl,
    created_at
  );

  return {
    id,
    tracking_id: data.trackingId,
    campaign_id: data.campaignId,
    recipient_id: data.recipientId,
    page_data,
    landing_page_url: data.landingPageUrl,
    created_at,
  };
}

/**
 * Get landing page by tracking ID
 */
export function getLandingPageByTrackingId(trackingId: string): LandingPage | null {
  const db = createServiceClient();
  const stmt = db.prepare("SELECT * FROM landing_pages WHERE tracking_id = ?");
  return stmt.get(trackingId) as LandingPage | null;
}

/**
 * Get all landing pages for a campaign
 */
export function getLandingPagesByCampaign(campaignId: string): LandingPage[] {
  const db = createServiceClient();
  const stmt = db.prepare(`
    SELECT lp.*, r.name, r.lastname, r.email, r.phone
    FROM landing_pages lp
    JOIN recipients r ON lp.recipient_id = r.id
    WHERE lp.campaign_id = ?
    ORDER BY lp.created_at DESC
  `);
  return stmt.all(campaignId) as LandingPage[];
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
  const operation = 'trackEvent';

  // Validate required inputs
  validateId(data.trackingId, 'trackingId', operation);
  validateEnum(data.eventType, 'eventType', operation, [
    'page_view', 'qr_scan', 'button_click', 'form_view', 'external_link'
  ] as const);

  const db = createServiceClient();
  const id = nanoid(16);
  const created_at = new Date().toISOString();

  dbLogger.info(operation, 'events', id, {
    trackingId: data.trackingId,
    eventType: data.eventType
  });

  const stmt = db.prepare(`
    INSERT INTO events (id, tracking_id, event_type, event_data, ip_address, user_agent, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const eventDataJson = data.eventData ? JSON.stringify(data.eventData) : null;

  try {
    stmt.run(
      id,
      data.trackingId,
      data.eventType,
      eventDataJson,
      data.ipAddress || null,
      data.userAgent || null,
      created_at
    );
    dbLogger.debug(`${operation} completed`, { id, eventType: data.eventType });
  } catch (error) {
    dbLogger.error(operation, error as Error, { trackingId: data.trackingId, eventType: data.eventType });
    throw error;
  }

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
  const db = createServiceClient();
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
  const db = createServiceClient();
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
  const operation = 'trackConversion';

  // Validate required inputs
  validateId(data.trackingId, 'trackingId', operation);
  validateEnum(data.conversionType, 'conversionType', operation, [
    'form_submission', 'appointment_booked', 'call_initiated', 'download'
  ] as const);

  const db = createServiceClient();
  const id = nanoid(16);
  const created_at = new Date().toISOString();

  dbLogger.info(operation, 'conversions', id, {
    trackingId: data.trackingId,
    conversionType: data.conversionType
  });

  const stmt = db.prepare(`
    INSERT INTO conversions (id, tracking_id, conversion_type, conversion_data, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const conversionDataJson = data.conversionData
    ? JSON.stringify(data.conversionData)
    : null;

  try {
    stmt.run(
      id,
      data.trackingId,
      data.conversionType,
      conversionDataJson,
      created_at
    );
    dbLogger.debug(`${operation} completed`, { id, conversionType: data.conversionType });
  } catch (error) {
    dbLogger.error(operation, error as Error, { trackingId: data.trackingId, conversionType: data.conversionType });
    throw error;
  }

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
  const db = createServiceClient();
  const stmt = db.prepare(
    "SELECT * FROM conversions WHERE tracking_id = ? ORDER BY created_at DESC"
  );
  return stmt.all(trackingId) as Conversion[];
}

/**
 * Check if tracking ID has converted
 */
export function hasConverted(trackingId: string): boolean {
  const db = createServiceClient();
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
  const db = createServiceClient();
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
  // Phase 12: Brand DNA
  logo_url?: string;
  logo_asset_id?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  background_color?: string;
  text_color?: string;
  heading_font?: string;
  body_font?: string;
  landing_page_template?: string;
  website_url?: string;
  last_updated_at?: string;
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
  const db = createServiceClient();

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
  const db = createServiceClient();
  const stmt = db.prepare(
    "SELECT * FROM brand_profiles WHERE company_name = ? AND is_active = 1"
  );
  return stmt.get(companyName) as BrandProfile | null;
}

/**
 * Get all brand profiles
 */
export function getAllBrandProfiles(): BrandProfile[] {
  const db = createServiceClient();
  const stmt = db.prepare(
    "SELECT * FROM brand_profiles WHERE is_active = 1 ORDER BY extracted_at DESC"
  );
  return stmt.all() as BrandProfile[];
}

/**
 * Update brand kit (visual identity) for existing profile
 * Phase 12: Brand DNA
 */
export function updateBrandKit(data: {
  companyName: string;
  logoUrl?: string;
  logoAssetId?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  headingFont?: string;
  bodyFont?: string;
  landingPageTemplate?: string;
  websiteUrl?: string;
}): BrandProfile | null {
  const db = createServiceClient();

  // Get existing profile or create one
  let profile = getBrandProfile(data.companyName);

  if (!profile) {
    // Create minimal profile if doesn't exist
    profile = saveBrandProfile({ companyName: data.companyName });
  }

  // Update brand kit fields
  const stmt = db.prepare(`
    UPDATE brand_profiles
    SET logo_url = COALESCE(?, logo_url),
        logo_asset_id = COALESCE(?, logo_asset_id),
        primary_color = COALESCE(?, primary_color),
        secondary_color = COALESCE(?, secondary_color),
        accent_color = COALESCE(?, accent_color),
        background_color = COALESCE(?, background_color),
        text_color = COALESCE(?, text_color),
        heading_font = COALESCE(?, heading_font),
        body_font = COALESCE(?, body_font),
        landing_page_template = COALESCE(?, landing_page_template),
        website_url = COALESCE(?, website_url),
        last_updated_at = ?
    WHERE id = ?
  `);

  stmt.run(
    data.logoUrl || null,
    data.logoAssetId || null,
    data.primaryColor || null,
    data.secondaryColor || null,
    data.accentColor || null,
    data.backgroundColor || null,
    data.textColor || null,
    data.headingFont || null,
    data.bodyFont || null,
    data.landingPageTemplate || null,
    data.websiteUrl || null,
    new Date().toISOString(),
    profile.id
  );

  // Return updated profile
  return getBrandProfile(data.companyName);
}

/**
 * Deactivate brand profile
 */
export function deactivateBrandProfile(id: string): boolean {
  const db = createServiceClient();
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

export function getDashboardStats(startDate?: string, endDate?: string): DashboardStats {
  const db = createServiceClient();

  // Build date filter clause
  const hasDateFilter = startDate && endDate;
  const recipientDateFilter = hasDateFilter ? "WHERE DATE(created_at) BETWEEN ? AND ?" : "";
  const eventDateFilter = hasDateFilter
    ? "WHERE event_type = 'page_view' AND DATE(created_at) BETWEEN ? AND ?"
    : "WHERE event_type = 'page_view'";
  const qrDateFilter = hasDateFilter
    ? "WHERE event_type = 'qr_scan' AND DATE(created_at) BETWEEN ? AND ?"
    : "WHERE event_type = 'qr_scan'";
  const conversionDateFilter = hasDateFilter ? "WHERE DATE(created_at) BETWEEN ? AND ?" : "";
  const formDateFilter = hasDateFilter
    ? "WHERE conversion_type = 'form_submission' AND DATE(created_at) BETWEEN ? AND ?"
    : "WHERE conversion_type = 'form_submission'";

  // Total campaigns (no date filter - all campaigns)
  const totalCampaignsStmt = db.prepare("SELECT COUNT(*) as count FROM campaigns");
  const { count: totalCampaigns } = totalCampaignsStmt.get() as { count: number };

  // Active campaigns (no date filter - current active)
  const activeCampaignsStmt = db.prepare(
    "SELECT COUNT(*) as count FROM campaigns WHERE status = 'active'"
  );
  const { count: activeCampaigns } = activeCampaignsStmt.get() as { count: number };

  // Total recipients
  const recipientQuery = `SELECT COUNT(*) as count FROM recipients ${recipientDateFilter}`;
  const totalRecipientsStmt = db.prepare(recipientQuery);
  const { count: totalRecipients } = (hasDateFilter
    ? totalRecipientsStmt.get(startDate, endDate)
    : totalRecipientsStmt.get()) as { count: number };

  // Total page views
  const pageViewQuery = `SELECT COUNT(*) as count FROM events ${eventDateFilter}`;
  const pageViewsStmt = db.prepare(pageViewQuery);
  const { count: totalPageViews } = (hasDateFilter
    ? pageViewsStmt.get(startDate, endDate)
    : pageViewsStmt.get()) as { count: number };

  // QR scans
  const qrQuery = `SELECT COUNT(*) as count FROM events ${qrDateFilter}`;
  const qrScansStmt = db.prepare(qrQuery);
  const { count: qrScans } = (hasDateFilter
    ? qrScansStmt.get(startDate, endDate)
    : qrScansStmt.get()) as { count: number };

  // Total conversions
  const conversionQuery = `SELECT COUNT(*) as count FROM conversions ${conversionDateFilter}`;
  const totalConversionsStmt = db.prepare(conversionQuery);
  const { count: totalConversions } = (hasDateFilter
    ? totalConversionsStmt.get(startDate, endDate)
    : totalConversionsStmt.get()) as { count: number };

  // Form submissions
  const formQuery = `SELECT COUNT(*) as count FROM conversions ${formDateFilter}`;
  const formSubmissionsStmt = db.prepare(formQuery);
  const { count: formSubmissions } = (hasDateFilter
    ? formSubmissionsStmt.get(startDate, endDate)
    : formSubmissionsStmt.get()) as { count: number };

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
  totalPageViews: number;
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
      totalPageViews: analytics?.totalPageViews || 0,
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
  const db = createServiceClient();

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

// ==================== EXPORT DATA ====================

export interface CampaignExportData {
  campaign: Campaign;
  recipients: Array<{
    name: string;
    lastname: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    zip?: string;
    tracking_id: string;
    sent_date: string;
    page_views: number;
    events: number;
    conversions: number;
    status: "pending" | "engaged" | "converted";
  }>;
  metrics: {
    totalRecipients: number;
    totalPageViews: number;
    uniqueVisitors: number;
    totalConversions: number;
    conversionRate: number;
  };
}

/**
 * Get detailed export data for a single campaign
 */
export function getCampaignExportData(campaignId: string): CampaignExportData | null {
  const db = createServiceClient();
  const campaign = getCampaignById(campaignId);

  if (!campaign) return null;

  // Get recipients with their stats
  const recipientsStmt = db.prepare(`
    SELECT
      r.name,
      r.lastname,
      r.email,
      r.phone,
      r.address,
      r.city,
      r.zip,
      r.tracking_id,
      r.created_at as sent_date,
      COALESCE(e.event_count, 0) as events,
      COALESCE(e.page_view_count, 0) as page_views,
      COALESCE(cv.conversion_count, 0) as conversions
    FROM recipients r
    LEFT JOIN (
      SELECT tracking_id, COUNT(*) as event_count,
             SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) as page_view_count
      FROM events
      GROUP BY tracking_id
    ) e ON r.tracking_id = e.tracking_id
    LEFT JOIN (
      SELECT tracking_id, COUNT(*) as conversion_count
      FROM conversions
      GROUP BY tracking_id
    ) cv ON r.tracking_id = cv.tracking_id
    WHERE r.campaign_id = ?
    ORDER BY r.created_at DESC
  `);

  const recipientsData = recipientsStmt.all(campaignId) as any[];

  const recipients = recipientsData.map(r => ({
    name: r.name,
    lastname: r.lastname,
    email: r.email,
    phone: r.phone,
    address: r.address,
    city: r.city,
    zip: r.zip,
    tracking_id: r.tracking_id,
    sent_date: r.sent_date,
    page_views: r.page_views,
    events: r.events,
    conversions: r.conversions,
    status: (r.conversions > 0 ? "converted" : r.page_views > 0 ? "engaged" : "pending") as "pending" | "engaged" | "converted",
  }));

  // Calculate metrics
  const totalRecipients = recipients.length;
  const totalPageViews = recipients.reduce((sum, r) => sum + r.page_views, 0);
  const uniqueVisitors = recipients.filter(r => r.page_views > 0).length;
  const totalConversions = recipients.filter(r => r.conversions > 0).length;
  const conversionRate = totalRecipients > 0
    ? parseFloat(((totalConversions / totalRecipients) * 100).toFixed(1))
    : 0;

  return {
    campaign,
    recipients,
    metrics: {
      totalRecipients,
      totalPageViews,
      uniqueVisitors,
      totalConversions,
      conversionRate,
    },
  };
}

/**
 * Get export data for all campaigns overview
 */
export function getAllCampaignsExportData() {
  const campaigns = getAllCampaigns();
  return campaigns;
}

// ==================== ANALYTICS & VISUALIZATIONS ====================

export interface TimeSeriesData {
  date: string;
  pageViews: number;
  conversions: number;
  uniqueVisitors: number;
  calls: number;
}

export interface CampaignTimeSeriesData {
  campaignId: string;
  campaignName: string;
  data: TimeSeriesData[];
}

export interface FunnelData {
  stage: string;
  count: number;
  percentage: number;
}

/**
 * Get time-series analytics data for all campaigns
 */
export function getTimeSeriesAnalytics(
  startDate?: string,
  endDate?: string
): TimeSeriesData[] {
  const db = createServiceClient();

  // Default to last 30 days if no dates provided
  const end = endDate || new Date().toISOString().split("T")[0];
  const start =
    startDate ||
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Get daily page views
  const pageViewsStmt = db.prepare(`
    SELECT
      DATE(created_at) as date,
      COUNT(*) as count
    FROM events
    WHERE event_type = 'page_view'
      AND DATE(created_at) BETWEEN ? AND ?
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);

  // Get daily conversions
  const conversionsStmt = db.prepare(`
    SELECT
      DATE(created_at) as date,
      COUNT(DISTINCT tracking_id) as count
    FROM conversions
    WHERE DATE(created_at) BETWEEN ? AND ?
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);

  // Get daily unique visitors
  const visitorsStmt = db.prepare(`
    SELECT
      DATE(created_at) as date,
      COUNT(DISTINCT tracking_id) as count
    FROM events
    WHERE event_type = 'page_view'
      AND DATE(created_at) BETWEEN ? AND ?
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);

  const pageViews = pageViewsStmt.all(start, end) as Array<{
    date: string;
    count: number;
  }>;
  const conversions = conversionsStmt.all(start, end) as Array<{
    date: string;
    count: number;
  }>;
  const visitors = visitorsStmt.all(start, end) as Array<{
    date: string;
    count: number;
  }>;

  // Get daily calls
  const callsStmt = db.prepare(`
    SELECT
      DATE(call_started_at) as date,
      COUNT(*) as count
    FROM elevenlabs_calls
    WHERE DATE(call_started_at) BETWEEN ? AND ?
    GROUP BY DATE(call_started_at)
    ORDER BY date ASC
  `);

  const calls = callsStmt.all(start, end) as Array<{
    date: string;
    count: number;
  }>;

  // Create a map of all dates in range
  const dateMap = new Map<string, TimeSeriesData>();
  const currentDate = new Date(start);
  const endDateObj = new Date(end);

  while (currentDate <= endDateObj) {
    const dateStr = currentDate.toISOString().split("T")[0];
    dateMap.set(dateStr, {
      date: dateStr,
      pageViews: 0,
      conversions: 0,
      uniqueVisitors: 0,
      calls: 0,
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Fill in actual data
  pageViews.forEach((pv) => {
    const data = dateMap.get(pv.date);
    if (data) data.pageViews = pv.count;
  });

  conversions.forEach((cv) => {
    const data = dateMap.get(cv.date);
    if (data) data.conversions = cv.count;
  });

  visitors.forEach((v) => {
    const data = dateMap.get(v.date);
    if (data) data.uniqueVisitors = v.count;
  });

  calls.forEach((c) => {
    const data = dateMap.get(c.date);
    if (data) data.calls = c.count;
  });

  return Array.from(dateMap.values());
}

/**
 * Get time-series data for specific campaign
 */
export function getCampaignTimeSeriesAnalytics(
  campaignId: string,
  startDate?: string,
  endDate?: string
): TimeSeriesData[] {
  const db = createServiceClient();

  // Default to last 30 days if no dates provided
  const end = endDate || new Date().toISOString().split("T")[0];
  const start =
    startDate ||
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Get daily page views for campaign recipients
  const pageViewsStmt = db.prepare(`
    SELECT
      DATE(e.created_at) as date,
      COUNT(*) as count
    FROM events e
    JOIN recipients r ON e.tracking_id = r.tracking_id
    WHERE r.campaign_id = ?
      AND e.event_type = 'page_view'
      AND DATE(e.created_at) BETWEEN ? AND ?
    GROUP BY DATE(e.created_at)
    ORDER BY date ASC
  `);

  // Get daily conversions for campaign recipients
  const conversionsStmt = db.prepare(`
    SELECT
      DATE(cv.created_at) as date,
      COUNT(DISTINCT cv.tracking_id) as count
    FROM conversions cv
    JOIN recipients r ON cv.tracking_id = r.tracking_id
    WHERE r.campaign_id = ?
      AND DATE(cv.created_at) BETWEEN ? AND ?
    GROUP BY DATE(cv.created_at)
    ORDER BY date ASC
  `);

  // Get daily unique visitors for campaign recipients
  const visitorsStmt = db.prepare(`
    SELECT
      DATE(e.created_at) as date,
      COUNT(DISTINCT e.tracking_id) as count
    FROM events e
    JOIN recipients r ON e.tracking_id = r.tracking_id
    WHERE r.campaign_id = ?
      AND e.event_type = 'page_view'
      AND DATE(e.created_at) BETWEEN ? AND ?
    GROUP BY DATE(e.created_at)
    ORDER BY date ASC
  `);

  const pageViews = pageViewsStmt.all(campaignId, start, end) as Array<{
    date: string;
    count: number;
  }>;
  const conversions = conversionsStmt.all(campaignId, start, end) as Array<{
    date: string;
    count: number;
  }>;
  const visitors = visitorsStmt.all(campaignId, start, end) as Array<{
    date: string;
    count: number;
  }>;

  // Get daily calls for campaign
  const callsStmt = db.prepare(`
    SELECT
      DATE(call_started_at) as date,
      COUNT(*) as count
    FROM elevenlabs_calls
    WHERE campaign_id = ?
      AND DATE(call_started_at) BETWEEN ? AND ?
    GROUP BY DATE(call_started_at)
    ORDER BY date ASC
  `);

  const calls = callsStmt.all(campaignId, start, end) as Array<{
    date: string;
    count: number;
  }>;

  // Create a map of all dates in range
  const dateMap = new Map<string, TimeSeriesData>();
  const currentDate = new Date(start);
  const endDateObj = new Date(end);

  while (currentDate <= endDateObj) {
    const dateStr = currentDate.toISOString().split("T")[0];
    dateMap.set(dateStr, {
      date: dateStr,
      pageViews: 0,
      conversions: 0,
      uniqueVisitors: 0,
      calls: 0,
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Fill in actual data
  pageViews.forEach((pv) => {
    const data = dateMap.get(pv.date);
    if (data) data.pageViews = pv.count;
  });

  conversions.forEach((cv) => {
    const data = dateMap.get(cv.date);
    if (data) data.conversions = cv.count;
  });

  visitors.forEach((v) => {
    const data = dateMap.get(v.date);
    if (data) data.uniqueVisitors = v.count;
  });

  calls.forEach((c) => {
    const data = dateMap.get(c.date);
    if (data) data.calls = c.count;
  });

  return Array.from(dateMap.values());
}

/**
 * Get funnel data for all campaigns or specific campaign
 */
export function getFunnelData(campaignId?: string): FunnelData[] {
  const db = createServiceClient();

  let totalRecipients: number;
  let totalVisitors: number;
  let totalConversions: number;

  if (campaignId) {
    // Get data for specific campaign
    const recipientsStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM recipients
      WHERE campaign_id = ?
    `);
    totalRecipients = (recipientsStmt.get(campaignId) as { count: number }).count;

    const visitorsStmt = db.prepare(`
      SELECT COUNT(DISTINCT e.tracking_id) as count
      FROM events e
      JOIN recipients r ON e.tracking_id = r.tracking_id
      WHERE r.campaign_id = ?
        AND e.event_type = 'page_view'
    `);
    totalVisitors = (visitorsStmt.get(campaignId) as { count: number }).count;

    const conversionsStmt = db.prepare(`
      SELECT COUNT(DISTINCT cv.tracking_id) as count
      FROM conversions cv
      JOIN recipients r ON cv.tracking_id = r.tracking_id
      WHERE r.campaign_id = ?
    `);
    totalConversions = (conversionsStmt.get(campaignId) as { count: number })
      .count;
  } else {
    // Get data for all campaigns
    const recipientsStmt = db.prepare("SELECT COUNT(*) as count FROM recipients");
    totalRecipients = (recipientsStmt.get() as { count: number }).count;

    const visitorsStmt = db.prepare(`
      SELECT COUNT(DISTINCT tracking_id) as count
      FROM events
      WHERE event_type = 'page_view'
    `);
    totalVisitors = (visitorsStmt.get() as { count: number }).count;

    const conversionsStmt = db.prepare(`
      SELECT COUNT(DISTINCT tracking_id) as count
      FROM conversions
    `);
    totalConversions = (conversionsStmt.get() as { count: number }).count;
  }

  return [
    {
      stage: "Recipients",
      count: totalRecipients,
      percentage: 100,
    },
    {
      stage: "Visitors",
      count: totalVisitors,
      percentage:
        totalRecipients > 0
          ? parseFloat(((totalVisitors / totalRecipients) * 100).toFixed(1))
          : 0,
    },
    {
      stage: "Conversions",
      count: totalConversions,
      percentage:
        totalRecipients > 0
          ? parseFloat(((totalConversions / totalRecipients) * 100).toFixed(1))
          : 0,
    },
  ];
}

/**
 * Get comparison data for multiple campaigns
 */
export function getCampaignsComparisonData(campaignIds: string[]) {
  const db = createServiceClient();

  return campaignIds.map((id) => {
    const campaign = getCampaignById(id);
    if (!campaign) return null;

    // Get metrics for this campaign
    const recipientsStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM recipients
      WHERE campaign_id = ?
    `);
    const totalRecipients = (recipientsStmt.get(id) as { count: number }).count;

    const visitorsStmt = db.prepare(`
      SELECT COUNT(DISTINCT e.tracking_id) as count
      FROM events e
      JOIN recipients r ON e.tracking_id = r.tracking_id
      WHERE r.campaign_id = ?
        AND e.event_type = 'page_view'
    `);
    const uniqueVisitors = (visitorsStmt.get(id) as { count: number }).count;

    const pageViewsStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM events e
      JOIN recipients r ON e.tracking_id = r.tracking_id
      WHERE r.campaign_id = ?
        AND e.event_type = 'page_view'
    `);
    const totalPageViews = (pageViewsStmt.get(id) as { count: number }).count;

    const conversionsStmt = db.prepare(`
      SELECT COUNT(DISTINCT cv.tracking_id) as count
      FROM conversions cv
      JOIN recipients r ON cv.tracking_id = r.tracking_id
      WHERE r.campaign_id = ?
    `);
    const totalConversions = (conversionsStmt.get(id) as { count: number }).count;

    const conversionRate =
      totalRecipients > 0
        ? parseFloat(((totalConversions / totalRecipients) * 100).toFixed(1))
        : 0;

    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      totalRecipients,
      uniqueVisitors,
      totalPageViews,
      totalConversions,
      conversionRate,
    };
  }).filter(Boolean);
}

// ==================== ENGAGEMENT METRICS ====================

/**
 * Get time-to-engagement metrics for a campaign
 * Returns average times in seconds
 */
export function getEngagementMetricsForCampaign(campaignId: string) {
  const db = createServiceClient();

  // Calculate average time to first page view (in seconds)
  const timeToFirstViewStmt = db.prepare(`
    SELECT
      AVG(
        (julianday(e.first_view) - julianday(r.created_at)) * 86400
      ) as avg_time_to_first_view_seconds,
      COUNT(DISTINCT r.id) as recipients_with_views
    FROM recipients r
    LEFT JOIN (
      SELECT tracking_id, MIN(created_at) as first_view
      FROM events
      WHERE event_type = 'page_view'
      GROUP BY tracking_id
    ) e ON r.tracking_id = e.tracking_id
    WHERE r.campaign_id = ? AND e.first_view IS NOT NULL
  `);

  const timeToFirstView = timeToFirstViewStmt.get(campaignId) as any;

  // Calculate average time from first view to conversion (in seconds)
  const timeToConversionStmt = db.prepare(`
    SELECT
      AVG(
        (julianday(c.created_at) - julianday(e.first_view)) * 86400
      ) as avg_time_to_conversion_seconds,
      COUNT(DISTINCT c.id) as conversions_count
    FROM conversions c
    JOIN recipients r ON c.tracking_id = r.tracking_id
    LEFT JOIN (
      SELECT tracking_id, MIN(created_at) as first_view
      FROM events
      WHERE event_type = 'page_view'
      GROUP BY tracking_id
    ) e ON r.tracking_id = e.tracking_id
    WHERE r.campaign_id = ?
  `);

  const timeToConversion = timeToConversionStmt.get(campaignId) as any;

  // Calculate total time from recipient creation to conversion (in seconds)
  const totalTimeStmt = db.prepare(`
    SELECT
      AVG(
        (julianday(c.created_at) - julianday(r.created_at)) * 86400
      ) as avg_total_time_seconds
    FROM conversions c
    JOIN recipients r ON c.tracking_id = r.tracking_id
    WHERE r.campaign_id = ?
  `);

  const totalTime = totalTimeStmt.get(campaignId) as any;

  return {
    avgTimeToFirstView: timeToFirstView.avg_time_to_first_view_seconds || null,
    recipientsWithViews: timeToFirstView.recipients_with_views || 0,
    avgTimeToConversion: timeToConversion.avg_time_to_conversion_seconds || null,
    conversionsCount: timeToConversion.conversions_count || 0,
    avgTotalTimeToConversion: totalTime.avg_total_time_seconds || null,
  };
}

/**
 * Get engagement metrics for a specific recipient
 */
export function getEngagementMetricsForRecipient(trackingId: string) {
  const db = createServiceClient();

  const stmt = db.prepare(`
    SELECT
      r.created_at as recipient_created,
      e.first_view,
      c.first_conversion,
      CASE
        WHEN e.first_view IS NOT NULL
        THEN (julianday(e.first_view) - julianday(r.created_at)) * 86400
        ELSE NULL
      END as time_to_first_view_seconds,
      CASE
        WHEN c.first_conversion IS NOT NULL AND e.first_view IS NOT NULL
        THEN (julianday(c.first_conversion) - julianday(e.first_view)) * 86400
        ELSE NULL
      END as time_to_conversion_seconds,
      CASE
        WHEN c.first_conversion IS NOT NULL
        THEN (julianday(c.first_conversion) - julianday(r.created_at)) * 86400
        ELSE NULL
      END as total_time_seconds
    FROM recipients r
    LEFT JOIN (
      SELECT tracking_id, MIN(created_at) as first_view
      FROM events
      WHERE event_type = 'page_view'
      GROUP BY tracking_id
    ) e ON r.tracking_id = e.tracking_id
    LEFT JOIN (
      SELECT tracking_id, MIN(created_at) as first_conversion
      FROM conversions
      GROUP BY tracking_id
    ) c ON r.tracking_id = c.tracking_id
    WHERE r.tracking_id = ?
  `);

  return stmt.get(trackingId) as any;
}

/**
 * Get engagement metrics for all campaigns (for analytics overview)
 */
export function getOverallEngagementMetrics(startDate?: string, endDate?: string) {
  const db = createServiceClient();

  const hasDateFilter = startDate && endDate;
  const recipientFilter = hasDateFilter ? "WHERE DATE(r.created_at) BETWEEN ? AND ?" : "";

  const query = `
    SELECT
      AVG(
        CASE
          WHEN e.first_view IS NOT NULL
          THEN (julianday(e.first_view) - julianday(r.created_at)) * 86400
          ELSE NULL
        END
      ) as avg_time_to_first_view_seconds,
      AVG(
        CASE
          WHEN c.first_conversion IS NOT NULL AND e.first_view IS NOT NULL
          THEN (julianday(c.first_conversion) - julianday(e.first_view)) * 86400
          ELSE NULL
        END
      ) as avg_time_to_conversion_seconds,
      AVG(
        CASE
          WHEN c.first_conversion IS NOT NULL
          THEN (julianday(c.first_conversion) - julianday(r.created_at)) * 86400
          ELSE NULL
        END
      ) as avg_total_time_seconds,
      AVG(
        CASE
          WHEN ca.first_appointment IS NOT NULL
          THEN (julianday(ca.first_appointment) - julianday(camp.created_at)) * 86400
          ELSE NULL
        END
      ) as avg_time_to_appointment_seconds,
      COUNT(DISTINCT CASE WHEN e.first_view IS NOT NULL THEN r.id END) as recipients_with_views,
      COUNT(DISTINCT CASE WHEN c.first_conversion IS NOT NULL THEN r.id END) as recipients_with_conversions,
      COUNT(DISTINCT CASE WHEN ca.first_appointment IS NOT NULL THEN r.id END) as recipients_with_appointments
    FROM recipients r
    JOIN campaigns camp ON r.campaign_id = camp.id
    LEFT JOIN (
      SELECT tracking_id, MIN(created_at) as first_view
      FROM events
      WHERE event_type = 'page_view'
      GROUP BY tracking_id
    ) e ON r.tracking_id = e.tracking_id
    LEFT JOIN (
      SELECT tracking_id, MIN(created_at) as first_conversion
      FROM conversions
      GROUP BY tracking_id
    ) c ON r.tracking_id = c.tracking_id
    LEFT JOIN (
      SELECT tracking_id, MIN(created_at) as first_appointment
      FROM conversions
      WHERE conversion_type = 'appointment_booked'
      GROUP BY tracking_id
    ) ca ON r.tracking_id = ca.tracking_id
    ${recipientFilter}
  `;

  const stmt = db.prepare(query);
  return (hasDateFilter ? stmt.get(startDate, endDate) : stmt.get()) as any;
}

// ==================== SANKEY CHART DATA ====================

export interface SankeyNode {
  name: string;
}

export interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
  metrics: {
    totalRecipients: number;
    qrScans: number;
    landingPageVisits: number;
    totalCalls: number;
    webAppointments: number;
    callAppointments: number;
    totalConverted: number; // All web conversions + call appointments
  };
}

/**
 * Get Sankey chart data for customer journey visualization
 * Flow: Recipients → QR Scans → Landing Page Visits → Calls/Appointments
 * @param startDate Optional start date filter (ISO string)
 * @param endDate Optional end date filter (ISO string)
 */
export function getSankeyChartData(startDate?: string, endDate?: string): SankeyData {
  const db = createServiceClient();

  const hasDateFilter = !!(startDate && endDate);

  // Total recipients (contacted people) - filtered by created_at date
  const recipientQuery = hasDateFilter
    ? `SELECT COUNT(*) as count FROM recipients WHERE DATE(created_at) BETWEEN ? AND ?`
    : `SELECT COUNT(*) as count FROM recipients`;

  const totalRecipientsStmt = db.prepare(recipientQuery);
  const totalRecipients = (hasDateFilter
    ? totalRecipientsStmt.get(startDate, endDate)
    : totalRecipientsStmt.get()) as { count: number };
  const totalRecipientsCount = totalRecipients.count;

  // QR code scans - filtered by created_at (event time)
  const qrQuery = hasDateFilter
    ? `SELECT COUNT(DISTINCT tracking_id) as count FROM events WHERE event_type = 'qr_scan' AND DATE(created_at) BETWEEN ? AND ?`
    : `SELECT COUNT(DISTINCT tracking_id) as count FROM events WHERE event_type = 'qr_scan'`;

  const qrScansStmt = db.prepare(qrQuery);
  const qrScansResult = (hasDateFilter
    ? qrScansStmt.get(startDate, endDate)
    : qrScansStmt.get()) as { count: number };
  const qrScans = qrScansResult.count;

  // Landing page visits - filtered by created_at (event time)
  const landingQuery = hasDateFilter
    ? `SELECT COUNT(DISTINCT tracking_id) as count FROM events WHERE event_type = 'page_view' AND DATE(created_at) BETWEEN ? AND ?`
    : `SELECT COUNT(DISTINCT tracking_id) as count FROM events WHERE event_type = 'page_view'`;

  const landingPageVisitsStmt = db.prepare(landingQuery);
  const landingPageVisitsResult = (hasDateFilter
    ? landingPageVisitsStmt.get(startDate, endDate)
    : landingPageVisitsStmt.get()) as { count: number };
  const landingPageVisits = landingPageVisitsResult.count;

  // Total calls - filtered by call start time
  const callsQuery = hasDateFilter
    ? `SELECT COUNT(*) as count FROM elevenlabs_calls WHERE DATE(call_started_at) BETWEEN ? AND ?`
    : `SELECT COUNT(*) as count FROM elevenlabs_calls`;

  const totalCallsStmt = db.prepare(callsQuery);
  const totalCallsResult = (hasDateFilter
    ? totalCallsStmt.get(startDate, endDate)
    : totalCallsStmt.get()) as { count: number };
  const totalCalls = totalCallsResult.count;

  // Web conversions (all types from landing pages: appointments, downloads, forms) - filtered by conversion time
  // Excludes call_initiated which is tracked separately via ElevenLabs calls
  const webConversionsQuery = hasDateFilter
    ? `SELECT COUNT(DISTINCT tracking_id) as count FROM conversions WHERE conversion_type IN ('appointment_booked', 'download', 'form_submission') AND DATE(created_at) BETWEEN ? AND ?`
    : `SELECT COUNT(DISTINCT tracking_id) as count FROM conversions WHERE conversion_type IN ('appointment_booked', 'download', 'form_submission')`;

  const webAppointmentsStmt = db.prepare(webConversionsQuery);
  const webAppointmentsResult = (hasDateFilter
    ? webAppointmentsStmt.get(startDate, endDate)
    : webAppointmentsStmt.get()) as { count: number };
  const webAppointments = webAppointmentsResult.count;

  // Appointments booked via calls - filtered by call time
  const callAppointmentsQuery = hasDateFilter
    ? `SELECT COUNT(*) as count FROM elevenlabs_calls WHERE is_conversion = 1 AND DATE(call_started_at) BETWEEN ? AND ?`
    : `SELECT COUNT(*) as count FROM elevenlabs_calls WHERE is_conversion = 1`;

  const callAppointmentsStmt = db.prepare(callAppointmentsQuery);
  const callAppointmentsResult = (hasDateFilter
    ? callAppointmentsStmt.get(startDate, endDate)
    : callAppointmentsStmt.get()) as { count: number };
  const callAppointments = callAppointmentsResult.count;

  // ✅ CRITICAL: Total Converted = All web conversions (any CTA) + Call appointments
  // This shows the complete picture of all successful conversions across all channels
  const totalConverted = webAppointments + callAppointments;

  // Calculate engaged recipients (those who took any action)
  const engagedRecipients = Math.max(qrScans, landingPageVisits) + totalCalls;
  const noEngagement = Math.max(0, totalRecipientsCount - engagedRecipients);

  // Debug logging for Sankey data
  console.log('[Sankey Query Debug]', {
    dateFilter: startDate && endDate ? `${startDate} to ${endDate}` : 'No filter (all time)',
    totalRecipients: totalRecipientsCount,
    engagedInPeriod: engagedRecipients,
    noEngagementInPeriod: noEngagement,
    qrScans,
    landingPageVisits,
    totalCalls,
    webConversions: webAppointments, // All web conversions (appointment, download, form)
    callAppointments,
    totalConverted, // webAppointments (all types) + callAppointments
  });

  // Nodes (indexed from 0)
  // Multi-path funnel: Show ALL recipients with engagement split
  const nodes: SankeyNode[] = [
    { name: "Recipients" },              // 0
    { name: "No Engagement" },          // 1
    { name: "QR Scans" },               // 2
    { name: "Landing Page Visits" },    // 3
    { name: "Calls Received" },         // 4
    { name: "Web Conversions" },        // 5 (appointments, downloads, forms)
    { name: "Call Appointments" },      // 6
  ];

  // Links (flows between nodes)
  const links: SankeyLink[] = [];

  console.log('[Sankey] Link creation starting...', {
    totalRecipients: totalRecipientsCount,
    noEngagement,
    qrScans,
    landingPageVisits,
    totalCalls,
    webAppointments,
    callAppointments
  });

  // CRITICAL: Show no engagement path so Recipients node displays correct total
  if (noEngagement > 0) {
    links.push({ source: 0, target: 1, value: noEngagement });
    console.log('[Sankey] ✓ Added link: Recipients → No Engagement', noEngagement);
  }

  // Path 1: Digital Engagement - QR Code Flow
  if (qrScans > 0) {
    links.push({ source: 0, target: 2, value: qrScans });
    console.log('[Sankey] ✓ Added link: Recipients → QR Scans', qrScans);

    // QR Scans → Landing Page Visits (from QR)
    const qrToLanding = Math.min(qrScans, landingPageVisits);
    if (qrToLanding > 0) {
      links.push({ source: 2, target: 3, value: qrToLanding });
      console.log('[Sankey] ✓ Added link: QR Scans → Landing Page Visits', qrToLanding);
    }
  }

  // Path 2: Direct Digital Engagement - Direct Landing Page Visits
  const directLandingVisits = qrScans > 0 ? Math.max(0, landingPageVisits - qrScans) : landingPageVisits;
  if (directLandingVisits > 0) {
    links.push({ source: 0, target: 3, value: directLandingVisits });
    console.log('[Sankey] ✓ Added link: Recipients → Landing Page Visits (direct)', directLandingVisits);
  }

  // Landing Page Visits → Web Conversions (appointments, downloads, forms)
  if (landingPageVisits > 0 && webAppointments > 0) {
    links.push({ source: 3, target: 5, value: webAppointments });
    console.log('[Sankey] ✓ Added link: Landing Page Visits → Web Conversions', webAppointments);
  } else {
    console.log('[Sankey] ✗ Skipped Web Conversions link:', { landingPageVisits, webAppointments });
  }

  // Path 3: Phone Engagement - Direct Calls (independent path)
  if (totalCalls > 0) {
    links.push({ source: 0, target: 4, value: totalCalls });
    console.log('[Sankey] ✓ Added link: Recipients → Calls Received', totalCalls);
  }

  // Calls → Call Appointments
  if (totalCalls > 0 && callAppointments > 0) {
    links.push({ source: 4, target: 6, value: callAppointments });
    console.log('[Sankey] ✓ Added link: Calls → Call Appointments', callAppointments);
  }

  console.log('[Sankey] Total links created:', links.length);
  console.log('[Sankey] Links:', JSON.stringify(links, null, 2));

  return {
    nodes,
    links,
    metrics: {
      totalRecipients: totalRecipientsCount,
      qrScans,
      landingPageVisits,
      totalCalls,
      webAppointments,
      callAppointments,
      totalConverted,
    },
  };
}
