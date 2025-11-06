# Audience Explorer Testing Guide

**Date:** 2025-11-06
**Feature:** Data Axle Audience Targeting Integration
**Status:** Ready for Testing

---

## 🎯 Test Objectives

1. Verify UI renders correctly and is intuitive
2. Validate real-time count API integration
3. Test audience save functionality
4. Confirm database persistence
5. Verify error handling and edge cases

---

## ✅ Pre-Test Checklist

- [ ] Development server running (`npm run dev`)
- [ ] Supabase connection active
- [ ] Environment variables configured:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (optional for admin operations)
  - `DATA_AXLE_API_KEY` (optional - will use mock data if missing)

---

## 📋 Test Cases

### **TEST 1: UI Rendering & Navigation**

**Objective:** Verify the audience explorer page loads and displays correctly

**Steps:**
1. Navigate to `http://localhost:3000/audiences`
2. Verify page loads without errors
3. Check for three tabs: Library, Create, Analytics
4. Verify "Create" tab is active by default
5. Check that all UI elements are visible:
   - LEFT: Filter categories (Geography, Demographics, Financial, Lifestyle)
   - CENTER: Filter controls (initially only Geography expanded)
   - RIGHT: Live preview panel (should show "Add filters to see audience size")

**Expected Results:**
- ✅ Page loads in < 3 seconds
- ✅ No console errors
- ✅ All components render correctly
- ✅ Purple gradient icon visible in header
- ✅ "Target 250M+ contacts with precision • FREE count preview" tagline visible

**Status:** 🟡 PENDING

---

### **TEST 2: Filter Interactions**

**Objective:** Verify filter controls work correctly

**Test 2.1: Geography Filters**
1. Click on "Geography" category (should already be expanded)
2. Select a state (e.g., "CA" for California)
3. Enter a city (e.g., "San Francisco")
4. Verify active filter count badge shows "2"

**Expected Results:**
- ✅ State dropdown populates with all 50 US states
- ✅ City input accepts text
- ✅ Badge shows correct count
- ✅ No console errors

**Test 2.2: Demographics Filters**
1. Click "Demographics" to expand
2. Enter Min Age: 25
3. Enter Max Age: 45
4. Select Gender: "M" (Male)
5. Verify active filter count updates

**Expected Results:**
- ✅ Age inputs accept numbers only
- ✅ Gender dropdown shows M/F/U options
- ✅ Badge updates to show total filters (Geography: 2, Demographics: 3 = 5 total)

**Test 2.3: Financial Filters**
1. Click "Financial" to expand
2. Enter Min Income: 50000
3. Enter Max Income: 150000
4. Verify active filter count updates

**Expected Results:**
- ✅ Income inputs accept numbers
- ✅ Badge shows 7 total active filters

**Status:** 🟡 PENDING

---

### **TEST 3: Real-Time Count Preview**

**Objective:** Verify the count API integration and debouncing

**Test 3.1: Count Loads After Debounce**
1. Start with no filters applied
2. Select State: "CA"
3. Wait 800ms (debounce delay)
4. Observe RIGHT panel for count update

**Expected Results:**
- ✅ Loading spinner appears immediately after filter change
- ✅ After 800ms, spinner disappears
- ✅ Count displays (either mock data or real Data Axle count)
- ✅ Cost calculator shows:
  - Total Contacts: [number]
  - Estimated Cost: $[count × 0.15]
  - Your Charge: $[count × 0.25]
  - Your Margin: $[difference]
- ✅ If mock data: Yellow banner shows "Using mock data - configure DATA_AXLE_API_KEY"
- ✅ Quality indicator appears (Good/Too Broad/Too Narrow)

**Test 3.2: Debouncing Works**
1. Rapidly change multiple filters (e.g., type in city field quickly)
2. Count should NOT update until 800ms after you stop typing

**Expected Results:**
- ✅ Only ONE API call made (check Network tab)
- ✅ Previous pending calls are cancelled
- ✅ No "rapid fire" requests

**Test 3.3: Quality Indicators**
1. Apply very broad filter (e.g., only State: "CA")
   - **Expected:** Orange warning "Too broad - Consider narrowing"
2. Apply very narrow filter (e.g., State: "CA", City: "TinyTown", Age 99-100, Income 999999-1000000)
   - **Expected:** Orange warning "Too narrow - Widen your criteria"
3. Apply balanced filter (e.g., State: "CA", Age 25-45, Income 50000-150000)
   - **Expected:** Green checkmark "Good targeting balance"

**Status:** 🟡 PENDING

---

### **TEST 4: Audience Save Functionality**

**Objective:** Verify audiences can be saved to the database

**Test 4.1: Save Form Appears**
1. Apply some filters (State: "CA", Age: 25-45)
2. Wait for count to load
3. Click "Save Audience" button in RIGHT panel
4. Verify save form expands below

**Expected Results:**
- ✅ Form appears with:
  - Audience Name input (required)
  - Description textarea (optional)
  - Cancel button
  - Save button (disabled until name entered)

**Test 4.2: Validation Works**
1. Click Save button without entering name
2. **Expected:** Button stays disabled OR error toast appears
3. Enter name: "California Millennials"
4. Click Save

**Expected Results:**
- ✅ Button shows "Saving..." with spinner
- ✅ Success toast appears: "Audience saved successfully!"
- ✅ Form resets
- ✅ Tab automatically switches to "Library"

**Test 4.3: Database Persistence**
1. Open browser DevTools → Network tab
2. Save an audience
3. Check for POST request to `/api/audience/save`
4. Verify request body contains:
   ```json
   {
     "organizationId": "00000000-0000-0000-0000-000000000000",
     "userId": "00000000-0000-0000-0000-000000000000",
     "name": "California Millennials",
     "description": "...",
     "filters": { "state": "CA", "ageMin": 25, "ageMax": 45 },
     "lastCount": 1234567,
     "lastEstimatedCost": 185185.05,
     "lastUserCharge": 308641.75
   }
   ```
5. Verify response is 201 Created with saved audience data

**Expected Results:**
- ✅ API call succeeds
- ✅ Response includes `audience.id` (UUID)
- ✅ No database errors in server console

**Test 4.4: Error Handling**
1. Try to save audience with duplicate name
2. **Expected:** Error toast "An audience with this name already exists"
3. Try to save without organizationId/userId
4. **Expected:** Error toast "Missing user or organization information. Please log in."

**Status:** 🟡 PENDING

---

### **TEST 5: Supabase Database Verification**

**Objective:** Confirm data is actually saved to Supabase

**Steps:**
1. Open Supabase Dashboard
2. Navigate to Table Editor
3. Find `audience_filters` table
4. Verify saved audience appears with:
   - Correct `name`
   - Correct `filters` (JSONB)
   - Correct `last_count`
   - Correct `last_estimated_cost`
   - `created_at` timestamp
   - `organization_id` and `created_by` match demo UUIDs

**Expected Results:**
- ✅ Row exists in `audience_filters` table
- ✅ All fields populated correctly
- ✅ JSONB filters are valid JSON

**Status:** 🟡 PENDING

---

### **TEST 6: Library Tab (Saved Audiences)**

**Objective:** Verify saved audiences can be viewed

**Steps:**
1. Save 2-3 test audiences
2. Navigate to "Library" tab
3. Verify saved audiences appear

**Expected Results:**
- ✅ Audience cards display with:
  - Audience name
  - Filter summary
  - Last count
  - Performance metrics (campaigns using, response rate, etc.)
- ✅ Search bar filters audiences
- ✅ "Create Your First Audience" button appears if no audiences exist

**Status:** 🟡 PENDING (Library component not yet wired to API)

---

### **TEST 7: Analytics Tab**

**Objective:** Verify analytics display correctly

**Steps:**
1. Navigate to "Analytics" tab
2. View overview stats

**Expected Results:**
- ✅ Shows placeholder/mock data initially
- ✅ Will populate with real data once audiences are used in campaigns

**Status:** 🟡 PENDING (Analytics component showing mock data)

---

### **TEST 8: Error Scenarios**

**Objective:** Verify error handling is robust

**Test 8.1: Network Failure**
1. Disconnect network or block API
2. Try to get count
3. **Expected:** Error toast with helpful message
4. Count panel shows error state

**Test 8.2: Invalid Filters**
1. Enter Min Age > Max Age (e.g., Min: 65, Max: 25)
2. **Expected:** Validation error or count returns 0

**Test 8.3: API Key Missing**
1. Remove `DATA_AXLE_API_KEY` from env
2. Restart server
3. Try to get count
4. **Expected:** Mock data with yellow banner: "Using mock data - configure DATA_AXLE_API_KEY for real counts"

**Status:** 🟡 PENDING

---

### **TEST 9: Performance**

**Objective:** Verify performance is acceptable

**Metrics to Check:**
1. Initial page load: < 3 seconds
2. Filter change → count update: 800ms debounce + ~500ms API call = ~1.3s total
3. Save operation: < 2 seconds
4. No memory leaks (check DevTools Memory tab)

**Expected Results:**
- ✅ All operations complete within acceptable time
- ✅ No performance warnings in console
- ✅ Smooth animations and transitions

**Status:** 🟡 PENDING

---

### **TEST 10: Mobile Responsiveness**

**Objective:** Verify UI works on mobile devices

**Steps:**
1. Open DevTools → Toggle device toolbar
2. Test on iPhone 12 Pro (390x844)
3. Test on iPad Air (820x1180)

**Expected Results:**
- ✅ Three-panel layout collapses appropriately
- ✅ All buttons and inputs are tappable
- ✅ Text is readable
- ✅ No horizontal scrolling

**Status:** 🟡 PENDING

---

## 🐛 Known Issues

### Issue Tracker
| Issue | Severity | Status | Notes |
|-------|----------|--------|-------|
| Library tab not showing saved audiences | Medium | 🔴 TODO | Need to wire up `/api/audience/list` |
| Only 6 filters implemented in UI | Medium | 🔴 TODO | Missing: zip, county, marital status, homeowner, net worth, interests |
| Demo user IDs hardcoded | Low | 🔴 TODO | Replace with real auth when implemented |
| Analytics showing mock data | Low | 🔴 TODO | Will populate once campaigns use audiences |

---

## 📊 Test Results Summary

**Total Test Cases:** 10
**Passed:** 0 🟡
**Failed:** 0 ❌
**Pending:** 10 🟡

---

## 🔍 Manual Testing Checklist

**Tester:** ___________
**Date:** ___________
**Browser:** ___________
**Environment:** Development / Staging / Production

### Quick Test (5 minutes)
- [ ] Navigate to /audiences
- [ ] Select State: CA
- [ ] Wait for count to load
- [ ] Verify count displays
- [ ] Click "Save Audience"
- [ ] Enter name and save
- [ ] Verify success toast

### Full Test (20 minutes)
- [ ] Complete all 10 test cases above
- [ ] Document any issues found
- [ ] Take screenshots of errors
- [ ] Check server logs for warnings

---

## 🚀 Next Steps After Testing

1. **Fix Critical Issues:** Address any bugs found during testing
2. **Expand Filters:** Add missing 10+ filter types to UI
3. **Wire Library Tab:** Connect saved audiences to list API
4. **Add Real Auth:** Replace demo UUIDs with actual user authentication
5. **Implement Purchase Flow:** Build contact purchase functionality
6. **Campaign Integration:** Connect audiences to campaign creation modal

---

## 📝 Notes

- Mock data is acceptable for development testing
- Real Data Axle API key required for production validation
- Database must have Migration 008 applied
- Supabase RLS policies must be configured correctly

---

**End of Testing Guide**
