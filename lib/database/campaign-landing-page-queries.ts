/**
 * Campaign Landing Page Queries
 *
 * Synchronous queries for campaign and landing page data
 * Used by the landing page preview route
 */

import { createServiceClient } from '@/lib/supabase/server';

export interface Campaign {
  id: string;
  name: string;
  message?: string;
  company_name?: string;
  status?: string;
}

export interface CampaignLandingPage {
  id: string;
  campaign_id: string;
  campaign_template_id: string | null;
  page_config: string;
  created_at: string;
  updated_at?: string;
}

export interface CampaignLandingPageConfig {
  title: string;
  message: string;
  companyName: string;
  formFields?: string[];
  ctaText?: string;
  thankYouMessage?: string;
  fallbackMessage?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  // Additional properties for landing page rendering
  logoUrl?: string;
  ctaUrl?: string;
  imageUrl?: string;
  template?: string;
  templateId?: string;
}

export interface Recipient {
  id: string;
  campaign_id: string;
  name: string;
  lastname: string;
  // CamelCase aliases for compatibility
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  tracking_id?: string;
  created_at?: string;
}

// Alias for backwards compatibility
export type RecipientData = Recipient;

/**
 * Get recipient by ID (synchronous wrapper)
 * Returns placeholder - actual data should be fetched via async version
 */
export function getRecipientById(recipientId: string): Recipient | null {
  console.log('[Recipient] Getting recipient:', recipientId);
  // Synchronous placeholder - use getRecipientByIdAsync for actual data
  return null;
}

/**
 * Async version - Get recipient by ID
 */
export async function getRecipientByIdAsync(recipientId: string): Promise<Recipient | null> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('recipients')
      .select('id, campaign_id, name, lastname, email, phone, address, city, state, zip, created_at')
      .eq('id', recipientId)
      .single();

    if (error) {
      console.error('[Recipient] Error fetching recipient:', error);
      return null;
    }

    return data as Recipient;
  } catch (error) {
    console.error('[Recipient] Unexpected error:', error);
    return null;
  }
}

/**
 * Get campaign by ID (synchronous wrapper for preview)
 * Returns mock/cached data for server component compatibility
 */
export function getCampaign(campaignId: string): Campaign | null {
  // Note: This is a synchronous function for server components
  // In production, this should be converted to async or use cached data
  console.log('[Campaign] Getting campaign:', campaignId);

  // Return a placeholder that will be hydrated on the client
  // The actual data should be fetched async in the component
  return {
    id: campaignId,
    name: 'Campaign Preview',
    message: 'Welcome to your campaign landing page',
    company_name: 'DropLab',
    status: 'draft',
  };
}

/**
 * Get campaign landing page configuration
 * Returns saved customization for a campaign
 */
export function getCampaignLandingPage(campaignId: string): CampaignLandingPage | null {
  // Note: This is a synchronous function for server components
  // Returns null to use default template configuration
  console.log('[CampaignLandingPage] Getting landing page config for:', campaignId);

  // Return null to fall back to template defaults
  // The actual customization is loaded via the configParam in query string
  return null;
}

/**
 * Async version - Get campaign by ID
 */
export async function getCampaignAsync(campaignId: string): Promise<Campaign | null> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('campaigns')
      .select('id, name, message, company_name, status')
      .eq('id', campaignId)
      .single();

    if (error) {
      console.error('[Campaign] Error fetching campaign:', error);
      return null;
    }

    return data as Campaign;
  } catch (error) {
    console.error('[Campaign] Unexpected error:', error);
    return null;
  }
}

/**
 * Async version - Get campaign landing page by campaign ID
 */
export async function getCampaignLandingPageAsync(
  campaignId: string
): Promise<CampaignLandingPage | null> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('campaign_landing_pages')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - not an error, just no saved config
        return null;
      }
      console.error('[CampaignLandingPage] Error fetching:', error);
      return null;
    }

    return data as CampaignLandingPage;
  } catch (error) {
    console.error('[CampaignLandingPage] Unexpected error:', error);
    return null;
  }
}

/**
 * Get landing page configuration parsed from JSON
 */
export function getCampaignLandingPageConfig(
  landingPage: CampaignLandingPage | null
): CampaignLandingPageConfig | null {
  if (!landingPage || !landingPage.page_config) {
    return null;
  }

  try {
    return JSON.parse(landingPage.page_config) as CampaignLandingPageConfig;
  } catch (error) {
    console.error('[CampaignLandingPage] Error parsing config:', error);
    return null;
  }
}

/**
 * Upsert campaign landing page configuration
 */
export async function upsertCampaignLandingPage(
  campaignId: string,
  config: CampaignLandingPageConfig,
  templateId?: string | null
): Promise<{ success: boolean; error?: string; data?: CampaignLandingPage }> {
  try {
    const supabase = createServiceClient();

    const pageConfig = JSON.stringify(config);

    // Check if a landing page already exists for this campaign
    const { data: existing } = await supabase
      .from('campaign_landing_pages')
      .select('id')
      .eq('campaign_id', campaignId)
      .limit(1)
      .single();

    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from('campaign_landing_pages')
        .update({
          page_config: pageConfig,
          campaign_template_id: templateId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('[CampaignLandingPage] Error updating:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as CampaignLandingPage };
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from('campaign_landing_pages')
        .insert({
          campaign_id: campaignId,
          page_config: pageConfig,
          campaign_template_id: templateId || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[CampaignLandingPage] Error inserting:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as CampaignLandingPage };
    }
  } catch (error) {
    console.error('[CampaignLandingPage] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
