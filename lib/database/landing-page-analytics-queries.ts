/**
 * Landing Page Analytics Queries
 *
 * Aggregates analytics data for landing pages including:
 * - Page views and QR scans
 * - Conversion counts and rates
 * - Campaign attribution
 *
 * Phase 9.2.13 - Landing Page Manager
 */

import { createClient } from '@/lib/supabase/server';

export interface LandingPageAnalytics {
  views: number;
  scans: number;
  conversions: number;
  conversion_rate: number;
}

export interface LandingPageWithAnalytics {
  id: string;
  campaign_id: string;
  campaign_name: string;
  template_type: string;
  tracking_code: string;
  page_config: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  analytics: LandingPageAnalytics;
}

/**
 * Get all landing pages for an organization with analytics data
 */
export async function getLandingPagesWithAnalytics(
  organizationId: string
): Promise<LandingPageWithAnalytics[]> {
  const supabase = await createClient();

  // Get all landing pages for organization via campaigns
  const { data: landingPages, error: pagesError } = await supabase
    .from('landing_pages')
    .select(`
      *,
      campaigns!inner(
        id,
        name,
        organization_id
      )
    `)
    .eq('campaigns.organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (pagesError) {
    console.error('Error fetching landing pages:', pagesError);
    return [];
  }

  if (!landingPages || landingPages.length === 0) {
    return [];
  }

  // Enrich each landing page with analytics
  const enrichedPages = await Promise.all(
    landingPages.map(async (page) => {
      try {
        // Count page views (both page_view and qr_scan events)
        const { count: views } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('tracking_code', page.tracking_code)
          .in('event_type', ['page_view', 'qr_scan']);

        // Count QR scans specifically
        const { count: scans } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('tracking_code', page.tracking_code)
          .eq('event_type', 'qr_scan');

        // Count conversions
        const { count: conversions } = await supabase
          .from('conversions')
          .select('*', { count: 'exact', head: true })
          .eq('tracking_code', page.tracking_code);

        // Calculate conversion rate
        const totalViews = views || 0;
        const totalConversions = conversions || 0;
        const conversionRate = totalViews > 0
          ? (totalConversions / totalViews) * 100
          : 0;

        return {
          id: page.id,
          campaign_id: page.campaign_id,
          campaign_name: page.campaigns.name,
          template_type: page.template_type || 'default',
          tracking_code: page.tracking_code,
          page_config: page.page_config,
          is_active: page.is_active,
          created_at: page.created_at,
          updated_at: page.updated_at,
          analytics: {
            views: totalViews,
            scans: scans || 0,
            conversions: totalConversions,
            conversion_rate: conversionRate,
          },
        };
      } catch (error) {
        console.error(`Error fetching analytics for landing page ${page.id}:`, error);

        // Return page with zero analytics if error
        return {
          id: page.id,
          campaign_id: page.campaign_id,
          campaign_name: page.campaigns.name,
          template_type: page.template_type || 'default',
          tracking_code: page.tracking_code,
          page_config: page.page_config,
          is_active: page.is_active,
          created_at: page.created_at,
          updated_at: page.updated_at,
          analytics: {
            views: 0,
            scans: 0,
            conversions: 0,
            conversion_rate: 0,
          },
        };
      }
    })
  );

  return enrichedPages;
}

/**
 * Get analytics for a single landing page
 */
export async function getLandingPageAnalytics(
  trackingCode: string
): Promise<LandingPageAnalytics> {
  const supabase = await createClient();

  try {
    // Count views
    const { count: views } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('tracking_code', trackingCode)
      .in('event_type', ['page_view', 'qr_scan']);

    // Count scans
    const { count: scans } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('tracking_code', trackingCode)
      .eq('event_type', 'qr_scan');

    // Count conversions
    const { count: conversions } = await supabase
      .from('conversions')
      .select('*', { count: 'exact', head: true })
      .eq('tracking_code', trackingCode);

    const totalViews = views || 0;
    const totalConversions = conversions || 0;

    return {
      views: totalViews,
      scans: scans || 0,
      conversions: totalConversions,
      conversion_rate: totalViews > 0 ? (totalConversions / totalViews) * 100 : 0,
    };
  } catch (error) {
    console.error('Error fetching landing page analytics:', error);
    return {
      views: 0,
      scans: 0,
      conversions: 0,
      conversion_rate: 0,
    };
  }
}
