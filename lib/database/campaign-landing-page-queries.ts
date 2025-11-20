import { getDatabase } from './connection';
import type { Database } from 'better-sqlite3';

/**
 * Campaign Landing Page Database Queries
 *
 * These queries support the new campaign-based landing page architecture
 * where one landing page serves an entire campaign with dual modes:
 * - Personalized mode (with encrypted recipient ID)
 * - Generic mode (direct campaign URL)
 */

export interface CampaignLandingPage {
  id: string;
  campaign_id: string;
  campaign_template_id: string | null;
  page_config: string; // JSON string
  created_at: string;
  updated_at: string;
}

export interface CampaignLandingPageConfig {
  title: string;
  message: string;
  companyName: string;
  logoUrl?: string;
  primaryColor?: string;
  formFields: string[];
  ctaText: string;
  thankYouMessage: string;
  fallbackMessage: string; // Used when no recipient data available
}

export interface RecipientData {
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

/**
 * Get campaign landing page configuration
 *
 * @param campaignId - Campaign ID
 * @returns Landing page config or null if not found
 */
export function getCampaignLandingPage(campaignId: string): CampaignLandingPage | null {
  const db = createServiceClient();

  try {
    const result = db.prepare(`
      SELECT * FROM campaign_landing_pages
      WHERE campaign_id = ?
    `).get(campaignId) as CampaignLandingPage | undefined;

    return result || null;
  } catch (error) {
    console.error('Error fetching campaign landing page:', error);
    return null;
  }
}

/**
 * Get parsed campaign landing page config
 *
 * @param campaignId - Campaign ID
 * @returns Parsed config object or null
 */
export function getCampaignLandingPageConfig(campaignId: string): CampaignLandingPageConfig | null {
  const landingPage = getCampaignLandingPage(campaignId);

  if (!landingPage) {
    return null;
  }

  try {
    return JSON.parse(landingPage.page_config) as CampaignLandingPageConfig;
  } catch (error) {
    console.error('Error parsing campaign landing page config:', error);
    return null;
  }
}

/**
 * Get recipient by ID
 *
 * @param recipientId - Recipient ID
 * @returns Recipient data or null
 */
export function getRecipientById(recipientId: string): RecipientData | null {
  const db = createServiceClient();

  try {
    const result = db.prepare(`
      SELECT * FROM recipients
      WHERE id = ?
    `).get(recipientId) as RecipientData | undefined;

    return result || null;
  } catch (error) {
    console.error('Error fetching recipient by ID:', error);
    return null;
  }
}

/**
 * Get recipient by tracking ID
 *
 * @param trackingId - Tracking ID
 * @returns Recipient data or null
 */
export function getRecipientByTrackingId(trackingId: string): RecipientData | null {
  const db = createServiceClient();

  try {
    const result = db.prepare(`
      SELECT * FROM recipients
      WHERE tracking_id = ?
    `).get(trackingId) as RecipientData | undefined;

    return result || null;
  } catch (error) {
    console.error('Error fetching recipient by tracking ID:', error);
    return null;
  }
}

/**
 * Create or update campaign landing page
 *
 * @param campaignId - Campaign ID
 * @param config - Landing page configuration
 * @param templateId - Optional template ID
 * @returns Created/updated landing page
 */
export function upsertCampaignLandingPage(
  campaignId: string,
  config: CampaignLandingPageConfig,
  templateId?: string
): CampaignLandingPage {
  const db = createServiceClient();

  const id = `clp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const configJson = JSON.stringify(config);
  const now = new Date().toISOString();

  try {
    // Check if landing page already exists
    const existing = getCampaignLandingPage(campaignId);

    if (existing) {
      // Update existing
      db.prepare(`
        UPDATE campaign_landing_pages
        SET page_config = ?,
            campaign_template_id = ?,
            updated_at = ?
        WHERE campaign_id = ?
      `).run(configJson, templateId || null, now, campaignId);

      return {
        ...existing,
        page_config: configJson,
        campaign_template_id: templateId || null,
        updated_at: now,
      };
    } else {
      // Create new
      db.prepare(`
        INSERT INTO campaign_landing_pages (
          id, campaign_id, campaign_template_id, page_config, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, campaignId, templateId || null, configJson, now, now);

      return {
        id,
        campaign_id: campaignId,
        campaign_template_id: templateId || null,
        page_config: configJson,
        created_at: now,
        updated_at: now,
      };
    }
  } catch (error) {
    console.error('Error upserting campaign landing page:', error);
    throw new Error('Failed to create/update campaign landing page');
  }
}

/**
 * Get campaign info
 *
 * @param campaignId - Campaign ID
 * @returns Campaign data or null
 */
export function getCampaign(campaignId: string): { id: string; name: string; message: string; company_name: string } | null {
  const db = createServiceClient();

  try {
    const result = db.prepare(`
      SELECT id, name, message, company_name
      FROM campaigns
      WHERE id = ?
    `).get(campaignId) as { id: string; name: string; message: string; company_name: string } | undefined;

    return result || null;
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return null;
  }
}
