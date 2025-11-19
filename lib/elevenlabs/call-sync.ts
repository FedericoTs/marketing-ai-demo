/**
 * ElevenLabs Call Sync Logic
 * Fetches new calls from ElevenLabs API and stores them in database
 */

import { fetchNewElevenLabsConversations, ElevenLabsConversation } from './call-tracking';
import {
  upsertElevenLabsCallSupabase,
  attributeCallToCampaignSupabase,
  getLastSyncTimestampSupabase,
} from '../database/call-tracking-supabase-queries';

export interface SyncResult {
  success: boolean;
  newCalls: number;
  attributedCalls: number;
  errors: string[];
  lastSyncTimestamp: number | null;
}

/**
 * Sync ElevenLabs calls from API to database
 * Fetches new conversations since last sync and stores them
 *
 * @param apiKey ElevenLabs API key
 * @param organizationId Organization ID for multi-tenancy
 * @param agentId Optional agent ID to filter
 * @returns Sync result with statistics
 */
export async function syncElevenLabsCalls(
  apiKey: string,
  organizationId: string,
  agentId?: string
): Promise<SyncResult> {
  const errors: string[] = [];
  let newCalls = 0;
  let attributedCalls = 0;

  console.log('[Call Sync] Starting ElevenLabs call sync for org:', organizationId);

  try {
    // Get last sync timestamp
    const lastSyncTimestamp = await getLastSyncTimestampSupabase(organizationId);

    console.log('[Call Sync] Last sync timestamp:', lastSyncTimestamp ? new Date(lastSyncTimestamp * 1000).toISOString() : 'Never');

    // Calculate sync window
    // If this is first sync, fetch calls from last 30 days
    // Otherwise, fetch since last sync
    const sinceTimestamp = lastSyncTimestamp || Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);

    // Fetch new conversations
    console.log('[Call Sync] Fetching conversations since:', new Date(sinceTimestamp * 1000).toISOString());

    const conversations = await fetchNewElevenLabsConversations(
      apiKey,
      sinceTimestamp,
      agentId
    );

    console.log('[Call Sync] Fetched conversations:', conversations.length);

    // Process each conversation
    for (const conversation of conversations) {
      try {
        // Convert conversation to call record
        const callRecord = convertConversationToCall(conversation, organizationId);

        // Attempt automatic attribution
        if (callRecord.phone_number) {
          const attribution = await attributeCallToCampaignSupabase(
            callRecord.phone_number,
            organizationId
          );

          if (attribution) {
            callRecord.campaign_id = attribution.campaign_id;
            callRecord.recipient_id = attribution.recipient_id;
            attributedCalls++;
          }
        }

        // Determine conversion status
        // Simple rule: call_successful === true = appointment_booked
        callRecord.appointment_booked = callRecord.call_successful || false;

        // Store in database (upsert to handle duplicates)
        const result = await upsertElevenLabsCallSupabase(callRecord);

        if (result.success) {
          newCalls++;
        } else {
          errors.push(`Failed to upsert call ${callRecord.elevenlabs_call_id}: ${result.error}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to process conversation ${conversation.conversation_id}: ${errorMessage}`);
        console.error('[Call Sync] Error processing conversation:', conversation.conversation_id, error);
      }
    }

    console.log('[Call Sync] Sync complete:', {
      newCalls,
      attributedCalls,
      errors: errors.length,
    });

    return {
      success: errors.length === 0 || errors.length < conversations.length,
      newCalls,
      attributedCalls,
      errors,
      lastSyncTimestamp: sinceTimestamp,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(`Sync failed: ${errorMessage}`);
    console.error('[Call Sync] Fatal error during sync:', error);

    return {
      success: false,
      newCalls,
      attributedCalls,
      errors,
      lastSyncTimestamp: null,
    };
  }
}

/**
 * Convert ElevenLabs conversation to call record format
 */
function convertConversationToCall(
  conversation: ElevenLabsConversation,
  organizationId: string
): {
  organization_id: string;
  elevenlabs_call_id: string;
  agent_id?: string;
  phone_number?: string;
  campaign_id?: string;
  recipient_id?: string;
  call_status?: string;
  call_duration_seconds?: number;
  start_time?: string;
  end_time?: string;
  call_successful?: boolean;
  appointment_booked?: boolean;
  transcript?: string;
  summary?: string;
  sentiment?: string;
  intent_detected?: string;
  raw_data?: Record<string, unknown>;
} {
  // Extract actual field names from ElevenLabs API response
  const startTimeUnix = (conversation.start_time_unix_secs || conversation.start_time_unix) as number | undefined;
  const callDuration = (conversation.call_duration_secs || conversation.call_duration_seconds) as number | undefined;

  // Convert Unix timestamp to ISO 8601 string
  const startedAt = startTimeUnix
    ? new Date(startTimeUnix * 1000).toISOString()
    : new Date().toISOString();

  // Calculate end time if we have start time and duration
  let endedAt: string | undefined;
  if (startTimeUnix && callDuration) {
    endedAt = new Date((startTimeUnix + callDuration) * 1000).toISOString();
  }

  // Determine call success
  const callSuccessful = conversation.call_successful === 'success';

  return {
    organization_id: organizationId,
    elevenlabs_call_id: conversation.conversation_id,
    agent_id: (conversation.agent_id || conversation.agent_name) as string | undefined,
    phone_number: conversation.caller_phone,
    start_time: startedAt,
    end_time: endedAt,
    call_duration_seconds: callDuration,
    call_status: conversation.call_successful as string || 'unknown',
    call_successful: callSuccessful,
    appointment_booked: false, // Will be updated if attribution succeeds
    transcript: (conversation.transcript as string) || null,
    summary: (conversation.summary as string) || null,
    sentiment: (conversation.sentiment as string) || null,
    intent_detected: (conversation.intent as string) || null,
    raw_data: conversation as Record<string, unknown>,
  };
}
