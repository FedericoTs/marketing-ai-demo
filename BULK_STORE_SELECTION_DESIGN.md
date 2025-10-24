# Bulk Store Selection System - Design Document

**Date**: October 24, 2025
**Problem**: Manual order creation requires selecting 400+ stores one-by-one (impossible UX)
**Solution**: Multi-method bulk store selection leveraging existing data structures

---

## 🎯 Problem Statement

### Current Limitation (Manual Order Creation):
```
To create order for 400 stores:
1. Click "Add Store" button
2. Select store from dropdown
3. Select campaign
4. Set quantity
5. Repeat 400 times! ❌

Total time: ~2 hours
User experience: Terrible
Adoption rate: 0%
```

**This defeats the entire purpose of the cold start solution!**

---

## 💡 Solution: Multi-Method Bulk Selection

### Approach 1: Geographic Bulk Selection ⭐ PRIORITY 1
**Use Case**: "Send Holiday Campaign to all Northeast stores"

**UI Design**:
```
┌────────────────────────────────────────────┐
│  Bulk Add Stores by Geography              │
├────────────────────────────────────────────┤
│  Select Region: [Northeast ▼]              │
│  Select State:  [All States ▼]             │
│  Select City:   [All Cities ▼]             │
│                                            │
│  Matching Stores: 87                       │
│                                            │
│  Campaign: [Holiday Campaign ▼]            │
│  Quantity per store: [100] pieces          │
│                                            │
│  [Preview Stores]  [Add All to Order]      │
└────────────────────────────────────────────┘
```

**Features**:
- **Cascading Filters**: Region → State → City
- **Live Count**: Show how many stores match
- **Preview**: Show list of stores before adding
- **Bulk Apply**: Same campaign + quantity to all

**Data Sources**:
- `retail_stores.region` (Northeast, Southwest, Midwest, West, Southeast)
- `retail_stores.state` (NY, CA, TX, etc.)
- `retail_stores.city` (New York, Los Angeles, etc.)

**Database Query**:
```sql
SELECT id, store_number, name, city, state, region
FROM retail_stores
WHERE is_active = 1
  AND (region = ? OR ? = 'all')
  AND (state = ? OR ? = 'all')
  AND (city = ? OR ? = 'all')
ORDER BY region, state, store_number
```

---

### Approach 2: CSV Upload for Bulk Assignment ⭐ PRIORITY 2
**Use Case**: "I have a spreadsheet with 400 stores and their quantities"

**CSV Format**:
```csv
Store Number,Campaign,Quantity,Notes
101,Holiday Campaign,150,Rush delivery
102,Holiday Campaign,200,
103,Spring Promo,100,
```

**UI Design**:
```
┌────────────────────────────────────────────┐
│  Upload Store Assignments (CSV)            │
├────────────────────────────────────────────┤
│  📎 Drop CSV file here or click to browse  │
│                                            │
│  Template: [Download CSV Template]         │
│                                            │
│  ✅ Uploaded: store-assignments.csv        │
│  ✅ Validated: 387 stores (13 not found)   │
│                                            │
│  Preview:                                  │
│  ┌──────────────────────────────────────┐ │
│  │ #101 - Main St Store - 150 pieces    │ │
│  │ #102 - Broadway Store - 200 pieces   │ │
│  │ ... (385 more)                       │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ⚠️ Not Found (13):                        │
│  Store #999, #888, ... (invalid numbers)   │
│                                            │
│  [Cancel]  [Add 387 Stores to Order]       │
└────────────────────────────────────────────┘
```

**Features**:
- **Drag & Drop**: Easy file upload
- **Validation**: Check store numbers exist
- **Error Report**: Show which stores not found
- **Preview**: Show what will be added
- **Flexible**: Supports different quantities per store

**Processing Logic**:
```typescript
1. Parse CSV file
2. For each row:
   - Look up store by store_number
   - Validate campaign exists
   - Validate quantity > 0
3. Generate validation report
4. Show preview with warnings
5. On confirm: Add all valid stores to order
```

---

### Approach 3: Store Groups / Templates ⭐ PRIORITY 3
**Use Case**: "I frequently order for the same group of stores"

**Examples**:
- "Top 50 Performers"
- "Metro Stores"
- "New Store Openings 2025"
- "Rural Locations"
- "Stores Needing Refresh"

**UI Design**:
```
┌────────────────────────────────────────────┐
│  Use Saved Store Group                     │
├────────────────────────────────────────────┤
│  Select Group: [Top 50 Performers ▼]       │
│                                            │
│  📊 This group contains 50 stores          │
│                                            │
│  Campaign: [Holiday Campaign ▼]            │
│  Quantity per store: [100] pieces          │
│                                            │
│  [Preview Stores]  [Add Group to Order]    │
│                                            │
│  ──────────────────────────────────────    │
│                                            │
│  💾 Save Current Selection as Group        │
│                                            │
│  Group Name: [___________________]         │
│  [Save Group]                              │
└────────────────────────────────────────────┘
```

**Database Schema**:
```sql
CREATE TABLE store_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE store_group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  FOREIGN KEY (group_id) REFERENCES store_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (store_id) REFERENCES retail_stores(id) ON DELETE CASCADE,
  UNIQUE(group_id, store_id)
);
```

**Features**:
- **Reusable**: Create once, use many times
- **Flexible**: Can overlap (store in multiple groups)
- **Manageable**: CRUD interface for groups
- **Time-Saving**: For recurring order patterns

---

### Approach 4: Clustering Integration ⭐ FUTURE
**Use Case**: "Order for all high-performing Northeast stores"

**Requires**:
- Clustering analysis already run
- Cluster assignments stored in database

**Database Schema**:
```sql
CREATE TABLE store_clusters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cluster_type TEXT, -- 'performance', 'demographic', 'geographic'
  created_at TEXT NOT NULL
);

CREATE TABLE store_cluster_assignments (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  cluster_id TEXT NOT NULL,
  confidence REAL, -- 0.0 to 1.0
  assigned_at TEXT NOT NULL,
  FOREIGN KEY (store_id) REFERENCES retail_stores(id),
  FOREIGN KEY (cluster_id) REFERENCES store_clusters(id)
);
```

**UI Design**:
```
┌────────────────────────────────────────────┐
│  Select Stores by Cluster                  │
├────────────────────────────────────────────┤
│  Cluster Type: [Performance Analysis ▼]    │
│                                            │
│  Available Clusters:                       │
│  ○ High Performers (87 stores)             │
│  ○ Medium Performers (156 stores)          │
│  ○ Low Performers (45 stores)              │
│  ○ New Stores (12 stores)                  │
│                                            │
│  Campaign: [Holiday Campaign ▼]            │
│  Quantity per store: [100] pieces          │
│                                            │
│  [Add Selected Cluster to Order]           │
└────────────────────────────────────────────┘
```

**Integration Points**:
- Performance Matrix already has cluster analysis
- Can leverage `top_recommendation` logic
- Filter stores by confidence score

---

### Approach 5: Advanced Filters with "Select All" ⭐ HYBRID
**Use Case**: "Show me all stores, let me filter, select what I want"

**UI Design**:
```
┌────────────────────────────────────────────────────────────────┐
│  Select Stores                                                 │
├────────────────────────────────────────────────────────────────┤
│  Filters:                                                      │
│  Region: [All ▼] State: [All ▼] City: [All ▼]                │
│  Size: [All ▼] Active: [✓] Performance: [All ▼]              │
│                                                                │
│  Showing 87 stores                                             │
│                                                                │
│  [☑ Select All Visible] [☐ Select None]                       │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ ☑ #101 - Main St Store - New York, NY - Northeast       │ │
│  │ ☑ #102 - Broadway Store - New York, NY - Northeast      │ │
│  │ ☑ #103 - Queens Store - New York, NY - Northeast        │ │
│  │ ☐ #104 - LA Store - Los Angeles, CA - West              │ │
│  │ ... (83 more)                                            │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  Selected: 3 stores                                            │
│                                                                │
│  Campaign: [Holiday Campaign ▼]                                │
│  Quantity per store: [100] pieces                              │
│                                                                │
│  [Add 3 Stores to Order]                                       │
└────────────────────────────────────────────────────────────────┘
```

**Features**:
- **Flexible Filtering**: Multiple criteria
- **Visual Selection**: See what you're selecting
- **Bulk Actions**: Select all visible at once
- **Fine Control**: Can deselect individuals

---

## 📊 Implementation Priority

### Phase 1: Quick Wins (2 hours)
**Goal**: Handle 400 stores efficiently TODAY

1. **Geographic Bulk Selection** (1 hour)
   - Add "Bulk Add by Geography" section
   - Region/State/City cascading filters
   - Preview + bulk add
   - Files: `app/campaigns/orders/new/page.tsx`

2. **CSV Upload** (1 hour)
   - File upload component
   - CSV parsing + validation
   - Store number matching
   - Files: `components/orders/csv-store-upload.tsx`, `lib/csv/parse-store-assignments.ts`

**Outcome**: User can create 400-store order in 2 minutes instead of 2 hours

---

### Phase 2: Store Groups (2 hours)
**Goal**: Reusable store groupings

1. **Database Schema** (15 min)
   - Create `store_groups` and `store_group_members` tables

2. **Store Groups API** (45 min)
   - CRUD endpoints for groups
   - Get stores by group

3. **Store Groups UI** (1 hour)
   - Create/edit groups
   - Select group in order creation
   - Manage groups page

**Outcome**: Users can save and reuse common store selections

---

### Phase 3: Clustering Integration (3 hours)
**Goal**: Leverage AI-powered store segmentation

1. **Cluster Schema** (30 min)
   - Create `store_clusters` and `store_cluster_assignments` tables

2. **Cluster API** (1 hour)
   - Run clustering analysis
   - Store cluster assignments
   - Query stores by cluster

3. **Cluster Selection UI** (1.5 hours)
   - Show available clusters
   - Select cluster in order creation
   - Visualize cluster membership

**Outcome**: AI-powered store selection based on performance/demographics

---

### Phase 4: Advanced Filters (2 hours)
**Goal**: Maximum flexibility

1. **Filter Component** (1 hour)
   - Multi-criteria filtering
   - Live search
   - Tag-based filters

2. **Checkbox Selection** (1 hour)
   - Selectable store list
   - Select all/none
   - Selected count

**Outcome**: Power users can fine-tune selections precisely

---

## 🎨 UI/UX Considerations

### Tabs for Different Selection Methods:
```
┌─────────────────────────────────────────────────┐
│  Add Stores to Order                            │
├─────────────────────────────────────────────────┤
│  ┌──────────┬──────────┬──────────┬──────────┐  │
│  │ Manual   │Geography │CSV Upload│ Groups   │  │
│  └──────────┴──────────┴──────────┴──────────┘  │
│                                                 │
│  [Content based on selected tab]                │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Order Creation Page Structure:
```
1. Order Details (notes, supplier email)
2. Add Stores Section:
   ├─ Tab: Individual (current implementation)
   ├─ Tab: Geographic Bulk ⭐ NEW
   ├─ Tab: CSV Upload ⭐ NEW
   └─ Tab: Store Groups ⭐ NEW
3. Current Order Items (list with remove)
4. Summary & Generate
```

### Workflow Example (Geographic):
```
1. User clicks "Geographic Bulk" tab
2. Selects "Northeast" region
3. Selects "All States"
4. Sees "87 stores match"
5. Clicks "Preview Stores"
6. Reviews list in modal
7. Selects "Holiday Campaign"
8. Sets quantity: 150
9. Clicks "Add 87 Stores to Order"
10. All 87 stores added instantly ✅
```

---

## 📈 Success Metrics

| Metric | Before | After Phase 1 | Target |
|--------|--------|---------------|--------|
| Time to create 400-store order | 2 hours | 2 minutes | <5 min |
| Clicks required | 1,600+ | 10 | <20 |
| User satisfaction | 0% | 90% | >85% |
| Adoption rate for manual orders | 0% | 75% | >50% |

---

## 🔧 Technical Implementation

### Geographic Bulk Selection API:

**Endpoint**: `POST /api/campaigns/orders/bulk-stores`

**Request**:
```json
{
  "filters": {
    "region": "Northeast",
    "state": "all",
    "city": "all",
    "isActive": true
  },
  "campaign": "Holiday Campaign",
  "quantity": 150
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "matchingStores": 87,
    "stores": [
      {
        "id": "store-123",
        "storeNumber": "101",
        "name": "Main Street Store",
        "city": "New York",
        "state": "NY",
        "region": "Northeast"
      }
    ]
  }
}
```

### CSV Upload Processing:

**Function**: `parseStoreAssignments(csvContent: string)`

```typescript
export function parseStoreAssignments(csvContent: string): {
  valid: Array<{
    storeNumber: string;
    campaignName: string;
    quantity: number;
    notes?: string;
  }>;
  invalid: Array<{
    row: number;
    storeNumber: string;
    reason: string;
  }>;
} {
  // Parse CSV
  // Validate each row
  // Match store numbers to database
  // Return valid and invalid entries
}
```

---

## 🎯 Cold Start Solution - Complete

### Before Bulk Selection:
```
New User → No AI Data → Can't use Performance Matrix
        → Manual order creation exists BUT...
        → Must add 400 stores individually (impossible!)
        → Cold start NOT solved ❌
```

### After Bulk Selection:
```
New User → No AI Data → Can't use Performance Matrix
        → Uses manual order creation
        → Selects "All Northeast Stores" (geographic bulk)
        → OR uploads CSV with 400 stores
        → Order created in 2 minutes ✅
        → Data generated for future AI analysis ✅
        → Cold start FULLY solved! ✅
```

---

## 📚 Documentation

### User Guide Sections:

1. **Quick Start**: Creating Your First Order
2. **Bulk Selection**: Add Many Stores at Once
3. **Geographic Selection**: Select by Region/State/City
4. **CSV Upload**: Import Store Assignments
5. **Store Groups**: Save Frequently-Used Selections
6. **Best Practices**: When to Use Each Method

### Training Materials:

- Video tutorial: "Creating 400-Store Order in 2 Minutes"
- Cheat sheet: "Bulk Selection Methods Comparison"
- FAQ: Common questions about bulk operations

---

## ✅ Next Steps

**Immediate** (Today):
1. ✅ Design document complete
2. ⏳ Implement geographic bulk selection
3. ⏳ Implement CSV upload
4. ⏳ Update order creation UI with tabs

**Short Term** (This Week):
- Store groups CRUD
- Store groups UI integration
- Documentation

**Medium Term** (Next Sprint):
- Clustering analysis integration
- Advanced filtering UI
- Performance optimizations

**Long Term**:
- ML-powered store recommendations
- Historical order patterns
- Automated reordering suggestions

---

**Ready to implement Phase 1!** 🚀

Geographic bulk selection + CSV upload will solve the 400-store problem TODAY.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
