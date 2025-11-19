import { NextResponse, NextRequest } from "next/server";
import { createClient } from '@/lib/supabase/server';
import { generateAllCampaignsCSV } from "@/lib/export/csv-exporter";
import { errorResponse } from "@/lib/utils/api-response";

/**
 * GET /api/analytics/campaigns/export
 *
 * MIGRATED TO SUPABASE - NO SQLite dependencies
 *
 * Export all campaigns with stats as CSV
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

    // Get all campaigns for this organization
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });

    if (campaignsError) {
      console.error('[Export API] Error fetching campaigns:', campaignsError);
      return NextResponse.json(
        errorResponse('Failed to fetch campaigns', 'FETCH_ERROR'),
        { status: 500 }
      );
    }

    // Enrich campaigns with stats
    const campaignsWithStats = await Promise.all(
      (campaigns || []).map(async (campaign) => {
        // Count unique visitors (distinct recipients who viewed pages)
        const { data: pageViewEvents } = await supabase
          .from('events')
          .select('recipient_id')
          .eq('campaign_id', campaign.id)
          .eq('event_type', 'page_view');

        const uniqueVisitors = new Set(
          pageViewEvents?.map(e => e.recipient_id).filter(Boolean)
        ).size;

        // Count total conversions
        const { count: totalConversions } = await supabase
          .from('conversions')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id);

        // Calculate conversion rate
        const conversionRate = (campaign.total_recipients && campaign.total_recipients > 0)
          ? ((totalConversions || 0) / campaign.total_recipients) * 100
          : 0;

        return {
          ...campaign,
          uniqueVisitors,
          totalConversions: totalConversions || 0,
          conversionRate: Number(conversionRate.toFixed(1)),
        };
      })
    );

    const csvContent = generateAllCampaignsCSV(campaignsWithStats);
    const filename = `all_campaigns_${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[Export API] Error exporting campaigns:", error);
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to export campaigns data",
        "EXPORT_ERROR"
      ),
      { status: 500 }
    );
  }
}
