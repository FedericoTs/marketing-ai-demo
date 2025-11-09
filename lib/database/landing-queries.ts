/**
 * Landing Pages Database Queries
 * Type-safe Supabase queries for landing_pages table
 */

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import type {
  LandingPage,
  LandingPageInsert,
  LandingPageUpdate,
} from './types';

// ============================================================================
// PUBLIC QUERIES (No Authentication Required)
// ============================================================================

/**
 * Get landing page by tracking code (PUBLIC ACCESS)
 * Used by public landing page route /lp/[trackingCode]
 *
 * @param trackingCode - Unique tracking code
 * @returns Landing page data or null
 */
export async function getLandingPageByTrackingCode(
  trackingCode: string
): Promise<LandingPage | null> {
  try {
    // Use service client for public access (bypasses RLS)
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('tracking_code', trackingCode)
      .eq('is_active', true) // Only return active landing pages
      .single();

    if (error) {
      console.error('Error fetching landing page:', error);
      return null;
    }

    return data as LandingPage;
  } catch (error) {
    console.error('Unexpected error in getLandingPageByTrackingCode:', error);
    return null;
  }
}

// ============================================================================
// AUTHENTICATED QUERIES
// ============================================================================

/**
 * Get all landing pages for a campaign
 *
 * @param campaignId - Campaign UUID
 * @returns Array of landing pages
 */
export async function getLandingPagesByCampaign(
  campaignId: string
): Promise<LandingPage[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching campaign landing pages:', error);
      return [];
    }

    return (data || []) as LandingPage[];
  } catch (error) {
    console.error('Unexpected error in getLandingPagesByCampaign:', error);
    return [];
  }
}

/**
 * Create a new landing page
 *
 * @param landingPage - Landing page data to insert
 * @returns Created landing page or null
 */
export async function createLandingPage(
  landingPage: LandingPageInsert
): Promise<LandingPage | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('landing_pages')
      .insert(landingPage)
      .select()
      .single();

    if (error) {
      console.error('Error creating landing page:', error);
      return null;
    }

    return data as LandingPage;
  } catch (error) {
    console.error('Unexpected error in createLandingPage:', error);
    return null;
  }
}

/**
 * Create multiple landing pages (batch)
 *
 * @param landingPages - Array of landing page data to insert
 * @returns Created landing pages or empty array
 */
export async function createLandingPages(
  landingPages: LandingPageInsert[]
): Promise<LandingPage[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('landing_pages')
      .insert(landingPages)
      .select();

    if (error) {
      console.error('Error creating landing pages:', error);
      return [];
    }

    return (data || []) as LandingPage[];
  } catch (error) {
    console.error('Unexpected error in createLandingPages:', error);
    return [];
  }
}

/**
 * Update an existing landing page
 *
 * @param id - Landing page UUID
 * @param updates - Partial landing page data to update
 * @returns Updated landing page or null
 */
export async function updateLandingPage(
  id: string,
  updates: LandingPageUpdate
): Promise<LandingPage | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('landing_pages')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating landing page:', error);
      return null;
    }

    return data as LandingPage;
  } catch (error) {
    console.error('Unexpected error in updateLandingPage:', error);
    return null;
  }
}

/**
 * Update landing page by tracking code
 *
 * @param trackingCode - Unique tracking code
 * @param updates - Partial landing page data to update
 * @returns Updated landing page or null
 */
export async function updateLandingPageByTrackingCode(
  trackingCode: string,
  updates: LandingPageUpdate
): Promise<LandingPage | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('landing_pages')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('tracking_code', trackingCode)
      .select()
      .single();

    if (error) {
      console.error('Error updating landing page by tracking code:', error);
      return null;
    }

    return data as LandingPage;
  } catch (error) {
    console.error(
      'Unexpected error in updateLandingPageByTrackingCode:',
      error
    );
    return null;
  }
}

/**
 * Delete a landing page
 *
 * @param id - Landing page UUID
 * @returns True if successful
 */
export async function deleteLandingPage(id: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from('landing_pages').delete().eq('id', id);

    if (error) {
      console.error('Error deleting landing page:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error in deleteLandingPage:', error);
    return false;
  }
}

/**
 * Deactivate a landing page (soft delete)
 *
 * @param id - Landing page UUID
 * @returns True if successful
 */
export async function deactivateLandingPage(id: string): Promise<boolean> {
  try {
    const result = await updateLandingPage(id, { is_active: false });
    return result !== null;
  } catch (error) {
    console.error('Unexpected error in deactivateLandingPage:', error);
    return false;
  }
}

/**
 * Get landing page analytics summary for a campaign
 *
 * @param campaignId - Campaign UUID
 * @returns Analytics summary
 */
export async function getLandingPageAnalytics(campaignId: string): Promise<{
  total_pages: number;
  active_pages: number;
  total_views: number;
  total_conversions: number;
  conversion_rate: number;
}> {
  try {
    const supabase = await createClient();

    // Get landing pages count
    const { data: landingPages } = await supabase
      .from('landing_pages')
      .select('id, is_active')
      .eq('campaign_id', campaignId);

    const total_pages = landingPages?.length || 0;
    const active_pages =
      landingPages?.filter((lp) => lp.is_active).length || 0;

    // TODO: Get views and conversions from events/conversions tables
    // For now, return zeros (will implement with event tracking)
    const total_views = 0;
    const total_conversions = 0;
    const conversion_rate =
      total_views > 0 ? (total_conversions / total_views) * 100 : 0;

    return {
      total_pages,
      active_pages,
      total_views,
      total_conversions,
      conversion_rate,
    };
  } catch (error) {
    console.error('Unexpected error in getLandingPageAnalytics:', error);
    return {
      total_pages: 0,
      active_pages: 0,
      total_views: 0,
      total_conversions: 0,
      conversion_rate: 0,
    };
  }
}
