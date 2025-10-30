# 🧪 Testing the Canvas Editor - Step-by-Step Guide

**Feature**: Fabric.js 300 DPI Canvas Editor for Direct Mail Templates
**Status**: ✅ Ready to Test
**Route**: http://localhost:3000/templates
**Dev Server**: Running on port 3000

---

## 🚀 Quick Start (3 Steps)

### 1. **Start Dev Server** (if not running)
```bash
npm run dev
# ✓ Ready in ~21s
# Server: http://localhost:3000
```

### 2. **Login with Test Credentials**
```
Email: owner@acme-corp.test
Password: Test123456!
```

### 3. **Navigate to Canvas Editor**
- Click "**Design Templates**" in sidebar (has orange "NEW" badge)
- Or go directly to: http://localhost:3000/templates

---

## 📋 Full Testing Checklist

### ✅ **Sidebar Navigation**
- [ ] Sidebar shows new structure with emoji icons
- [ ] "Design Templates" has orange "NEW" badge
- [ ] Sidebar sections: 🎨 Design & Create, 📬 Campaign Management, 📊 Analytics, ⚙️ Settings
- [ ] Click "Design Templates" → redirects to /templates

### ✅ **Login & Authentication**
```
Test Credentials:
- owner@acme-corp.test / Test123456!
- admin@acme-corp.test / Test123456!
- owner@techstart.test / Test123456!
```

**Steps**:
1. Open http://localhost:3000
2. You'll be redirected to /login (if not authenticated)
3. Enter test credentials above
4. After login, you're redirected to /dashboard
5. Click "Design Templates" in sidebar

### ✅ **Canvas Editor Page**
**Template Info Section**:
- [ ] "Template Name" input field visible
- [ ] "Description" input field visible (optional)
- [ ] Can type in both fields

**Canvas Editor**:
- [ ] White canvas visible (450px × 300px display size)
- [ ] Canvas info shows: "1800 x 1200px (6" x 4" at 300 DPI)"
- [ ] Display scale shows: "25% (editing view)"

### ✅ **Toolbar - Design Tools**

**Text Tool**:
- [ ] Click "Text" button
- [ ] Text object appears in center of canvas ("Double-click to edit")
- [ ] Double-click text → can edit inline
- [ ] Can drag text around canvas
- [ ] Can resize text by dragging corners

**Rectangle Tool**:
- [ ] Click "Rectangle" button
- [ ] Orange rectangle appears in center
- [ ] Can drag rectangle around
- [ ] Can resize by dragging corners
- [ ] Has black stroke outline

**Circle Tool**:
- [ ] Click "Circle" button
- [ ] Teal circle appears in center
- [ ] Can drag circle around
- [ ] Can resize by dragging corners
- [ ] Has black stroke outline

**Image Upload Tool**:
- [ ] Click "Image" button
- [ ] File picker opens
- [ ] Select an image file (PNG, JPG, etc.)
- [ ] Image appears on canvas
- [ ] Image auto-scales to 50% canvas width max
- [ ] Can drag and resize image

### ✅ **Toolbar - Edit Controls**

**Undo/Redo**:
- [ ] Add a few objects (text, shapes)
- [ ] Click "Undo" → last action reversed
- [ ] Click "Redo" → action restored
- [ ] Undo button disabled when at start of history
- [ ] Redo button disabled when at end of history

**Delete**:
- [ ] Click on an object to select it (handles appear)
- [ ] Click "Delete" button
- [ ] Object removed from canvas
- [ ] If nothing selected, shows toast: "No objects selected"

**Zoom Controls**:
- [ ] Click "Zoom In" → canvas enlarges
- [ ] Click "Zoom Out" → canvas shrinks
- [ ] Can zoom between 10% - 200%
- [ ] Objects maintain proportions

### ✅ **Save Template**

**Prerequisites**:
1. Create a template name: "Summer Sale Postcard"
2. Add some objects (text, shapes, images) to canvas

**Save Process**:
- [ ] Click "Save Template" button
- [ ] Loading overlay appears: "Saving template..."
- [ ] Success toast: "Template saved successfully!"
- [ ] Template name and description inputs cleared

**Database Verification** (via Supabase Dashboard):
1. Go to https://supabase.com/dashboard/project/egccqmlhzqiirovstpal/editor
2. Click "design_templates" table
3. Verify new row exists with:
   - [ ] name = "Summer Sale Postcard"
   - [ ] organization_id = Acme Corp UUID
   - [ ] canvas_json = JSON string with Fabric.js data
   - [ ] variable_mappings = JSON object
   - [ ] preview_image_url = base64 PNG data
   - [ ] template_type = "postcard"
   - [ ] canvas_dimensions = {width: 1800, height: 1200, dpi: 300}

### ✅ **Download PNG**

**Test Full Resolution Export**:
- [ ] Add objects to canvas
- [ ] Click "Download PNG" button
- [ ] File downloads: `design-{timestamp}.png`
- [ ] Open downloaded PNG
- [ ] Verify dimensions: **1800px × 1200px** (full 300 DPI)
- [ ] Image quality is high (print-ready)
- [ ] All objects rendered correctly

### ✅ **Multi-Object Editing**

**Selection & Manipulation**:
- [ ] Click object → handles appear
- [ ] Click canvas background → deselect
- [ ] Drag object → moves smoothly
- [ ] Resize object → maintains aspect ratio (if locked)
- [ ] Rotate object (if handles support rotation)

**Multiple Objects**:
- [ ] Add 3-4 objects of different types
- [ ] Can layer objects (drag to reorder z-index)
- [ ] Each object selectable independently
- [ ] Delete works on selected object only

### ✅ **Canvas Dimensions Info**

**Info Card at Bottom**:
- [ ] Shows: "Canvas Size: 1800 x 1200px (6" x 4" at 300 DPI)"
- [ ] Shows: "Display Scale: 25% (editing view)"
- [ ] Blue background with info icon

---

## 🎨 Advanced Testing

### **Test Scenario 1: Create Postcard Template**
1. Login as Acme Owner
2. Click "Design Templates"
3. Enter name: "Holiday Promo Postcard"
4. Add text: "Special Holiday Offer!"
5. Add rectangle background
6. Upload company logo image
7. Click "Save Template"
8. Verify in Supabase database

### **Test Scenario 2: Test Multi-Tenant Isolation**
1. Login as `owner@acme-corp.test`
2. Create and save template "Acme Template A"
3. Sign out
4. Login as `owner@techstart.test`
5. Go to /templates
6. Verify TechStart user cannot see Acme's template (future: add template library view to verify)

### **Test Scenario 3: Complex Design**
1. Add text: "Big Sale - 50% Off"
2. Add 2 rectangles (different colors)
3. Add 1 circle
4. Upload 2 images
5. Use undo/redo multiple times
6. Zoom in/out
7. Rearrange objects by dragging
8. Save template
9. Download PNG and verify all objects present

---

## 🐛 Known Issues & Workarounds

### **Issue 1: SQLite API Error (Non-Blocking)**
**Error**: `❌ [Templates API] Error: invalid ELF header`

**Impact**: None on new canvas editor (uses Supabase)

**Explanation**:
- Old templates API (`/api/campaigns/templates`) uses SQLite
- SQLite has native module issues on WSL
- New canvas editor uses Supabase (Phase 1/2 implementation)
- Can safely ignore this error

**Workaround**: None needed - new implementation bypasses SQLite

---

### **Issue 2: Auth Redirect Loop** (if encountered)
**Symptom**: Continuous redirect between /login and /dashboard

**Fix**:
1. Clear browser cookies for localhost:3000
2. Hard refresh (Ctrl+Shift+R)
3. Login again with test credentials

---

## 📊 Expected Results

### **Successful Canvas Editor Test**:
✅ Sidebar shows "Design Templates" with NEW badge
✅ Login redirects to dashboard
✅ Templates page loads successfully (HTTP 200)
✅ Canvas renders at 450x300px (25% scale)
✅ All toolbar tools work (text, shapes, image upload)
✅ Undo/redo maintains history
✅ Save stores to Supabase design_templates table
✅ Download exports 1800x1200px PNG at 300 DPI
✅ Multi-tenant isolation enforced (org-scoped templates)

---

## 🎯 Demo Flow (for Presentation)

**5-Minute Canvas Editor Demo**:

1. **Show Sidebar** (30 seconds)
   - "New navigation structure for DropLab"
   - "Design Templates has NEW badge"

2. **Login** (15 seconds)
   - Use owner@acme-corp.test
   - Fast authentication

3. **Create Template** (2 minutes)
   - Enter name: "Summer Sale Postcard"
   - Add text: "50% Off Summer Sale!"
   - Add rectangle background (orange)
   - Add circle decoration (teal)
   - Upload logo image

4. **Show Features** (1 minute)
   - Demonstrate undo/redo
   - Zoom in/out
   - Delete an object
   - Show canvas dimensions (300 DPI)

5. **Save & Export** (1 minute)
   - Click "Save Template"
   - Show success toast
   - Click "Download PNG"
   - Show downloaded file is 1800x1200px

6. **Database Verification** (30 seconds)
   - Open Supabase Dashboard
   - Show design_templates table
   - Show saved record with canvas_json

---

## 🚨 Troubleshooting

### **Server Not Starting**
```bash
# Kill existing processes
pkill -f "node.*next"

# Clear cache and restart
rm -rf .next
npm run dev
```

### **Page Not Loading**
1. Check server logs in terminal
2. Verify URL: http://localhost:3000/templates
3. Hard refresh browser (Ctrl+Shift+R)
4. Check for compilation errors in terminal

### **Canvas Not Rendering**
1. Check browser console for errors (F12)
2. Verify Fabric.js loaded: `window.fabric` should exist
3. Clear browser cache
4. Refresh page

### **Save Not Working**
1. Check browser console for API errors
2. Verify Supabase credentials in .env.local
3. Check you're logged in (refresh auth state)
4. Verify organization_id exists in user_profiles table

---

## 📝 Test Results Log

**Date**: ___________
**Tester**: ___________

| Feature | Status | Notes |
|---------|--------|-------|
| Sidebar navigation | ☐ Pass ☐ Fail | |
| Login/Auth | ☐ Pass ☐ Fail | |
| Canvas renders | ☐ Pass ☐ Fail | |
| Text tool | ☐ Pass ☐ Fail | |
| Shape tools | ☐ Pass ☐ Fail | |
| Image upload | ☐ Pass ☐ Fail | |
| Undo/Redo | ☐ Pass ☐ Fail | |
| Delete | ☐ Pass ☐ Fail | |
| Zoom | ☐ Pass ☐ Fail | |
| Save template | ☐ Pass ☐ Fail | |
| Download PNG | ☐ Pass ☐ Fail | |
| Database storage | ☐ Pass ☐ Fail | |

**Overall Status**: ☐ All Pass ☐ Some Issues ☐ Major Issues

**Notes**: ____________________________________________

---

**🎉 If all tests pass**: Canvas editor is ready for Phase 2.2 (Template Library) implementation!

**📋 Next Steps**:
- Task 2.2: Build template gallery/library view
- Task 2.3: Add AI background generation (DALL-E)
- Task 2.4: Implement variable field markers
- Task 2.5: Integrate QR code generation

---

**🤖 Generated with [Claude Code](https://claude.com/claude-code)**
