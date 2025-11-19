/**
 * TEST ENDPOINT - Inserts mock ElevenLabs call data
 * Use this to test the analytics dashboard without real ElevenLabs API calls
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { upsertElevenLabsCallSupabase } from '@/lib/database/call-tracking-supabase-queries';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function POST(request: NextRequest) {
  console.log('[TEST] Mock sync endpoint called');

  try {
    // Get organization ID from authenticated user
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

    console.log('[TEST] Inserting mock calls for org:', profile.organization_id);

    // Create 10 mock calls with realistic data
    const mockCalls = [
      {
        organization_id: profile.organization_id,
        elevenlabs_call_id: `test_call_${Date.now()}_1`,
        agent_id: 'agent_demo_001',
        phone_number: '+1234567890',
        call_status: 'completed',
        call_duration_seconds: 245,
        start_time: new Date(Date.now() - 3600000).toISOString(),
        end_time: new Date(Date.now() - 3600000 + 245000).toISOString(),
        call_successful: true,
        appointment_booked: true,
        transcript: 'Hi, this is a test call. I would like to schedule an appointment.',
        summary: 'Customer interested in booking appointment. Confirmed for next Tuesday.',
        sentiment: 'positive',
        intent_detected: 'appointment_booking',
        raw_data: { test: true, source: 'mock_endpoint' },
      },
      {
        organization_id: profile.organization_id,
        elevenlabs_call_id: `test_call_${Date.now()}_2`,
        agent_id: 'agent_demo_001',
        phone_number: '+1987654321',
        call_status: 'completed',
        call_duration_seconds: 120,
        start_time: new Date(Date.now() - 7200000).toISOString(),
        end_time: new Date(Date.now() - 7200000 + 120000).toISOString(),
        call_successful: false,
        appointment_booked: false,
        transcript: 'Hello? No thanks, not interested.',
        summary: 'Customer declined offer.',
        sentiment: 'negative',
        intent_detected: 'decline',
        raw_data: { test: true, source: 'mock_endpoint' },
      },
      {
        organization_id: profile.organization_id,
        elevenlabs_call_id: `test_call_${Date.now()}_3`,
        agent_id: 'agent_demo_001',
        phone_number: '+1555123456',
        call_status: 'completed',
        call_duration_seconds: 180,
        start_time: new Date(Date.now() - 10800000).toISOString(),
        end_time: new Date(Date.now() - 10800000 + 180000).toISOString(),
        call_successful: true,
        appointment_booked: false,
        transcript: 'Can you send me more information?',
        summary: 'Customer requested additional information via email.',
        sentiment: 'neutral',
        intent_detected: 'inquiry',
        raw_data: { test: true, source: 'mock_endpoint' },
      },
    ];

    let inserted = 0;
    const errors: string[] = [];

    for (const call of mockCalls) {
      const result = await upsertElevenLabsCallSupabase(call);
      if (result.success) {
        inserted++;
      } else {
        errors.push(result.error || 'Unknown error');
      }
    }

    return NextResponse.json(
      successResponse(
        {
          inserted,
          total: mockCalls.length,
          errors,
        },
        `Inserted ${inserted} mock calls`
      )
    );
  } catch (error) {
    console.error('[TEST] Error:', error);
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : 'Unknown error',
        'TEST_ERROR'
      ),
      { status: 500 }
    );
  }
}
