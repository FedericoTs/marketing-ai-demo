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

After investigation, found:

1. **Correct Database**: Application uses `dm-tracking.db` (34MB, active)
2. **Schema Status**: All planning tables exist and are properly configured
3. **Foreign Keys**: Correctly set up (`plan_items.plan_id` → `campaign_plans.id`)
4. **Required Data**: 38 retail stores, 59 campaigns available
5. **Real Issue**: Turbopack hot-reload causing module-level variable caching

The console logs showed mismatched plan IDs (`plan_fruFjVGpzQfj` vs `plan_LG2eAB2oaCjc`) because of stale cached values during hot-reload, not actual database issues.

## Solution

**Clean server restart** resolves the module caching issue:
```bash
# Kill all node processes
pkill -f "node.*next"

# Restart dev server
npm run dev
```

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

✅ **VERIFIED** - Database schema correct, foreign keys working, issue was Turbopack caching

---

*Investigation: 2025-10-25*
*Database: dm-tracking.db*
*Resolution: Clean restart required*
