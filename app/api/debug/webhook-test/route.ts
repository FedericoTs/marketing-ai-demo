/**
 * Debug endpoint to test webhook processing without ElevenLabs
 * POST /api/debug/webhook-test
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('\n[DEBUG] ========== WEBHOOK TEST START ==========');

  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    checks: {},
    errors: []
  };

  try {
    // Test 1: Can we import database?
    console.log('[DEBUG] Test 1: Importing database module...');
    try {
      const { getDatabase } = await import('@/lib/database/connection');
      diagnostics.checks.databaseImport = '✅ SUCCESS';
      console.log('[DEBUG] ✅ Database module imported');

      // Test 2: Can we connect to database?
      console.log('[DEBUG] Test 2: Connecting to database...');
      try {
        const db = createServiceClient();
        diagnostics.checks.databaseConnection = '✅ SUCCESS';
        diagnostics.dbPath = process.cwd() + '/dm-tracking.db';
        console.log('[DEBUG] ✅ Database connected');

        // Test 3: Can we query database?
        console.log('[DEBUG] Test 3: Querying database...');
        try {
          const result = db.prepare('SELECT COUNT(*) as count FROM elevenlabs_calls').get() as { count: number };
          diagnostics.checks.databaseQuery = '✅ SUCCESS';
          diagnostics.currentCallCount = result.count;
          console.log('[DEBUG] ✅ Database query successful, current calls:', result.count);
        } catch (queryError) {
          diagnostics.checks.databaseQuery = '❌ FAILED';
          diagnostics.errors.push({
            test: 'databaseQuery',
            error: queryError instanceof Error ? queryError.message : String(queryError)
          });
          console.error('[DEBUG] ❌ Database query failed:', queryError);
        }
      } catch (connectError) {
        diagnostics.checks.databaseConnection = '❌ FAILED';
        diagnostics.errors.push({
          test: 'databaseConnection',
          error: connectError instanceof Error ? connectError.message : String(connectError),
          hint: 'Run: npm rebuild better-sqlite3'
        });
        console.error('[DEBUG] ❌ Database connection failed:', connectError);
      }
    } catch (importError) {
      diagnostics.checks.databaseImport = '❌ FAILED';
      diagnostics.errors.push({
        test: 'databaseImport',
        error: importError instanceof Error ? importError.message : String(importError)
      });
      console.error('[DEBUG] ❌ Database import failed:', importError);
    }

    // Test 4: Can we process webhook data?
    console.log('[DEBUG] Test 4: Simulating webhook processing...');
    try {
      const { upsertElevenLabsCall } = await import('@/lib/database/call-tracking-queries');

      const testCall = {
        conversation_id: `test_${Date.now()}`,
        agent_id: 'test_agent',
        elevenlabs_phone_number: '+1234567890',
        caller_phone_number: '+0987654321',
        call_started_at: new Date().toISOString(),
        call_ended_at: new Date().toISOString(),
        call_duration_seconds: 60,
        call_status: 'success' as const,
        campaign_id: undefined,
        recipient_id: undefined,
        is_conversion: false,
        raw_data: JSON.stringify({ test: true })
      };

      const callId = upsertElevenLabsCall(testCall);
      diagnostics.checks.webhookProcessing = '✅ SUCCESS';
      diagnostics.testCallId = callId;
      console.log('[DEBUG] ✅ Test call inserted, ID:', callId);

      // Verify it was saved
      const { getDatabase: getDb } = await import('@/lib/database/connection');
      const db = getDb();
      const savedCall = db.prepare('SELECT * FROM elevenlabs_calls WHERE conversation_id = ?').get(testCall.conversation_id);
      diagnostics.testCallSaved = savedCall ? '✅ VERIFIED' : '❌ NOT FOUND';

    } catch (webhookError) {
      diagnostics.checks.webhookProcessing = '❌ FAILED';
      diagnostics.errors.push({
        test: 'webhookProcessing',
        error: webhookError instanceof Error ? webhookError.message : String(webhookError)
      });
      console.error('[DEBUG] ❌ Webhook processing failed:', webhookError);
    }

  } catch (error) {
    diagnostics.errors.push({
      test: 'general',
      error: error instanceof Error ? error.message : String(error)
    });
    console.error('[DEBUG] ❌ General error:', error);
  }

  console.log('[DEBUG] ========== WEBHOOK TEST END ==========\n');
  console.log('[DEBUG] Results:', JSON.stringify(diagnostics, null, 2));

  return NextResponse.json(diagnostics, { status: 200 });
}

export async function GET() {
  return NextResponse.json({
    message: 'Webhook diagnostic endpoint',
    usage: 'POST to this endpoint to run diagnostics'
  });
}
