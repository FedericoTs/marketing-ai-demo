import { NextResponse, NextRequest } from "next/server";
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from "@/lib/utils/api-response";

/**
 * GET /api/analytics/charts
 *
 * MIGRATED TO SUPABASE - NO SQLite dependencies
 *
 * Query params:
 * - type: "timeseries" | "funnel" | "comparison"
 * - campaignId (optional): Filter by specific campaign
 * - startDate (optional): Start date filter
 * - endDate (optional): End date filter
 * - campaignIds (optional): Comma-separated campaign IDs for comparison
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");
    const campaignId = searchParams.get("campaignId");
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const campaignIds = searchParams.get("campaignIds");

    if (!type) {
      return NextResponse.json(
        errorResponse("Missing 'type' parameter", "MISSING_TYPE"),
        { status: 400 }
      );
    }

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

    const organizationId = profile.organization_id;

    switch (type) {
      case "timeseries":
        // Get time-series analytics data
        const timeseriesData = await getTimeSeriesData(
          supabase,
          organizationId,
          campaignId || undefined,
          startDate,
          endDate
        );
        return NextResponse.json(
          successResponse(timeseriesData, "Timeseries data retrieved successfully")
        );

      case "funnel":
        // Get funnel data
        const funnelData = await getFunnelData(
          supabase,
          organizationId,
          campaignId || undefined
        );
        return NextResponse.json(
          successResponse(funnelData, "Funnel data retrieved successfully")
        );

      case "comparison":
        if (!campaignIds) {
          return NextResponse.json(
            errorResponse("Missing 'campaignIds' parameter for comparison", "MISSING_CAMPAIGN_IDS"),
            { status: 400 }
          );
        }
        const ids = campaignIds.split(",");
        const comparisonData = await getCampaignsComparisonData(
          supabase,
          organizationId,
          ids
        );
        return NextResponse.json(
          successResponse(comparisonData, "Comparison data retrieved successfully")
        );

      default:
        return NextResponse.json(
          errorResponse(`Invalid chart type: ${type}`, "INVALID_TYPE"),
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[Charts API] Error fetching chart data:", error);
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to fetch chart data",
        "FETCH_ERROR"
      ),
      { status: 500 }
      );
  }
}

// ============================================================================
// Supabase Helper Functions (NO SQLite)
// ============================================================================

/**
 * Get time-series analytics data from Supabase
 */
async function getTimeSeriesData(
  supabase: any,
  organizationId: string,
  campaignId?: string,
  startDate?: string,
  endDate?: string
) {
  // Get campaigns for this organization
  let campaignsQuery = supabase
    .from('campaigns')
    .select('id')
    .eq('organization_id', organizationId);

  if (campaignId) {
    campaignsQuery = campaignsQuery.eq('id', campaignId);
  }

  const { data: campaigns } = await campaignsQuery;
  const campaignIds = campaigns?.map((c: any) => c.id) || [];

  // Generate full date range (even if no data)
  const dateMap: Record<string, { date: string; pageViews: number; conversions: number; calls: number; uniqueVisitors: number }> = {};

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dateMap[dateStr] = { date: dateStr, pageViews: 0, conversions: 0, calls: 0, uniqueVisitors: 0 };
    }
  }

  // Get events grouped by date
  if (campaignIds.length > 0) {
    let eventsQuery = supabase
      .from('events')
      .select('created_at, event_type')
      .in('campaign_id', campaignIds);

    if (startDate) {
      eventsQuery = eventsQuery.gte('created_at', startDate);
    }
    if (endDate) {
      eventsQuery = eventsQuery.lte('created_at', endDate);
    }

    const { data: events } = await eventsQuery;

    // Get conversions grouped by date
    let conversionsQuery = supabase
      .from('conversions')
      .select('created_at')
      .in('campaign_id', campaignIds);

    if (startDate) {
      conversionsQuery = conversionsQuery.gte('created_at', startDate);
    }
    if (endDate) {
      conversionsQuery = conversionsQuery.lte('created_at', endDate);
    }

    const { data: conversions } = await conversionsQuery;

    // Process events
    events?.forEach((event: any) => {
      const date = event.created_at.split('T')[0]; // YYYY-MM-DD
      if (!dateMap[date]) {
        dateMap[date] = { date, pageViews: 0, conversions: 0, calls: 0, uniqueVisitors: 0 };
      }
      if (event.event_type === 'page_view') {
        dateMap[date].pageViews += 1;
        dateMap[date].uniqueVisitors += 1; // Simplified - should count unique recipients
      }
    });

    // Process conversions
    conversions?.forEach((conversion: any) => {
      const date = conversion.created_at.split('T')[0];
      if (!dateMap[date]) {
        dateMap[date] = { date, pageViews: 0, conversions: 0, calls: 0, uniqueVisitors: 0 };
      }
      dateMap[date].conversions += 1;
    });
  }

  // Get ElevenLabs calls for organization (include unattributed calls)
  let callsQuery = supabase
    .from('elevenlabs_calls')
    .select('start_time, call_successful')
    .eq('organization_id', organizationId);

  if (startDate) {
    callsQuery = callsQuery.gte('start_time', startDate);
  }
  if (endDate) {
    callsQuery = callsQuery.lte('start_time', endDate);
  }

  const { data: calls } = await callsQuery;

  // Process calls
  calls?.forEach((call: any) => {
    const date = call.start_time.split('T')[0];
    if (!dateMap[date]) {
      dateMap[date] = { date, pageViews: 0, conversions: 0, calls: 0, uniqueVisitors: 0 };
    }
    dateMap[date].calls += 1;
  });

  // Convert to array and sort by date
  return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get funnel data from Supabase
 */
async function getFunnelData(
  supabase: any,
  organizationId: string,
  campaignId?: string
) {
  // Get campaigns for this organization
  let campaignsQuery = supabase
    .from('campaigns')
    .select('id, total_recipients')
    .eq('organization_id', organizationId);

  if (campaignId) {
    campaignsQuery = campaignsQuery.eq('id', campaignId);
  }

  const { data: campaigns } = await campaignsQuery;

  if (!campaigns || campaigns.length === 0) {
    return [];
  }

  const campaignIds = campaigns.map((c: any) => c.id);
  const totalRecipients = campaigns.reduce((sum: number, c: any) => sum + (c.total_recipients || 0), 0);

  // Count events
  const { count: pageViews } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .in('campaign_id', campaignIds)
    .eq('event_type', 'page_view');

  // Count conversions
  const { count: conversions } = await supabase
    .from('conversions')
    .select('*', { count: 'exact', head: true })
    .in('campaign_id', campaignIds);

  // Build funnel stages
  const funnel = [
    {
      stage: "Recipients",
      count: totalRecipients,
      percentage: 100,
    },
    {
      stage: "Visited Landing Page",
      count: pageViews || 0,
      percentage: totalRecipients > 0 ? Number((((pageViews || 0) / totalRecipients) * 100).toFixed(1)) : 0,
    },
    {
      stage: "Converted",
      count: conversions || 0,
      percentage: totalRecipients > 0 ? Number((((conversions || 0) / totalRecipients) * 100).toFixed(1)) : 0,
    },
  ];

  return funnel;
}

/**
 * Get campaign comparison data from Supabase
 */
async function getCampaignsComparisonData(
  supabase: any,
  organizationId: string,
  campaignIds: string[]
) {
  const results = [];

  for (const id of campaignIds) {
    // Get campaign details
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, name, total_recipients')
      .eq('id', id)
      .eq('organization_id', organizationId) // Security: ensure belongs to org
      .single();

    if (!campaign) continue;

    // Count events
    const { count: pageViews } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', id)
      .eq('event_type', 'page_view');

    // Count conversions
    const { count: conversions } = await supabase
      .from('conversions')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', id);

    results.push({
      id: campaign.id,
      name: campaign.name,
      totalRecipients: campaign.total_recipients || 0,
      uniqueVisitors: pageViews || 0,
      totalConversions: conversions || 0,
      conversionRate: (campaign.total_recipients && campaign.total_recipients > 0)
        ? Number((((conversions || 0) / campaign.total_recipients) * 100).toFixed(1))
        : 0,
    });
  }

  return results;
}
