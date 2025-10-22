/**
 * ElevenLabs Webhook Endpoint
 * Receives real-time call events from ElevenLabs
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  upsertElevenLabsCall,
  attributeCallToCampaign,
} from '@/lib/database/call-tracking-queries';
import {
  validateWebhookRequest,
  logWebhookAttempt,
  checkRateLimit,
} from '@/lib/elevenlabs/webhook-handler';

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
        { success: false, error: validation.error },
        { status: 403 }
      );
    }

    // 2. Rate limiting (100 requests per minute per IP)
    const rateLimitKey = validation.ip || 'unknown';
    if (!checkRateLimit(rateLimitKey, 100, 60000)) {
      console.error('[Webhook Security] Rate limit exceeded for:', rateLimitKey);
      logWebhookAttempt('unknown', rateLimitKey, false, 'Rate limit exceeded');

      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
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
        { success: false, error: 'Missing conversation_id' },
        { status: 400 }
      );
    }

    // Only process conversation.ended events (ignore other event types)
    if (payload.event && payload.event !== 'conversation.ended') {
      console.log('[Webhook] Ignoring event type:', payload.event);
      return NextResponse.json({ success: true, message: 'Event ignored' });
    }

    // Convert webhook payload to call record
    const callRecord = convertWebhookToCall(payload);

    // Attempt automatic attribution
    if (callRecord.caller_phone_number) {
      const attribution = attributeCallToCampaign(callRecord.caller_phone_number);

      if (attribution) {
        callRecord.campaign_id = attribution.campaign_id;
        callRecord.recipient_id = attribution.recipient_id;
        console.log('[Webhook] Call attributed to campaign:', attribution.campaign_id);
      } else {
        console.log('[Webhook] No attribution found for phone:', callRecord.caller_phone_number);
      }
    }

    // Determine conversion status
    callRecord.is_conversion = callRecord.call_status === 'success';

    // Store in database (upsert to handle duplicates)
    const callId = upsertElevenLabsCall(callRecord);

    const duration = Date.now() - startTime;
    console.log('[Webhook] Call stored successfully:', {
      callId,
      conversation_id: payload.conversation_id,
      duration_ms: duration,
    });

    // Log successful webhook attempt
    logWebhookAttempt(payload.conversation_id, validation.ip || 'unknown', true);

    // Return 200 OK quickly to acknowledge webhook
    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      data: {
        callId,
        conversation_id: payload.conversation_id,
        attributed: !!callRecord.campaign_id,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Webhook] Error processing webhook:', error);
    console.error('[Webhook] Processing duration:', duration, 'ms');

    // Return 200 OK even on error to prevent webhook retries
    // Log error for manual investigation
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Webhook received but processing failed',
      },
      { status: 200 } // Return 200 to prevent ElevenLabs from retrying
    );
  }
}

/**
 * Convert webhook payload to call record format
 */
function convertWebhookToCall(payload: ElevenLabsWebhookPayload): Omit<
  Parameters<typeof upsertElevenLabsCall>[0],
  'campaign_id' | 'recipient_id' | 'is_conversion'
> & {
  campaign_id?: string;
  recipient_id?: string;
  is_conversion: boolean;
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
    conversation_id: payload.conversation_id,
    agent_id: (payload.agent_id || payload.agent_name) as string | undefined,
    elevenlabs_phone_number: payload.phone_number,
    caller_phone_number: payload.caller_phone,
    call_started_at: startedAt,
    call_ended_at: endedAt,
    call_duration_seconds: callDuration,
    call_status: payload.call_successful || 'unknown',
    raw_data: JSON.stringify(payload),
    is_conversion: false, // Will be determined by main logic
  };
}

/**
 * GET /api/webhooks/elevenlabs
 * Returns webhook status and configuration info
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'ElevenLabs webhook endpoint is active',
    endpoint: '/api/webhooks/elevenlabs',
    methods: ['POST'],
    version: '1.0.0',
  });
}
