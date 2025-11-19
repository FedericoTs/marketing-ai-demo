#!/usr/bin/env node
/**
 * Test ElevenLabs API Integration
 * Fetches real conversations from ElevenLabs and syncs to Supabase
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from .env.local
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '../.env.local');
    const envFile = readFileSync(envPath, 'utf-8');
    const env: Record<string, string> = {};

    envFile.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        env[key] = value;
      }
    });

    return env;
  } catch (error) {
    console.error('Error loading .env.local:', error);
    return {};
  }
}

const env = loadEnv();
const ELEVENLABS_API_KEY = env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY;
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ELEVENLABS_API_KEY) {
  console.error('❌ ELEVENLABS_API_KEY not found in .env.local');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Supabase credentials not found in .env.local');
  process.exit(1);
}

console.log('🔑 ElevenLabs API Key:', ELEVENLABS_API_KEY.substring(0, 20) + '...');
console.log('🔑 Supabase URL:', SUPABASE_URL);
console.log('');

/**
 * Fetch conversations from ElevenLabs API
 */
async function fetchElevenLabsConversations() {
  const url = 'https://api.elevenlabs.io/v1/convai/conversations';

  console.log('📡 Fetching conversations from ElevenLabs...');
  console.log('🌐 URL:', url);
  console.log('');

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
    });

    console.log('📊 Response Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      throw new Error(`ElevenLabs API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    console.log('');
    console.log('✅ SUCCESS! Fetched conversations from ElevenLabs');
    console.log('📈 Total Conversations:', data.conversations?.length || 0);
    console.log('📄 Has More:', data.has_more || false);
    console.log('');

    if (data.conversations && data.conversations.length > 0) {
      console.log('📋 First Conversation Sample:');
      console.log(JSON.stringify(data.conversations[0], null, 2));
      console.log('');

      console.log('📋 All Conversation IDs:');
      data.conversations.forEach((conv: any, idx: number) => {
        console.log(`  ${idx + 1}. ${conv.conversation_id || conv.id} - Agent: ${conv.agent_id || 'N/A'}`);
      });
    } else {
      console.log('ℹ️  No conversations found in your ElevenLabs account');
      console.log('');
      console.log('💡 To see data here, you need to:');
      console.log('   1. Create an agent in ElevenLabs dashboard');
      console.log('   2. Make at least one test call');
      console.log('   3. Wait for the call to complete');
      console.log('   4. Run this script again');
    }

    return data;
  } catch (error) {
    console.error('❌ Error fetching from ElevenLabs:', error);
    throw error;
  }
}

/**
 * Sync conversations to Supabase
 */
async function syncToSupabase(conversations: any[], organizationId: string) {
  console.log('');
  console.log('💾 Syncing to Supabase...');
  console.log('🏢 Organization ID:', organizationId);
  console.log('');

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const conv of conversations) {
    try {
      const startTimeUnix = conv.start_time_unix_secs || conv.start_time_unix;
      const callDuration = conv.call_duration_secs || conv.call_duration_seconds;

      const startTime = startTimeUnix
        ? new Date(startTimeUnix * 1000).toISOString()
        : new Date().toISOString();

      let endTime = null;
      if (startTimeUnix && callDuration) {
        endTime = new Date((startTimeUnix + callDuration) * 1000).toISOString();
      }

      const callRecord = {
        organization_id: organizationId,
        elevenlabs_call_id: conv.conversation_id || conv.id,
        agent_id: conv.agent_id || conv.agent_name || null,
        phone_number: conv.caller_phone || null,
        start_time: startTime,
        end_time: endTime,
        call_duration_seconds: callDuration || null,
        call_status: conv.call_successful || 'unknown',
        call_successful: conv.call_successful === 'success',
        appointment_booked: false,
        transcript: conv.transcript || null,
        summary: conv.summary || null,
        sentiment: conv.sentiment || null,
        intent_detected: conv.intent || null,
        raw_data: conv,
        synced_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('elevenlabs_calls')
        .upsert(callRecord, { onConflict: 'elevenlabs_call_id' })
        .select();

      if (error) {
        errors.push(`Failed to sync ${callRecord.elevenlabs_call_id}: ${error.message}`);
        console.error(`  ❌ Error syncing conversation ${callRecord.elevenlabs_call_id}:`, error.message);
      } else {
        inserted++;
        console.log(`  ✅ Synced: ${callRecord.elevenlabs_call_id}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(errorMsg);
      console.error('  ❌ Exception:', errorMsg);
    }
  }

  console.log('');
  console.log('📊 Sync Results:');
  console.log(`  ✅ Successfully synced: ${inserted}`);
  console.log(`  ❌ Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('');
    console.log('⚠️  Errors:');
    errors.forEach(err => console.log(`  - ${err}`));
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 ElevenLabs → Supabase Sync Test');
  console.log('═══════════════════════════════════');
  console.log('');

  try {
    // Step 1: Fetch from ElevenLabs
    const data = await fetchElevenLabsConversations();

    // Step 2: If conversations exist, sync to Supabase
    if (data.conversations && data.conversations.length > 0) {
      // Use a test organization ID (you should replace this with your actual org ID)
      const ORG_ID = '47660215-d828-4bbe-9664-57bca613b661'; // From the logs

      await syncToSupabase(data.conversations, ORG_ID);
    }

    console.log('');
    console.log('✅ Test completed successfully!');
  } catch (error) {
    console.error('');
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

main();
