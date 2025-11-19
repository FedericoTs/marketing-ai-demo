import { NextResponse, NextRequest } from "next/server";
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from "@/lib/utils/api-response";

/**
 * GET /api/analytics/campaigns
 *
 * MIGRATED TO SUPABASE - NO SQLite dependencies
 *
 * Returns all campaigns for the authenticated user's organization with stats
 */
export async function GET(request: NextRequest) {
  try {
    // Get organization ID from authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        errorResponse('Unauthorized', 'AUTH_ERROR'),
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return NextResponse.json(
        errorResponse('Organization not found', 'ORG_ERROR'),
        { status: 404 }
      );
    }

    // Get all campaigns for this organization with template thumbnails
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select(`
        *,
        template:design_templates(thumbnail_url)
      `)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });

    if (campaignsError) {
      console.error('[Campaigns API] Error fetching campaigns:', campaignsError);
      return NextResponse.json(
        errorResponse('Failed to fetch campaigns', 'FETCH_ERROR'),
        { status: 500 }
      );
    }

    // PERFORMANCE OPTIMIZATION: Batch fetch all stats in 2 queries instead of 2*N queries
    const campaignIds = campaigns?.map(c => c.id) || [];

    // Batch query 1: Get all page view events for all campaigns
    const { data: allPageViewEvents } = await supabase
      .from('events')
      .select('campaign_id, recipient_id')
      .in('campaign_id', campaignIds)
      .eq('event_type', 'page_view');

    // Batch query 2: Get all conversions grouped by campaign
    const { data: allConversions } = await supabase
      .from('conversions')
      .select('campaign_id')
      .in('campaign_id', campaignIds);

    // Group events by campaign_id
    const eventsByCampaign = new Map<string, Set<string>>();
    allPageViewEvents?.forEach(event => {
      if (!eventsByCampaign.has(event.campaign_id)) {
        eventsByCampaign.set(event.campaign_id, new Set());
      }
      if (event.recipient_id) {
        eventsByCampaign.get(event.campaign_id)!.add(event.recipient_id);
      }
    });

    // Group conversions by campaign_id
    const conversionsByCampaign = new Map<string, number>();
    allConversions?.forEach(conversion => {
      const count = conversionsByCampaign.get(conversion.campaign_id) || 0;
      conversionsByCampaign.set(conversion.campaign_id, count + 1);
    });

    // Enrich campaigns with pre-fetched stats
    const campaignsWithStats = (campaigns || []).map((campaign: any) => {
      const uniqueVisitors = eventsByCampaign.get(campaign.id)?.size || 0;
      const totalConversions = conversionsByCampaign.get(campaign.id) || 0;

      const conversionRate = (campaign.total_recipients && campaign.total_recipients > 0)
        ? ((totalConversions / campaign.total_recipients) * 100)
        : 0;

      return {
        ...campaign,
        totalRecipients: campaign.total_recipients || 0,
        uniqueVisitors,
        totalConversions,
        conversionRate: Number(conversionRate.toFixed(1)),
        templateThumbnail: campaign.template?.thumbnail_url || null,
        template: undefined, // Remove nested object after extracting thumbnail
      };
    });

    return NextResponse.json(
      successResponse(campaignsWithStats, "Campaigns retrieved successfully")
    );
  } catch (error) {
    console.error("[Campaigns API] Error fetching campaigns:", error);
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to fetch campaigns",
        "FETCH_ERROR"
      ),
      { status: 500 }
    );
  }
}
