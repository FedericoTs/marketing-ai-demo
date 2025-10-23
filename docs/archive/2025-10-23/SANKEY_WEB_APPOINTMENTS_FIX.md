# Sankey Web Appointments Fix

**Date**: October 23, 2025
**Status**: ✅ Fixed - Ready for Testing from Windows

## Issue Reported

User reported that the Sankey diagram is not showing the correct flow for landing page appointments:

1. ✅ Landing page visit increased by +1 (working correctly)
2. ✅ Appointment booked and showing in campaign stats (working correctly)
3. ❌ **Sankey Web Appointments = 0** (BROKEN)

**Expected behavior**: The Sankey should show `Landing Page Visits → Web Appointments` with the appointment count flowing through.

---

## Root Cause Analysis

### The Bug

The Sankey query in `getSankeyChartData()` was using **incorrect date filtering**:

```typescript
// BEFORE (BROKEN)
const dateFilter = startDate && endDate
  ? `AND created_at >= '${startDate}' AND created_at <= '${endDate}'`
  : '';
```

This compares the full datetime string (e.g., `'2025-10-23 14:35:22'`) directly against just the date (e.g., `'2025-10-23'`), which doesn't match properly in SQLite.

### Why It Failed

When filtering by date range:
- The `created_at` field contains full datetime: `'2025-10-23 14:35:22'`
- The filter used: `created_at >= '2025-10-23' AND created_at <= '2025-10-23'`
- This would only match if `created_at = '2025-10-23'` exactly (no time component)
- Result: **No appointments found, webAppointments = 0**

### Why Campaign Stats Worked

The `getDashboardStats()` function uses the correct approach:

```typescript
// CORRECT (in getDashboardStats)
const conversionDateFilter = hasDateFilter
  ? "WHERE DATE(created_at) BETWEEN ? AND ?"
  : "";
```

This uses SQLite's `DATE()` function to extract just the date portion before comparing, which works correctly.

---

## The Fix

Updated all date filters in `getSankeyChartData()` to use `DATE()` function with `BETWEEN`:

**File**: `lib/database/tracking-queries.ts` (lines 1721-1732)

```typescript
// AFTER (FIXED)
// Date filter conditions (using DATE() for proper datetime comparison)
const dateFilter = startDate && endDate
  ? `AND DATE(created_at) BETWEEN '${startDate}' AND '${endDate}'`
  : '';

const eventDateFilter = startDate && endDate
  ? `AND DATE(event_time) BETWEEN '${startDate}' AND '${endDate}'`
  : '';

const callDateFilter = startDate && endDate
  ? `AND DATE(call_started_at) BETWEEN '${startDate}' AND '${endDate}'`
  : '';
```

### Changes Made

1. **Updated date filters** (lines 1721-1732)
   - Changed from `>=` / `<=` to `DATE() BETWEEN`
   - Now matches the pattern used in `getDashboardStats()`

2. **Added debug logging** (lines 1790-1800)
   ```typescript
   console.log('[Sankey Query Debug]', {
     dateFilter: startDate && endDate ? `${startDate} to ${endDate}` : 'No filter',
     totalRecipients,
     qrScans,
     landingPageVisits,
     totalCalls,
     webAppointments,
     callAppointments,
     totalAppointments,
   });
   ```

---

## Data Flow Verification

### How Appointments Are Tracked

1. **Landing Page Visit**:
   - User visits `/lp/[trackingId]`
   - Tracking code calls `/api/tracking/event`
   - Creates record in `events` table: `event_type = 'page_view'`

2. **Appointment Booking**:
   - User fills out appointment form on landing page
   - Form submits to `/api/tracking/conversion`
   - Creates record in `conversions` table: `conversion_type = 'appointment_booked'`

3. **Sankey Query**:
   ```sql
   -- Landing page visits
   SELECT COUNT(DISTINCT tracking_id) FROM events
   WHERE event_type = 'page_view'
   AND DATE(event_time) BETWEEN '2025-10-01' AND '2025-10-23'

   -- Web appointments
   SELECT COUNT(DISTINCT tracking_id) FROM conversions
   WHERE conversion_type = 'appointment_booked'
   AND DATE(created_at) BETWEEN '2025-10-01' AND '2025-10-23'
   ```

4. **Sankey Flow**:
   ```
   Landing Page Visits (node 3) → Web Appointments (node 5)
   ```

---

## Files Modified

### lib/database/tracking-queries.ts

**Lines 1721-1732**: Fixed date filter logic
```typescript
// Old: created_at >= '${startDate}' AND created_at <= '${endDate}'
// New: DATE(created_at) BETWEEN '${startDate}' AND '${endDate}'
```

**Lines 1790-1800**: Added debug logging
```typescript
console.log('[Sankey Query Debug]', {
  dateFilter,
  totalRecipients,
  // ... all metrics
});
```

---

## Testing Instructions

### Prerequisites

⚠️ **MUST run from Windows** (not WSL) due to better-sqlite3 native module issues.

Use: `RUN_FROM_WINDOWS.bat`

### Test Steps

1. **Navigate to Analytics Dashboard**
   ```
   http://localhost:3000/analytics?tab=overview
   ```

2. **Set Date Filter to "All Time"**
   - Verify you see existing landing page visits
   - Note the count (e.g., "Landing Page Visits: 3")

3. **Open a Landing Page**
   - Get a tracking URL from a campaign
   - Open in new browser tab
   - Verify landing page visit count increases by 1

4. **Book an Appointment**
   - Fill out the appointment form on the landing page
   - Complete questionnaire
   - Submit booking
   - Verify success message appears

5. **Check Sankey Diagram**
   - Go back to Analytics Dashboard
   - Refresh the page
   - **Expected**: Sankey shows:
     ```
     Landing Page Visits (X) → Web Appointments (Y)
     ```
   - **Verify**:
     - Landing Page Visits count matches the metric card
     - Web Appointments shows at least 1
     - The flow connection is visible

6. **Check Debug Console**
   - Open browser DevTools → Console
   - Look for `[Sankey Query Debug]` log
   - **Verify**:
     ```javascript
     {
       dateFilter: "No filter" or "2025-10-01 to 2025-10-23",
       totalRecipients: 2596,
       landingPageVisits: X,  // Should match UI
       webAppointments: Y,    // Should be > 0 if you booked appointment
       totalAppointments: Y,
       // ...
     }
     ```

7. **Test Date Filtering**
   - Select "Last 7 Days" filter
   - Verify Sankey updates and shows filtered data
   - Select "Last 30 Days"
   - Verify counts change appropriately

---

## Expected Results

### Before Fix

```
Landing Page Visits (3) → [No connection to Web Appointments]
Web Appointments: 0  ❌ (incorrect, appointments exist but not showing)
```

### After Fix

```
Landing Page Visits (3) → Web Appointments (1) ✅
```

The flow should show:
- Recipients who visited the landing page
- How many of those booked appointments via the web form
- Proper date filtering that matches campaign stats

---

## Success Criteria

- ✅ Web Appointments count > 0 when appointments exist
- ✅ Sankey shows flow: Landing Page Visits → Web Appointments
- ✅ Web Appointments matches campaign stats conversion count
- ✅ Date filtering works consistently across all metrics
- ✅ Debug logging shows correct values

---

## Known Constraints

### Separate Tracking Systems

Currently, the platform has **two independent appointment tracking systems**:

1. **Web Appointments** (conversions table)
   - Source: Landing page appointment forms
   - Tracked via: `/api/tracking/conversion`
   - Type: `conversion_type = 'appointment_booked'`

2. **Call Appointments** (elevenlabs_calls table)
   - Source: ElevenLabs phone calls
   - Tracked via: Call webhook + sync job
   - Type: `is_conversion = 1`

These are **mutually exclusive** in the current implementation - a single appointment is either:
- Web (conversions table) OR
- Call (elevenlabs_calls table)

NOT both.

### Future Enhancement

If the same recipient books BOTH a web appointment AND a call appointment, they would show up as 2 separate appointments in the Sankey. A future enhancement could:
- Link appointments by recipient tracking_id
- De-duplicate to show unique recipients with appointments
- Track multi-channel attribution

---

## Debug Commands

If Web Appointments still shows 0 after testing:

### 1. Check Database Directly

Open SQLite database (from Windows):
```bash
sqlite3 marketing.db

-- Check if appointments exist
SELECT COUNT(*) FROM conversions WHERE conversion_type = 'appointment_booked';

-- Check most recent appointment
SELECT * FROM conversions WHERE conversion_type = 'appointment_booked' ORDER BY created_at DESC LIMIT 1;

-- Check created_at format
SELECT created_at FROM conversions WHERE conversion_type = 'appointment_booked' LIMIT 1;
```

### 2. Check Date Filter Logic

Look at console debug output:
```javascript
[Sankey Query Debug] {
  dateFilter: "2025-10-01 to 2025-10-23",  // Check this matches your test date
  webAppointments: 0,  // If this is 0, query is not finding appointments
}
```

### 3. Verify Conversion Created

Check browser Network tab after booking appointment:
```
POST /api/tracking/conversion
Response: {
  "success": true,
  "data": {
    "conversionId": "...",
    "trackingId": "...",
    "conversionType": "appointment_booked",
    "timestamp": "2025-10-23T14:35:22.123Z"
  }
}
```

---

## Related Documentation

- `CRITICAL_FIXES_DASHBOARD_FILTERING.md` - Previous dashboard filtering fixes
- `WSL_BETTER_SQLITE3_FIX.md` - Why you must run from Windows
- `PHASE1_IMPLEMENTATION_COMPLETE.md` - Call tracking implementation
- `RUN_FROM_WINDOWS.bat` - Batch script to run from Windows

---

## Summary

**Problem**: Sankey diagram not showing web appointments due to incorrect date filtering
**Root Cause**: String comparison of datetime vs date (no `DATE()` function)
**Solution**: Use `DATE() BETWEEN` for all date filters, matching `getDashboardStats()` pattern
**Status**: ✅ Code fixed and compiles successfully
**Next Step**: Test from Windows environment to verify fix works end-to-end

The Sankey diagram should now correctly display the customer journey flow from landing page visits to web appointments! 🎯
