import { NextResponse, NextRequest } from "next/server";
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from "@/lib/utils/api-response";

/**
 * GET /api/analytics/recent-activity
 *
 * MIGRATED TO SUPABASE - NO SQLite dependencies
 *
 * Returns recent events and conversions
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20", 10);

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

    // Get campaigns for this organization
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id')
      .eq('organization_id', profile.organization_id);

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json(successResponse([], "No recent activity"));
    }

    const campaignIds = campaigns.map((c: any) => c.id);

    // Get recent events
    const { data: events } = await supabase
      .from('events')
      .select('*, campaign_recipients(name, email)')
      .in('campaign_id', campaignIds)
      .order('created_at', { ascending: false })
      .limit(Math.floor(limit / 2));

    // Get recent conversions
    const { data: conversions } = await supabase
      .from('conversions')
      .select('*, campaign_recipients(name, email)')
      .in('campaign_id', campaignIds)
      .order('created_at', { ascending: false })
      .limit(Math.floor(limit / 2));

    // Combine and format activities
    const activities = [
      ...(events || []).map((e: any) => ({
        type: e.event_type,
        recipientName: e.campaign_recipients?.name || 'Unknown',
        recipientEmail: e.campaign_recipients?.email || '',
        timestamp: e.created_at,
        campaignId: e.campaign_id,
      })),
      ...(conversions || []).map((c: any) => ({
        type: 'conversion',
        conversionType: c.conversion_type,
        recipientName: c.campaign_recipients?.name || 'Unknown',
        recipientEmail: c.campaign_recipients?.email || '',
        timestamp: c.created_at,
        campaignId: c.campaign_id,
      })),
    ];

    // Sort by timestamp descending and limit
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json(
      successResponse(activities.slice(0, limit), "Recent activity retrieved successfully")
    );
  } catch (error) {
    console.error("[Recent Activity API] Error:", error);
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to fetch recent activity",
        "FETCH_ERROR"
      ),
      { status: 500 }
    );
  }
}
