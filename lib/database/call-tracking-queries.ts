/**
 * Database queries for ElevenLabs call tracking
 */

import { getDatabase } from './connection';
import { nanoid } from 'nanoid';

export interface ElevenLabsCall {
  id: string;
  conversation_id: string;
  agent_id?: string;
  elevenlabs_phone_number?: string;
  caller_phone_number?: string;
  call_started_at: string; // ISO 8601
  call_ended_at?: string;
  call_duration_seconds?: number;
  call_status: 'success' | 'failure' | 'unknown';
  campaign_id?: string;
  recipient_id?: string;
  is_conversion: boolean;
  raw_data?: string; // JSON string
  synced_at: string;
  created_at: string;
}

export interface CallMetrics {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  unknown_calls: number;
  conversions: number;
  conversion_rate: number;
  average_duration: number;
  calls_today: number;
  calls_this_week: number;
  calls_this_month: number;
}

/**
 * Insert or update a call record
 * Uses conversation_id as unique identifier to prevent duplicates
 */
export function upsertElevenLabsCall(call: Omit<ElevenLabsCall, 'id' | 'created_at' | 'synced_at'>): string {
  const db = getDatabase();

  const id = nanoid();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO elevenlabs_calls (
      id, conversation_id, agent_id, elevenlabs_phone_number, caller_phone_number,
      call_started_at, call_ended_at, call_duration_seconds, call_status,
      campaign_id, recipient_id, is_conversion, raw_data, synced_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(conversation_id) DO UPDATE SET
      agent_id = excluded.agent_id,
      elevenlabs_phone_number = excluded.elevenlabs_phone_number,
      caller_phone_number = excluded.caller_phone_number,
      call_started_at = excluded.call_started_at,
      call_ended_at = excluded.call_ended_at,
      call_duration_seconds = excluded.call_duration_seconds,
      call_status = excluded.call_status,
      campaign_id = excluded.campaign_id,
      recipient_id = excluded.recipient_id,
      is_conversion = excluded.is_conversion,
      raw_data = excluded.raw_data,
      synced_at = excluded.synced_at
  `);

  stmt.run(
    id,
    call.conversation_id,
    call.agent_id || null,
    call.elevenlabs_phone_number || null,
    call.caller_phone_number || null,
    call.call_started_at,
    call.call_ended_at || null,
    call.call_duration_seconds || null,
    call.call_status,
    call.campaign_id || null,
    call.recipient_id || null,
    call.is_conversion ? 1 : 0,
    call.raw_data || null,
    now,
    now
  );

  console.log('[DB] Upserted ElevenLabs call:', call.conversation_id);

  return id;
}

/**
 * Attempt to attribute a call to a campaign based on caller phone number
 * Returns campaign_id and recipient_id if a match is found
 */
export function attributeCallToCampaign(callerPhoneNumber: string): {
  campaign_id?: string;
  recipient_id?: string;
} | null {
  if (!callerPhoneNumber) {
    return null;
  }

  const db = getDatabase();

  // Normalize phone number (remove spaces, dashes, etc.)
  const normalizedPhone = callerPhoneNumber.replace(/[\s\-\(\)]/g, '');

  const stmt = db.prepare(`
    SELECT id, campaign_id, phone
    FROM recipients
    WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') = ?
    ORDER BY created_at DESC
    LIMIT 1
  `);

  const recipient = stmt.get(normalizedPhone) as { id: string; campaign_id: string; phone: string } | undefined;

  if (recipient) {
    console.log('[DB] Attributed call to campaign:', {
      callerPhone: callerPhoneNumber,
      campaignId: recipient.campaign_id,
      recipientId: recipient.id,
    });

    return {
      campaign_id: recipient.campaign_id,
      recipient_id: recipient.id,
    };
  }

  console.log('[DB] No attribution found for phone:', callerPhoneNumber);
  return null;
}

/**
 * Get all calls for a campaign
 */
export function getCallsByCampaign(campaignId: string): ElevenLabsCall[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM elevenlabs_calls
    WHERE campaign_id = ?
    ORDER BY call_started_at DESC
  `);

  const calls = stmt.all(campaignId) as ElevenLabsCall[];

  return calls.map((call) => ({
    ...call,
    is_conversion: Boolean(call.is_conversion),
  }));
}

/**
 * Get call metrics for a campaign
 */
export function getCampaignCallMetrics(campaignId: string): CallMetrics {
  const db = getDatabase();

  // Get total counts
  const countsStmt = db.prepare(`
    SELECT
      COUNT(*) as total_calls,
      SUM(CASE WHEN call_status = 'success' THEN 1 ELSE 0 END) as successful_calls,
      SUM(CASE WHEN call_status = 'failure' THEN 1 ELSE 0 END) as failed_calls,
      SUM(CASE WHEN call_status = 'unknown' THEN 1 ELSE 0 END) as unknown_calls,
      SUM(CASE WHEN is_conversion = 1 THEN 1 ELSE 0 END) as conversions,
      AVG(CASE WHEN call_duration_seconds IS NOT NULL THEN call_duration_seconds ELSE NULL END) as average_duration
    FROM elevenlabs_calls
    WHERE campaign_id = ?
  `);

  const counts = countsStmt.get(campaignId) as {
    total_calls: number;
    successful_calls: number;
    failed_calls: number;
    unknown_calls: number;
    conversions: number;
    average_duration: number | null;
  };

  // Get calls today
  const todayStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM elevenlabs_calls
    WHERE campaign_id = ?
    AND DATE(call_started_at) = DATE('now')
  `);

  const today = todayStmt.get(campaignId) as { count: number };

  // Get calls this week
  const weekStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM elevenlabs_calls
    WHERE campaign_id = ?
    AND DATE(call_started_at) >= DATE('now', '-7 days')
  `);

  const week = weekStmt.get(campaignId) as { count: number };

  // Get calls this month
  const monthStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM elevenlabs_calls
    WHERE campaign_id = ?
    AND DATE(call_started_at) >= DATE('now', 'start of month')
  `);

  const month = monthStmt.get(campaignId) as { count: number };

  const conversion_rate =
    counts.successful_calls > 0 ? (counts.conversions / counts.successful_calls) * 100 : 0;

  return {
    total_calls: counts.total_calls || 0,
    successful_calls: counts.successful_calls || 0,
    failed_calls: counts.failed_calls || 0,
    unknown_calls: counts.unknown_calls || 0,
    conversions: counts.conversions || 0,
    conversion_rate: Math.round(conversion_rate * 10) / 10, // Round to 1 decimal
    average_duration: Math.round(counts.average_duration || 0),
    calls_today: today.count || 0,
    calls_this_week: week.count || 0,
    calls_this_month: month.count || 0,
  };
}

/**
 * Get overall call metrics (all campaigns)
 */
export function getAllCallMetrics(): CallMetrics {
  const db = getDatabase();

  const countsStmt = db.prepare(`
    SELECT
      COUNT(*) as total_calls,
      SUM(CASE WHEN call_status = 'success' THEN 1 ELSE 0 END) as successful_calls,
      SUM(CASE WHEN call_status = 'failure' THEN 1 ELSE 0 END) as failed_calls,
      SUM(CASE WHEN call_status = 'unknown' THEN 1 ELSE 0 END) as unknown_calls,
      SUM(CASE WHEN is_conversion = 1 THEN 1 ELSE 0 END) as conversions,
      AVG(CASE WHEN call_duration_seconds IS NOT NULL THEN call_duration_seconds ELSE NULL END) as average_duration
    FROM elevenlabs_calls
  `);

  const counts = countsStmt.get() as {
    total_calls: number;
    successful_calls: number;
    failed_calls: number;
    unknown_calls: number;
    conversions: number;
    average_duration: number | null;
  };

  const todayStmt = db.prepare(`SELECT COUNT(*) as count FROM elevenlabs_calls WHERE DATE(call_started_at) = DATE('now')`);
  const today = todayStmt.get() as { count: number };

  const weekStmt = db.prepare(`SELECT COUNT(*) as count FROM elevenlabs_calls WHERE DATE(call_started_at) >= DATE('now', '-7 days')`);
  const week = weekStmt.get() as { count: number };

  const monthStmt = db.prepare(`SELECT COUNT(*) as count FROM elevenlabs_calls WHERE DATE(call_started_at) >= DATE('now', 'start of month')`);
  const month = monthStmt.get() as { count: number };

  const conversion_rate =
    counts.successful_calls > 0 ? (counts.conversions / counts.successful_calls) * 100 : 0;

  return {
    total_calls: counts.total_calls || 0,
    successful_calls: counts.successful_calls || 0,
    failed_calls: counts.failed_calls || 0,
    unknown_calls: counts.unknown_calls || 0,
    conversions: counts.conversions || 0,
    conversion_rate: Math.round(conversion_rate * 10) / 10,
    average_duration: Math.round(counts.average_duration || 0),
    calls_today: today.count || 0,
    calls_this_week: week.count || 0,
    calls_this_month: month.count || 0,
  };
}

/**
 * Get calls by day for charting
 */
export function getCallsByDay(campaignId: string, days: number = 30): Array<{
  date: string;
  count: number;
  conversions: number;
}> {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT
      DATE(call_started_at) as date,
      COUNT(*) as count,
      SUM(CASE WHEN is_conversion = 1 THEN 1 ELSE 0 END) as conversions
    FROM elevenlabs_calls
    WHERE campaign_id = ?
    AND DATE(call_started_at) >= DATE('now', '-' || ? || ' days')
    GROUP BY DATE(call_started_at)
    ORDER BY date ASC
  `);

  return stmt.all(campaignId, days) as Array<{
    date: string;
    count: number;
    conversions: number;
  }>;
}

/**
 * Get all calls for a specific campaign
 * Returns calls ordered by most recent first
 */
export function getCampaignCalls(campaignId: string, limit: number = 100): ElevenLabsCall[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT *
    FROM elevenlabs_calls
    WHERE campaign_id = ?
    ORDER BY call_started_at DESC
    LIMIT ?
  `);

  return stmt.all(campaignId, limit) as ElevenLabsCall[];
}

/**
 * Get all unattributed calls (no campaign_id)
 * For manual attribution interface
 */
export function getUnattributedCalls(limit: number = 100): ElevenLabsCall[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT *
    FROM elevenlabs_calls
    WHERE campaign_id IS NULL
    ORDER BY call_started_at DESC
    LIMIT ?
  `);

  return stmt.all(limit) as ElevenLabsCall[];
}

/**
 * Get last sync timestamp (most recent call synced)
 * Used to fetch only new calls in subsequent syncs
 */
export function getLastSyncTimestamp(): number | null {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT MAX(call_started_at) as last_sync
    FROM elevenlabs_calls
  `);

  const result = stmt.get() as { last_sync: string | null };

  if (result.last_sync) {
    // Convert ISO 8601 to Unix timestamp (seconds)
    return Math.floor(new Date(result.last_sync).getTime() / 1000);
  }

  return null;
}

/**
 * Get unattributed calls (calls without campaign_id)
 * Useful for manual attribution UI
 */
export function getUnattributedCalls(): ElevenLabsCall[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM elevenlabs_calls
    WHERE campaign_id IS NULL
    ORDER BY call_started_at DESC
  `);

  const calls = stmt.all() as ElevenLabsCall[];

  return calls.map((call) => ({
    ...call,
    is_conversion: Boolean(call.is_conversion),
  }));
}

/**
 * Manually attribute a call to a campaign
 */
export function manuallyAttributeCall(conversationId: string, campaignId: string, recipientId?: string): void {
  const db = getDatabase();

  const stmt = db.prepare(`
    UPDATE elevenlabs_calls
    SET campaign_id = ?, recipient_id = ?
    WHERE conversation_id = ?
  `);

  stmt.run(campaignId, recipientId || null, conversationId);

  console.log('[DB] Manually attributed call:', conversationId, 'to campaign:', campaignId);
}
