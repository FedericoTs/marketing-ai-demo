# Percentile System - Why It Shows 50th and How to Fix It

## TL;DR

**Why percentiles show 50th**: All stores in your database have **0% conversion rate** (no actual conversions), so they all rank identically at the median.

**Fix**: Populate historical campaign data with realistic conversion rates so stores can be ranked properly.

---

## Understanding the Issue

### What You're Seeing
```
AI Recommendation:
- Base Quality: 50th
- At This Volume: 50th
- 10% saturated

Your Override:
- Base Quality: 50th (SAME!)
- At This Volume: 50th (SAME!)
- 53% saturated (different, but percentile unchanged)
```

### Why This Happens

**Current Database State:**
```sql
SELECT name, campaigns, recipients, conversions, conversion_rate
FROM retail_stores_performance;

Portland Central:     2 campaigns, 4 recipients, 0 conversions → 0%
Phoenix North:        2 campaigns, 2 recipients, 0 conversions → 0%
Downtown Miami Store: 2 campaigns, 4 recipients, 0 conversions → 0%
(10 other stores):    0 campaigns, 0 recipients, 0 conversions → N/A
```

**Result**: Everyone has 0% performance → Everyone ranks at 50th percentile (median)

---

## How Percentile Ranking Works

###  Concept
**Percentile** = "What % of stores does this store outperform?"

- **90th percentile** = Better than 90% of stores
- **50th percentile** = Average/median performance
- **10th percentile** = Worse than 90% of stores

### Requirements for Meaningful Rankings

1. **Multiple stores** (ideally 10-20+)
2. **Performance variation** (some high, some medium, some low)
3. **Real conversion data** (actual results, not predictions)

### Example: Proper Distribution

| Store | Conversion Rate | Percentile Rank |
|-------|----------------|-----------------|
| Beverly Hills | 6.2% | 95th (Top performer!) |
| Manhattan | 5.5% | 85th |
| Downtown Miami | 4.8% | 75th |
| Chicago | 4.2% | 65th |
| Phoenix | 3.5% | 55th |
| Portland | 3.0% | 45th (Median) |
| Austin | 2.7% | 35th |
| Denver | 2.3% | 25th |
| Rural Store A | 1.9% | 15th |
| Rural Store B | 1.5% | 5th (Needs improvement) |

With this distribution:
- High performer at low quantity (200 pcs) → 85th percentile
- Same store at high saturation (5000 pcs) → Drops to 60th percentile
- Low performer at any quantity → Always 10-20th percentile

---

## Why Your Percentiles Don't Change

### The Math

**Base Percentile Calculation:**
```typescript
function calculateStorePercentile(storeId) {
  const allStores = getStoresWithPerformanceData();
  // Sort by conversion rate
  const sorted = allStores.sort((a, b) => b.conversion_rate - a.conversion_rate);

  // Your stores:
  // [0%, 0%, 0%] → All tied!

  const rank = sorted.findIndex(s => s.id === storeId);
  const percentile = ((sorted.length - rank) / sorted.length) * 100;

  // Everyone at position 1-3 out of 3 → All get ~50th percentile
  return Math.round(percentile);
}
```

**Projected Percentile at Different Saturation:**
```typescript
function calculateProjectedPercentile(storeId, saturationLevel, actualRate) {
  // At 10% saturation:
  const efficiency = 1 / Math.pow(1 + 0.1 * 2, 0.5); // ≈ 1.38x
  const projectedRate = 0% * 1.38 = 0% still!

  // At 53% saturation:
  const efficiency = 1 / Math.pow(1 + 0.53 * 2, 0.5); // ≈ 0.98x
  const projectedRate = 0% * 0.98 = 0% still!

  // Re-rank all stores at this saturation:
  // [0%, 0%, 0%] → Still all tied! → Still 50th percentile
}
```

**The Problem**: 0% × any efficiency factor = 0%, so rankings never change!

---

## Solution: Populate Realistic Historical Data

### Option 1: Run Seed Script (Recommended)

I've created `scripts/seed-retail-data.ts` which will:
1. Add 25 retail stores (5 high, 12 medium, 8 low performers)
2. Create 5-8 historical campaigns per store
3. Generate realistic conversions following response curves
4. Create proper performance distribution

**Run it:**
```bash
# Note: May need to run from Windows due to WSL/esbuild issues
npx tsx scripts/seed-retail-data.ts
```

### Option 2: Add Performance to Existing Stores (Quick Fix)

Add conversion data to your 3 existing stores:

```sql
-- Add realistic conversions to existing campaigns
-- (See scripts/add-historical-performance.sql for full version)

-- Make Portland a HIGH performer (5% rate)
INSERT INTO conversions (id, tracking_id, conversion_type, created_at)
SELECT
  'conv_portland_' || tracking_id,
  tracking_id,
  'form_submission',
  datetime('now')
FROM recipients r
JOIN retail_deployment_recipients rdr ON r.id = rdr.recipient_id
JOIN retail_campaign_deployments d ON rdr.deployment_id = d.id
WHERE d.store_id = '1XYzsCJ2Qsi4oNvX'
LIMIT (SELECT COUNT(*) * 0.05 FROM recipients ...); -- 5% conversion

-- Make Phoenix MEDIUM performer (3% rate)
-- (Similar INSERT with 3% limit)

-- Make Miami MEDIUM-LOW performer (2% rate)
-- (Similar INSERT with 2% limit)
```

### Option 3: Use Real Campaign Data

As you run actual campaigns and collect real conversions:
1. The system will automatically pick up the new data
2. Percentiles will start reflecting real performance differences
3. Predictions will become more accurate over time

---

## What Happens After Adding Data

### Before (Current State)
```
All stores: 0% → Everyone at 50th percentile
- AI at 200 pcs: 50th percentile
- User at 2000 pcs: 50th percentile (no change!)
```

### After (With Realistic Data)
```
Distribution:
Portland: 5.2% → 85th percentile (high performer)
Miami: 3.5% → 55th percentile (medium)
Phoenix: 2.8% → 35th percentile (medium-low)
```

**Now when you test overrides:**
```
AI Recommendation: 200 pieces from Portland (high performer)
- Base Quality: 85th (Portland is a top store!)
- At This Volume: 87th (low saturation = high efficiency)
- 10% saturated

Your Override: 2000 pieces from Portland
- Base Quality: 85th (inherent quality unchanged)
- At This Volume: 68th (drops due to high saturation!)
- 53% saturated → diminishing returns kicking in
```

**The percentile changes!** 87th → 68th shows the impact of oversaturation.

---

## Testing the System

### Step 1: Verify Current State
```sql
-- Check current performance distribution
SELECT
  s.name,
  COUNT(DISTINCT d.id) as campaigns,
  COUNT(DISTINCT rdr.recipient_id) as recipients,
  COUNT(DISTINCT c.id) as conversions,
  ROUND(CAST(COUNT(DISTINCT c.id) AS FLOAT) / COUNT(DISTINCT rdr.recipient_id) * 100, 2) as rate
FROM retail_stores s
LEFT JOIN retail_campaign_deployments d ON s.id = d.store_id
LEFT JOIN retail_deployment_recipients rdr ON d.id = rdr.deployment_id
LEFT JOIN recipients r ON rdr.recipient_id = r.id
LEFT JOIN conversions c ON r.tracking_id = c.tracking_id
GROUP BY s.id
ORDER BY rate DESC;
```

Expected output now:
```
All stores: 0% or NULL
```

After seeding:
```
Top stores: 4-6% conversion rate
Medium stores: 2.5-4% conversion rate
Low stores: 1.5-2.5% conversion rate
```

### Step 2: Test Override Panel

1. Go to Planning Workspace
2. Select a plan with stores
3. Click "Override" on any store
4. Change quantity from 200 → 2000 pieces
5. **Watch the percentiles update!**

Expected behavior:
- Base Quality: Stays the same (inherent store quality)
- At This Volume: **Decreases** as saturation increases
- System shows warning: "Diminishing returns" or "Oversaturated"

### Step 3: Compare Different Stores

Try overriding:
- **High performer** (85th percentile) → Stays high even at medium saturation
- **Low performer** (15th percentile) → Drops further at high saturation

This visually demonstrates which stores can handle higher volumes.

---

## Console Logs to Watch

When you test the override panel after adding data, check the browser console:

**With data:**
```
📊 Fitting response curve from 6 historical campaigns for store Portland
Base rate: 5.2%, Alpha: 1.3 (gentle curve), Market: 8500
```

**Without data:**
```
⚠️ Insufficient historical data for store Portland, using heuristic curve
Base rate: 3.0%, Alpha: 1.0 (generic), Market: 3000
```

---

## Summary

### Current Issue
✗ All stores have 0% conversion rate
✗ No performance variation
✗ Everyone ranks at 50th percentile
✗ Percentiles don't change with quantity

### After Adding Data
✓ Stores have varied performance (1.5% - 6%)
✓ Clear high/medium/low tiers
✓ Meaningful percentile rankings
✓ Percentiles adapt to saturation levels
✓ Visual feedback shows oversaturation impact

### Action Items

1. **Immediate**: Run `scripts/seed-retail-data.ts` to populate benchmark data
2. **Test**: Try override panel → change quantities → see percentiles adapt
3. **Long-term**: As real campaigns run, system learns from actual data
4. **Monitor**: Console logs show "Fitting from historical campaigns" vs "Using heuristic"

The system is **working correctly** - it just needs real performance data to create meaningful rankings!

---

*Document Created: 2025-10-25*
*Author: Claude (Anthropic)*
