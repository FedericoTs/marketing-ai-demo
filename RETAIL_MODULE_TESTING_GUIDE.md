# 🧪 Retail Module - Complete Testing Guide

This guide will walk you through testing the entire retail module from start to finish.

---

## 📋 PRE-REQUISITES

### 1. Enable Retail Module in Settings

**Steps:**
1. Navigate to **Settings** page (sidebar)
2. Scroll to **Industry Module** section
3. Select **"Retail"** from the dropdown
4. Check ✅ **"Enable Multi-Store Management"** feature
5. Click **"Save Settings"** button
6. Verify you see toast: "Settings saved successfully"

**Expected Result:**
- You should now see **"🏪 Retail Module"** section in the sidebar with:
  - Stores
  - Deployments
  - Performance

---

## 🏪 PART 1: STORE MANAGEMENT (Phase 8B)

### Test 1.1: Access Retail Module Landing Page

**Steps:**
1. Click **"Stores"** in the sidebar under Retail Module
2. Or navigate directly to: `http://localhost:3000/retail/stores`

**Expected Result:**
- You should see the Stores page with:
  - Empty state message: "No Stores Yet"
  - "Import Stores" button
  - "Add Store" button

---

### Test 1.2: Download CSV Template

**Steps:**
1. Click **"Import Stores"** button
2. In the dialog, click **"Download Template"** button

**Expected Result:**
- A file named `store-template.csv` should download
- Open it and verify it contains:
  - Headers: `storeNumber,name,address,city,state,zip,region,district,sizeCategory,lat,lng`
  - 3 sample rows (Store 001, 002, 003)

---

### Test 1.3: Import Stores from CSV

**Prepare Test Data:**
Create a CSV file named `test-stores.csv` with this content:

```csv
storeNumber,name,address,city,state,zip,region,district
001,Downtown Seattle,123 Pike St,Seattle,WA,98101,Pacific NW,District 1
002,Bellevue Square,456 Bellevue Way,Bellevue,WA,98004,Pacific NW,District 1
003,Portland Main,789 Broadway,Portland,OR,97201,Pacific NW,District 2
004,San Francisco,321 Market St,San Francisco,CA,94102,West Coast,District 3
005,Los Angeles,654 Sunset Blvd,Los Angeles,CA,90028,West Coast,District 3
```

**Steps:**
1. Click **"Import Stores"** button
2. Drag and drop `test-stores.csv` or click to browse
3. Wait for validation (should see green success message)
4. Click **"Import 5 Stores"** button
5. Wait for import to complete

**Expected Result:**
- Toast notification: "Successfully imported 5 stores"
- Dialog closes automatically
- Store list shows 5 stores in a table
- Each store shows: Store #, Name, Location, Region

---

### Test 1.4: View Store Details

**Steps:**
1. Click on any store row in the table
2. Or click the "View" button on a store

**Expected Result:**
- Navigate to store detail page `/retail/stores/[id]`
- Shows store information:
  - Store number, name
  - Address, city, state, zip
  - Region, district
  - Status badge (Active)
- "Edit Store" and "Back to Stores" buttons visible

---

### Test 1.5: Search and Filter Stores

**Steps:**
1. Go back to `/retail/stores`
2. In the search box, type "Seattle"
3. Observe the filtering

**Expected Result:**
- Only "Downtown Seattle" store is visible
- Other stores are filtered out
- Clear search to see all stores again

---

## 🎯 PART 2: CAMPAIGN DEPLOYMENT (Phase 8C)

### Test 2.1: Create CSV with Store Numbers

**Prepare Recipient CSV:**
Create a file named `recipients-with-stores.csv`:

```csv
name,lastname,address,city,zip,email,phone,storeNumber
John,Doe,123 Main St,Seattle,98101,john@example.com,555-0101,001
Jane,Smith,456 Oak Ave,Seattle,98102,jane@example.com,555-0102,001
Bob,Johnson,789 Pine Rd,Bellevue,98004,bob@example.com,555-0103,002
Alice,Williams,321 Elm St,Bellevue,98005,alice@example.com,555-0104,002
Charlie,Brown,654 Maple Dr,Portland,97201,charlie@example.com,555-0105,003
```

**Notes:**
- This CSV has 5 recipients
- 2 recipients for Store 001 (Seattle)
- 2 recipients for Store 002 (Bellevue)
- 1 recipient for Store 003 (Portland)

---

### Test 2.2: Upload CSV and See Store Distribution Preview

**Steps:**
1. Navigate to **DM Creative** page (sidebar)
2. Click **"Batch Upload"** tab
3. Enter a marketing message in the "Default Marketing Message" field:
   ```
   Discover our exclusive hearing solutions tailored for you!
   Visit your local store for a FREE consultation.
   ```
4. Click **"Upload CSV File"**
5. Select `recipients-with-stores.csv`
6. Wait for processing

**Expected Result:**
- ✅ Green checkmark: "5 recipients loaded"
- 🏪 **Blue card appears**: "Store Deployment Detected"
- Card shows:
  - Badge: "3 Stores"
  - Total Recipients: 5
  - Unique Stores: 3
  - Avg per Store: 2
- **Store breakdown section:**
  - Store #001: 2 recipients (40%)
  - Store #002: 2 recipients (40%)
  - Store #003: 1 recipient (20%)
- Visual percentage bars for each store
- Info message: "Store-level analytics enabled"

---

### Test 2.3: Generate Batch Campaign with Store Deployment

**Steps:**
1. With the CSV still loaded, click **"Generate 5 Direct Mails"** button
2. Wait for processing (should take 5-10 seconds)

**Expected Result:**
- Toast notification: "Generated 5 direct mails! Campaign: Batch Campaign - [date]"
- Right panel shows **"Batch Results"** with 5 DM previews
- Each DM shows:
  - Recipient name
  - QR code
  - Landing page URL
  - Download buttons

---

## 📊 PART 3: VIEW DEPLOYMENTS (Phase 8D - Part 1)

### Test 3.1: Access Deployments Page

**Steps:**
1. Click **"Deployments"** in the sidebar (under Retail Module)
2. Or navigate to: `http://localhost:3000/retail/deployments`

**Expected Result:**
- You should see the Deployments page with:
  - **4 summary cards:**
    - Total Deployments: 3
    - Stores Reached: 3
    - Total Recipients: 5
    - Avg per Store: 2
  - **Search bar** for filtering
  - **3 deployment cards** (one for each store)

---

### Test 3.2: Verify Deployment Details

**Steps:**
1. Examine each deployment card

**Expected Result for Each Card:**
- **Campaign Name:** "Batch Campaign - [date]"
- **Campaign Status Badge:** "active" (green)
- **Creation Date:** Today's date
- **Deployment Status:** "sent"
- **Store Information:**
  - Store #001: Downtown Seattle, Seattle, WA
  - Store #002: Bellevue Square, Bellevue, WA
  - Store #003: Portland Main, Portland, OR
- **Deployment Stats:**
  - Recipients count matches CSV (2, 2, 1)
- **Action buttons:**
  - "View Store" - links to store detail
  - "View Campaign Analytics" - links to analytics

---

### Test 3.3: Search Deployments

**Steps:**
1. In the search box, type "Seattle"
2. Observe filtering

**Expected Result:**
- Only deployment for "Downtown Seattle" store is visible
- Other 2 deployments are hidden
- Counter shows: "Showing 1 of 3 deployments"

---

## 📈 PART 4: PERFORMANCE AGGREGATION (Phase 8D - Part 2)

### Test 4.1: Trigger Performance Aggregation

**Steps:**
1. Click **"Performance"** in the sidebar (under Retail Module)
2. Or navigate to: `http://localhost:3000/retail/performance`
3. Click **"Refresh Data"** button in the top right
4. Wait for aggregation (should take 1-2 seconds)

**Expected Result:**
- Toast notification: "Performance data refreshed!"
- Page reloads with updated metrics

**Note:** This calculates and stores performance metrics for fast dashboard loading.

---

### Test 4.2: View Performance Dashboard

**After aggregation completes, verify the dashboard shows:**

**Overview Stats (4 cards):**
- **Active Stores:** 3/5 (3 stores have deployments out of 5 total)
- **Campaign Deployments:** 3
- **Total Conversions:** 0 (no conversions yet - we just created the campaign)
- **Avg Conversion Rate:** 0.0%

**Top Performing Stores Section:**
- Should show: "No performance data available yet"
- (Because no one has visited landing pages or converted yet)

**Regional Performance Section:**
- Should show regions if you set them up:
  - Pacific NW: 3 stores
  - West Coast: 2 stores
- Each region card shows:
  - Stores count
  - Total recipients
  - Conversions (0 for now)
  - Avg conversion rate

---

## 🌐 PART 5: SIMULATE USER ENGAGEMENT (Create Conversions)

Now let's simulate users engaging with the campaign to see performance tracking!

### Test 5.1: Visit Landing Pages

**Steps:**
1. Go to **Analytics** → **Campaigns** tab
2. Find the "Batch Campaign" you just created
3. Click **"View Details"** button
4. You'll see the campaign detail page showing 5 recipients

**For each recipient, visit their landing page:**

**Method 1: From Campaign Analytics**
1. In the recipients table, note the tracking IDs
2. Visit: `http://localhost:3000/lp/[trackingId]` for each recipient

**Method 2: Scan QR Codes**
1. Download one of the DM PDFs from batch results
2. Scan the QR code with your phone
3. It will open the landing page

**Expected Result for Each Landing Page Visit:**
- Personalized greeting with recipient name
- Hearing questionnaire form
- Appointment booking section

---

### Test 5.2: Submit Appointment Form (Create Conversions)

**Steps for 2-3 landing pages:**
1. Visit landing page
2. Fill out the hearing questionnaire (click through steps)
3. Fill out the appointment form:
   - Name: (pre-filled)
   - Phone: 555-1234
   - Email: test@example.com
   - Preferred date: Choose any date
   - Preferred time: Choose any time
   - Message: (optional)
4. Click **"Book Appointment"** button

**Expected Result:**
- Toast notification: "Appointment booked successfully!"
- Success message appears
- Conversion is tracked in database

---

### Test 5.3: Refresh Performance Data

**Steps:**
1. Go back to `/retail/performance`
2. Click **"Refresh Data"** button again
3. Wait for aggregation

**Expected Result - Updated Dashboard:**

**Overview Stats:**
- **Total Conversions:** 2-3 (depending on how many forms you submitted)
- **Avg Conversion Rate:** 40-60% (conversions/recipients * 100)

**Top Performing Stores:**
- Now shows actual stores with medals 🥇🥈🥉
- Each store card shows:
  - Medal emoji (#1, #2, #3)
  - Store number and name
  - Conversion rate badge (e.g., "50.0%")
  - Location (city, state)
  - Conversions count (e.g., "1/2")

**Regional Performance:**
- Shows actual conversion data per region
- Pacific NW region shows aggregated stats

---

## 📊 PART 6: VERIFY STORE-LEVEL ANALYTICS

### Test 6.1: View Store Stats in Campaign List

**Steps:**
1. Navigate to **Analytics** page
2. Click **"Campaigns"** tab
3. Find the "Batch Campaign"

**Expected Result:**
- Under the campaign metrics, you should see a **blue card**:
  - Title: "Store Performance"
  - Badge showing: "3 Stores"
- **3 store breakdown cards** showing:
  - Store #001: Recipients, Views, Conversions, Rate
  - Store #002: Recipients, Views, Conversions, Rate
  - Store #003: Recipients, Views, Conversions, Rate
- Each store shows its individual performance

---

### Test 6.2: Compare Store Performance

**Steps:**
1. Look at the store stats in the campaign
2. Compare with the Performance Dashboard top stores

**Expected Result:**
- Data matches between:
  - Campaign store stats (in analytics)
  - Performance dashboard (in retail module)
  - Deployments page (recipient counts)

---

## 🏪 PART 7: RETAIL MODULE LANDING PAGE

### Test 7.1: Access Retail Hub

**Steps:**
1. Navigate to: `http://localhost:3000/retail`
2. Or click on the "🏪 Retail Module" section header in sidebar

**Expected Result:**
- **Welcome header:** "🏪 Retail Module"
- **Quick stats cards** (4 cards showing current metrics)
- **4 feature cards:**
  1. 🏪 Store Management (blue) - with "Manage Stores" button
  2. 🎯 Campaign Deployments (purple) - with "View Deployments" button
  3. 📈 Performance Dashboard (green) - with "View Performance" button
  4. 🧠 AI Insights (grey) - "Coming Soon" badge and disabled button
- **Quick Actions section** with 3 buttons
- Each card has:
  - Icon, title, description
  - 4 bullet points of features
  - Action button

---

### Test 7.2: Navigate Between Sections

**Steps:**
1. From `/retail` landing page:
2. Click **"Manage Stores"** → should go to `/retail/stores`
3. Go back, click **"View Deployments"** → should go to `/retail/deployments`
4. Go back, click **"View Performance"** → should go to `/retail/performance`
5. Use sidebar to navigate between all sections

**Expected Result:**
- All navigation works smoothly
- Each page loads correctly
- Data is consistent across all views

---

## ✅ COMPREHENSIVE VERIFICATION CHECKLIST

Use this checklist to ensure everything works:

### Store Management ✅
- [ ] Import stores from CSV (5 stores)
- [ ] View store list with all stores
- [ ] Search/filter stores works
- [ ] View individual store details
- [ ] Edit store information (optional)

### Campaign Deployment ✅
- [ ] Upload CSV with storeNumber column
- [ ] See store distribution preview (blue card)
- [ ] Preview shows correct store breakdown
- [ ] Generate batch campaign successfully
- [ ] Verify all DMs generated with QR codes

### Deployments Tracking ✅
- [ ] View deployments page
- [ ] See all 3 deployments listed
- [ ] Summary stats are correct (3 deployments, 3 stores, 5 recipients)
- [ ] Search deployments works
- [ ] Deployment cards show correct store info
- [ ] Quick action buttons work

### Performance Dashboard ✅
- [ ] Refresh aggregation works
- [ ] Overview stats display correctly
- [ ] Top stores leaderboard shows (after conversions)
- [ ] Regional performance displays
- [ ] Medals display for top 3 stores
- [ ] Conversion rates calculate correctly

### Analytics Integration ✅
- [ ] Campaign store stats appear in campaign list
- [ ] Store-level metrics are accurate
- [ ] Data matches between dashboard and campaign view

### User Engagement Simulation ✅
- [ ] Visit landing pages (track page views)
- [ ] Submit appointment forms (create conversions)
- [ ] Verify conversions tracked in database
- [ ] Performance updates after refresh

### Retail Landing Page ✅
- [ ] Access `/retail` shows landing page
- [ ] Quick stats display correctly
- [ ] All feature cards display
- [ ] Navigation buttons work
- [ ] Getting started guide shows (if no stores)

---

## 🎯 EXPECTED FINAL STATE

After completing all tests, you should have:

**Stores:** 5 stores imported
- 3 with deployments (001, 002, 003)
- 2 without deployments (004, 005)

**Campaigns:** 1 batch campaign created

**Deployments:** 3 deployments
- Store 001: 2 recipients
- Store 002: 2 recipients
- Store 003: 1 recipient

**Conversions:** 2-3 conversions (from form submissions)

**Performance Data:**
- Aggregated metrics calculated
- Top stores ranked by conversion rate
- Regional performance aggregated

---

## 🐛 TROUBLESHOOTING

### Issue: "Retail module not enabled" error
**Solution:**
- Go to Settings
- Select "Retail" industry
- Enable "Multi-Store Management"
- Save settings

### Issue: No deployments showing
**Solution:**
- Make sure CSV has `storeNumber` column
- Verify store numbers in CSV match stores in database
- Check that stores exist before creating campaign

### Issue: Performance dashboard shows "No data"
**Solution:**
- Click "Refresh Data" button to trigger aggregation
- Ensure you have deployments created first
- Check browser console for errors

### Issue: Store distribution preview not showing
**Solution:**
- CSV must have `storeNumber` column (exact spelling)
- At least one recipient must have a storeNumber value
- Clear browser cache and try again

### Issue: Conversions not tracked
**Solution:**
- Make sure you submitted the appointment form completely
- Check that tracking ID in URL is correct
- Go to Analytics to verify events are tracked

---

## 📝 ADDITIONAL TESTING SCENARIOS

### Scenario 1: Empty States
1. Create a new campaign WITHOUT storeNumber column
2. Verify: No store distribution preview appears
3. Verify: Campaign works normally (backwards compatible)
4. Verify: No deployments created for this campaign

### Scenario 2: Missing Store Numbers
Create CSV with some recipients missing storeNumber:
```csv
name,lastname,address,city,zip,storeNumber
John,Doe,123 Main St,Seattle,98101,001
Jane,Smith,456 Oak Ave,Seattle,98102,
Bob,Johnson,789 Pine Rd,Chicago,60601,
```

**Expected:**
- Store distribution preview shows warning
- "2 recipients missing store numbers"
- Only John Doe gets linked to store deployment
- Jane and Bob are in campaign but not linked to stores

### Scenario 3: Large Store Network
1. Import 50+ stores via CSV
2. Create campaign with 100+ recipients across stores
3. Verify pagination works in store list
4. Verify performance aggregation completes
5. Verify dashboard loads quickly (under 500ms)

---

## 🎊 SUCCESS CRITERIA

You'll know the retail module is working perfectly when:

✅ All stores import successfully
✅ Store distribution preview appears with CSV upload
✅ Campaigns create deployments automatically
✅ Deployments page shows all deployments
✅ Performance aggregation calculates metrics
✅ Top stores leaderboard displays correctly
✅ Regional performance shows data
✅ Store-level stats appear in campaign analytics
✅ Landing page displays all features
✅ Navigation works seamlessly
✅ Data is consistent across all views

---

## 🚀 NEXT STEPS AFTER TESTING

Once all tests pass:

1. **Create More Campaigns**
   - Test with different store combinations
   - Try different recipient distributions
   - Experiment with different regions

2. **Monitor Performance**
   - Track actual user engagement
   - Analyze which stores perform best
   - Identify regional trends

3. **Export Data**
   - Use analytics export features
   - Generate reports for stakeholders
   - Track ROI per store

4. **Scale Up**
   - Import full 440-store network
   - Run enterprise-scale campaigns
   - Test with thousands of recipients

---

**🎉 Happy Testing! The retail module is ready for production use!**
