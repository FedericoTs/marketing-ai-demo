# Planning Schema Initialization Fix

## Issue

Foreign key constraint errors when creating plan items:
```
SqliteError: FOREIGN KEY constraint failed
at createPlanItem (lib\database\planning-queries.ts:300:8)
```

## Root Cause

The planning workspace tables (`campaign_plans`, `plan_items`, `plan_waves`, `plan_activity_log`) were not initialized in the `marketing.db` database. The schema file existed at `lib/database/schema/planning-workspace-schema.sql` but had not been applied.

## Fix Applied

```bash
sqlite3 marketing.db < lib/database/schema/planning-workspace-schema.sql
```

This created the following tables:
- `campaign_plans` - Main plan records
- `plan_items` - Store recommendations with AI scores
- `plan_waves` - Wave management for phased rollouts
- `plan_activity_log` - Audit trail for plan changes
- Views: `plan_summary`, `plan_item_with_store_details`

## Tables Created

✅ **campaign_plans** (main plan table)
✅ **plan_items** (store recommendations with AI data)
✅ **plan_waves** (wave assignments)
✅ **plan_activity_log** (audit log)
✅ **plan_summary** (view for aggregated plan data)
✅ **plan_item_with_store_details** (view joining items with store info)

## Prevention

The schema initialization should be handled automatically by the `initializeSchema()` function in `lib/database/connection.ts` on first database connection. This may need to be updated to include the planning workspace schema.

## Verification

Check tables exist:
```bash
sqlite3 marketing.db ".tables" | grep plan
```

Expected output:
```
campaign_plans  plan_activity_log  plan_items  plan_summary  plan_waves
```

## Status

✅ **RESOLVED** - Planning workspace now functional with all tables initialized.

---

*Fixed: 2025-10-25*
*Database: marketing.db*
