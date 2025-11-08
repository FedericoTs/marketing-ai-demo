# Campaign Preview - Debug Guide

**Date**: November 7, 2025
**Status**: Fixed and debugged
**All fixes committed**: 3 commits

---

## 🎯 What Was Fixed

### **Commit 1**: Canvas zoom corruption
- Removed `setZoom()` from auto-fit
- Locked zoom at 1.0 permanently
- Canvas-only scaling via CSS

### **Commit 2**: Variable replacement logic
- Fixed Fabric.js v6 import syntax
- Extract variable names from `{variableName}` patterns
- Match extracted names with mappings correctly

### **Commit 3**: Canvas element and error handling
- Create canvas IN DOM (not detached)
- Multiple safety checks and fallbacks
- Proper cleanup of canvas elements
- Extensive error logging

---

## 🧪 Testing Checklist

### **1. Restart Everything**
```bash
# Stop dev server (Ctrl+C)
npm run dev

# Hard refresh browser
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

### **2. Create Campaign**
1. Go to `/campaigns/create`
2. **Step 1**: Select template
3. **Step 2**: Select recipient list (with contacts)
4. **Step 3**: Map variables (e.g., `firstName` → `first_name`)
5. **Step 4**: Click "Preview Campaign"

---

## 📊 Console Logs to Check

### **Scenario 1: No Variables to Replace**

**Expected:**
```
✅ No variables to replace, using static thumbnail
```
**Result**: Shows `template.thumbnail_url` image


### **Scenario 2: Template Has No Objects**

**Expected:**
```
🎨 Starting personalized preview generation...
📋 Template canvas_json type: object
📋 Template canvas_json keys: ['version', 'objects']
📋 Canvas JSON objects: 0
⚠️ Template has no canvas objects, using thumbnail
```
**Result**: Falls back to thumbnail
**Action**: Template is empty or corrupted - recreate it


### **Scenario 3: Canvas Loads with 0 Objects**

**Expected:**
```
🎨 Canvas created: { width: 1800, height: 1200, zoom: 1 }
✅ Canvas loaded successfully, objects: 0
⚠️ Canvas loaded but has 0 objects, using thumbnail
```
**Result**: Falls back to thumbnail
**Action**: `canvas_json` in database is corrupted - delete template


### **Scenario 4: Successful Personalization** ✅

**Expected:**
```
🎨 Starting personalized preview generation...
📋 Template canvas_json type: object
📋 Template canvas_json keys: ['version', 'objects', 'background', ...]
📋 Canvas JSON objects: 4

🎨 Canvas created: { width: 1800, height: 1200, zoom: 1 }
✅ Canvas loaded successfully, objects: 4

🔍 Variable Mappings: [
  { templateVariable: 'firstName', recipientField: 'first_name', ... },
  { templateVariable: 'lastName', recipientField: 'last_name', ... }
]
🔍 Sample Recipient: { first_name: 'John', last_name: 'Smith', ... }

📝 Object 0: { type: 'textbox', variableType: 'recipientName', text: 'Hello, {firstName}!' }
  📝 Textbox analysis: { text: 'Hello, {firstName}!', extractedVariableName: 'firstName' }
  🔄 Checking mapping: { templateVariable: 'firstName', extractedVariableName: 'firstName', matches: true }
  ✅ Match found! Recipient value: 'John'
  🎯 Replaced "firstName" with "John"

📝 Object 1: { type: 'textbox', variableType: 'recipientName', text: '{lastName}' }
  📝 Textbox analysis: { text: '{lastName}', extractedVariableName: 'lastName' }
  🔄 Checking mapping: { templateVariable: 'lastName', extractedVariableName: 'lastName', matches: true }
  ✅ Match found! Recipient value: 'Smith'
  🎯 Replaced "lastName" with "Smith"

📝 Object 2: { type: 'image', variableType: 'qrCode' }
  🔲 Generating QR code for tracking: abc123-def456
  ✅ QR code replaced

✅ Preview generated: { width: 1800, height: 1200, dataUrlLength: 145678 }
🧹 Cleaned up canvas elements
```

**Result**:
- Preview shows personalized content
- Variables replaced with actual data
- QR code generated
- Black text (not purple)

---

## ❌ Error Scenarios

### **Error 1: Canvas loaded, objects: 0**

**Cause**: Template `canvas_json` has empty `objects` array

**Debug in Database**:
```sql
-- Check template data
SELECT
  id,
  name,
  canvas_json->>'objects' as objects_array,
  jsonb_array_length(canvas_json->'objects') as object_count
FROM design_templates
WHERE id = 'your-template-id';
```

**Solution**: Delete template and recreate from scratch


### **Error 2: Variables not replaced**

**Console shows**:
```
📝 Object 0: { type: 'textbox', text: '{firstName}' }
  📝 Textbox analysis: { extractedVariableName: 'firstName' }
  🔄 Checking mapping: { templateVariable: 'first_name', extractedVariableName: 'firstName', matches: false }
  ⚠️ No mapping found for variable "firstName"
```

**Cause**: Mismatch between:
- Variable name in template: `{firstName}` (camelCase)
- Mapping templateVariable: `first_name` (snake_case)

**Solution**:
- In Step 3, variable should be mapped as `firstName` → `first_name`
- The `templateVariable` must match the extracted name from `{variableName}`


### **Error 3: clearRect error**

**Console shows**:
```
TypeError: Cannot read properties of undefined (reading 'clearRect')
```

**Cause**: Canvas element not in DOM (should be FIXED now)

**Check**:
- Should see `document.body.appendChild(canvasElement)` in code
- Canvas element positioned at `-9999px` off-screen

**If still happens**:
1. Check browser console for React StrictMode double-renders
2. Verify cleanup is running: `🧹 Cleaned up canvas elements`


### **Error 4: Preview shows purple text**

**Cause**: Purple highlighting not removed

**Check Console**:
```
📝 Textbox analysis: { ... }
// Should see:
textObj.set({ backgroundColor: 'transparent', fill: '#000000' })
```

**If not working**: Variable type not detected correctly


### **Error 5: Recipient data shows as undefined**

**Console shows**:
```
✅ Match found! Recipient value: undefined
⚠️ Recipient field "first_name" is empty
```

**Cause**:
- Recipient doesn't have that field
- Field name mismatch (e.g., `firstName` vs `first_name`)

**Check**:
```
🔍 Sample Recipient: {
  first_name: 'John',  // ✅ Has first_name
  last_name: 'Smith'   // ✅ Has last_name
}
```

**Solution**: Verify recipient list has correct field names

---

## 🔍 Database Debugging

### **Check Template Canvas JSON**:
```sql
SELECT
  id,
  name,
  canvas_json->'objects' as objects,
  jsonb_array_length(canvas_json->'objects') as object_count,
  variable_mappings,
  thumbnail_url
FROM design_templates
ORDER BY created_at DESC
LIMIT 5;
```

**Expected**:
- `object_count`: > 0 (at least 1 object)
- `objects`: Array with object definitions
- `variable_mappings`: Object with index → metadata
- `thumbnail_url`: Data URL (base64 PNG)


### **Check Recipient Data**:
```sql
SELECT
  id,
  first_name,
  last_name,
  email,
  phone,
  address_line1,
  city,
  state,
  zip_code
FROM recipients
WHERE recipient_list_id = 'your-list-id'
LIMIT 5;
```

**Expected**:
- All required fields populated
- Field names match SampleRecipient interface

---

## 🎯 Success Criteria

✅ **Preview displays full template** (not cropped to 1/4)
✅ **Variables replaced** with actual recipient data
✅ **Purple highlighting removed** (black text on transparent)
✅ **QR code visible** and unique per recipient
✅ **Navigate between recipients** shows different data
✅ **No console errors** (especially no clearRect)
✅ **Proper cleanup** - see "🧹 Cleaned up canvas elements"

---

## 🚀 Next Steps (If All Works)

1. **Floating Preview Modal** - Clean "as printed" view
2. **Batch Preview Generation** - Cache all previews
3. **Double-sided DM** - Flip animation
4. **Template Cards** - Preview thumbnails in Step 1

---

## 📞 If Still Not Working

**Provide these logs**:
1. Full console output from opening preview modal
2. Screenshot of preview (or lack thereof)
3. Template ID from database
4. Result of database queries above

**Most likely issues**:
- Template has corrupted `canvas_json` → Delete and recreate
- Variable names don't match mapping → Check Step 3 mappings
- Recipient fields missing → Check recipient list data

---

**Last Updated**: November 7, 2025
**All Commits**: 3 commits on `feature/supabase-parallel-app`
