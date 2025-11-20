/**
 * Supabase Database Queries for ElevenLabs Call Tracking
 * Replaces SQLite queries with Supabase queries
 */

import { createServiceClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ElevenLabsCallRecord {
  organization_id?: string; // Optional - webhooks don't have org context initially
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
  conversion_value?: number;
  transcript?: string;
  summary?: string;
  sentiment?: string;
  intent_detected?: string;
  raw_data?: Record<string, unknown>;
}

/**
 * Insert or update a call record in Supabase
 * Uses elevenlabs_call_id as unique identifier to prevent duplicates
 */
export async function upsertElevenLabsCallSupabase(
  call: ElevenLabsCallRecord
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceClient();

    console.log('[Supabase] Upserting ElevenLabs call:', {
      organization_id: call.organization_id || 'NULL (webhook - no org context)',
      elevenlabs_call_id: call.elevenlabs_call_id,
      agent_id: call.agent_id,
      phone_number: call.phone_number,
    });

    const { data, error } = await supabase
      .from('elevenlabs_calls')
      .upsert(
        {
          organization_id: call.organization_id || null,
          elevenlabs_call_id: call.elevenlabs_call_id,
          agent_id: call.agent_id || null,
          phone_number: call.phone_number || null,
          campaign_id: call.campaign_id || null,
          recipient_id: call.recipient_id || null,
          call_status: call.call_status || 'unknown',
          call_duration_seconds: call.call_duration_seconds || null,
          start_time: call.start_time || new Date().toISOString(),
          end_time: call.end_time || null,
          call_successful: call.call_successful || false,
          appointment_booked: call.appointment_booked || false,
          conversion_value: call.conversion_value || null,
          transcript: call.transcript || null,
          summary: call.summary || null,
          sentiment: call.sentiment || null,
          intent_detected: call.intent_detected || null,
          raw_data: call.raw_data || null,
          synced_at: new Date().toISOString(),
        },
        {
          onConflict: 'elevenlabs_call_id',
        }
      )
      .select();

    if (error) {
      console.error('[Supabase] Error upserting call:', error);
      return { success: false, error: error.message };
    }

    console.log('[Supabase] Call upserted successfully');
    return { success: true };
  } catch (error) {
    console.error('[Supabase] Exception upserting call:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Attempt to attribute a call to a campaign based on caller phone number
 * Returns campaign_id and recipient_id if a match is found
 */
export async function attributeCallToCampaignSupabase(
  callerPhoneNumber: string,
  organizationId: string
): Promise<{
  campaign_id?: string;
  recipient_id?: string;
} | null> {
  if (!callerPhoneNumber) {
    return null;
  }

  try {
    const supabase = createServiceClient();

    // Normalize phone number (remove spaces, dashes, parentheses)
    const normalizedPhone = callerPhoneNumber.replace(/[\s\-\(\)]/g, '');

    console.log('[Supabase] Attributing call for phone:', normalizedPhone);

    // Query recipients table for matching phone number
    // Note: Supabase doesn't have REPLACE function in the same way as SQLite
    // We need to normalize on the app side or use PostgreSQL's regexp_replace
    const { data: recipients, error } = await supabase
      .from('recipients')
      .select('id, campaign_id, phone')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(100); // Get recent recipients

    if (error) {
      console.error('[Supabase] Error querying recipients:', error);
      return null;
    }

    // Find matching recipient by normalizing phone numbers in JS
    const matchingRecipient = recipients?.find((r) => {
      const recipientNormalized = r.phone?.replace(/[\s\-\(\)]/g, '') || '';
      return recipientNormalized === normalizedPhone;
    });

    if (matchingRecipient) {
      console.log('[Supabase] Attributed call to campaign:', {
        callerPhone: callerPhoneNumber,
        campaignId: matchingRecipient.campaign_id,
        recipientId: matchingRecipient.id,
      });

      return {
        campaign_id: matchingRecipient.campaign_id,
        recipient_id: matchingRecipient.id,
      };
    }

    console.log('[Supabase] No attribution found for phone:', callerPhoneNumber);
    return null;
  } catch (error) {
    console.error('[Supabase] Exception in attribution:', error);
    return null;
  }
}

/**
 * Get last sync timestamp (most recent call synced)
 * Used to fetch only new calls in subsequent syncs
 */
export async function getLastSyncTimestampSupabase(
  organizationId: string
): Promise<number | null> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('elevenlabs_calls')
      .select('start_time')
      .eq('organization_id', organizationId)
      .order('start_time', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.log('[Supabase] No previous sync found for org:', organizationId);
      return null;
    }

    if (data.start_time) {
      // Convert ISO 8601 to Unix timestamp (seconds)
      const timestamp = Math.floor(new Date(data.start_time).getTime() / 1000);
      console.log('[Supabase] Last sync timestamp:', new Date(data.start_time).toISOString());
      return timestamp;
    }

    return null;
  } catch (error) {
    console.error('[Supabase] Exception getting last sync timestamp:', error);
    return null;
  }
}
