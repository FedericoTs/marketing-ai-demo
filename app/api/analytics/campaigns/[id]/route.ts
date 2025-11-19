import { NextResponse, NextRequest } from "next/server";
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from "@/lib/utils/api-response";

/**
 * GET /api/analytics/campaigns/[id]
 *
 * MIGRATED TO SUPABASE - NO SQLite dependencies
 *
 * Returns detailed analytics for a specific campaign
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .eq('organization_id', profile.organization_id) // Security: ensure belongs to org
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        errorResponse("Campaign not found", "CAMPAIGN_NOT_FOUND"),
        { status: 404 }
      );
    }

    // Get campaign stats
    const { count: pageViews } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', id)
      .eq('event_type', 'page_view');

    const { count: conversions } = await supabase
      .from('conversions')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', id);

    // Get call metrics for this campaign
    const { data: calls } = await supabase
      .from('elevenlabs_calls')
      .select('*')
      .eq('campaign_id', id);

    const callMetrics = {
      totalCalls: calls?.length || 0,
      successfulCalls: calls?.filter(c => c.call_successful)?.length || 0,
      appointmentsBooked: calls?.filter(c => c.appointment_booked)?.length || 0,
    };

    // Get calls by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentCalls } = await supabase
      .from('elevenlabs_calls')
      .select('start_time')
      .eq('campaign_id', id)
      .gte('start_time', thirtyDaysAgo.toISOString());

    // Group calls by day
    const callsByDay: Record<string, number> = {};
    recentCalls?.forEach(call => {
      const day = call.start_time.split('T')[0];
      callsByDay[day] = (callsByDay[day] || 0) + 1;
    });

    // Get all recipients with their journey data
    const { data: recipients } = await supabase
      .from('campaign_recipients')
      .select('*')
      .eq('campaign_id', id);

    const recipientsWithJourney = await Promise.all(
      (recipients || []).map(async (recipient) => {
        // Get events for this recipient
        const { count: recipientPageViews } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('recipient_id', recipient.id);

        // Get conversions for this recipient
        const { count: recipientConversions } = await supabase
          .from('conversions')
          .select('*', { count: 'exact', head: true })
          .eq('recipient_id', recipient.id);

        return {
          ...recipient,
          pageViews: recipientPageViews || 0,
          hasConverted: (recipientConversions || 0) > 0,
          eventsCount: recipientPageViews || 0,
          conversionsCount: recipientConversions || 0,
        };
      })
    );

    const analytics = {
      ...campaign,
      pageViews: pageViews || 0,
      conversions: conversions || 0,
      conversionRate: (campaign.total_recipients && campaign.total_recipients > 0)
        ? ((conversions || 0) / campaign.total_recipients) * 100
        : 0,
    };

    return NextResponse.json(
      successResponse(
        {
          ...analytics,
          callMetrics,
          callsByDay: Object.entries(callsByDay).map(([date, count]) => ({ date, count })),
          recipients: recipientsWithJourney,
        },
        "Campaign analytics with call metrics retrieved successfully"
      )
    );
  } catch (error) {
    console.error("[Campaign Details API] Error:", error);
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to fetch campaign analytics",
        "FETCH_ERROR"
      ),
      { status: 500 }
    );
  }
}
