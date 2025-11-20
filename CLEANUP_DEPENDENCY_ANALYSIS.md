# Cleanup & Dependency Analysis
**Date**: 2025-11-20
**Purpose**: Identify code to remove vs keep for simplified credits-based billing model

---

## Business Model Requirements (User Confirmed)

### What Stays:
- ✅ **Platform Subscription**: $499/month for platform access
- ✅ **Credits System**: Usage-based payments for Data Axle contacts and PostGrid printing
- ✅ **Website Analyzer**: AI brand intelligence extraction
- ✅ **NanoBanana Image Generation**: $0.05/image (replacing OpenAI DALL-E)
- ✅ **Data Axle Integration**: Volume-based pricing (already credits-based)
- ✅ **PostGrid Integration**: $1.00/postcard (already credits-based)

### What Goes:
- ❌ **Copywriting Feature**: Part of SQLite parallel project to be removed
- ❌ **OpenAI Integration**: Replaced with NanoBanana (cheaper, faster)
- ❌ **SQLite Database**: Migrate everything to Supabase
- ❓ **ElevenLabs Call Initiate**: "Not sure if we still need" - user uncertain

### What Changes:
- 🔄 **ElevenLabs**: Not self-serve anymore, only via "contacting directly the company"

---

## 1. Copywriting Dependencies (REMOVE ALL - 13 files)

### Core Copywriting Files (Delete):
```
app/copywriting/page.tsx                          ❌ DELETE
app/api/copywriting/route.ts                      ❌ DELETE
components/copywriting/copy-generator.tsx         ❌ DELETE
components/copywriting/variation-card.tsx         ❌ DELETE
```

### Files Referencing Copywriting (Cleanup):
```
app/(main)/dashboard/page.tsx                     🔧 REMOVE copywriting references
components/dashboard/quick-actions-fab.tsx        🔧 REMOVE copywriting quick action
components/dm-creative/dm-builder.tsx             🔧 REMOVE "Use in Campaign" feature
components/settings/brand-profile-manager.tsx     🔧 REMOVE copywriting integration
```

### Sidebar Navigation:
```
components/sidebar.tsx                            🔧 REMOVE copywriting nav item
```

### Impact:
- **Lines of code removed**: ~1,200
- **Dependencies removed**: OpenAI GPT-4o-mini calls for copywriting
- **Cost savings**: $0.0003 per copywriting request (minimal but adds up)

---

## 2. ElevenLabs Dependencies (14 files - DECISION NEEDED)

### Analysis:

#### A. Call Initiate Feature (Self-Serve)
**Status**: User said "Not sure if we still need the elevenlabs call initiate"
**Business Requirement**: "ElevenLabs will be available only through contacting directly the company"

```
app/cc-operations/page.tsx                        ❓ DECISION: Remove if not self-serve
components/cc-operations/call-initiator.tsx       ❓ Remove self-serve call initiation
components/cc-operations/call-status.tsx          ❓ Remove if no self-serve
components/cc-operations/agent-widget.tsx         ❓ Remove if no self-serve
app/api/call/initiate/route.ts                    ❓ Remove self-serve API
```

#### B. Call Tracking (Passive - for Analytics)
**Status**: Analytics has ElevenLabs sync DISABLED with comment "TEMPORARILY DISABLED - ElevenLabs sync (SQLite dependency)"
**Infrastructure**: Both SQLite and Supabase versions exist

```
lib/elevenlabs/call-tracking.ts                   ✅ KEEP - API client
lib/elevenlabs/call-sync.ts                       ✅ KEEP - Sync logic
lib/elevenlabs/webhook-handler.ts                 ✅ KEEP - Receive webhooks
app/api/webhooks/elevenlabs/route.ts              ✅ KEEP - Webhook endpoint
app/api/jobs/sync-elevenlabs-calls/route.ts       ✅ KEEP - Manual sync trigger
```

#### C. Database Layer
**Status**: Dual implementation (SQLite + Supabase)

```
lib/database/call-tracking-queries.ts             ❌ DELETE - SQLite version
lib/database/call-tracking-supabase-queries.ts    ✅ KEEP - Supabase version
```

#### D. Analytics Integration
**Status**: Analytics tab exists but ElevenLabs sync is commented out

```
app/analytics/page.tsx                            🔧 UNCOMMENT ElevenLabs sync (line 26-61)
components/analytics/calls-analytics.tsx          ✅ KEEP - Calls analytics tab
app/api/analytics/calls/metrics/route.ts          ✅ KEEP - Call metrics API
app/api/analytics/calls/recent/route.ts           ✅ KEEP - Recent calls API
app/api/analytics/calls/analytics/route.ts        ✅ KEEP - Call analytics API
```

#### E. Supabase Schema
**Status**: RLS policies exist, but table creation migration missing

```
supabase/migrations/20250119_add_elevenlabs_service_role_policies.sql  ✅ EXISTS
supabase/migrations/[NEW]_create_elevenlabs_calls_table.sql            ⚠️ MISSING
```

### ⚠️ **CRITICAL DECISION NEEDED**:

**Option 1: Keep Call Tracking Only (RECOMMENDED)**
- ✅ Remove self-serve call initiate (`/cc-operations`)
- ✅ Keep webhook receiver (passive tracking)
- ✅ Keep analytics integration
- ✅ Users contact company directly for ElevenLabs setup
- ✅ Platform tracks calls automatically via webhooks
- **Result**: Analytics works, but users don't initiate calls from platform

**Option 2: Remove Everything**
- ❌ Remove all ElevenLabs integration
- ❌ Remove analytics calls tab
- ❌ No call tracking at all
- **Result**: Simpler, but lose valuable analytics feature

**Option 3: Keep Everything (NOT RECOMMENDED)**
- ❌ Contradicts "only via contacting directly the company"
- ❌ Self-serve call initiate stays
- **Result**: Confusion between self-serve vs contact company

**Recommendation**: **Option 1** - Remove self-serve initiate, keep passive tracking

---

## 3. SQLite Dependencies (REMOVE ALL - 19 files)

### Core Database Files (Delete):
```
lib/database/connection.ts                        ❌ DELETE - SQLite connection
lib/database/init.ts                              ❌ DELETE - SQLite schema
lib/database/campaigns.ts                         ❌ DELETE - SQLite queries
lib/database/recipients.ts                        ❌ DELETE - SQLite queries
lib/database/templates.ts                         ❌ DELETE - SQLite queries
lib/database/tracking.ts                          ❌ DELETE - SQLite queries
lib/database/analytics.ts                         ❌ DELETE - SQLite queries
lib/database/call-tracking-queries.ts             ❌ DELETE - SQLite ElevenLabs
```

### Supabase Replacements (Keep):
```
lib/database/supabase-queries.ts                  ✅ KEEP - Supabase version
lib/database/analytics-supabase-queries.ts        ✅ KEEP - Supabase analytics
lib/database/call-tracking-supabase-queries.ts    ✅ KEEP - Supabase calls
lib/supabase/server.ts                            ✅ KEEP - Supabase client
```

### Scripts Using SQLite (Cleanup):
```
scripts/test-elevenlabs-sync.ts                   🔧 UPDATE to use Supabase
scripts/seed-analytics-data.ts                    🔧 UPDATE to use Supabase
scripts/diagnose-sankey-data.ts                   🔧 UPDATE to use Supabase
scripts/cleanup-analytics-data.ts                 🔧 UPDATE to use Supabase
```

### Impact:
- **Lines of code removed**: ~3,500
- **Dependencies removed**: `better-sqlite3`, SQLite schema files
- **Performance improvement**: No local database, pure PostgreSQL
- **Scalability**: Cloud-native, multi-tenant ready

---

## 4. OpenAI Dependencies (REPLACE - 5 files)

### Current Usage:
```typescript
// lib/ai/openai.ts
const response = await openai.images.generate({
  model: "gpt-image-1",      // or "dall-e-3"
  prompt: imagePrompt,
  n: 1,
  size: "1024x1024",
});
// Cost: $0.04-0.08 per image
```

### Replacement with NanoBanana:
```typescript
// lib/ai/nanobanana.ts (NEW)
const response = await fetch('https://api.nanobanana.com/v1/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.NANOBANANA_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: imagePrompt,
    size: "1024x1024"
  })
});
// Cost: $0.05 per image
```

### Files to Update:
```
lib/ai/openai.ts                                  🔧 REPLACE with NanoBanana
app/api/dm-creative/generate/route.ts             🔧 UPDATE to use NanoBanana
app/api/campaigns/generate-background/route.ts    🔧 UPDATE to use NanoBanana
components/design/background-generator.tsx        🔧 UPDATE to use NanoBanana
```

### Cost Analysis:
- **OpenAI DALL-E 3**: $0.04-0.08/image
- **NanoBanana**: $0.05/image
- **Savings**: 37.5% cheaper (if DALL-E $0.08) or slightly more expensive (if $0.04)
- **Speed**: "faster" according to user
- **Integration**: "not well integrated" - needs cleanup

---

## 5. Website Analyzer (KEEP)

**Status**: User confirmed "keep the website analyzer because I'm pretty sure we still need it"

```
app/api/analyze/website/route.ts                  ✅ KEEP
components/settings/brand-profile-manager.tsx     ✅ KEEP
lib/brand-analyzer.ts                             ✅ KEEP
```

**Features**:
- AI extracts brand identity from website URL
- Logo extraction (Clearbit API + HTML scraping)
- Color palette extraction
- Typography detection
- Auto-fills brand settings

**Cost**: Minimal (uses GPT-4o-mini for analysis)

---

## 6. Pricing Calculation (Task #8)

### First Month Bonus Structure:
```
Month 1:
  - User pays: $499 subscription
  - User receives: $499 in credits
  - Actual cost to us: MUST BE $349 (30% profit margin)

Month 2+:
  - User pays: $499 subscription
  - User receives: $99 in credits
```

### Credit Value Calculation:
**Target**: $499 credits = $349 actual cost

#### Data Axle Pricing (Volume-Based):
```
Small (1-10k):     $0.20 cost → $0.35 charge (75% margin)
Medium (10k-50k):  $0.15 cost → $0.25 charge (67% margin)
Large (50k-250k):  $0.12 cost → $0.20 charge (67% margin)
Enterprise (250k+): $0.10 cost → $0.18 charge (80% margin)
```

#### PostGrid Pricing (Fixed):
```
Cost: $0.85/postcard
User price: $1.00/postcard
Margin: 18%
```

#### NanoBanana Pricing (Fixed):
```
Cost: $0.05/image
User price: $0.05/image (no markup for now)
Margin: 0%
```

### Example Allocation to Hit $349 Cost:

**Scenario A: Heavy Data Axle Users**
```
$499 credits could buy:
- 1,400 contacts @ $0.35 = $490 in credits
  (Actual cost: 1,400 × $0.20 = $280)
- Plus 50 images @ $0.05 = $2.50
- Plus 50 postcards @ $1.00 = $50
  (Actual cost: 50 × $0.85 = $42.50)

Total credits used: $490 + $2.50 + $50 = $542.50 (OVER)
Actual cost: $280 + $2.50 + $42.50 = $325 ✅ UNDER TARGET
```

**Scenario B: Heavy PostGrid Users**
```
$499 credits could buy:
- 400 postcards @ $1.00 = $400
  (Actual cost: 400 × $0.85 = $340)
- Plus 1,000 contacts @ $0.35 = $350 (OVER)

Need to balance to hit exactly $349 cost.
```

**⚠️ PROBLEM**: Volume-based Data Axle pricing makes exact $349 impossible to guarantee!

**SOLUTION OPTIONS**:

1. **Accept Range**: $300-$400 actual cost per month (avg $349)
2. **Fixed Credit Value**: 1 credit = $0.70 actual cost
   - $499 credits ÷ $0.70 = 713 credits in actual purchasing power
   - BUT: This breaks volume pricing (user pays same regardless of tier)
3. **Recommend Usage Pattern**:
   - "First month $499 credits best used for: 1,200 contacts + 150 postcards"
   - Pre-calculate ideal mix

**RECOMMENDATION**: Option 3 - Provide suggested usage mix in onboarding.

---

## 7. Cleanup Priority Order

### Phase 1: Immediate Removals (2 hours)
1. ❌ Delete copywriting pages/components (13 files)
2. ❌ Delete SQLite database layer (8 core files)
3. ❌ Delete `better-sqlite3` dependency
4. 🔧 Update sidebar navigation (remove copywriting)
5. 🔧 Update dashboard (remove copywriting quick action)

### Phase 2: ElevenLabs Decision (3 hours)
**AFTER USER CONFIRMS OPTION 1, 2, or 3:**
1. If Option 1: Delete `/cc-operations` page + call initiate API
2. If Option 2: Delete all ElevenLabs integration
3. If Option 3: Keep everything (no changes)
4. 🔧 Update analytics to use Supabase call tracking
5. ✅ Create missing `elevenlabs_calls` table migration

### Phase 3: OpenAI → NanoBanana Migration (4 hours)
1. 🆕 Create `lib/ai/nanobanana.ts` client
2. 🔧 Update background generation API routes
3. 🔧 Update design components
4. 🧪 Test image generation end-to-end
5. ❌ Delete `lib/ai/openai.ts` (if no longer needed)

### Phase 4: SQLite Scripts Cleanup (1 hour)
1. 🔧 Update seed scripts to use Supabase
2. 🔧 Update diagnostic scripts
3. 🧪 Test all scripts work with Supabase

### Phase 5: Documentation Update (1 hour)
1. 🔧 Update `DROPLAB_TRANSFORMATION_PLAN.md`
2. 🔧 Update `CLAUDE.md`
3. 🔧 Update `README.md`
4. 📋 Create migration checklist

**Total Estimated Time**: 11 hours

---

## 8. Migration Risks

### High Risk:
- ❗ **ElevenLabs Analytics**: If we remove tracking, analytics breaks
- ❗ **SQLite Removal**: Ensure ALL data migrated to Supabase first
- ❗ **NanoBanana Integration**: "not well integrated" - may need debugging

### Medium Risk:
- ⚠️ **Copywriting Removal**: Features may reference it in unexpected places
- ⚠️ **Sidebar Navigation**: Hardcoded routes may 404 after removal

### Low Risk:
- ✅ **Website Analyzer**: Confirmed to keep, no changes
- ✅ **Data Axle**: Already credits-based, no changes
- ✅ **PostGrid**: Already credits-based, no changes

---

## 9. Testing Checklist

After cleanup:

- [ ] Dashboard loads without errors
- [ ] Sidebar navigation works (no 404s)
- [ ] Analytics displays call tracking (if kept)
- [ ] Background generation works with NanoBanana
- [ ] Data Axle credit enforcement works
- [ ] PostGrid credit enforcement works
- [ ] No SQLite references in codebase
- [ ] No copywriting references in codebase
- [ ] Build succeeds with no errors
- [ ] TypeScript compiles with no errors

---

## 10. Next Steps (REQUIRES USER DECISION)

**🔴 CRITICAL DECISION NEEDED**:

**Question**: "Should we keep ElevenLabs call tracking for analytics (Option 1), remove everything (Option 2), or keep self-serve call initiate (Option 3)?"

**User's original comment**: "Not sure if we still need the elevenlabs call initiate"

**Once decided, I will**:
1. Execute Phase 1 cleanup (copywriting + SQLite)
2. Execute Phase 2 based on ElevenLabs decision
3. Execute Phase 3 (NanoBanana migration)
4. Update master plan
5. Commit all changes

**Estimated total time**: 11 hours of development work

---

## Summary

| Component | Action | Files Affected | Impact |
|-----------|--------|----------------|---------|
| Copywriting | ❌ DELETE | 13 files | Remove SQLite feature |
| SQLite | ❌ DELETE | 19 files | Migrate to Supabase |
| OpenAI | 🔧 REPLACE | 5 files | Switch to NanoBanana |
| ElevenLabs | ❓ DECISION | 14 files | Keep tracking or remove all? |
| Website Analyzer | ✅ KEEP | 3 files | No changes |
| Data Axle | ✅ KEEP | - | Already credits-based |
| PostGrid | ✅ KEEP | - | Already credits-based |

**Total files to modify/delete**: 50+ files
**Estimated cleanup time**: 11 hours
**Blockers**: ElevenLabs decision needed
