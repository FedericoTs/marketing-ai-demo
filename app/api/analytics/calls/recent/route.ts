import { NextResponse, NextRequest } from "next/server";
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from "@/lib/utils/api-response";

/**
 * GET /api/analytics/calls/recent
 *
 * MIGRATED TO SUPABASE - NO SQLite dependencies
 *
 * Returns recent calls from ElevenLabs calls table
 */
export async function GET(request: NextRequest) {
  try {
    // Get organization ID from authenticated user
    const supabaseAuth = await createClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        errorResponse('Unauthorized', 'AUTH_ERROR'),
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabaseAuth
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

    // Use service role client to bypass RLS (we manually filter by org_id for security)
    const supabase = createServiceClient();

    // Get recent calls for this organization
    const { data: calls, error: callsError } = await supabase
      .from('elevenlabs_calls')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('start_time', { ascending: false })
      .limit(50);

    if (callsError) {
      console.error('[Recent Calls API] Error:', callsError);
      return NextResponse.json(
        errorResponse('Failed to fetch recent calls', 'FETCH_ERROR'),
        { status: 500 }
      );
    }

    return NextResponse.json(
      successResponse(calls || [], "Recent calls retrieved successfully")
    );
  } catch (error) {
    console.error("[Recent Calls API] Error:", error);
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to fetch recent calls",
        "FETCH_ERROR"
      ),
      { status: 500 }
    );
  }
}
