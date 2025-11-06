# VDP Campaign Creation - Testing Guide

## Prerequisites
- Dev server running (`npm run dev`)
- At least one saved template with `{variable}` fields (e.g., `{firstName}`, `{lastName}`, `{email}`)

## Step-by-Step Testing Instructions

### Part 1: Create a Template with Variables (5 min)

1. **Navigate to Templates Page**
   - Go to http://localhost:3000/templates
   - Click "Templates" in sidebar

2. **Create a New Template**
   - Select format (e.g., "4×6 Postcard")
   - Add text with variable markers:
     - Click "Add" → "Title" or "Heading"
     - Type: `Hello {firstName} {lastName}!`
     - Add another text: `Email us at {email}`
   - In Layers Panel (right side), enter:
     - **Template Name**: "VDP Test Template"
     - **Description**: "Testing variable data printing"
   - Click **Save Template** button (top toolbar)
   - Verify toast: "✅ Template saved successfully"

3. **Verify Template Saved**
   - Click "Load Template" button (folder icon)
   - Should see your template in the library
   - Close library modal

---

### Part 2: Test Campaign Creation Workflow (10 min)

4. **Open Campaign Modal**
   - Click "Load Template" button again
   - Hover over your template card
   - Click **"⚡ Create Campaign"** button (appears on hover)
   - Campaign modal opens → Step 1: Variables

5. **Step 1: Variable Detection & CSV Download**
   - Verify detected variables show:
     - ✅ Detected 3 variables
     - Variable list: `{firstName}`, `{lastName}`, `{email}`
   - Check CSV sample preview (shows headers + 3 sample rows)
   - Click **"Download CSV Template"** button
   - File downloaded: `vdp_test_template_sample.csv`
   - Open CSV file - should contain:
     ```csv
     firstName,lastName,email
     John,Smith,john.smith@example.com
     Sarah,Johnson,sarah.johnson@example.com
     Michael,Williams,michael.williams@example.com
     ```
   - Click **"Continue to Upload"**

6. **Step 2: CSV Upload & Validation**
   - **Test 1: Drag & Drop**
     - Drag the downloaded CSV file into the upload area
     - Should show green border when dragging
     - File uploads and validates
     - Shows: ✅ "Valid CSV - Ready to process"
     - Displays detected columns with green checkmarks
     - Preview table shows first 5 rows

   - **Test 2: Column Validation** (optional - create invalid CSV)
     - Remove the CSV file (click X button)
     - Edit CSV: Remove `lastName` column
     - Re-upload
     - Should show red error: ❌ "Missing required columns: lastName"

   - **Test 3: Row Count Validation** (optional)
     - CSV with < 10 rows → Error
     - CSV with > 10,000 rows → Error

7. **Upload Valid CSV (10+ rows)**
   - Edit your CSV to have at least 10 rows of test data
   - Upload again
   - Verify:
     - ✅ Green success state
     - Preview shows first 5 rows
     - Button enabled: "Generate Campaign (10 variants)"
   - Click **"Generate Campaign"**

8. **Step 3: Processing & Results**
   - **Progress Tracking** (should appear for ~1-2 seconds):
     - Blue progress bar animating 0% → 100%
     - "Processing batch 1 of 1"
     - "10 of 10 variants generated"

   - **Success View**:
     - ✅ Green success card: "Campaign Generated Successfully!"
     - "10 personalized variants ready for export"
     - Variants list shows first 10 with:
       - Row number badges (1, 2, 3...)
       - Personalized data preview ("John • Smith")
       - Field count ("3 fields personalized")
       - Green checkmarks
     - Next steps instructions visible

9. **Verify Personalization**
   - Each variant in the list should show different names
   - Data should match your CSV rows
   - All variants marked as completed

---

### Part 3: Test Edge Cases (5 min)

10. **No Variables in Template**
    - Create a template with NO `{variable}` text
    - Try to create campaign
    - Should show: ⚠️ "No variables detected"
    - "Continue to Upload" button disabled

11. **Large CSV Performance** (optional)
    - Create CSV with 500 rows
    - Upload and generate
    - Should process in batches of 50
    - Progress bar should update multiple times
    - Total processing time: ~5-10 seconds

12. **Cancel/Close Workflow**
    - Start campaign creation
    - Click "Cancel" at Step 1 → Modal closes
    - Re-open → Should reset to Step 1
    - Upload CSV at Step 2
    - Click "Back" → Returns to Step 1
    - Click X (close) → Modal closes

---

## Expected Results Summary

✅ **Step 1 - Variable Detection:**
- Auto-detects all `{variable}` patterns
- Shows realistic sample data
- Generates downloadable CSV template

✅ **Step 2 - CSV Upload:**
- Drag & drop works smoothly
- Validates columns, row count, file type
- Shows clear error messages
- Displays preview of uploaded data

✅ **Step 3 - Processing:**
- Real-time progress tracking
- Batch processing for large datasets
- Success view with variant list
- No errors in console

---

## Known Limitations (Current Phase)

⏸️ **Not Yet Implemented:**
- PDF Export (shows "Coming Soon" button)
- ZIP Download (pending PDF export)
- Actual rendering of personalized canvas variants
- Save/store generated campaigns

---

## Troubleshooting

**Issue**: Template name field disappears on first input
- **Status**: Under investigation
- **Workaround**: TBD after bug fix

**Issue**: Variables not detected
- **Check**: Make sure text includes `{variableName}` format
- **Check**: Variable names must be alphanumeric + underscore only

**Issue**: CSV validation failing
- **Check**: File is actual CSV (not Excel .xlsx)
- **Check**: All required columns present
- **Check**: Row count between 10-10,000

**Issue**: Progress bar stuck
- **Check**: Browser console for errors
- **Refresh**: Close modal and retry

---

## Next Steps After Testing

Once testing is complete, remaining features to implement:
1. **PDF Export Engine** - Render each variant as 300 DPI PDF
2. **ZIP Download** - Bundle all PDFs for bulk download
3. **Campaign Storage** - Save campaigns to database
4. **Gallery View** - Visual preview of all variants

---

**Testing Checklist:**
- [ ] Create template with variables
- [ ] Open campaign modal
- [ ] Download CSV sample
- [ ] Edit CSV with real data (10+ rows)
- [ ] Upload CSV successfully
- [ ] Generate campaign
- [ ] View progress tracking
- [ ] See success results with variants
- [ ] Test error cases (invalid CSV, no variables)
- [ ] Verify no console errors

**Estimated Testing Time: 20 minutes**
