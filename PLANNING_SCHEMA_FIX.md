# Planning Schema Initialization Fix

## Issue

Foreign key constraint errors when creating plan items:
```
SqliteError: FOREIGN KEY constraint failed
at createPlanItem (lib\database\planning-queries.ts:300:8)
```

## Root Cause

**IMPORTANT**: The application uses `dm-tracking.db` (not `marketing.db`) as configured in `lib/database/connection.ts:7`.

The planning workspace tables exist and are properly configured in `dm-tracking.db`. The foreign key errors were caused by Turbopack hot-reload/module caching issues showing stale plan IDs in console logs. The actual database schema is correct.

## Verification Commands

Check which database is being used:
```bash
grep DB_PATH lib/database/connection.ts
# Shows: const DB_PATH = path.join(process.cwd(), "dm-tracking.db");
```

Verify planning tables exist:
```bash
sqlite3 dm-tracking.db ".tables" | grep plan
```

This created the following tables:
- `campaign_plans` - Main plan records
- `plan_items` - Store recommendations with AI scores
- `plan_waves` - Wave management for phased rollouts
- `plan_activity_log` - Audit trail for plan changes
- Views: `plan_summary`, `plan_item_with_store_details`

## Actual Root Cause Analysis

After **first-principles investigation**, found:

1. **Correct Database**: Application uses `dm-tracking.db` (34MB, active) ✅
2. **Schema Status**: All planning tables exist and are properly configured ✅
3. **Foreign Keys**: Correctly set up (`plan_items.plan_id` → `campaign_plans.id`) ✅
4. **Required Data**: 38 retail stores, 59 campaigns available ✅
5. **REAL ROOT CAUSE**: 🔴 **Code bug in `createPlan()` function** (line 42)

### The Actual Bug

**File**: `lib/database/planning-queries.ts`
**Line**: 42 (before fix)

```typescript
// BUG: Always generated new ID, ignored input.id parameter
const id = `plan_${nanoid(12)}`;
```

**Flow**:
```
API Route: Creates planId = 'plan_abc123'
         ↓ Passes { id: 'plan_abc123', ... } to createPlan()
createPlan: Ignores input.id, generates NEW id = 'plan_xyz789' ❌
         ↓ Inserts plan with id='plan_xyz789'
API Route: Tries to insert plan_items with plan_id='plan_abc123' ❌
Result: FOREIGN KEY CONSTRAINT FAILED (plan_abc123 doesn't exist)
```

Initial hypotheses (database schema, Turbopack caching) were **incorrect** - the bug was in parameter handling.

## Solution

**Code Fix** (Commit 10e6500):

**File 1**: `lib/database/planning-queries.ts` (Line 42)
```typescript
// FIXED: Respects provided ID or generates new one
const id = input.id || `plan_${nanoid(12)}`;
```

**File 2**: `types/planning.ts` (After line 372, ~107 new lines)
Added comprehensive input types:
- `CreatePlanInput` with optional `id?: string`
- `CreatePlanItemInput` with all AI fields
- `UpdatePlanInput`, `UpdatePlanItemInput`
- `CreateWaveInput`, `UpdateWaveInput`

**Commit Message**: `fix: CRITICAL - createPlan() was ignoring input.id causing FK constraint errors`

## Database Verification

Confirm all tables exist in correct database:
```bash
sqlite3 dm-tracking.db ".tables" | grep plan
```

Expected output:
```
campaign_plans  plan_activity_log  plan_items  plan_summary  plan_waves
```

Check foreign keys:
```bash
sqlite3 dm-tracking.db "PRAGMA foreign_key_list(plan_items);"
```

Expected: `plan_id` → `campaign_plans.id` with CASCADE on delete

## Tables Status

✅ **campaign_plans** - Exists with proper schema
✅ **plan_items** - Exists with foreign keys configured
✅ **plan_waves** - Exists
✅ **plan_activity_log** - Exists
✅ **plan_summary** - View exists
✅ **plan_item_with_store_details** - View exists

## Known Issues

### OpenAI API Key (User Action Required)
**Error**: `401 Incorrect API key provided`
**Fix**: Regenerate key at https://platform.openai.com/account/api-keys
**Note**: This blocks AI plan generation but doesn't affect visual enhancements

### WSL Environment (Non-blocking)
- `lightningcss.linux-x64-gnu.node` - Known WSL/Windows mismatch
- `better-sqlite3` - Same issue
- **Workaround**: Run `npm run dev` from Windows terminal (not WSL)

## Status

✅ **FIXED** - Root cause identified and corrected in code

**Summary**:
- ✅ Database schema was correct (not the issue)
- ✅ Foreign keys properly configured (not the issue)
- ✅ **Code bug found**: `createPlan()` ignoring input.id parameter
- ✅ **Fix applied**: Line 42 now respects input.id
- ✅ **Types added**: Comprehensive input interfaces for type safety
- ✅ **Committed**: Commit 10e6500

**Testing**: Requires Windows terminal (not WSL) due to better-sqlite3 native module limitations

**See**: `FOREIGN_KEY_FIX_COMPLETE.md` for full investigation details

---

*Investigation: 2025-10-25*
*Database: dm-tracking.db*
*Resolution: Code fix in createPlan() function*
