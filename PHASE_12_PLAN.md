# PHASE 12: Brand DNA Engine - Implementation Plan

## 🎯 Mission
Enable complete brand customization through Settings, making every DM and landing page reflect the company's unique brand identity (logo, colors, fonts).

## 📋 Option A: Quick Foundation (4-6 hours)

### Objective
Create manual brand customization foundation that will support AI automation later.

### Success Criteria
- ✅ Users can upload logo and it appears on DMs and landing pages
- ✅ Users can set brand colors and they apply throughout platform
- ✅ Users can select fonts and they apply to all materials
- ✅ Landing pages are dynamically branded (no more hardcoded "Miracle-Ear")
- ✅ DM backgrounds use brand colors
- ✅ No breaking changes to existing functionality

---

## 🏗️ Implementation Steps

### Step 1: Database Schema Enhancement (30 min)
**File:** `lib/database/connection.ts`

**Changes:**
- Enhance `brand_profiles` table with new columns:
  - `logo_url` - URL to uploaded logo
  - `logo_asset_id` - Link to campaign_assets table
  - `primary_color` - Main brand color (hex)
  - `secondary_color` - Supporting color (hex)
  - `accent_color` - CTA/highlight color (hex)
  - `background_color` - Page background (hex)
  - `text_color` - Main text color (hex)
  - `heading_font` - Font for headings (Google Fonts)
  - `body_font` - Font for body text (Google Fonts)
  - `landing_page_template` - Template selection

**Testing:**
- Database creates without errors
- Existing brand profiles still load
- Default values applied for new columns

---

### Step 2: Settings UI - Brand Kit Tab (2 hours)
**Files:**
- `app/settings/page.tsx` - Add Brand Kit tab
- `components/settings/brand-kit-manager.tsx` - New component

**Features:**
1. Logo Upload
   - File upload (PNG, SVG, JPG)
   - Preview uploaded logo
   - Save to campaign_assets
   - Store URL in brand_profiles

2. Color Pickers
   - Primary color (with hex input)
   - Secondary color
   - Accent color
   - Live preview

3. Font Selection
   - Dropdown with Google Fonts
   - Heading font selector
   - Body font selector
   - Preview text with selected fonts

4. Template Selection
   - Radio buttons/cards for templates:
     - Professional (default)
     - Healthcare
     - Retail
     - Modern
     - Classic

5. Save & Preview
   - Save button stores to database
   - Preview buttons show DM and landing page samples

**Testing:**
- Logo uploads successfully
- Colors save and persist
- Fonts load correctly
- Template selection saves
- No errors in console

---

### Step 3: CSS Variables System (1 hour)
**Files:**
- `app/globals.css` - Define CSS variables
- `app/layout.tsx` - Load brand config globally
- `lib/hooks/use-brand-config.ts` - Hook to access brand config

**Implementation:**
```css
/* CSS Variables in globals.css */
:root {
  --brand-primary: #1E3A8A;
  --brand-secondary: #FF6B35;
  --brand-accent: #10B981;
  --brand-background: #FFFFFF;
  --brand-text: #1F2937;
  --brand-heading-font: 'Inter';
  --brand-body-font: 'Open Sans';
}
```

**Dynamic Loading:**
- Load brand config on app mount
- Apply CSS variables to :root
- Load Google Fonts dynamically

**Testing:**
- CSS variables accessible in all components
- Font loading works
- Color changes apply globally

---

### Step 4: Apply to Landing Pages (1.5 hours)
**Files:**
- `app/lp/[trackingId]/page.tsx` - Load brand config
- `components/landing/branded-header.tsx` - Logo in header
- `components/landing/branded-layout.tsx` - Apply CSS variables

**Changes:**
1. Load Brand Config
   - Fetch brand profile for company
   - Apply CSS variables dynamically
   - Load company logo

2. Dynamic Header
   - Replace hardcoded "Miracle-Ear" with `{companyName}`
   - Show uploaded logo
   - Use brand colors for background

3. Dynamic Styling
   - Use CSS variables for all colors
   - Apply brand fonts
   - Maintain responsive design

**Testing:**
- Logo appears in header
- Company name is dynamic
- Colors match brand settings
- Fonts load correctly
- Mobile responsive
- Fallback to defaults if no brand config

---

### Step 5: Apply to DM Generation (1 hour)
**Files:**
- `app/api/dm-creative/generate/route.ts` - Load brand config
- Client-side compositor - Apply brand colors

**Changes:**
1. Load Brand Config in API
   - Fetch active brand profile
   - Pass to DALL-E prompt
   - Return with DM data

2. Enhanced DALL-E Prompt
   - Include brand colors in prompt
   - Specify color scheme
   - Match brand aesthetic

3. Client-Side Composition
   - Apply brand colors to overlays
   - Add logo to DM header
   - Use brand fonts

**Testing:**
- DM backgrounds reflect brand colors
- Logo appears on DM
- Text uses brand fonts
- PDF downloads correctly

---

### Step 6: API Routes for Brand Config (30 min)
**Files:**
- `app/api/brand/config/route.ts` - GET active brand config
- `app/api/brand/config/route.ts` - POST update brand config
- `app/api/brand/upload-logo/route.ts` - POST logo upload

**Endpoints:**
- `GET /api/brand/config` - Fetch active brand config
- `POST /api/brand/config` - Update brand config
- `POST /api/brand/upload-logo` - Upload logo image

**Testing:**
- Endpoints return correct data
- Logo upload stores file correctly
- Updates persist to database

---

### Step 7: Testing & Polish (1 hour)
**Complete Testing:**
1. Upload logo → appears everywhere
2. Change colors → DMs and landing pages update
3. Select fonts → all text updates
4. Choose template → landing page changes
5. Create new campaign → uses brand settings
6. View old campaigns → still work (backward compatible)

**Edge Cases:**
- No logo uploaded (use placeholder)
- No colors set (use defaults)
- Invalid hex codes (validation)
- Large logo files (resize/compress)
- Missing brand profile (create default)

**Polish:**
- Loading states
- Success toasts
- Error handling
- Help text/tooltips
- Preview functionality

---

## 🗂️ File Structure

```
New/Modified Files:
├── PHASE_12_PLAN.md (this file)
├── lib/database/
│   └── connection.ts (MODIFIED - schema)
├── app/settings/
│   └── page.tsx (MODIFIED - add Brand Kit tab)
├── components/settings/
│   └── brand-kit-manager.tsx (NEW)
├── app/api/brand/
│   ├── config/route.ts (NEW)
│   └── upload-logo/route.ts (NEW)
├── app/globals.css (MODIFIED - CSS variables)
├── app/layout.tsx (MODIFIED - load brand config)
├── lib/hooks/
│   └── use-brand-config.ts (NEW)
├── app/lp/[trackingId]/
│   └── page.tsx (MODIFIED - dynamic branding)
├── components/landing/
│   ├── branded-header.tsx (NEW)
│   └── branded-layout.tsx (NEW)
└── app/api/dm-creative/generate/
    └── route.ts (MODIFIED - brand colors)
```

---

## 📊 Progress Tracking

### Phase 1: Foundation ✅
- [x] Plan documented
- [ ] Database schema enhanced
- [ ] Brand config API routes created

### Phase 2: Settings UI 🔄
- [ ] Brand Kit tab created
- [ ] Logo upload functional
- [ ] Color pickers working
- [ ] Font selectors working
- [ ] Template selection working

### Phase 3: Application 🔄
- [ ] CSS variables implemented
- [ ] Landing pages use brand config
- [ ] DM generation uses brand config
- [ ] Logo appears on all materials

### Phase 4: Testing & Polish 🔄
- [ ] End-to-end testing complete
- [ ] Edge cases handled
- [ ] Error handling robust
- [ ] User feedback implemented

---

## 🚀 Next Phase: AI Automation

After Option A is complete, we'll build:
- Website URL analyzer
- AI logo extraction
- AI color extraction
- AI brand voice analysis
- One-click brand setup

This foundation makes that seamless!

---

## 📝 Notes

**Design Principles:**
- Maintain existing functionality (backward compatible)
- Default values for all brand settings
- Graceful fallbacks when brand config missing
- Mobile-first responsive design
- Clear user feedback (toasts, loading states)
- Intuitive UI with helpful tooltips

**Performance:**
- Lazy load Google Fonts
- Optimize logo images
- Cache brand config
- Minimize API calls

**Security:**
- Validate file uploads (size, type)
- Sanitize hex color inputs
- Prevent XSS in font names
- Rate limit API routes

---

Last Updated: 2025-10-16
Status: In Progress
