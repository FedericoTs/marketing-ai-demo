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

    // Optional: Get agent ID from request body
    const body = await request.json().catch(() => ({}));
    const agentId = body.agentId as string | undefined;

    // Run sync
    console.log('[API] Starting call sync with agentId:', agentId || 'all');

    const result = await syncElevenLabsCalls(apiKey, agentId);

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
    // Check if this is a SQLite/better-sqlite3 error (common in WSL2)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isSQLiteError = errorMessage.includes('invalid ELF header') ||
                          errorMessage.includes('better_sqlite3');

    if (isSQLiteError) {
      console.warn('[API] ElevenLabs sync skipped - SQLite not available in this environment');
      // Return success with zero results (graceful degradation)
      return NextResponse.json(
        successResponse(
          {
            newCalls: 0,
            attributedCalls: 0,
            errors: [],
            lastSyncTimestamp: null,
            skipped: true,
            reason: 'SQLite not available (call tracking requires local database)',
          },
          'Call sync skipped - feature unavailable'
        )
      );
    }

    console.error('[API] Error in sync-elevenlabs-calls:', error);

    return NextResponse.json(
      errorResponse(
        `Failed to sync ElevenLabs calls: ${errorMessage}`,
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
