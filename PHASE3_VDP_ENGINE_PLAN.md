# Phase 3: Variable Data Printing (VDP) Engine

**Strategic Goal**: Enable batch personalization of 1,000-10,000+ direct mail pieces from a single template with unique recipient data and tracking QR codes.

**Success Metrics**:
- Generate 1,000 personalized designs in < 5 minutes
- 300 DPI print-ready quality
- Zero data loss in variable replacement
- Unique tracking QR code per recipient
- Scalable to 100,000+ recipients

---

## 🎯 Core Problem Statement

**Current State**:
- ✅ Fabric.js visual editor for template design (Phase 2)
- ✅ Design templates stored in database with `canvas_json`
- ✅ Recipient lists (Data Axle API + CSV upload)
- ✅ Variable mappings concept (template vars → recipient fields)
- ✅ Campaign creation wizard
- ❌ **NO way to apply recipient data to templates at scale**
- ❌ **NO QR code generation per recipient in designs**
- ❌ **NO export to print-ready files**

**Target State**:
- ✅ One-click batch personalization of entire campaign
- ✅ Each recipient gets unique design with their data
- ✅ Each design has trackable QR code → landing page
- ✅ Export 300 DPI PDF/PNG for printing
- ✅ Preview any personalized design
- ✅ Bulk download as ZIP

---

## 🏗️ Architecture Deep Dive

### **1. Data Flow**

```
Campaign Template (Fabric.js Canvas JSON)
  ↓
+ Recipient List (1,000 rows)
  ↓
+ Variable Mappings (name → first_name, address → mailing_address)
  ↓
VDP Engine (Server-side Fabric.js)
  ↓
1,000 Personalized Canvas JSONs
  ↓
+ Unique QR Codes (tracking_code → /lp/ABC123)
  ↓
Export Engine (300 DPI PNG/PDF)
  ↓
Supabase Storage (signed URLs)
  ↓
User Downloads (Individual or ZIP)
```

### **2. Database Schema**

**Already Exists** (`campaign_recipients` table from migration `019_campaigns_schema.sql`):
```sql
CREATE TABLE campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  recipient_id UUID REFERENCES recipients(id),
  personalized_canvas_json JSONB,      -- 🔑 Customized Fabric.js canvas
  tracking_code TEXT UNIQUE,            -- 🔑 Unique QR code identifier
  qr_code_url TEXT,                     -- 🔑 Base64 QR code data URL
  personalized_pdf_url TEXT,            -- 🔑 Supabase Storage URL
  status TEXT CHECK (status IN ('pending', 'generated', 'sent', 'delivered', 'failed')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**What we'll populate**:
- `personalized_canvas_json` - Fabric.js canvas with recipient data applied
- `tracking_code` - 12-char nanoid (e.g., "A7xK9mP3qR2w")
- `qr_code_url` - Base64 PNG of QR code
- `personalized_pdf_url` - Supabase Storage path (e.g., "campaigns/abc123/recipients/def456.pdf")

### **3. Technical Challenges & Solutions**

#### **Challenge 1: Fabric.js is Browser-Only**
**Problem**: Fabric.js uses browser Canvas API, doesn't work in Node.js

**Solution**: Use `fabric` package + `canvas` (node-canvas)
```bash
npm install fabric canvas
```

Node-canvas provides Canvas API implementation for Node.js. Fabric.js can use it.

**Caveat**: node-canvas requires native dependencies (Cairo graphics library)
- Works on Ubuntu/Debian
- Can be tricky on Windows (needs build tools)
- **Alternative**: Use Puppeteer to run browser headless (slower but more reliable)

**Decision**: Try node-canvas first, fallback to Puppeteer if needed

---

#### **Challenge 2: Variable Mapping - How to Identify Objects?**

**Problem**: Which Fabric.js text object corresponds to "recipient name"?

**Current Implementation** (from Phase 2):
- Custom properties: `obj.variableType = 'recipientName'`
- Stored separately in `variable_mappings` (index-based)

**Variable Mapping Structure**:
```typescript
{
  "0": { variableType: "logo", isReusable: true },
  "3": { variableType: "recipientName", isReusable: false },
  "5": { variableType: "recipientAddress", isReusable: false },
  "8": { variableType: "qrCode", isReusable: false }
}
```

**VDP Process**:
1. Load template `canvas_json`
2. Load `variable_mappings`
3. Apply mappings to objects by index
4. Find all objects with `isReusable: false`
5. Replace text based on `variableType`

**Example**:
```typescript
// Object at index 3 has variableType: 'recipientName'
// Campaign mapping says: recipientName → recipient.first_name
// Recipient data: { first_name: 'John', last_name: 'Doe' }
// Result: textObject.text = 'John'
```

---

#### **Challenge 3: QR Code Sizing & Quality**

**Problem**: QR codes must be scannable, can't be blurry

**Requirements**:
- Minimum size: 1 inch × 1 inch at print resolution
- 300 DPI print → 300px × 300px minimum
- High error correction (L = 7%, M = 15%, Q = 25%, H = 30%)

**Implementation**:
```typescript
import QRCode from 'qrcode';

const qrDataUrl = await QRCode.toDataURL(
  `${process.env.NEXT_PUBLIC_APP_URL}/lp/${trackingCode}`,
  {
    width: 300,  // 1 inch at 300 DPI
    margin: 1,
    errorCorrectionLevel: 'H',  // High error correction
    type: 'image/png',
  }
);
```

**Placement Strategy**:
1. Find QR placeholder object (index with `variableType: 'qrCode'`)
2. Load QR as Fabric.Image
3. Replace placeholder, maintaining position/size
4. Lock aspect ratio

---

#### **Challenge 4: Export Quality (300 DPI)**

**Problem**: Fabric.js defaults to screen resolution (72-96 DPI)

**Solution**: Scale canvas before export
```typescript
// Template designed at 1000px × 1400px (8.5" × 11" at ~117 DPI)
// Export at 300 DPI: 2550px × 3300px

const scaleFactor = 300 / 117; // ≈ 2.56

canvas.setWidth(1000 * scaleFactor);
canvas.setHeight(1400 * scaleFactor);
canvas.setZoom(scaleFactor);

const dataUrl = canvas.toDataURL({
  format: 'png',
  quality: 1,
  multiplier: 1,  // Don't scale again
});
```

**PDF Generation**:
- Use `jspdf` to create PDF
- Add high-res PNG to PDF
- Set PDF page size to match design (8.5" × 11")
- Embed fonts if using custom typography

---

#### **Challenge 5: Memory Management (1,000+ Canvases)**

**Problem**: Loading 1,000 Fabric canvases = OOM crash

**Solution**: Process in batches
```typescript
const BATCH_SIZE = 100;

for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
  const batch = recipients.slice(i, i + BATCH_SIZE);

  await Promise.all(batch.map(async (recipient) => {
    const personalizedCanvas = await personalizeDesign(template, recipient);
    const pdf = await exportToPDF(personalizedCanvas);
    await uploadToStorage(pdf);
    // Clear canvas from memory
    personalizedCanvas.dispose();
  }));
}
```

**Progress Tracking**:
- Store in database: `campaign.generation_progress` (0-100%)
- Poll from frontend every 2 seconds
- Show progress bar

---

#### **Challenge 6: Supabase Storage Integration**

**Storage Structure**:
```
supabase-storage/
└── campaigns/
    └── {campaign_id}/
        ├── recipients/
        │   ├── {recipient_1_id}.pdf
        │   ├── {recipient_2_id}.pdf
        │   └── ...
        └── bulk/
            └── all_recipients_{timestamp}.zip
```

**Upload Process**:
```typescript
const supabase = createServiceClient();

const { data, error } = await supabase.storage
  .from('campaigns')
  .upload(
    `${campaignId}/recipients/${recipientId}.pdf`,
    pdfBuffer,
    {
      contentType: 'application/pdf',
      cacheControl: '3600',
      upsert: true,
    }
  );

// Generate signed URL (7-day expiration)
const { data: signedUrl } = await supabase.storage
  .from('campaigns')
  .createSignedUrl(`${campaignId}/recipients/${recipientId}.pdf`, 604800);
```

---

## 📋 Implementation Roadmap

### **Task 3.1: Basic VDP Engine** (2-3 hours)

**Files to Create**:
1. `lib/vdp/personalization-engine.ts` - Core VDP logic
2. `lib/vdp/variable-replacer.ts` - Apply recipient data to canvas
3. `lib/vdp/qr-integrator.ts` - Generate & place QR codes
4. `lib/vdp/export-engine.ts` - Export to 300 DPI PNG/PDF

**Steps**:
1. Install dependencies:
   ```bash
   npm install fabric canvas qrcode pdfkit
   npm install --save-dev @types/fabric @types/qrcode @types/pdfkit
   ```

2. Create `personalization-engine.ts`:
   - Load Fabric canvas from JSON
   - Apply variable mappings
   - Replace text objects
   - Return personalized canvas JSON

3. Test with single recipient

---

### **Task 3.2: QR Code Integration** (1 hour)

**Steps**:
1. Generate unique tracking code (nanoid)
2. Create QR code image (300×300px)
3. Find QR placeholder in canvas
4. Replace with generated QR
5. Store tracking code in `campaign_recipients`

---

### **Task 3.3: Batch Processing** (2 hours)

**Steps**:
1. Create API route: `POST /api/campaigns/[id]/generate-vdp`
2. Fetch campaign + template + recipients
3. Process in batches (100 at a time)
4. Store results in `campaign_recipients` table
5. Update progress in database

**Progress Tracking**:
```typescript
await supabase
  .from('campaigns')
  .update({
    generation_progress: Math.floor((i / total) * 100),
    generation_status: 'processing',
  })
  .eq('id', campaignId);
```

---

### **Task 3.4: Export & Storage** (2 hours)

**Steps**:
1. Export personalized canvas to 300 DPI PNG
2. Convert PNG to PDF (optional but recommended)
3. Upload to Supabase Storage
4. Generate signed URL
5. Store URL in `campaign_recipients.personalized_pdf_url`

---

### **Task 3.5: UI for VDP Management** (2-3 hours)

**Files to Create**:
1. `app/(main)/campaigns/[id]/recipients/page.tsx` - Recipients list
2. `components/campaigns/recipients-table.tsx` - Table component
3. `components/campaigns/recipient-preview-modal.tsx` - Preview modal

**Features**:
- Table showing all recipients
- Columns: Name, Status, Tracking Code, Actions
- Preview button (opens modal with design preview)
- Download button (individual PDF)
- Bulk download button (ZIP all PDFs)
- Regenerate button (re-run VDP for one recipient)

---

## 🎨 UI/UX Design

### **Campaign Recipients Page**

```
┌─────────────────────────────────────────────────────┐
│  Campaign: "Spring Promotion 2024"                   │
│  Template: "Postcard 6x9 - Retail"                   │
│  Recipients: 1,247                                    │
│                                                       │
│  [Generate All Designs] [Download All (ZIP)]         │
│                                                       │
│  Progress: ████████████░░░░ 75% (935/1,247)          │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Name        | Status    | Tracking   | Actions  │ │
│  ├─────────────────────────────────────────────────┤ │
│  │ John Doe    | Generated | A7xK9mP3q  | [👁][⬇] │ │
│  │ Jane Smith  | Generated | B2yL3nQ8r  | [👁][⬇] │ │
│  │ Bob Johnson | Pending   | -          | [🔄]    │ │
│  │ ...         | ...       | ...        | ...     │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 🔒 Error Handling

**Failure Scenarios**:

1. **node-canvas won't install** → Fallback to Puppeteer
2. **QR code generation fails** → Retry 3 times, mark as failed
3. **PDF export fails** → Store PNG instead
4. **Storage upload fails** → Retry with exponential backoff
5. **Recipient data missing** → Use placeholder text, warn user

**Graceful Degradation**:
- Store error in `campaign_recipients.error_message`
- Set `status = 'failed'`
- Allow manual retry
- Continue processing other recipients

---

## 🚀 Performance Optimizations

### **Phase 3 MVP (Week 5-6)**:
- Sequential processing (simple, reliable)
- 100 recipients/batch
- ~5 minutes for 1,000 recipients

### **Phase 3 Advanced (Future)**:
- Parallel processing with worker threads
- Queue-based (BullMQ + Redis)
- Serverless functions (Vercel Edge)
- ~30 seconds for 1,000 recipients

---

## 📊 Testing Strategy

### **Unit Tests**:
1. Variable replacement logic
2. QR code generation
3. Canvas JSON manipulation
4. Export quality validation

### **Integration Tests**:
1. End-to-end VDP flow
2. Batch processing
3. Storage uploads
4. Progress tracking

### **Manual Testing**:
1. Create campaign with 10 recipients
2. Run VDP generation
3. Verify all designs are unique
4. Check QR codes scan correctly
5. Download PDFs, check print quality
6. Test bulk download

---

## 🎯 Acceptance Criteria

Phase 3 is COMPLETE when:

- ✅ User can click "Generate Designs" on campaign
- ✅ System processes all recipients (up to 1,000)
- ✅ Each recipient gets unique personalized design
- ✅ Each design has scannable QR code → landing page
- ✅ Designs are 300 DPI print-ready
- ✅ User can preview any design
- ✅ User can download individual PDFs
- ✅ User can bulk download all as ZIP
- ✅ Progress bar shows real-time status
- ✅ Errors are handled gracefully
- ✅ No memory leaks or crashes

---

## 📝 Next Steps

**Immediate** (Before Phase 3):
1. ✅ Add landing page viewer (show tracking codes)
2. ✅ Test landing pages work end-to-end

**Phase 3.1** (Start Here):
1. Install Fabric.js + node-canvas
2. Create basic personalization engine
3. Test with single recipient
4. Expand to batch processing

**Phase 3.2** (QR Codes):
1. Integrate QR generation
2. Test tracking codes work
3. Link to landing pages

**Phase 3.3** (Export):
1. Implement 300 DPI export
2. PDF generation
3. Supabase Storage upload

**Phase 3.4** (UI):
1. Recipients table
2. Preview modal
3. Download buttons

---

## 🏆 Success Metrics

**Week 5-6 Goal**:
- Generate 1,000 personalized designs in < 5 minutes
- 100% accuracy in variable replacement
- 100% QR code scannability
- Zero crashes or OOM errors
- User can preview & download all designs

**Stretch Goals**:
- Support 10,000 recipients
- Generate in < 60 seconds
- Real-time WebSocket progress updates
- Image variable support (not just text)

---

**End of Phase 3 Plan**
