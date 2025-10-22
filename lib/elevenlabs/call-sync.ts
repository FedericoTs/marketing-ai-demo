/**
 * ElevenLabs Call Sync Logic
 * Fetches new calls from ElevenLabs API and stores them in database
 */

import { fetchNewElevenLabsConversations, ElevenLabsConversation } from './call-tracking';
import {
  upsertElevenLabsCall,
  attributeCallToCampaign,
  getLastSyncTimestamp,
} from '../database/call-tracking-queries';

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
 * @param agentId Optional agent ID to filter
 * @returns Sync result with statistics
 */
export async function syncElevenLabsCalls(
  apiKey: string,
  agentId?: string
): Promise<SyncResult> {
  const errors: string[] = [];
  let newCalls = 0;
  let attributedCalls = 0;

  console.log('[Call Sync] Starting ElevenLabs call sync...');

  try {
    // Get last sync timestamp
    const lastSyncTimestamp = getLastSyncTimestamp();

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
        const callRecord = convertConversationToCall(conversation);

        // Attempt automatic attribution
        if (callRecord.caller_phone_number) {
          const attribution = attributeCallToCampaign(callRecord.caller_phone_number);

          if (attribution) {
            callRecord.campaign_id = attribution.campaign_id;
            callRecord.recipient_id = attribution.recipient_id;
            attributedCalls++;
          }
        }

        // Determine conversion status
        // Simple rule: call_successful === 'success' = conversion
        callRecord.is_conversion = callRecord.call_status === 'success';

        // Store in database (upsert to handle duplicates)
        upsertElevenLabsCall(callRecord);
        newCalls++;
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
function convertConversationToCall(conversation: ElevenLabsConversation): Omit<
  Parameters<typeof upsertElevenLabsCall>[0],
  'campaign_id' | 'recipient_id' | 'is_conversion'
> & {
  campaign_id?: string;
  recipient_id?: string;
  is_conversion: boolean;
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

  return {
    conversation_id: conversation.conversation_id,
    agent_id: (conversation.agent_id || conversation.agent_name) as string | undefined,
    elevenlabs_phone_number: conversation.phone_number,
    caller_phone_number: conversation.caller_phone,
    call_started_at: startedAt,
    call_ended_at: endedAt,
    call_duration_seconds: callDuration,
    call_status: conversation.call_successful || 'unknown',
    raw_data: JSON.stringify(conversation),
    is_conversion: false, // Will be determined by sync logic
  };
}
