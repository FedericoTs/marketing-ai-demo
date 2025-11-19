/**
 * API endpoint to sync ElevenLabs calls
 * POST /api/jobs/sync-elevenlabs-calls
 *
 * Can be called manually or scheduled via cron/BullMQ
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncElevenLabsCalls } from '@/lib/elevenlabs/call-sync';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function POST(request: NextRequest) {
  console.log('[API] Sync ElevenLabs calls endpoint called');

  try {
    // Get API key from environment
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        errorResponse(
          'ElevenLabs API key not configured. Please set ELEVENLABS_API_KEY in environment variables',
          'API_KEY_MISSING'
        ),
        { status: 500 }
      );
    }

    // Get organization ID from authenticated user
    const { createClient } = await import('@/lib/supabase/server');
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

    // Optional: Get agent ID from request body
    const body = await request.json().catch(() => ({}));
    const agentId = body.agentId as string | undefined;

    // Run sync
    console.log('[API] Starting call sync for org:', profile.organization_id, 'with agentId:', agentId || 'all');

    const result = await syncElevenLabsCalls(apiKey, profile.organization_id, agentId);

    // Return result
    if (result.success) {
      return NextResponse.json(
        successResponse(
          {
            newCalls: result.newCalls,
            attributedCalls: result.attributedCalls,
            errors: result.errors,
            lastSyncTimestamp: result.lastSyncTimestamp,
          },
          'Call sync completed successfully'
        )
      );
    } else {
      return NextResponse.json(
        errorResponse(
          'Call sync completed with errors',
          'SYNC_WITH_ERRORS'
        ),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API] Error in sync-elevenlabs-calls:', error);

    return NextResponse.json(
      errorResponse(
        `Failed to sync ElevenLabs calls: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SYNC_ERROR'
      ),
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check sync status
 */
export async function GET() {
  return NextResponse.json(
    successResponse(
      {
        usage: 'POST to this endpoint to trigger sync',
        methods: ['POST', 'GET'],
      },
      'ElevenLabs call sync endpoint'
    )
  );
}
