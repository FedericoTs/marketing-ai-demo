# Canvas Editor Enhancement Plan

## 🎯 Objective
Enhance canvas usability with professional editing tools while preserving ALL existing functionalities.

## 🏗️ Architecture Principles

### 1. **Non-Destructive Enhancement**
- All new features are **additive only**
- Existing data structures remain **backward compatible**
- No breaking changes to existing workflows

### 2. **Dual-Name System for Layer Management**
```typescript
{
  displayName: "My Company Logo",  // User-editable, shown in UI
  variableType: "logo",            // Immutable system reference
}
```

**Benefits:**
- ✅ Users can rename layers freely
- ✅ Programmatic replacement always works (uses `variableType`)
- ✅ Template reusability preserved

### 3. **Enhanced Variable Mapping Schema**
```typescript
interface EnhancedVariableMapping {
  // EXISTING FIELDS (backward compatible)
  type: "text" | "image" | "backgroundImage";
  dataField: string;
  variable: boolean;
  reusable?: boolean;

  // NEW FIELDS (optional, non-breaking)
  displayName?: string;          // User-editable layer name
  variableType?: string;          // Immutable: logo, message, qr-code, decorative-image-1, etc.
  category?: "standard" | "custom-image" | "custom-shape" | "custom-text";
  isLocked?: boolean;
  isVisible?: boolean;
  layerOrder?: number;
  imageData?: string;             // Base64 for custom images
  shapeData?: {                   // For custom shapes
    shapeType: "rectangle" | "circle" | "line";
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  };
}
```

## 📋 Implementation Phases

### ✅ PHASE 1: Foundation (COMPLETED)
- [x] Enhanced database schema with backward compatibility
- [x] Updated TypeScript interfaces
- [x] Fixed logo aspect ratio preservation (scale uniformly to 200px max width)
- [x] Added enhanced metadata foundation

### 🔄 PHASE 2: Critical Tools (IN PROGRESS)
**Priority: Delete + Image Upload**

#### Delete Tool
- **UI**: Trash icon button in toolbar
- **Keyboard**: Delete/Backspace key support
- **Behavior**:
  - Only works when object is selected
  - Confirmation for standard layers (logo, message, QR code)
  - No confirmation for custom layers
  - Updates layer panel in real-time
- **Safety**: Undo history preserved

#### Image Upload Tool
- **UI**: Image icon button + file picker
- **Formats**: PNG, JPG, JPEG, SVG, WebP
- **Behavior**:
  - Aspect ratio preserved (scale to 300px max width)
  - Placed at canvas center
  - Automatically selected after upload
  - Generates unique `variableType`: decorative-image-1, decorative-image-2, etc.
- **Storage**: Base64 in `imageData` field

### 🎨 PHASE 3: Layer Management Panel
**Priority: Professional layer control**

#### Layer Panel UI
- **Location**: Right sidebar (collapsible)
- **Features**:
  - List all canvas objects
  - Show layer thumbnails
  - Display layer names (editable)
  - Visual indicators (locked, hidden)

#### Layer Controls
1. **Visibility Toggle**
   - Eye icon (visible) / EyeOff icon (hidden)
   - Updates canvas immediately
   - Preserves in variableMapping

2. **Lock/Unlock**
   - Lock icon (locked) / Unlock icon (unlocked)
   - Locked layers cannot be selected/moved/edited
   - Preserves in variableMapping

3. **Reorder (Z-Index)**
   - Drag-and-drop to reorder
   - Or use ChevronUp/ChevronDown buttons
   - Updates `layerOrder` in variableMapping

4. **Rename Layer**
   - Double-click layer name to edit
   - Updates `displayName` only
   - `variableType` remains unchanged
   - Shows both in UI: "My Logo (logo)"

5. **Delete Layer**
   - Trash icon in layer row
   - Confirmation for standard layers
   - Removes from canvas + variableMapping

### 🛠️ PHASE 4: Shape & Alignment Tools
**Priority: Design flexibility**

#### Shape Tools
1. **Rectangle Tool**
   - Default: 200x100px, blue fill, no stroke
   - Generates `variableType`: decorative-shape-1, decorative-shape-2, etc.
   - Stores shape data in `shapeData` field

2. **Circle Tool**
   - Default: 100px radius, purple fill, no stroke
   - Generates `variableType`: decorative-shape-3, etc.

3. **Line Tool**
   - Default: 200px length, 2px stroke, black
   - Horizontal placement

#### Alignment Tools
- Align Left, Center, Right (horizontal)
- Align Top, Middle, Bottom (vertical)
- Distribute Horizontally/Vertically (if multiple selected)
- Only enabled when object(s) selected

### ✨ PHASE 5: Polish & Finalization
**Priority: Professional UX**

#### Enhanced Controls
1. **Color Picker**
   - Better UI with recent colors
   - Works for text, shapes, stroke

2. **Font Controls**
   - Font size slider (8px - 120px)
   - Font weight toggle (normal/bold)
   - Font family dropdown

#### Data Management
1. **Save Logic Enhancement**
   - Generate unique `variableType` for all custom layers
   - Store `imageData` for custom images
   - Store `shapeData` for shapes
   - Preserve all metadata

2. **Load Logic Enhancement**
   - Use `variableType` for programmatic replacement (NOT displayName)
   - Restore layer state (visibility, lock, order)
   - Backward compatible with old templates

### 🧪 FINAL: Comprehensive Testing
**Priority: Zero regressions**

1. **Existing Functionality Tests**
   - Logo upload still works
   - Text editing still works
   - QR code placement still works
   - Save template still works
   - Load template still works
   - Variable replacement still works

2. **New Functionality Tests**
   - Delete tool works
   - Image upload works
   - Layer panel works
   - Shapes work
   - Alignment works

3. **Backward Compatibility Tests**
   - Old templates load correctly
   - Old templates can be edited
   - Old templates can be saved
   - Variable replacement works on old templates

## 🎨 UX Design Principles

### Toolbar Organization
```
[Text] [Image] [Rectangle] [Circle] [Line] | [Delete] | [Align Left] [Align Center] [Align Right] | [Layers]
```

### Layer Panel Design
```
┌─ Layers ──────────────┐
│ [x] 🔓 Company Logo    │ <- visible, unlocked
│     🔒 Background      │ <- hidden, locked
│ [x] 🔓 Message Text    │
│ [x] 🔓 QR Code        │
│ [x] 🔓 Decorative 1   │
└───────────────────────┘
```

### Color Scheme
- Standard layers: Blue (#3B82F6)
- Custom layers: Purple (#A855F7)
- Locked layers: Gray (#9CA3AF)
- Selected layer: Green (#10B981)

## 📦 Database Impact

### No Schema Changes Required
All enhancements use existing `variable_mappings` TEXT column (stores JSON).

### Migration Strategy
1. Old templates have minimal `variableMappings`
2. New fields are optional
3. Load logic checks for field existence before using
4. Graceful degradation for missing fields

## 🔒 Safety Measures

### Protected Standard Layers
- `logo`, `background-image`, `message`, `qr-code`
- `customer-name`, `customer-address`, `phone-number`
- **Deletion requires confirmation**
- **Always preserve variableType**

### Undo/Redo System
- Preserve existing undo/redo functionality
- Add to history after each change
- Max 50 history states

### Error Handling
- Graceful degradation if image fails to load
- Toast notifications for all user actions
- Console logging for debugging
- No silent failures

## 📈 Success Metrics

### User Experience
- ✅ Intuitive UI (no learning curve)
- ✅ Fast operations (< 100ms response time)
- ✅ Clear visual feedback
- ✅ Professional appearance

### Technical
- ✅ Zero breaking changes
- ✅ 100% backward compatibility
- ✅ No performance degradation
- ✅ All existing tests pass

## 🚀 Rollout Strategy

### Phase-by-Phase Deployment
1. Complete Phase 2 → Test → Commit
2. Complete Phase 3 → Test → Commit
3. Complete Phase 4 → Test → Commit
4. Complete Phase 5 → Test → Commit
5. Final comprehensive testing
6. Merge to main

### Testing Checkpoints
- After each phase: Test all existing functionality
- Before commit: Run full test suite
- After commit: Verify no regressions

---

**Last Updated:** 2025-10-18
**Status:** Phase 2 in progress
**Next Milestone:** Delete tool + Image upload implementation
