/**
 * ElevenLabs Webhook Endpoint
 * Receives real-time call events from ElevenLabs
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  upsertElevenLabsCallSupabase,
  attributeCallToCampaignSupabase,
} from '@/lib/database/call-tracking-supabase-queries';
import {
  validateWebhookRequest,
  logWebhookAttempt,
  checkRateLimit,
} from '@/lib/elevenlabs/webhook-handler';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

interface ElevenLabsWebhookPayload {
  event: 'conversation.ended' | string;
  conversation_id: string;
  agent_id?: string;
  agent_name?: string;

  // Call metadata
  start_time_unix_secs?: number;
  start_time_unix?: number;
  call_duration_secs?: number;
  call_duration_seconds?: number;
  call_successful?: 'success' | 'failure' | 'unknown';

  // Phone numbers
  phone_number?: string;
  caller_phone?: string;

  // Conversation data
  transcript?: {
    messages: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: number;
    }>;
  };

  // Analysis
  analysis?: {
    sentiment?: string;
    intent?: string;
    outcome?: string;
  };

  // Custom metadata
  metadata?: Record<string, any>;
}

/**
 * POST /api/webhooks/elevenlabs
 * Handles incoming webhook notifications from ElevenLabs
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Validate webhook request (security checks)
    const validation = await validateWebhookRequest(request);

    if (!validation.valid) {
      console.error('[Webhook Security] Validation failed:', validation.error);
      logWebhookAttempt('unknown', validation.ip || 'unknown', false, validation.error);

      return NextResponse.json(
        errorResponse(validation.error || 'Webhook validation failed', 'VALIDATION_ERROR'),
        { status: 403 }
      );
    }

    // 2. Rate limiting (100 requests per minute per IP)
    const rateLimitKey = validation.ip || 'unknown';
    if (!checkRateLimit(rateLimitKey, 100, 60000)) {
      console.error('[Webhook Security] Rate limit exceeded for:', rateLimitKey);
      logWebhookAttempt('unknown', rateLimitKey, false, 'Rate limit exceeded');

      return NextResponse.json(
        errorResponse('Rate limit exceeded', 'RATE_LIMIT_ERROR'),
        { status: 429 }
      );
    }

    // 3. Parse webhook payload
    const payload: ElevenLabsWebhookPayload = await request.json();

    console.log('[Webhook] Received ElevenLabs webhook:', {
      event: payload.event,
      conversation_id: payload.conversation_id,
      agent_id: payload.agent_id || payload.agent_name,
    });

    // Validate required fields
    if (!payload.conversation_id) {
      console.error('[Webhook] Missing conversation_id in payload');
      return NextResponse.json(
        errorResponse('Missing conversation_id', 'MISSING_CONVERSATION_ID'),
        { status: 400 }
      );
    }

    // Only process conversation.ended events (ignore other event types)
    if (payload.event && payload.event !== 'conversation.ended') {
      console.log('[Webhook] Ignoring event type:', payload.event);
      return NextResponse.json(
        successResponse(null, 'Event ignored')
      );
    }

    // Convert webhook payload to call record
    const callRecord = convertWebhookToCall(payload);

    // Note: Attribution skipped in webhook (no organization context)
    // The sync job will handle attribution with proper organization context
    console.log('[Webhook] Attribution deferred to sync job (no org context in webhook)');

    // Store in database (upsert to handle duplicates)
    // organization_id will be NULL - sync job will fill it in later
    const result = await upsertElevenLabsCallSupabase(callRecord);

    if (!result.success) {
      console.error('[Webhook] Failed to store call:', result.error);
      throw new Error(result.error || 'Failed to upsert call');
    }

    const duration = Date.now() - startTime;
    console.log('[Webhook] Call stored successfully:', {
      elevenlabs_call_id: callRecord.elevenlabs_call_id,
      conversation_id: payload.conversation_id,
      duration_ms: duration,
    });

    // Log successful webhook attempt
    logWebhookAttempt(payload.conversation_id, validation.ip || 'unknown', true);

    // Return 200 OK quickly to acknowledge webhook
    return NextResponse.json(
      successResponse(
        {
          elevenlabs_call_id: callRecord.elevenlabs_call_id,
          conversation_id: payload.conversation_id,
          attributed: false, // Attribution deferred to sync job
        },
        'Webhook processed successfully'
      )
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Webhook] Error processing webhook:', error);
    console.error('[Webhook] Processing duration:', duration, 'ms');

    // ⚠️ WEBHOOK PATTERN: Return 200 OK even on error to prevent webhook retries
    // Webhooks should return 200 to acknowledge receipt, even if processing fails
    // Log error for manual investigation
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      errorResponse(
        `Webhook received but processing failed: ${errorMessage}`,
        'WEBHOOK_PROCESSING_ERROR'
      ),
      { status: 200 } // Intentional 200 to prevent ElevenLabs from retrying
    );
  }
}

/**
 * Convert webhook payload to call record format
 */
function convertWebhookToCall(payload: ElevenLabsWebhookPayload): {
  elevenlabs_call_id: string;
  agent_id?: string;
  phone_number?: string;
  call_status?: string;
  call_duration_seconds?: number;
  start_time?: string;
  end_time?: string;
  call_successful?: boolean;
  raw_data?: Record<string, unknown>;
  organization_id?: string; // Will be NULL for webhooks
  campaign_id?: string;
  recipient_id?: string;
} {
  // Extract actual field names (handle variants)
  const startTimeUnix =
    (payload.start_time_unix_secs || payload.start_time_unix) as number | undefined;
  const callDuration =
    (payload.call_duration_secs || payload.call_duration_seconds) as number | undefined;

  // Convert Unix timestamp to ISO 8601 string
  const startedAt = startTimeUnix
    ? new Date(startTimeUnix * 1000).toISOString()
    : new Date().toISOString();

  // Calculate end time if we have start time and duration
  let endedAt: string | undefined;
  if (startTimeUnix && callDuration) {
    endedAt = new Date((startTimeUnix + callDuration) * 1000).toISOString();
  }

  return {
    elevenlabs_call_id: payload.conversation_id,
    agent_id: (payload.agent_id || payload.agent_name) as string | undefined,
    phone_number: payload.caller_phone, // Caller's phone number
    call_status: payload.call_successful || 'unknown',
    call_duration_seconds: callDuration,
    start_time: startedAt,
    end_time: endedAt,
    call_successful: payload.call_successful === 'success',
    raw_data: payload,
    organization_id: undefined, // No org context in webhook - sync job will fill this
    campaign_id: undefined,
    recipient_id: undefined,
  };
}

/**
 * GET /api/webhooks/elevenlabs
 * Returns webhook status and configuration info
 */
export async function GET() {
  return NextResponse.json(
    successResponse(
      {
        endpoint: '/api/webhooks/elevenlabs',
        methods: ['POST'],
        version: '1.0.0',
      },
      'ElevenLabs webhook endpoint is active'
    )
  );
}
