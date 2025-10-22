/**
 * API endpoint to sync ElevenLabs calls
 * POST /api/jobs/sync-elevenlabs-calls
 *
 * Can be called manually or scheduled via cron/BullMQ
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncElevenLabsCalls } from '@/lib/elevenlabs/call-sync';

export async function POST(request: NextRequest) {
  console.log('[API] Sync ElevenLabs calls endpoint called');

  try {
    // Get API key from environment
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'ElevenLabs API key not configured',
          message: 'Please set ELEVENLABS_API_KEY in environment variables',
        },
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
      return NextResponse.json({
        success: true,
        message: 'Call sync completed successfully',
        data: {
          newCalls: result.newCalls,
          attributedCalls: result.attributedCalls,
          errors: result.errors,
          lastSyncTimestamp: result.lastSyncTimestamp,
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'Call sync completed with errors',
          data: {
            newCalls: result.newCalls,
            attributedCalls: result.attributedCalls,
            errors: result.errors,
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API] Error in sync-elevenlabs-calls:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to sync ElevenLabs calls',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check sync status
 */
export async function GET() {
  return NextResponse.json({
    message: 'ElevenLabs call sync endpoint',
    usage: 'POST to this endpoint to trigger sync',
    methods: ['POST', 'GET'],
  });
}
