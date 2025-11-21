/**
 * Dashboard Metrics API
 *
 * Provides aggregated business intelligence for dashboard display:
 * - Campaign performance overview
 * - Recent campaigns list
 * - Performance insights
 *
 * Dashboard Improvement - Nov 21, 2025
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    const organizationId = profile.organization_id;

    // Parallel queries for performance
    const [
      campaignsResult,
      eventsResult,
      conversionsResult,
      templatesResult,
    ] = await Promise.all([
      // Get all campaigns with recipient counts
      supabase
        .from('campaigns')
        .select('id, name, status, total_recipients, created_at, sent_at, template_id')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false }),

      // Get all events for response rate calculation
      supabase
        .from('events')
        .select('id, campaign_id, event_type, created_at')
        .in('campaign_id', await getCampaignIds(supabase, organizationId)),

      // Get all conversions for ROI calculation
      supabase
        .from('conversions')
        .select('id, campaign_id, conversion_type, conversion_value, created_at')
        .in('campaign_id', await getCampaignIds(supabase, organizationId)),

      // Get templates for top performer
      supabase
        .from('design_templates')
        .select('id, name, thumbnail_url')
        .eq('organization_id', organizationId),
    ]);

    const campaigns = campaignsResult.data || [];
    const events = eventsResult.data || [];
    const conversions = conversionsResult.data || [];
    const templates = templatesResult.data || [];

    // Calculate metrics
    const totalCampaigns = campaigns.length;
    const sentCampaigns = campaigns.filter((c) => c.status === 'sent' || c.status === 'completed');
    const activeCampaigns = campaigns.filter((c) => c.status === 'sending' || c.status === 'scheduled');

    // Calculate response rate (events / total recipients)
    const totalRecipients = sentCampaigns.reduce((sum, c) => sum + c.total_recipients, 0);
    const totalEvents = events.length;
    const responseRate = totalRecipients > 0 ? (totalEvents / totalRecipients) * 100 : 0;

    // Calculate ROI (conversions value sum)
    const totalRevenue = conversions.reduce((sum, c) => sum + (c.conversion_value || 0), 0);

    // Recent campaigns (last 5)
    const recentCampaigns = campaigns.slice(0, 5).map((c) => {
      const campaignEvents = events.filter((e) => e.campaign_id === c.id);
      const campaignConversions = conversions.filter((cv) => cv.campaign_id === c.id);
      const campaignResponseRate = c.total_recipients > 0
        ? (campaignEvents.length / c.total_recipients) * 100
        : 0;

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        recipients: c.total_recipients,
        responseRate: campaignResponseRate,
        conversions: campaignConversions.length,
        createdAt: c.created_at,
        sentAt: c.sent_at,
      };
    });

    // Top performing template (by response rate)
    let topTemplate = null;
    if (templates.length > 0 && sentCampaigns.length > 0) {
      const templatePerformance = templates.map((template) => {
        const templateCampaigns = sentCampaigns.filter((c) => c.template_id === template.id);
        const templateRecipients = templateCampaigns.reduce((sum, c) => sum + c.total_recipients, 0);
        const templateEvents = events.filter((e) =>
          templateCampaigns.some((c) => c.id === e.campaign_id)
        );
        const rate = templateRecipients > 0 ? (templateEvents.length / templateRecipients) * 100 : 0;

        return {
          id: template.id,
          name: template.name,
          thumbnailUrl: template.thumbnail_url,
          responseRate: rate,
          campaignsUsed: templateCampaigns.length,
        };
      });

      const sorted = templatePerformance.sort((a, b) => b.responseRate - a.responseRate);
      topTemplate = sorted[0] || null;
    }

    // Best performing audience (by state/city from events)
    const locationPerformance: Record<string, { events: number; name: string }> = {};
    events.forEach((event) => {
      const location = event.region || event.city || 'Unknown';
      if (!locationPerformance[location]) {
        locationPerformance[location] = { events: 0, name: location };
      }
      locationPerformance[location].events += 1;
    });

    const topLocations = Object.values(locationPerformance)
      .sort((a, b) => b.events - a.events)
      .slice(0, 3);

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalCampaigns: totalCampaigns,
          sentCampaigns: sentCampaigns.length,
          activeCampaigns: activeCampaigns.length,
          responseRate: responseRate,
          totalRevenue: totalRevenue,
          totalEvents: totalEvents,
          totalConversions: conversions.length,
        },
        recentCampaigns: recentCampaigns,
        insights: {
          topTemplate: topTemplate,
          topLocations: topLocations,
        },
      },
    });
  } catch (error) {
    console.error('[Dashboard Metrics] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Helper to get campaign IDs for the organization
async function getCampaignIds(supabase: any, organizationId: string): Promise<string[]> {
  const { data } = await supabase
    .from('campaigns')
    .select('id')
    .eq('organization_id', organizationId);

  return data ? data.map((c: any) => c.id) : [];
}
