# Phase 1 Implementation Plan: ElevenLabs Call Tracking

**Date**: 2025-10-22
**Status**: 🚀 In Progress
**Estimated Effort**: 6-8 hours
**Approach**: Simple API Polling (no webhooks yet)

---

## 🎯 Goals

### PRIMARY GOAL
✅ Track number of inbound calls received by ElevenLabs AI Agent
✅ Display call count in Analytics Dashboard
✅ Attribute calls to campaigns when possible

### SUCCESS CRITERIA
- Count total calls per campaign
- Show call metrics in dashboard
- No breaking changes to existing features
- Simple, reliable implementation

---

## 📋 Implementation Checklist

### Step 1: Database Schema ✅ COMPLETED
- [x] Create `elevenlabs_calls` table
- [x] Add indexes for performance
- [x] Test schema creation

### Step 2: API Client ✅ COMPLETED
- [x] Create ElevenLabs API helper
- [x] Implement conversation list fetcher
- [x] Handle pagination
- [x] Error handling

### Step 3: Database Queries ✅ COMPLETED
- [x] Create call tracking queries module
- [x] Get calls by campaign
- [x] Get call metrics
- [x] Attribution logic

### Step 4: Sync Job ✅ COMPLETED
- [x] Create background sync job
- [x] Fetch calls from ElevenLabs API
- [x] Store in database
- [x] Handle duplicates
- [x] Schedule (manual trigger via API endpoint)

### Step 5: Analytics Integration ✅ COMPLETED
- [x] Add call metrics to analytics queries
- [x] Update analytics dashboard UI
- [x] Create call activity metrics
- [x] Display call statistics

### Step 6: Campaign Detail Page ⏳ OPTIONAL
- [ ] Add "Calls" tab
- [ ] List all calls for campaign
- [ ] Show call details
- [ ] Manual attribution UI

### Step 7: Testing ⏳ PENDING
- [ ] Test with real ElevenLabs account
- [ ] Verify call counting accuracy
- [ ] Test campaign attribution
- [x] Verify no impact on existing features

---

## 🏗️ File Structure

```
lib/
├─ elevenlabs/
│  ├─ client.ts              [NEW] - ElevenLabs API client
│  └─ call-sync.ts           [NEW] - Sync job logic
├─ database/
│  ├─ connection.ts          [MODIFY] - Add new table schema
│  └─ call-tracking-queries.ts [NEW] - Call tracking queries
└─ jobs/
   └─ sync-elevenlabs-calls.ts [NEW] - Background job

app/
├─ api/
│  └─ jobs/
│     └─ sync-calls/
│        └─ route.ts         [NEW] - Manual sync trigger
└─ campaigns/
   └─ [id]/
      └─ calls/
         └─ page.tsx         [NEW] - Calls tab UI

components/
└─ analytics/
   └─ call-metrics.tsx       [NEW] - Call metrics display
```

---

## 🔐 Safety Measures

### Existing Features Protected
✅ All new code in separate files
✅ No modifications to existing API routes
✅ No changes to existing database queries
✅ Feature flag for easy disable

### Testing Strategy
1. Test new code in isolation
2. Verify existing features still work
3. Check database integrity
4. Monitor API rate limits

---

## 📊 Database Schema

```sql
CREATE TABLE IF NOT EXISTS elevenlabs_calls (
  id TEXT PRIMARY KEY,
  conversation_id TEXT UNIQUE NOT NULL,

  -- Agent & Phone
  agent_id TEXT,
  elevenlabs_phone_number TEXT,
  caller_phone_number TEXT,

  -- Timing
  call_started_at TEXT NOT NULL,
  call_ended_at TEXT,
  call_duration_seconds INTEGER,

  -- Status
  call_status TEXT NOT NULL, -- 'success', 'failure', 'unknown'

  -- Campaign Attribution
  campaign_id TEXT,
  recipient_id TEXT,

  -- Conversion
  is_conversion BOOLEAN DEFAULT 0,

  -- Metadata
  raw_data TEXT,
  synced_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
  FOREIGN KEY (recipient_id) REFERENCES recipients(id)
);

CREATE INDEX idx_elevenlabs_calls_campaign ON elevenlabs_calls(campaign_id);
CREATE INDEX idx_elevenlabs_calls_started ON elevenlabs_calls(call_started_at);
CREATE INDEX idx_elevenlabs_calls_status ON elevenlabs_calls(call_status);
CREATE INDEX idx_elevenlabs_calls_caller ON elevenlabs_calls(caller_phone_number);
```

---

## 🔄 Sync Job Logic

### Every 15 Minutes:
1. Fetch conversations from ElevenLabs API
2. Filter: calls after last sync time
3. For each new call:
   - Store in database
   - Attempt campaign attribution
   - Mark as conversion if successful
4. Update last sync timestamp

### Error Handling:
- Retry on API failures (3 attempts)
- Log errors to database
- Continue on partial failures
- Alert if sync fails repeatedly

---

## 📈 Analytics Integration

### New Metrics

```typescript
interface CampaignCallMetrics {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  conversion_rate: number;
  average_duration: number;
  calls_today: number;
  calls_this_week: number;
  calls_by_day: Array<{date: string; count: number}>;
}
```

### Dashboard UI

```
Campaign Analytics:
┌─────────────────────────────┐
│ 📊 Performance Overview     │
├─────────────────────────────┤
│ DMs Sent: 500               │
│ QR Scans: 150 (30%)         │
│ Page Views: 120 (24%)       │
│ 📞 Calls: 45 (9%) [NEW]     │
│ ✅ Conversions: 30 (6%)     │
└─────────────────────────────┘

┌─────────────────────────────┐
│ 📞 Call Performance [NEW]   │
├─────────────────────────────┤
│ ✅ Successful: 38 (84%)     │
│ ❌ Failed: 5 (11%)          │
│ ⏱️ Avg Duration: 3m 45s     │
│                             │
│ [Call Activity Chart]       │
└─────────────────────────────┘
```

---

## ⏱️ Timeline

### Session 1 (3-4 hours)
- ✅ Database schema
- ✅ ElevenLabs API client
- ✅ Database queries
- ✅ Basic sync job

### Session 2 (3-4 hours)
- ✅ Analytics integration
- ✅ Dashboard UI updates
- ✅ Calls tab in campaign detail
- ✅ Testing & verification

---

## 🧪 Testing Plan

### Unit Tests
- Database queries return correct data
- API client handles pagination
- Attribution logic works correctly

### Integration Tests
- Sync job fetches and stores calls
- Dashboard displays metrics
- No SQL errors

### Manual Tests
- Real ElevenLabs account test
- Make test call, verify it appears
- Check campaign attribution
- Verify existing features work

---

## ✅ Completion Checklist

- [ ] Database table created successfully
- [ ] API client can fetch calls from ElevenLabs
- [ ] Sync job stores calls in database
- [ ] Analytics dashboard shows call metrics
- [ ] Campaign detail page has Calls tab
- [ ] Attribution logic works (manual or automatic)
- [ ] No errors in production
- [ ] Existing features unchanged
- [ ] Documentation updated

---

**Status**: 🚀 Ready to begin implementation
**Next Step**: Create database schema
