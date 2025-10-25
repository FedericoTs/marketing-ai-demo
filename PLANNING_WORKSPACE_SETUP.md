# Planning Workspace - Setup & Testing Guide

## 🚀 Quick Start (Windows)

### 1. Initialize Database Tables

The Planning Workspace requires new database tables. Run this once:

```powershell
# From project root in Windows PowerShell
node scripts/init-planning-db.js
```

**Expected Output**:
```
🔄 Initializing Planning Workspace database...
✅ Database opened successfully
🔄 Creating tables...
✅ Planning Workspace tables created successfully!

📊 Created tables:
   ✓ campaign_plans
   ✓ plan_activity_log
   ✓ plan_items
   ✓ plan_waves

👁️  Created views:
   ✓ plan_item_with_store_details
   ✓ plan_summary

✨ Planning Workspace database initialized successfully!
```

### 2. Seed Sample Data (Optional)

To test with sample plans and AI recommendations:

```powershell
node scripts/seed-planning-data.js
```

**Expected Output**:
```
🌱 Seeding Planning Workspace with sample data...
✅ Found 10 stores and 3 campaigns

📋 Creating sample plans...
   ✓ Created plan: March 2025 Spring Campaign
   ✓ Created plan: Q2 2025 Regional Rollout

🏪 Creating sample plan items with AI recommendations...
   ✓ Added 8 items to "March 2025 Spring Campaign"
   ✓ Added 5 items to "Q2 2025 Regional Rollout"

🔄 Updating plan aggregates...
   ✓ Updated aggregates for "March 2025 Spring Campaign"
   ✓ Updated aggregates for "Q2 2025 Regional Rollout"

✨ Sample data seeded successfully!
📊 Created 2 plans with 13 total items
```

### 3. Start Dev Server

```powershell
npm run dev
```

### 4. Test the UI

Navigate to: **http://localhost:3000/campaigns/planning**

---

## 🎯 What to Test

### **Planning Dashboard** (`/campaigns/planning`)

You should see:
- ✅ List of plans with status badges (Draft/Approved/Executed)
- ✅ Plan cards showing:
  - Store count (e.g., "8 stores, 7 included")
  - Estimated cost & quantity
  - AI confidence percentage (color-coded)
  - Expected conversions
- ✅ Filter tabs (All/Draft/Approved/Executed)
- ✅ Create New Plan button

### **Plan Editor** (`/campaigns/planning/{id}`)

Click on any plan card → Opens the plan editor:

**Summary Cards** (at top):
- ✅ Total stores
- ✅ Estimated cost
- ✅ Average AI confidence
- ✅ Expected conversions

**Store Recommendations Table**:
- ✅ Each row shows: Store | Campaign | Quantity | AI Confidence
- ✅ Click any row → **Expands to show full AI Reasoning Panel**

### **AI Reasoning Panel** (🎯 Main Feature!)

When you expand a store row, you should see:

```
┌─ AI Recommendation Panel ─────────────────────────┐
│                                                    │
│  AI Recommendation              [85% High Conf]   │
│  Expected Conversions: 3.5                         │
│                                                    │
│  AI Score Breakdown                                │
│  📊 Store Performance       [████████] 90/100     │
│  🎨 Creative Performance    [███████░] 78/100     │
│  📍 Geographic Fit          [████████] 88/100     │
│  ⏰ Timing Alignment        [███████░] 85/100     │
│                                                    │
│  Why AI Recommended This                           │
│  ✓ Strong historical performance (4.2% conv)      │
│  ✓ High regional fit for spring themes            │
│  ✓ Similar stores show 85% success rate           │
│                                                    │
│  Potential Risks                                   │
│  ⚠️ Limited historical data (if any)              │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Visual Elements to Verify**:
- ✅ **Color-coded confidence badge**: Green (high ≥75%), Yellow (medium 50-75%), Red (low <50%)
- ✅ **4 progress bars**: Each showing 0-100 score with different colors
- ✅ **Reasoning bullets**: With checkmark icons explaining WHY
- ✅ **Risk warnings**: Yellow alert badges (if risks exist)
- ✅ **Expected conversions**: Prediction number highlighted

### **Actions**

**For Draft Plans**:
- ✅ Click "Approve Plan" → Status changes to "Approved"

**For Approved Plans**:
- ✅ Click "Execute Plan" → Confirms, then creates orders and redirects to `/campaigns/orders`

---

## 🔧 Troubleshooting

### Error: "Failed to load plan"

**Cause**: Database tables not initialized

**Fix**:
```powershell
node scripts/init-planning-db.js
```

### Error: "No plans found"

**Cause**: No data in database

**Fix**:
```powershell
node scripts/seed-planning-data.js
```

### Error: "No retail stores found"

**Cause**: Need to seed retail stores first

**Fix**: Go to the Retail module and add some stores, or use the existing retail store seeding process

---

## 📊 Sample Data Overview

The seeding script creates:

**Plan 1**: "March 2025 Spring Campaign" (Draft)
- 8 stores with varied AI confidence levels
- Mix of high/medium/low confidence recommendations
- Some assigned to Wave 1, some to Wave 2, some unassigned
- Total cost ~$400-600
- Expected conversions ~15-25

**Plan 2**: "Q2 2025 Regional Rollout" (Approved)
- 5 stores with AI recommendations
- Ready to execute (already approved)
- Shows what an approved plan looks like

Each store has:
- ✅ AI confidence score (55-95%)
- ✅ 4 factor scores (40-95 each)
- ✅ 3-4 reasoning bullet points
- ✅ 0-2 risk factors (depending on confidence)
- ✅ Expected conversion prediction

---

## 🎨 Visual AI Reasoning Features

The Planning Workspace demonstrates:

### 1. **Confidence Color Coding**
```
🟢 Green Badge   = High Confidence (≥75%)  "Trust this recommendation"
🟡 Yellow Badge  = Medium Confidence       "Review carefully"
🔴 Red Badge     = Low Confidence (<50%)   "Use caution, consider override"
```

### 2. **Score Breakdown** (4 Factors)
```
Each factor shows 0-100 with visual progress bar:

📊 Store Performance    = How well this store converts historically
🎨 Creative Performance = How well this campaign works elsewhere
📍 Geographic Fit       = Regional/demographic alignment
⏰ Timing Alignment     = Seasonal/calendar fit
```

### 3. **Reasoning Explanations**
```
✓ Strong historical performance (4.2% conversion rate)
✓ High regional fit for spring themes
✓ Similar stores show 85% success rate
✓ Seasonal timing aligns well with campaign message
```

### 4. **Risk Warnings**
```
⚠️ Limited historical data for this store
⚠️ Demographic mismatch with campaign target
⚠️ Suboptimal seasonal timing
```

---

## 📁 Files Reference

**Database Scripts**:
- `scripts/init-planning-db.js` - Initialize tables
- `scripts/seed-planning-data.js` - Create sample data

**Database Schema**:
- `lib/database/schema/planning-workspace-schema.sql` - Table definitions

**API Endpoints**:
- `app/api/campaigns/plans/route.ts` - List/create plans
- `app/api/campaigns/plans/[id]/route.ts` - Plan operations
- `app/api/campaigns/plans/[id]/items/route.ts` - Items operations
- `app/api/campaigns/plans/[id]/approve/route.ts` - Approve plan
- `app/api/campaigns/plans/[id]/execute/route.ts` - Execute plan (create orders)

**UI Pages**:
- `app/campaigns/planning/page.tsx` - Dashboard
- `app/campaigns/planning/[id]/page.tsx` - Plan editor

**Visual Components**:
- `components/planning/ai-confidence-badge.tsx` - Confidence indicator
- `components/planning/score-breakdown.tsx` - 4-factor progress bars
- `components/planning/ai-reasoning.tsx` - Reasoning + risks panel

---

## ✨ Success Criteria

After setup, you should be able to:

1. ✅ View planning dashboard with sample plans
2. ✅ Click on a plan to see details
3. ✅ Expand any store row to see full AI reasoning
4. ✅ Visually understand WHY AI recommended each campaign through:
   - Color-coded confidence
   - 4 score breakdowns
   - Reasoning explanations
   - Risk warnings
5. ✅ Approve a draft plan
6. ✅ Execute an approved plan (creates orders)

**The core requirement is met**: Users can **visually understand AI reasoning through KPIs**! 🎯
