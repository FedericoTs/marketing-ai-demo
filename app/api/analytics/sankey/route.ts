import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { createClient } from '@/lib/supabase/server';
import { getSankeyChartData } from "@/lib/database/analytics-supabase-queries";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    console.log('[Sankey API] Request received:', {
      startDate,
      endDate,
      hasStartDate: !!startDate,
      hasEndDate: !!endDate
    });

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        errorResponse('Unauthorized', 'AUTH_ERROR'),
        { status: 401 }
      );
    }

    // Get user's organization
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

    // Get Sankey chart data for this organization
    const data = await getSankeyChartData(profile.organization_id, startDate, endDate);

    console.log('[Sankey API] Data returned:', {
      nodesCount: data.nodes.length,
      linksCount: data.links.length,
      metrics: data.metrics
    });

    if (data.links.length === 0) {
      console.warn('[Sankey API] ⚠️  WARNING: No links generated! This will show "No data" message.');
      console.warn('[Sankey API] Debug info:', {
        nodes: data.nodes.map(n => n.name),
        metrics: data.metrics
      });
    }

    return NextResponse.json(
      successResponse(data, "Sankey chart data retrieved successfully")
    );
  } catch (error) {
    console.error("[Sankey API] ❌ Error fetching Sankey chart data:", error);
    console.error("[Sankey API] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      errorResponse(
        "Failed to fetch Sankey chart data",
        "FETCH_ERROR"
      ),
      { status: 500 }
    );
  }
}
