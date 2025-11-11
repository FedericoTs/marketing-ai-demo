# Front & Back Canvas Implementation Plan

**Date**: November 11, 2025
**Status**: Planning Phase
**Objective**: Enable users to design both front and back pages of postcards in the template editor

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [PostGrid Requirements Analysis](#postgrid-requirements-analysis)
3. [Current System Analysis](#current-system-analysis)
4. [Fabric.js Multi-Canvas Architecture](#fabricjs-multi-canvas-architecture)
5. [Database Schema Changes](#database-schema-changes)
6. [PDF Generation Changes](#pdf-generation-changes)
7. [UI/UX Design](#uiux-design)
8. [Implementation Plan](#implementation-plan)
9. [Risk Analysis](#risk-analysis)
10. [Testing Strategy](#testing-strategy)

---

## Executive Summary

### Current State
- ✅ Front page: Fully customizable Fabric.js canvas (1875×1275px)
- ❌ Back page: Blank white page (PostGrid adds address automatically)
- ✅ PDF Generation: Working 2-page PDFs with correct dimensions (6.25"×4.25")
- ✅ PostGrid Submission: 100% success rate (5/5 in recent test)

### Proposed State
- ✅ Front page: Fully customizable Fabric.js canvas
- ✅ Back page: Fully customizable Fabric.js canvas WITH reserved address block zone
- ✅ PDF Generation: 2 different pages from 2 canvas JSONs
- ✅ PostGrid Submission: Custom back design + automatic address overlay

### Key Findings
1. **PostGrid DOES support custom back pages** - confirmed via documentation
2. **Address overlay works with PDFs** - PostGrid adds address on top of our design
3. **Red zone requirements vary by country** (US/Canada/UK/Europe)
4. **Database already has `surfaces` array** - infrastructure partially exists!
5. **Fabric.js supports multiple canvases** - standard pattern

---

## PostGrid Requirements Analysis

### 1. Custom Back Page Support

**Finding**: PostGrid API supports custom front AND back pages via multiple methods:

#### Method A: Single 2-Page PDF (CURRENT APPROACH)
```typescript
formData.append('pdf', pdfBlob, 'postcard.pdf')  // 2-page PDF
formData.append('to[firstName]', 'Jane')          // Address data
formData.append('to[addressLine1]', '123 Main')  // etc...
```

**How it works**:
- Upload 2-page PDF with custom front (page 1) and custom back (page 2)
- PostGrid overlays address block on page 2 at predefined location
- Address block position varies by country and postcard size

#### Method B: Separate HTML Templates (ALTERNATIVE)
```typescript
formData.append('frontHTML', '<html>...</html>')
formData.append('backHTML', '<html>...</html>')
```

**Decision**: **Continue with Method A (2-page PDF)** because:
- Already working (100% success rate)
- Better quality control (pixel-perfect rendering)
- Easier variable data printing (VDP)
- No HTML/CSS complexity

### 2. Address Block Positioning

**Critical Requirement**: Must leave space for PostGrid's address block overlay

#### US & International Postcards (6×4 format)

Based on USPS regulations and standard direct mail guidelines:

**Address Block Zone (Red Zone)**:
- **Position**: Right half of back page
- **Dimensions**: ~3.5" × 1.875" (at 300 DPI: ~1050px × 562px)
- **Top-Left Corner**: X: 2.75" (825px), Y: 1.0625" (319px)
- **Purpose**: Mailing address, postage, barcode

**Safe Zone (Design Area)**:
- **Position**: Left half of back page + margins
- **Usable Width**: ~2.5" (750px)
- **Usable Height**: ~3.75" (1125px)
- **Margin**: 0.125" (37.5px) from all edges

**Visual Layout** (Back Page):
```
┌─────────────────────────────────────────┐
│  0.125" Margin (Bleed)                  │
│  ┌───────────────────────────────────┐  │
│  │ SAFE ZONE        │  ADDRESS ZONE  │  │
│  │ (Left Side)      │  (Right Side)  │  │
│  │                  │                │  │
│  │ ✅ Custom Design │ ❌ Reserved    │  │
│  │                  │    for         │  │
│  │ Logo             │    PostGrid    │  │
│  │ Messaging        │    Address     │  │
│  │ Branding         │    Overlay     │  │
│  │                  │                │  │
│  └───────────────────────────────────┘  │
│  0.125" Margin (Bleed)                  │
└─────────────────────────────────────────┘
```

#### Country-Specific Variations

| Country | Red Zone Width | Red Zone Position |
|---------|---------------|-------------------|
| US & International | 50% (right half) | Right side |
| Canada | ~50% (right half) | Right side |
| UK & Europe | 50% (right half) | Right side |

**Source**: PostGrid design guidelines reference PDFs:
- `postcard_guideline_6x4.pdf` (US & International)
- `postcard_guideline_6x4_ca.pdf` (Canada)
- `postcard_guideline_6x4_uk.pdf` (UK & Europe)

### 3. Design Guidelines

**PostGrid Best Practices**:
1. **Bleed**: 0.125" on all sides (already implemented ✅)
2. **Safe Zone**: 0.25" inside from all edges
3. **Red Zone**: Reserve right half for address block
4. **Text**: Keep important text 0.5" from red zone boundary
5. **Contrast**: Ensure address will be readable (light background recommended in red zone area)

**Our Implementation**:
- ✅ Bleed: 6.25"×4.25" PDF (1875×1275px at 300 DPI)
- ✅ Safe Zone: Visual guides in editor
- 🔄 Red Zone: Need to add visual guide + snap boundaries
- 🔄 Text: Need "keep-out" warning for red zone

---

## Current System Analysis

### Database Schema (design_templates table)

**Existing Structure**:
```sql
CREATE TABLE design_templates (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  created_by uuid NOT NULL,
  name text NOT NULL,
  description text,

  -- OLD SINGLE-CANVAS FIELDS (DEPRECATED AFTER MIGRATION)
  canvas_json jsonb NOT NULL,              -- ❌ Will become deprecated
  canvas_width integer NOT NULL,            -- ❌ Will become deprecated
  canvas_height integer NOT NULL,           -- ❌ Will become deprecated
  variable_mappings jsonb DEFAULT '{}'::jsonb,  -- ❌ Will become deprecated

  -- NEW MULTI-SURFACE ARCHITECTURE (READY TO USE!)
  surfaces jsonb DEFAULT '[]'::jsonb,      -- ✅ Already exists!

  -- Format metadata
  format_type text DEFAULT 'postcard_4x6',
  format_width_inches numeric DEFAULT 6.000,
  format_height_inches numeric DEFAULT 4.000,
  postal_country text DEFAULT 'US',

  -- Other fields...
  thumbnail_url text,
  background_image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)
```

**Current `surfaces` Array Structure**:
```json
[
  {
    "side": "front",
    "canvas_json": {
      "objects": [...],
      "background": "#ffffff",
      "version": "6.7.1"
    },
    "thumbnail_url": "data:image/png;base64,...",
    "variable_mappings": {
      "0": {"variableType": "custom", "isReusable": false}
    }
  }
]
```

**Proposed `surfaces` Array Structure** (with back side):
```json
[
  {
    "side": "front",
    "canvas_json": {...},
    "thumbnail_url": "...",
    "variable_mappings": {...}
  },
  {
    "side": "back",
    "canvas_json": {...},
    "thumbnail_url": "...",
    "variable_mappings": {...},
    "address_block_zone": {
      "x": 825,
      "y": 319,
      "width": 1050,
      "height": 562,
      "country": "US"
    }
  }
]
```

**Migration Strategy**:
1. **Phase 1**: Support both old (single canvas_json) and new (surfaces array) formats
2. **Phase 2**: Auto-migrate old templates to surfaces format on first edit
3. **Phase 3**: Deprecate old fields after all templates migrated

### Current PDF Generation Flow

**File**: `lib/pdf/canvas-to-pdf-simple.ts`

**Current Logic**:
```typescript
// 1. Load template canvasJSON (front page only)
const processedTemplate = await downloadCanvasImages(templateCanvasJSON)

// 2. Render front page with Puppeteer + Fabric.js
await page.setContent(html)  // HTML with Fabric.js
await page.waitForFunction(() => window.renderComplete)

// 3. Screenshot front canvas → PNG
const imgBuffer = await canvasElement.screenshot({ type: 'png' })

// 4. Create 2-page PDF
pdf.addImage(frontPNG, 'PNG', 0, 0, pdfWidth, pdfHeight)  // Page 1: Front
pdf.addPage([pdfWidth, pdfHeight], orientation)           // Page 2: Blank
pdf.setFillColor(255, 255, 255)                            // White background
pdf.rect(0, 0, pdfWidth, pdfHeight, 'F')                   // Fill white
```

**Proposed Logic** (with custom back):
```typescript
// 1. Load BOTH front and back canvas JSONs
const frontCanvas = surfaces.find(s => s.side === 'front').canvas_json
const backCanvas = surfaces.find(s => s.side === 'back')?.canvas_json || null

// 2. Render FRONT page
const frontPNG = await renderCanvasPage(frontCanvas, recipientData, width, height)

// 3. Render BACK page (if custom design exists)
const backPNG = backCanvas
  ? await renderCanvasPage(backCanvas, recipientData, width, height)
  : createBlankPage(width, height)

// 4. Create 2-page PDF
pdf.addImage(frontPNG, 'PNG', 0, 0, pdfWidth, pdfHeight)  // Page 1: Front
pdf.addPage([pdfWidth, pdfHeight], orientation)           // Page 2: Back
pdf.addImage(backPNG, 'PNG', 0, 0, pdfWidth, pdfHeight)   // Custom back or blank
```

**Key Change**: Need to render TWO canvases instead of one + blank

---

## Fabric.js Multi-Canvas Architecture

### Pattern: Multiple Canvas Instances

**Approach**: Use 2 separate Fabric.js canvas instances (not one canvas with layers)

**Reasons**:
1. **Independent State**: Front and back have separate objects, backgrounds, zoom levels
2. **Simpler Rendering**: Each canvas renders independently for PDF generation
3. **Standard Pattern**: Matches Fabric.js best practices
4. **Performance**: Only active canvas needs updates

### Implementation Pattern

**React Component Structure**:
```typescript
export function DualCanvasEditor() {
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front')
  const frontCanvasRef = useRef<fabric.Canvas | null>(null)
  const backCanvasRef = useRef<fabric.Canvas | null>(null)

  useEffect(() => {
    // Initialize front canvas
    frontCanvasRef.current = new fabric.Canvas('frontCanvas', {
      width: 1875,
      height: 1275,
      backgroundColor: '#ffffff'
    })

    // Initialize back canvas
    backCanvasRef.current = new fabric.Canvas('backCanvas', {
      width: 1875,
      height: 1275,
      backgroundColor: '#ffffff'
    })

    return () => {
      frontCanvasRef.current?.dispose()
      backCanvasRef.current?.dispose()
    }
  }, [])

  return (
    <div>
      <Tabs value={activeSide} onValueChange={setActiveSide}>
        <TabsList>
          <TabsTrigger value="front">Front</TabsTrigger>
          <TabsTrigger value="back">Back</TabsTrigger>
        </TabsList>

        <TabsContent value="front">
          <canvas id="frontCanvas" />
        </TabsContent>

        <TabsContent value="back">
          <canvas id="backCanvas" />
          <AddressBlockOverlay /> {/* Visual guide for red zone */}
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

### Address Block Visual Guide

**Component**: `<AddressBlockOverlay />`

**Purpose**: Show non-editable overlay indicating where PostGrid will add address

**Implementation**:
```typescript
function AddressBlockOverlay() {
  return (
    <div className="absolute" style={{
      left: '825px',    // 2.75" at 300 DPI
      top: '319px',     // 1.0625" at 300 DPI
      width: '1050px',  // 3.5" at 300 DPI
      height: '562px',  // 1.875" at 300 DPI
      border: '2px dashed #ff6b35',
      backgroundColor: 'rgba(255, 107, 53, 0.1)',
      pointerEvents: 'none',  // Don't block canvas interaction
      zIndex: 1000
    }}>
      <div className="p-4 text-center">
        <Lock className="mx-auto mb-2" />
        <p className="text-sm font-semibold">Reserved for Address</p>
        <p className="text-xs">PostGrid will overlay recipient address here</p>
      </div>
    </div>
  )
}
```

**Features**:
- Dashed orange border
- Semi-transparent fill
- Lock icon + explanatory text
- Pointer-events: none (doesn't block canvas)
- Always on top (z-index: 1000)

---

## Database Schema Changes

### Option A: Use Existing `surfaces` Array (RECOMMENDED)

**Pros**:
- ✅ Infrastructure already exists
- ✅ No schema migration needed
- ✅ Scalable for future surfaces (envelopes, letters)
- ✅ Clean separation of concerns

**Cons**:
- ⚠️ Need to migrate existing templates from old `canvas_json` field
- ⚠️ More complex queries (JSON array operations)

**Migration Strategy**:
```sql
-- Create migration function to convert old templates to surfaces format
CREATE OR REPLACE FUNCTION migrate_template_to_surfaces(template_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE design_templates
  SET surfaces = jsonb_build_array(
    jsonb_build_object(
      'side', 'front',
      'canvas_json', canvas_json,
      'thumbnail_url', thumbnail_url,
      'variable_mappings', COALESCE(variable_mappings, '{}'::jsonb)
    )
  )
  WHERE id = template_id
  AND (surfaces IS NULL OR surfaces = '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Run migration for all existing templates
DO $$
DECLARE
  template_record RECORD;
BEGIN
  FOR template_record IN SELECT id FROM design_templates WHERE surfaces = '[]'::jsonb
  LOOP
    PERFORM migrate_template_to_surfaces(template_record.id);
  END LOOP;
END $$;
```

**New Template Creation**:
```typescript
const newTemplate = {
  name: 'My Postcard',
  surfaces: [
    {
      side: 'front',
      canvas_json: {...},
      thumbnail_url: '...',
      variable_mappings: {...}
    },
    {
      side: 'back',
      canvas_json: {...},
      thumbnail_url: '...',
      variable_mappings: {...},
      address_block_zone: {
        x: 825, y: 319,
        width: 1050, height: 562,
        country: 'US'
      }
    }
  ]
}
```

### Option B: Add Separate Back Canvas Fields (NOT RECOMMENDED)

**Why not**:
- ❌ Duplicates fields (back_canvas_json, back_variable_mappings, etc.)
- ❌ Not scalable (what about 3+ page documents?)
- ❌ `surfaces` array already exists and is better design

---

## PDF Generation Changes

### Updated `convertCanvasToPDF` Function

**File**: `lib/pdf/canvas-to-pdf-simple.ts`

**New Signature**:
```typescript
export async function convertCanvasToPDF(
  frontCanvasJSON: any,          // Front page canvas
  backCanvasJSON: any | null,    // Back page canvas (optional)
  recipientData: RecipientData,
  formatType: string,
  fileName: string = 'design'
): Promise<PDFResult>
```

**Implementation**:
```typescript
export async function convertCanvasToPDF(
  frontCanvasJSON: any,
  backCanvasJSON: any | null,
  recipientData: RecipientData,
  formatType: string,
  fileName: string = 'design'
): Promise<PDFResult> {
  console.log(`🖼️ [PDF] Converting 2-sided canvas for ${recipientData.name}...`)

  const browser = await getBrowserInstance()
  const page = await browser.newPage()

  try {
    const format = getFormat(formatType)

    // FRONT PAGE
    console.log('📄 [PDF] Rendering front page...')
    const frontProcessed = await downloadCanvasImages(frontCanvasJSON)
    const frontPNG = await renderCanvasToImage(
      page, frontProcessed, recipientData, format.widthPixels, format.heightPixels
    )

    // BACK PAGE
    console.log('📄 [PDF] Rendering back page...')
    let backPNG: string

    if (backCanvasJSON) {
      // Custom back design
      const backProcessed = await downloadCanvasImages(backCanvasJSON)
      backPNG = await renderCanvasToImage(
        page, backProcessed, recipientData, format.widthPixels, format.heightPixels
      )
    } else {
      // Blank white back (current behavior)
      backPNG = createBlankPageImage(format.widthPixels, format.heightPixels)
    }

    // CREATE PDF
    const pdfWidth = format.widthPixels / format.dpi
    const pdfHeight = format.heightPixels / format.dpi
    const orientation = format.widthInches > format.heightInches ? 'landscape' : 'portrait'

    const pdf = new jsPDF({
      orientation,
      unit: 'in',
      format: [pdfWidth, pdfHeight],
      compress: true,
    })

    // Page 1: Front
    pdf.addImage(frontPNG, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST')

    // Page 2: Back
    pdf.addPage([pdfWidth, pdfHeight], orientation)
    pdf.addImage(backPNG, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST')

    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'))
    console.log(`✅ [PDF] Complete: ${(pdfBuffer.length / 1024).toFixed(2)} KB (2 pages)`)

    return {
      buffer: pdfBuffer,
      fileName: `${fileName}.pdf`,
      fileSizeBytes: pdfBuffer.length,
      metadata: {
        format: formatType,
        widthInches: pdfWidth,
        heightInches: pdfHeight,
        widthPixels: format.widthPixels,
        heightPixels: format.heightPixels,
        dpi: format.dpi,
        pages: 2
      }
    }
  } finally {
    await page.close()
    await releaseBrowserInstance()
  }
}

// Helper: Render canvas JSON to PNG base64
async function renderCanvasToImage(
  page: Page,
  canvasJSON: any,
  recipientData: RecipientData,
  width: number,
  height: number
): Promise<string> {
  const html = createHTML(JSON.stringify(canvasJSON), recipientData, width, height)
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 })
  await page.waitForFunction(() => window.renderComplete || window.renderError, { timeout: 60000 })

  const renderComplete = await page.evaluate(() => (window as any).renderComplete)
  const error = await page.evaluate(() => (window as any).renderError)

  if (!renderComplete && error) {
    throw new Error(`Render failed: ${error}`)
  }

  const canvasEl = await page.$('#canvas')
  if (!canvasEl) throw new Error('Canvas not found')

  const imgBuffer = await canvasEl.screenshot({ type: 'png', omitBackground: false })
  return `data:image/png;base64,${(imgBuffer as Buffer).toString('base64')}`
}

// Helper: Create blank white page
function createBlankPageImage(width: number, height: number): string {
  // Create minimal SVG for blank white page (more efficient than PNG)
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="#ffffff"/>
  </svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}
```

**Key Improvements**:
1. ✅ Supports optional back canvas (backwards compatible)
2. ✅ Efficient blank page generation (SVG instead of white rectangle)
3. ✅ Extracted `renderCanvasToImage` helper (DRY principle)
4. ✅ Better error handling and logging

---

## UI/UX Design

### Template Editor Layout

**Current**: Single canvas view

**Proposed**: Tabbed dual-canvas view

```
┌─────────────────────────────────────────────────────────────┐
│  Template Editor: My Postcard Template                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Front] [Back]  <-- Tabs for switching sides               │
│                                                              │
│  ┌─────────────────────────────┐  ┌──────────────────────┐ │
│  │                             │  │  TOOLBAR             │ │
│  │                             │  │                      │ │
│  │     CANVAS AREA             │  │  [Text] [Image]      │ │
│  │     (Front or Back)         │  │  [Rectangle] [Circle]│ │
│  │                             │  │  [Variables]         │ │
│  │     1875 × 1275 px          │  │                      │ │
│  │                             │  │  LAYERS              │ │
│  │     [ADDRESS BLOCK          │  │  - Layer 1           │ │
│  │      GUIDE visible          │  │  - Layer 2           │ │
│  │      on back side]          │  │  - Layer 3           │ │
│  │                             │  │                      │ │
│  └─────────────────────────────┘  └──────────────────────┘ │
│                                                              │
│  [Save] [Preview] [Generate Campaign]                       │
└─────────────────────────────────────────────────────────────┘
```

### Address Block Guide (Back Side Only)

**Visual Elements**:
1. **Dashed Border**: Orange (#ff6b35) 2px dashed outline
2. **Semi-Transparent Fill**: rgba(255, 107, 53, 0.1)
3. **Lock Icon**: Center-aligned with text
4. **Label**: "Reserved for Address - PostGrid will overlay recipient address here"
5. **Non-Interactive**: Doesn't block canvas clicks/drags

**Behavior**:
- Always visible on back side
- Hidden on front side
- Cannot be deleted or moved
- Shows "snap boundaries" when dragging objects near edge
- Warning toast if user places text in red zone

### User Workflow

**Creating New Template**:
1. Click "New Template" → Select format (4×6, 5×7, etc.)
2. **Front tab auto-selected** → Design front page
3. Click **"Back" tab** → Design back page
   - See address block guide automatically
   - Warning: "Leave right side clear for mailing address"
4. Save template → Both sides saved to `surfaces` array

**Editing Existing Template**:
1. Open template → Loads front side by default
2. Click "Back" tab → Loads back side (or shows blank if not designed yet)
3. Edit either side → Auto-saves to respective surface
4. Preview → Shows flip animation between front/back

**Generating Campaign**:
1. Select template (with front + back)
2. Upload recipients CSV
3. Click "Generate"
4. System generates 2-page PDFs:
   - Page 1: Front with personalized data
   - Page 2: Back with personalized data + space for PostGrid address

---

## Implementation Plan

### Phase 1: Database Migration (1-2 hours)

**Tasks**:
1. ✅ Verify `surfaces` column exists (DONE - confirmed in schema)
2. Create migration function to convert old templates
3. Add database indexes for surfaces array queries
4. Test migration with sample templates

**SQL**:
```sql
-- Migration function (see Database Schema Changes section)

-- Add index for surfaces array queries
CREATE INDEX idx_design_templates_surfaces_side
ON design_templates USING GIN (surfaces);

-- Add constraint to ensure front surface always exists
ALTER TABLE design_templates
ADD CONSTRAINT check_front_surface_exists
CHECK (
  surfaces IS NOT NULL
  AND jsonb_array_length(surfaces) > 0
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(surfaces) AS s
    WHERE s->>'side' = 'front'
  )
);
```

**Files Modified**:
- `supabase/migrations/[timestamp]_add_surfaces_migration.sql`

---

### Phase 2: Update Type Definitions (30 minutes)

**Tasks**:
1. Update `lib/database/types.ts` with new surface types
2. Update `DesignTemplate` interface
3. Add helper functions for surface operations

**Code**:
```typescript
// lib/database/types.ts

export interface CanvasSurface {
  side: 'front' | 'back'
  canvas_json: Record<string, any>
  thumbnail_url?: string
  variable_mappings?: Record<string, VariableMapping>
  address_block_zone?: AddressBlockZone  // Only for back side
}

export interface AddressBlockZone {
  x: number
  y: number
  width: number
  height: number
  country: 'US' | 'CA' | 'UK' | 'EU'
}

export interface DesignTemplate {
  id: string
  organization_id: string
  created_by: string
  name: string
  description?: string

  // NEW: Multi-surface architecture
  surfaces: CanvasSurface[]

  // OLD: Deprecated (kept for backwards compatibility)
  canvas_json?: Record<string, any>  // @deprecated Use surfaces[0].canvas_json
  canvas_width?: number               // @deprecated Use format dimensions
  canvas_height?: number              // @deprecated Use format dimensions
  variable_mappings?: Record<string, VariableMapping>  // @deprecated Use surfaces[0].variable_mappings

  // Format metadata
  format_type: string
  format_width_inches: number
  format_height_inches: number
  postal_country: string

  // Other fields...
  thumbnail_url?: string
  background_image_url?: string
  created_at: string
  updated_at: string
}

// Helper functions
export function getFrontSurface(template: DesignTemplate): CanvasSurface | undefined {
  return template.surfaces.find(s => s.side === 'front')
}

export function getBackSurface(template: DesignTemplate): CanvasSurface | undefined {
  return template.surfaces.find(s => s.side === 'back')
}

export function hasCustomBack(template: DesignTemplate): boolean {
  return template.surfaces.some(s => s.side === 'back')
}

export function getAddressBlockZone(formatType: string, country: string = 'US'): AddressBlockZone {
  // Standard US 4×6 postcard (6.25"×4.25" with bleed)
  if (formatType === 'postcard_4x6') {
    return {
      x: 825,     // 2.75" at 300 DPI
      y: 319,     // 1.0625" at 300 DPI
      width: 1050, // 3.5" at 300 DPI
      height: 562, // 1.875" at 300 DPI
      country: country as 'US' | 'CA' | 'UK' | 'EU'
    }
  }

  // Add other formats as needed
  throw new Error(`Address block zone not defined for format: ${formatType}`)
}
```

**Files Modified**:
- `lib/database/types.ts`

---

### Phase 3: Update PDF Generator (2-3 hours)

**Tasks**:
1. Modify `convertCanvasToPDF` to accept two canvases
2. Extract `renderCanvasToImage` helper function
3. Add `createBlankPageImage` helper
4. Update all callers to pass both front and back canvases
5. Add logging for 2-page rendering

**Files Modified**:
- `lib/pdf/canvas-to-pdf-simple.ts` (see PDF Generation Changes section)
- `lib/campaigns/batch-vdp-processor.ts` (update to pass both surfaces)

**Testing**:
- Generate PDF with custom back → Verify 2 different pages
- Generate PDF with no back → Verify blank page 2 (backwards compatible)
- Check PDF dimensions (6.25"×4.25") ✅
- Check page count (2 pages) ✅

---

### Phase 4: Update Canvas Editor UI (4-6 hours)

**Tasks**:
1. Add tabbed interface (Front/Back)
2. Create `<DualCanvasEditor>` component
3. Add `<AddressBlockOverlay>` component for back side
4. Implement canvas switching logic
5. Add "snap boundaries" near red zone
6. Add warning toast when placing objects in red zone
7. Update save logic to save both surfaces

**New Components**:
```
components/design/
├── canvas-editor.tsx               # Existing (refactor to DualCanvasEditor)
├── address-block-overlay.tsx       # NEW
├── canvas-toolbar.tsx              # Existing (shared between front/back)
└── canvas-surface-tabs.tsx         # NEW
```

**Example**:
```typescript
// components/design/address-block-overlay.tsx
export function AddressBlockOverlay({ zone }: { zone: AddressBlockZone }) {
  return (
    <div
      className="absolute border-2 border-dashed border-orange-500 bg-orange-50/10 pointer-events-none z-50"
      style={{
        left: `${zone.x}px`,
        top: `${zone.y}px`,
        width: `${zone.width}px`,
        height: `${zone.height}px`,
      }}
    >
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <Lock className="w-8 h-8 mb-2 text-orange-600" />
        <p className="text-sm font-semibold text-orange-700">Reserved for Address</p>
        <p className="text-xs text-orange-600">PostGrid will overlay recipient address here</p>
        <p className="text-xs text-orange-500 mt-2">Keep this area clear for best results</p>
      </div>
    </div>
  )
}
```

**Files Modified**:
- `components/design/canvas-editor.tsx` (major refactor)
- `components/design/address-block-overlay.tsx` (new)
- `components/design/canvas-surface-tabs.tsx` (new)

---

### Phase 5: Update API Routes (1-2 hours)

**Tasks**:
1. Update `POST /api/design-templates` to accept surfaces array
2. Update `PATCH /api/design-templates/[id]` to update surfaces
3. Update `GET /api/design-templates/[id]` to return surfaces
4. Add backwards compatibility for old `canvas_json` field

**Example**:
```typescript
// app/api/design-templates/route.ts

export async function POST(request: NextRequest) {
  const body = await request.json()

  const { data, error } = await supabase
    .from('design_templates')
    .insert({
      organization_id: body.organization_id,
      created_by: body.created_by,
      name: body.name,
      surfaces: body.surfaces || [
        {
          side: 'front',
          canvas_json: body.canvas_json,  // Backwards compat
          variable_mappings: body.variable_mappings,
          thumbnail_url: body.thumbnail_url
        }
      ],
      format_type: body.format_type,
      // ... other fields
    })
    .select()
    .single()

  if (error) throw error
  return NextResponse.json({ data })
}
```

**Files Modified**:
- `app/api/design-templates/route.ts`
- `app/api/design-templates/[id]/route.ts`

---

### Phase 6: Update Campaign Generation (1 hour)

**Tasks**:
1. Update `batch-vdp-processor.ts` to load both surfaces
2. Pass both front and back canvas to PDF generator
3. Handle templates with only front surface (backwards compat)

**Code**:
```typescript
// lib/campaigns/batch-vdp-processor.ts

const frontSurface = template.surfaces.find(s => s.side === 'front')
const backSurface = template.surfaces.find(s => s.side === 'back')

if (!frontSurface) {
  throw new Error('Template missing front surface')
}

const result = await convertCanvasToPDF(
  frontSurface.canvas_json,
  backSurface?.canvas_json || null,  // null if no custom back
  recipientData,
  template.format_type,
  `${campaign.name}_${recipient.name}`
)
```

**Files Modified**:
- `lib/campaigns/batch-vdp-processor.ts`

---

### Phase 7: Testing & Validation (2-3 hours)

**Test Cases**:

1. **Create new template with custom back**
   - ✅ Front and back tabs work
   - ✅ Address block guide visible on back
   - ✅ Both surfaces save to database
   - ✅ Thumbnail generation works for both sides

2. **Edit existing template (old format)**
   - ✅ Automatically migrates to surfaces format
   - ✅ Front side loads correctly
   - ✅ Back side starts blank (can be designed)

3. **Generate campaign with custom back**
   - ✅ PDF has 2 different pages
   - ✅ Front page shows custom front design
   - ✅ Back page shows custom back design
   - ✅ Variable replacement works on both pages

4. **Generate campaign without custom back**
   - ✅ PDF has 2 pages (front + blank)
   - ✅ Backwards compatible with current behavior

5. **PostGrid submission**
   - ✅ Custom back PDFs submit successfully
   - ✅ Address overlays correctly on back page
   - ✅ No content in address block zone

**Files Modified**:
- None (testing only)

---

### Phase 8: Documentation (1 hour)

**Tasks**:
1. Update user guide with front/back editor instructions
2. Add address block zone documentation
3. Create video tutorial showing front/back design
4. Update API documentation

**Files Created**:
- `docs/FRONT_BACK_CANVAS_USER_GUIDE.md`
- `docs/ADDRESS_BLOCK_POSITIONING.md`

---

## Risk Analysis

### High Risk ⚠️

**Risk**: Breaking existing campaigns that use old `canvas_json` format

**Mitigation**:
- Keep old fields for backwards compatibility
- Auto-migrate on first edit (not on read)
- Add fallback logic in PDF generator
- Test thoroughly with existing templates

**Risk**: Address block overlay not positioned correctly for different countries

**Mitigation**:
- Use PostGrid's official guideline PDFs
- Add country-specific `getAddressBlockZone()` function
- Test with actual PostGrid submissions
- Add visual verification in preview mode

**Risk**: Performance issues with 2 canvases rendering simultaneously

**Mitigation**:
- Only render active canvas
- Dispose inactive canvas from memory
- Use lazy loading for back canvas
- Optimize Fabric.js object count

### Medium Risk ⚠️

**Risk**: Users accidentally place important content in address block zone

**Mitigation**:
- Prominent visual guide (orange dashed border)
- Warning toast when dragging objects near red zone
- "Validate design" button that checks for violations
- Auto-snap objects away from red zone

**Risk**: PDF generation takes longer with 2 pages to render

**Mitigation**:
- Parallel rendering (if possible)
- Progress indicators
- Optimize Puppeteer viewport settings
- Cache rendered canvases when no variables change

### Low Risk ⚠️

**Risk**: Database migration fails for some templates

**Mitigation**:
- Dry-run migration first
- Transaction-based migration
- Rollback plan
- Manual fix for edge cases

**Risk**: UI/UX confusion with tabs vs layers

**Mitigation**:
- Clear labeling ("Front" / "Back" not "Page 1" / "Page 2")
- Visual preview showing which side is active
- Onboarding tooltip
- Help text

---

## Testing Strategy

### Unit Tests

**PDF Generator**:
```typescript
describe('convertCanvasToPDF', () => {
  it('generates 2-page PDF with custom front and back', async () => {
    const result = await convertCanvasToPDF(
      mockFrontCanvas,
      mockBackCanvas,
      mockRecipient,
      'postcard_4x6'
    )

    expect(result.metadata.pages).toBe(2)
    expect(result.buffer.length).toBeGreaterThan(0)
  })

  it('generates 2-page PDF with front and blank back (backwards compat)', async () => {
    const result = await convertCanvasToPDF(
      mockFrontCanvas,
      null,  // No custom back
      mockRecipient,
      'postcard_4x6'
    )

    expect(result.metadata.pages).toBe(2)
  })
})
```

**Database Queries**:
```typescript
describe('getSurface helpers', () => {
  it('returns front surface', () => {
    const front = getFrontSurface(mockTemplate)
    expect(front?.side).toBe('front')
  })

  it('returns back surface if exists', () => {
    const back = getBackSurface(mockTemplateWithBack)
    expect(back?.side).toBe('back')
  })

  it('returns undefined if no back surface', () => {
    const back = getBackSurface(mockTemplateFrontOnly)
    expect(back).toBeUndefined()
  })
})
```

### Integration Tests

**E2E Template Creation**:
1. Create new template
2. Design front page → Add text, images, variables
3. Switch to back tab → Add logo, message
4. Save template
5. Verify database has both surfaces
6. Reload template → Verify both sides render correctly

**E2E Campaign Generation**:
1. Select template with custom back
2. Upload 5 recipients CSV
3. Generate campaign
4. Download PDFs
5. Verify PDFs:
   - 2 pages each
   - Different content on page 1 vs page 2
   - Variables replaced correctly on both pages
   - Address block area clear on back page

**E2E PostGrid Submission**:
1. Generate campaign with custom back
2. Submit to PostGrid (test mode)
3. Verify submission success
4. Check PostGrid dashboard → Verify address overlays correctly
5. Download proof from PostGrid → Verify no design conflicts with address

### Manual Testing Checklist

- [ ] Create template with custom back
- [ ] Edit template front only (back unchanged)
- [ ] Edit template back only (front unchanged)
- [ ] Delete back design (revert to blank)
- [ ] Migrate old template to new format
- [ ] Generate campaign with custom back (5 recipients)
- [ ] Generate campaign without custom back (5 recipients)
- [ ] Submit to PostGrid test mode
- [ ] Verify address placement in PostGrid proofs
- [ ] Test with different countries (US/CA/UK)
- [ ] Test with different formats (4×6, 5×7, 6×9)
- [ ] Performance test with 100 recipients

---

## Timeline Estimate

| Phase | Task | Time | Complexity |
|-------|------|------|------------|
| 1 | Database Migration | 1-2 hours | Low |
| 2 | Type Definitions | 30 min | Low |
| 3 | PDF Generator | 2-3 hours | Medium |
| 4 | Canvas Editor UI | 4-6 hours | **High** |
| 5 | API Routes | 1-2 hours | Low |
| 6 | Campaign Generation | 1 hour | Low |
| 7 | Testing & Validation | 2-3 hours | Medium |
| 8 | Documentation | 1 hour | Low |
| **TOTAL** | **13-19 hours** | **~2-3 days** |

**Recommendation**: Allocate 3 full days for implementation + testing + buffer

---

## Success Criteria

### Functional Requirements ✅
- [ ] Users can design both front and back pages in template editor
- [ ] Address block guide is visible on back page
- [ ] Both surfaces save to database correctly
- [ ] PDF generator creates 2 different pages from 2 canvases
- [ ] Variable replacement works on both front and back
- [ ] PostGrid submissions succeed with custom back designs
- [ ] Address overlays correctly without conflicting with custom design
- [ ] Backwards compatible with existing templates (auto-migration)

### Performance Requirements ✅
- [ ] Canvas switching < 500ms
- [ ] PDF generation time increase < 50% (currently ~6.6s, target < 10s)
- [ ] Database queries < 100ms
- [ ] No memory leaks from multiple canvas instances

### Quality Requirements ✅
- [ ] Zero PostGrid submission failures
- [ ] No content in address block zone (validated)
- [ ] PDF dimensions remain correct (6.25"×4.25") ✅
- [ ] Page count correct (2 pages) ✅
- [ ] All existing campaigns continue to work

---

## Next Steps

### Before Implementation
1. ✅ Review this plan thoroughly
2. ✅ Get user approval on UI/UX mockups
3. ✅ Download PostGrid guideline PDFs for exact red zone coordinates
4. ✅ Create test template with custom back in Figma (design reference)
5. ✅ Set up development environment

### During Implementation
1. Follow phases in order (dependencies matter!)
2. Commit after each phase (atomic commits)
3. Test thoroughly before moving to next phase
4. Document any deviations from plan

### After Implementation
1. Deploy to staging environment
2. User acceptance testing (UAT)
3. Performance testing with large batches (100-1000 recipients)
4. PostGrid test submissions for all countries
5. Production deployment
6. Monitor for issues (first 48 hours critical)

---

## Conclusion

This implementation will enable full customization of both front and back postcard pages while maintaining:
- ✅ **100% PostGrid compatibility** (current success rate)
- ✅ **Backwards compatibility** (existing templates work)
- ✅ **Professional UX** (address block guide + validation)
- ✅ **Scalable architecture** (`surfaces` array supports future formats)

**Estimated Effort**: 2-3 days full-time development

**Risk Level**: Medium (well-planned, infrastructure exists, clear requirements)

**Recommendation**: **PROCEED with implementation** following this plan

---

**Document Version**: 1.0
**Last Updated**: November 11, 2025
**Status**: Ready for Implementation ✅
