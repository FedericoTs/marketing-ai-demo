# CTA-Aligned Conversion Tracking - Comprehensive Audit & Fix Plan

**Date**: October 23, 2025
**Priority**: 🔴 CRITICAL - Foundation for Accurate Analytics
**Status**: 📋 Analysis Complete - Implementation Required

---

## Executive Summary

**CRITICAL ARCHITECTURAL ISSUE IDENTIFIED:**

The platform currently has **HARDCODED conversion tracking** that does NOT respect the landing page CTA type. This means:

❌ Appointment booking CTA → tracked as `"form_submission"`
❌ Download guide CTA → tracked as `"form_submission"`
❌ Request quote CTA → tracked as `"form_submission"`

**Business Impact:**
- **Analytics are BROKEN** - Can't differentiate between conversion types
- **Sankey diagram incorrect** - Only shows appointments, not other conversions
- **ROI measurement impossible** - Can't measure success per CTA type
- **Campaign optimization blocked** - Can't A/B test different CTAs

---

## Current Architecture (BROKEN)

### 1. Template Configuration

**File**: `components/landing/campaign-landing-page.tsx:77-88`

```typescript
const layoutTypeMap: Record<string, string> = {
  'book-appointment': 'appointment',    // ← CTA Type Known
  'download-guide': 'download',          // ← CTA Type Known
  'shop-products': 'shop',               // ← CTA Type Known
  'start-trial': 'trial',                // ← CTA Type Known
  'get-quote': 'quote',                  // ← CTA Type Known
  'register-event': 'event',             // ← CTA Type Known
  'take-assessment': 'assessment',       // ← CTA Type Known
  'request-demo': 'demo',                // ← CTA Type Known
};
```

✅ **Good**: Templates KNOW their CTA type

### 2. Form Submission Handler

**File**: `app/api/landing-page/submit/route.ts:42-52`

```typescript
db.prepare(`
  INSERT INTO conversions (
    id, tracking_id, conversion_type, conversion_data, created_at
  ) VALUES (?, ?, ?, ?, ?)
`).run(
  submissionId,
  tracking_id,
  'form_submission',  // ❌ HARDCODED! Ignores CTA type!
  JSON.stringify(formData),
  now
);
```

❌ **BROKEN**: Always tracks as `'form_submission'` regardless of CTA type

### 3. Analytics Queries

**ALL analytics queries are broken because they can't differentiate conversion types:**

#### Campaign Stats
**File**: `lib/database/tracking-queries.ts:854`

```sql
SELECT COUNT(*) as count FROM conversions
-- ❌ Counts ALL conversions, can't filter by CTA type
```

#### Sankey Diagram
**File**: `lib/database/tracking-queries.ts:1770`

```sql
SELECT COUNT(DISTINCT cv.tracking_id) as count
FROM conversions cv
WHERE cv.conversion_type = 'appointment_booked'
-- ❌ ONLY shows appointments, misses download/quote/etc
```

---

## Required Database Schema

### Current Schema
```sql
CREATE TABLE conversions (
  id TEXT PRIMARY KEY,
  tracking_id TEXT NOT NULL,
  conversion_type TEXT CHECK(conversion_type IN (
    'form_submission',      -- ← Generic, not useful
    'appointment_booked',   -- ← Specific, good
    'call_initiated',       -- ← Specific, good
    'download'              -- ← Specific, good
  )),
  conversion_data TEXT,
  created_at TEXT
);
```

### Needed Additions
```sql
-- NO schema changes needed!
-- Just need to use the CORRECT conversion_type based on CTA
```

**Available conversion types:**
- `'appointment_booked'` → Book Appointment CTA
- `'download'` → Download Guide CTA
- `'form_submission'` → Generic Contact Form CTA
- `'call_initiated'` → Call Now CTA

---

## Comprehensive Fix Plan

### Fix #1: Map Template ID to Conversion Type ✅ HIGH PRIORITY

**File**: NEW - `lib/template-conversion-mapper.ts`

```typescript
/**
 * Maps landing page template IDs to their conversion types
 * This ensures tracking is CTA-aware
 */

import type { Conversion } from '@/lib/database/tracking-queries';

export const TEMPLATE_CONVERSION_MAP: Record<string, Conversion['conversion_type']> = {
  // Appointment-based templates
  'book-appointment': 'appointment_booked',
  'medical-consultation': 'appointment_booked',
  'salon-booking': 'appointment_booked',
  'dental-appointment': 'appointment_booked',

  // Download-based templates
  'download-guide': 'download',
  'get-ebook': 'download',
  'download-whitepaper': 'download',
  'get-template': 'download',

  // Contact form templates
  'get-quote': 'form_submission',
  'request-demo': 'form_submission',
  'contact-us': 'form_submission',
  'register-event': 'form_submission',

  // Shopping templates (future: could be 'purchase')
  'shop-products': 'form_submission', // For now, until we add 'purchase' type

  // Trial templates (future: could be 'trial_started')
  'start-trial': 'form_submission', // For now, until we add 'trial_started' type

  // Assessment templates
  'take-assessment': 'form_submission',
};

/**
 * Get conversion type for a template
 * Falls back to 'form_submission' for unknown templates
 */
export function getConversionTypeForTemplate(
  templateId: string
): Conversion['conversion_type'] {
  return TEMPLATE_CONVERSION_MAP[templateId] || 'form_submission';
}

/**
 * Get all templates for a specific conversion type
 */
export function getTemplatesForConversionType(
  conversionType: Conversion['conversion_type']
): string[] {
  return Object.entries(TEMPLATE_CONVERSION_MAP)
    .filter(([_, type]) => type === conversionType)
    .map(([templateId]) => templateId);
}
```

---

### Fix #2: Update Campaign Landing Page Config ✅ HIGH PRIORITY

**File**: `lib/database/campaign-landing-page-queries.ts:22-32`

**BEFORE:**
```typescript
export interface CampaignLandingPageConfig {
  title: string;
  message: string;
  companyName: string;
  logoUrl?: string;
  primaryColor?: string;
  formFields: string[];
  ctaText: string;
  thankYouMessage: string;
  fallbackMessage: string;
}
```

**AFTER:**
```typescript
export interface CampaignLandingPageConfig {
  title: string;
  message: string;
  companyName: string;
  logoUrl?: string;
  primaryColor?: string;
  formFields: string[];
  ctaText: string;
  conversionType?: 'appointment_booked' | 'download' | 'form_submission' | 'call_initiated'; // ✅ NEW!
  thankYouMessage: string;
  fallbackMessage: string;
}
```

---

### Fix #3: Update Landing Page Submit API ✅ CRITICAL

**File**: `app/api/landing-page/submit/route.ts:12-73`

**BEFORE (Lines 42-52):**
```typescript
db.prepare(`
  INSERT INTO conversions (
    id, tracking_id, conversion_type, conversion_data, created_at
  ) VALUES (?, ?, ?, ?, ?)
`).run(
  submissionId,
  tracking_id,
  'form_submission',  // ❌ HARDCODED!
  JSON.stringify(formData),
  now
);
```

**AFTER:**
```typescript
import { getConversionTypeForTemplate } from '@/lib/template-conversion-mapper';
import { getCampaignLandingPageConfig } from '@/lib/database/campaign-landing-page-queries';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { campaign_id, tracking_id, mode, formData, templateId } = body as {
    campaign_id: string;
    tracking_id?: string;
    mode: 'personalized' | 'generic';
    templateId?: string; // ✅ NEW! Pass from frontend
    formData: any;
  };

  // Determine conversion type based on template
  let conversionType: string = 'form_submission'; // default

  if (templateId) {
    // Use template ID to determine conversion type
    conversionType = getConversionTypeForTemplate(templateId);
    console.log(`📊 Template ${templateId} → Conversion Type: ${conversionType}`);
  } else {
    // Fallback: Try to get from campaign config
    const config = getCampaignLandingPageConfig(campaign_id);
    if (config?.conversionType) {
      conversionType = config.conversionType;
      console.log(`📊 Campaign config → Conversion Type: ${conversionType}`);
    }
  }

  if (mode === 'personalized' && tracking_id) {
    db.prepare(`
      INSERT INTO conversions (
        id, tracking_id, conversion_type, conversion_data, created_at
      ) VALUES (?, ?, ?, ?, ?)
    `).run(
      submissionId,
      tracking_id,
      conversionType,  // ✅ DYNAMIC based on CTA!
      JSON.stringify(formData),
      now
    );

    console.log(`✅ Conversion tracked: ${conversionType} for tracking_id: ${tracking_id}`);
  }
}
```

---

### Fix #4: Update Campaign Landing Page Client ✅ CRITICAL

**File**: `components/landing/campaign-landing-page.tsx:97-124`

**BEFORE:**
```typescript
const handleSubmit = async (formData: any) => {
  const response = await fetch('/api/landing-page/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      campaign_id: campaignId,
      tracking_id: mode === 'personalized' ? recipientData?.tracking_id : undefined,
      mode,
      formData,
    }),
  });
};
```

**AFTER:**
```typescript
const handleSubmit = async (formData: any) => {
  const response = await fetch('/api/landing-page/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      campaign_id: campaignId,
      tracking_id: mode === 'personalized' ? recipientData?.tracking_id : undefined,
      mode,
      templateId: templateId,  // ✅ NEW! Pass template ID
      formData,
    }),
  });
};
```

---

### Fix #5: Update Sankey Query to be CTA-Aware ✅ MEDIUM PRIORITY

**File**: `lib/database/tracking-queries.ts:1766-1772`

**CURRENT PROBLEM:**
```sql
-- Only shows appointments
SELECT COUNT(DISTINCT cv.tracking_id) as count
FROM conversions cv
WHERE cv.conversion_type = 'appointment_booked'
```

**TWO OPTIONS:**

#### Option A: Rename "Web Appointments" to "Web Conversions"
```typescript
// Change node name to be CTA-agnostic
const nodes: SankeyNode[] = [
  { name: "Recipients" },
  { name: "No Engagement" },
  { name: "QR Scans" },
  { name: "Landing Page Visits" },
  { name: "Calls Received" },
  { name: "Web Conversions" },      // ✅ Was "Web Appointments"
  { name: "Call Appointments" },
];

// Query ALL web conversions (not just appointments)
const webConversionsStmt = db.prepare(`
  SELECT COUNT(DISTINCT cv.tracking_id) as count
  FROM conversions cv
  WHERE cv.conversion_type IN ('appointment_booked', 'download', 'form_submission')
  ${dateFilter}
`);
```

#### Option B: Multiple Conversion Paths (More Complex)
```typescript
const nodes: SankeyNode[] = [
  { name: "Recipients" },
  { name: "No Engagement" },
  { name: "Landing Page Visits" },
  { name: "Appointments" },     // appointment_booked
  { name: "Downloads" },         // download
  { name: "Form Submissions" },  // form_submission
  { name: "Calls" },             // call_initiated (from phone)
];

// Separate queries for each type
const appointmentsStmt = db.prepare(`
  SELECT COUNT(DISTINCT tracking_id) FROM conversions
  WHERE conversion_type = 'appointment_booked' ${dateFilter}
`);

const downloadsStmt = db.prepare(`
  SELECT COUNT(DISTINCT tracking_id) FROM conversions
  WHERE conversion_type = 'download' ${dateFilter}
`);
```

**RECOMMENDATION**: Start with **Option A** (simpler), upgrade to **Option B** later if needed.

---

### Fix #6: Update Campaign Stats Queries ✅ LOW PRIORITY

**File**: `lib/database/tracking-queries.ts:854-858`

**Add breakdown by conversion type:**

```typescript
// Current: Just total count
const conversionQuery = `SELECT COUNT(*) as count FROM conversions ${conversionDateFilter}`;

// Enhanced: Breakdown by type
const conversionBreakdownQuery = `
  SELECT
    conversion_type,
    COUNT(*) as count
  FROM conversions
  ${conversionDateFilter}
  GROUP BY conversion_type
`;

const conversionBreakdown = db.prepare(conversionBreakdownQuery).all();

// Return both total and breakdown
return {
  ...stats,
  totalConversions,
  conversionBreakdown: {
    appointments: conversionBreakdown.find(r => r.conversion_type === 'appointment_booked')?.count || 0,
    downloads: conversionBreakdown.find(r => r.conversion_type === 'download')?.count || 0,
    forms: conversionBreakdown.find(r => r.conversion_type === 'form_submission')?.count || 0,
  },
};
```

---

### Fix #7: Update Old Appointment Form ✅ ALREADY DONE

**File**: `components/landing/appointment-form.tsx:46-52`

✅ **ALREADY FIXED** in previous commit:
```typescript
await trackAppointmentBooked(trackingId, {  // ✅ Correct!
  ...formData,
});
```

---

## Summary of Required Changes

| Fix # | File | Priority | Status | Description |
|-------|------|----------|--------|-------------|
| 1 | `lib/template-conversion-mapper.ts` | HIGH | 🔴 NEW FILE | Map template IDs to conversion types |
| 2 | `lib/database/campaign-landing-page-queries.ts` | HIGH | 🟡 UPDATE | Add `conversionType` to config interface |
| 3 | `app/api/landing-page/submit/route.ts` | CRITICAL | 🔴 UPDATE | Use dynamic conversion type from template |
| 4 | `components/landing/campaign-landing-page.tsx` | CRITICAL | 🔴 UPDATE | Pass `templateId` to API |
| 5 | `lib/database/tracking-queries.ts` | MEDIUM | 🟡 UPDATE | Sankey query for all conversion types |
| 6 | `lib/database/tracking-queries.ts` | LOW | 🟢 OPTIONAL | Add conversion type breakdown |
| 7 | `components/landing/appointment-form.tsx` | N/A | ✅ DONE | Already fixed |

---

## Testing Plan

### Test Case 1: Appointment Template
1. Create campaign with "Book Appointment" template
2. Book appointment through landing page
3. **Verify**: `conversions.conversion_type = 'appointment_booked'` ✓
4. **Verify**: Sankey shows in "Web Conversions" ✓
5. **Verify**: Campaign stats count it correctly ✓

### Test Case 2: Download Template
1. Create campaign with "Download Guide" template
2. Download guide through landing page
3. **Verify**: `conversions.conversion_type = 'download'` ✓
4. **Verify**: Sankey shows in "Web Conversions" ✓
5. **Verify**: Campaign stats count it correctly ✓

### Test Case 3: Contact Form Template
1. Create campaign with "Get Quote" template
2. Submit contact form
3. **Verify**: `conversions.conversion_type = 'form_submission'` ✓
4. **Verify**: Sankey shows in "Web Conversions" ✓
5. **Verify**: Campaign stats count it correctly ✓

### Test Case 4: Analytics Consistency
1. Create 3 campaigns with different CTAs
2. Generate 1 conversion for each
3. **Verify**: Dashboard shows 3 total conversions ✓
4. **Verify**: Breakdown shows 1 appointment, 1 download, 1 form ✓
5. **Verify**: Date filtering works for all types ✓

---

## Migration Strategy

### For Existing Data

**Problem**: Existing conversions tracked as `'form_submission'` might actually be appointments.

**Solution**: One-time data migration script

```sql
-- Update old form_submissions that are actually appointments
-- (based on campaign landing page config or form data)

UPDATE conversions
SET conversion_type = 'appointment_booked'
WHERE conversion_type = 'form_submission'
AND conversion_data LIKE '%preferredDate%'  -- Has appointment fields
AND created_at < '2025-10-23';  -- Before fix date
```

---

## Future Enhancements

### 1. Add More Conversion Types
```typescript
conversion_type IN (
  'form_submission',
  'appointment_booked',
  'download',
  'call_initiated',
  'purchase',           // ✅ NEW for e-commerce
  'trial_started',      // ✅ NEW for SaaS
  'registration',       // ✅ NEW for events
  'subscription'        // ✅ NEW for newsletters
)
```

### 2. Conversion Value Tracking
```sql
ALTER TABLE conversions ADD COLUMN conversion_value REAL DEFAULT 0;
-- Track monetary value of each conversion for ROI calculation
```

### 3. Multi-Step Conversion Funnels
```sql
CREATE TABLE conversion_steps (
  id TEXT PRIMARY KEY,
  conversion_id TEXT,
  step_number INTEGER,
  step_name TEXT,
  completed_at TEXT,
  FOREIGN KEY (conversion_id) REFERENCES conversions(id)
);
-- Track progress through multi-step forms (wizards)
```

### 4. A/B Testing Support
```sql
ALTER TABLE campaign_landing_pages ADD COLUMN variant_id TEXT;
-- Track which template variant generated each conversion
```

---

## Critical Dependencies

### Files That Will Break If Not Updated Together

1. **Template Selection** → Must pass `templateId` to form
2. **Form Submission** → Must receive and use `templateId`
3. **API Handler** → Must map `templateId` to `conversion_type`
4. **Analytics Queries** → Must include new conversion types

**⚠️ WARNING**: All 4 must be updated in same deployment or tracking will be inconsistent!

---

## Success Metrics

✅ **Data Accuracy**
- All conversions tracked with correct type
- 0 conversions with wrong type
- 100% CTA alignment

✅ **Analytics Usability**
- Can filter by conversion type
- Can compare CTA performance
- Can measure ROI per CTA

✅ **Business Intelligence**
- Know which CTAs convert best
- Optimize campaigns based on CTA type
- Accurate funnel visualization

---

## Recommended Implementation Order

### Phase 1: Core Fixes (1-2 hours)
1. Create `lib/template-conversion-mapper.ts`
2. Update `app/api/landing-page/submit/route.ts`
3. Update `components/landing/campaign-landing-page.tsx`
4. Test with one template type

### Phase 2: Analytics Updates (1 hour)
1. Update Sankey query to "Web Conversions"
2. Add conversion type breakdown to dashboard
3. Test analytics consistency

### Phase 3: Migration & Testing (30 min)
1. Run data migration for existing records
2. End-to-end testing with all template types
3. Verify no regressions

---

**TOTAL ESTIMATED TIME**: 2.5-3.5 hours for complete implementation

**CRITICAL**: This is foundational architecture - without this, the entire analytics platform gives incorrect insights! 🚨
