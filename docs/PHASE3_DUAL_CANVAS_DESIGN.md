# Phase 3: Dual-Canvas Editor Design Document

**Date**: November 11, 2025
**Status**: Design Phase
**Priority**: Ultra-careful, minimal impact, maximum simplicity

---

## 🎯 GOALS

1. **Enable front AND back canvas design** in template editor
2. **Visualize PostGrid address block zone** on back page
3. **Zero breaking changes** to existing functionality
4. **Incredible simple and engaging UI**

---

## 🧠 ARCHITECTURE ANALYSIS

### Current State (Single Canvas)
```typescript
// State
const [canvas, setCanvas] = useState<Canvas | null>(null);

// Initialization (useEffect with deps: [currentFormat, initialData])
const fabricCanvas = new Canvas(canvasRef.current, {...});
setCanvas(fabricCanvas);

// Cleanup
return () => {
  if (fabricCanvas) fabricCanvas.dispose();
};

// Save
onSave({
  canvasJSON: JSON.stringify(canvas.toJSON()),
  variableMappings: {...},
  preview: canvas.toDataURL(),
  format: currentFormat,
});
```

### Dependencies Already Support Multi-Surface ✅
- ✅ **API** (`/api/design-templates`): Lines 109-116 already pack canvas into `surfaces[0]`
- ✅ **Database**: `surfaces` jsonb array column exists
- ✅ **Templates Page**: Lines 71-79 already read from `surfaces[0]`
- ✅ **Types**: `DesignSurface` interface defined

---

## 🎨 UI DESIGN (Ultra-Simple)

### Visual Mockup
```
┌──────────────────────────────────────────────────────────────┐
│  ← Back  |  📄 Template Name: [Input]  |  [Save]  [Download] │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────────────────────────┐   │
│  │  TOOLBAR    │  │  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓    │   │
│  │             │  │  ┃ [Front] [Back] ← Tabs      ┃    │   │
│  │  [Text]     │  │  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛    │   │
│  │  [Image]    │  │  ┌──────────────────────────────┐  │   │
│  │  [Shape]    │  │  │                              │  │   │
│  │  [QR Code]  │  │  │  CANVAS (Front or Back)      │  │   │
│  │             │  │  │                              │  │   │
│  │             │  │  │  [Address Block Overlay]     │  │   │
│  │             │  │  │  (only visible on Back tab)  │  │   │
│  │             │  │  │                              │  │   │
│  │             │  │  └──────────────────────────────┘  │   │
│  └─────────────┘  └─────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Key UI Elements

**1. Tab Component** (shadcn/ui Tabs)
```tsx
<Tabs value={activeSide} onValueChange={handleSideChange}>
  <TabsList>
    <TabsTrigger value="front">
      <FileText className="w-4 h-4 mr-2" />
      Front
    </TabsTrigger>
    <TabsTrigger value="back">
      <FileCheck className="w-4 h-4 mr-2" />
      Back
    </TabsTrigger>
  </TabsList>
</Tabs>
```

**2. Address Block Overlay** (Only visible on Back tab)
```tsx
{activeSide === 'back' && (
  <div className="absolute" style={{
    left: `${(825 / currentFormat.widthPixels) * 100}%`,
    top: `${(319 / currentFormat.heightPixels) * 100}%`,
    width: `${(1050 / currentFormat.widthPixels) * 100}%`,
    height: `${(562 / currentFormat.heightPixels) * 100}%`,
    border: '2px dashed #ff6b35',
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    pointerEvents: 'none',
    zIndex: 1000,
  }}>
    <div className="absolute top-2 left-2 text-xs text-orange-600 font-semibold bg-white/90 px-2 py-1 rounded">
      📮 Reserved for Address (PostGrid)
    </div>
  </div>
)}
```

---

## 🔧 IMPLEMENTATION STRATEGY

### Approach: **Dual-Canvas with State Switching** ⚡

**Why NOT single canvas with layers?**
- ❌ Complex state management
- ❌ Difficult to isolate front/back
- ❌ Risk of mixing objects between sides

**Why YES dual canvas instances?**
- ✅ Simple: Each side is independent
- ✅ Standard Fabric.js pattern
- ✅ Easy to save/load separately
- ✅ Clean separation of concerns

### State Changes (Minimal)
```typescript
// BEFORE (single canvas)
const [canvas, setCanvas] = useState<Canvas | null>(null);

// AFTER (dual canvas)
const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
const [frontCanvas, setFrontCanvas] = useState<Canvas | null>(null);
const [backCanvas, setBackCanvas] = useState<Canvas | null>(null);

// Computed: Active canvas (no duplication of logic)
const canvas = activeSide === 'front' ? frontCanvas : backCanvas;
```

### Canvas Initialization (Careful Lifecycle)
```typescript
useEffect(() => {
  if (!frontCanvasRef.current || !backCanvasRef.current) return;

  let fabricFrontCanvas: Canvas | null = null;
  let fabricBackCanvas: Canvas | null = null;

  const initTimeout = setTimeout(() => {
    // Create front canvas
    fabricFrontCanvas = new Canvas(frontCanvasRef.current, {
      width: currentFormat.widthPixels,
      height: currentFormat.heightPixels,
      backgroundColor: '#ffffff',
    });

    // Load front surface data
    if (initialData?.surfaces?.[0]) {
      fabricFrontCanvas.loadFromJSON(initialData.surfaces[0].canvas_json, () => {
        // Apply variable mappings...
        fabricFrontCanvas.renderAll();
      });
    }

    setFrontCanvas(fabricFrontCanvas);

    // Create back canvas
    fabricBackCanvas = new Canvas(backCanvasRef.current, {
      width: currentFormat.widthPixels,
      height: currentFormat.heightPixels,
      backgroundColor: '#ffffff',
    });

    // Load back surface data (if exists)
    if (initialData?.surfaces?.[1]) {
      fabricBackCanvas.loadFromJSON(initialData.surfaces[1].canvas_json, () => {
        fabricBackCanvas.renderAll();
      });
    }

    setBackCanvas(fabricBackCanvas);

    // Attach event listeners to BOTH canvases
    [fabricFrontCanvas, fabricBackCanvas].forEach(c => {
      c.on('object:modified', () => saveToHistory(c));
      c.on('object:added', () => saveToHistory(c));
      c.on('object:removed', () => saveToHistory(c));
      // ... other events
    });
  }, 50);

  return () => {
    clearTimeout(initTimeout);
    if (fabricFrontCanvas) fabricFrontCanvas.dispose();
    if (fabricBackCanvas) fabricBackCanvas.dispose();
  };
}, [currentFormat, initialData]);
```

### Canvas Switching (Simple)
```typescript
const handleSideChange = (side: 'front' | 'back') => {
  setActiveSide(side);
  // That's it! CSS will show/hide the canvases
};
```

### CSS for Canvas Visibility
```tsx
<div className="relative">
  {/* Front Canvas */}
  <div style={{ display: activeSide === 'front' ? 'block' : 'none' }}>
    <canvas ref={frontCanvasRef} />
  </div>

  {/* Back Canvas */}
  <div style={{ display: activeSide === 'back' ? 'block' : 'none' }}>
    <canvas ref={backCanvasRef} />
    <AddressBlockOverlay /> {/* Only on back */}
  </div>
</div>
```

### Save Logic (Updated)
```typescript
const handleSave = useCallback(() => {
  if (!frontCanvas || !backCanvas || !onSave) return;

  try {
    // Extract front surface
    const frontSurface = {
      side: 'front' as const,
      canvas_json: JSON.parse(JSON.stringify(frontCanvas.toJSON())),
      variable_mappings: extractVariableMappings(frontCanvas),
      thumbnail_url: frontCanvas.toDataURL({ format: 'png', quality: 0.8, multiplier: 0.2 }),
    };

    // Extract back surface
    const backSurface = {
      side: 'back' as const,
      canvas_json: JSON.parse(JSON.stringify(backCanvas.toJSON())),
      variable_mappings: extractVariableMappings(backCanvas),
      thumbnail_url: backCanvas.toDataURL({ format: 'png', quality: 0.8, multiplier: 0.2 }),
      address_block_zone: getAddressBlockZone(currentFormat.id, 'US'),
    };

    // Call onSave with surfaces array
    onSave({
      canvasJSON: JSON.stringify(frontSurface.canvas_json), // Backwards compat
      variableMappings: frontSurface.variable_mappings, // Backwards compat
      preview: frontSurface.thumbnail_url,
      format: currentFormat,
      surfaces: [frontSurface, backSurface], // NEW!
    });

    toast.success('Template saved with custom back page!');
  } catch (error) {
    toast.error('Failed to save template');
  }
}, [frontCanvas, backCanvas, onSave, currentFormat]);
```

---

## ⚠️ RISK ANALYSIS & MITIGATION

### High Risk: Breaking Existing Functionality
**Mitigation**:
- ✅ Keep ALL existing props unchanged
- ✅ Maintain backwards compatibility in save format
- ✅ Only ADD new functionality, don't modify existing
- ✅ Test with existing templates (should work without changes)

### Medium Risk: Event Listeners Conflict
**Mitigation**:
- ✅ Attach listeners to both canvases independently
- ✅ Use closure to capture correct canvas reference
- ✅ Test selection, undo/redo on both sides

### Medium Risk: History State Confusion
**Mitigation**:
- ✅ Maintain separate history stacks for front/back
- OR ✅ Use single history with side identifier
- ✅ Undo/redo only affects active canvas

### Low Risk: Performance (2 Canvases)
**Mitigation**:
- ✅ Only one canvas rendered at a time (CSS display: none)
- ✅ Fabric.js doesn't render hidden canvases
- ✅ No performance impact

---

## 🧪 TESTING STRATEGY

### Unit Tests (Manual)
1. ✅ Create new template → Switch Front/Back tabs → Verify both canvases work
2. ✅ Add objects to Front → Switch to Back → Add different objects → Save
3. ✅ Load saved template → Verify both Front and Back load correctly
4. ✅ Undo/Redo on Front → Switch to Back → Undo/Redo → Verify independence
5. ✅ Address block overlay only shows on Back tab
6. ✅ Save → Check database → Verify `surfaces` array has 2 elements

### Integration Tests
1. ✅ Load existing template (without back) → Should still work
2. ✅ Save existing template → Should not break (backwards compat)
3. ✅ Create campaign with dual-surface template → Generate PDFs → Verify 2 different pages

### E2E Test
1. Create new template
2. Design front page (add text, image, QR code)
3. Switch to Back tab
4. Design back page (add logo, message - avoid address block zone)
5. Save template
6. Load template → Verify both sides preserved
7. Create campaign with 5 recipients
8. Generate → Verify PDFs have custom front AND back
9. Submit to PostGrid → Verify 100% success

---

## 📋 IMPLEMENTATION CHECKLIST

- [ ] Install any new dependencies (none needed - use existing shadcn/ui Tabs)
- [ ] Update `CanvasEditorProps` interface (add `surfaces` to onSave callback)
- [ ] Add state: `activeSide`, `frontCanvas`, `backCanvas`
- [ ] Add refs: `frontCanvasRef`, `backCanvasRef`
- [ ] Update canvas initialization useEffect (create both canvases)
- [ ] Add tab component above canvas area
- [ ] Create `<AddressBlockOverlay>` component
- [ ] Update canvas switching logic (show/hide via CSS)
- [ ] Update save logic (extract both surfaces)
- [ ] Update load logic (apply both surfaces)
- [ ] Update toolbar event handlers (use active canvas)
- [ ] Update PropertyPanel (use active canvas)
- [ ] Update LayersPanel (use active canvas)
- [ ] Test with existing templates
- [ ] Test creating new dual-surface templates
- [ ] Test campaign generation with dual surfaces

---

## 🚀 ROLLOUT PLAN

### Phase 3A: UI Structure (2 hours)
- Add Tabs component
- Add dual canvas refs
- Update state management
- Test tab switching

### Phase 3B: Canvas Logic (2 hours)
- Dual canvas initialization
- Event listener setup
- Canvas switching logic
- Test canvas independence

### Phase 3C: Address Block Overlay (1 hour)
- Create overlay component
- Position calculation
- Conditional rendering
- Test visibility

### Phase 3D: Save/Load (1 hour)
- Update save to export surfaces array
- Update load to apply surfaces
- Backwards compatibility check
- Test with existing templates

### Phase 3E: Testing & Validation (2 hours)
- Manual testing all workflows
- Test backwards compatibility
- Test campaign generation
- Document any issues

---

## ✅ SUCCESS CRITERIA

- [ ] Can switch between Front/Back tabs smoothly
- [ ] Can design different content on Front vs Back
- [ ] Address block overlay visible only on Back tab
- [ ] Both surfaces save correctly to database
- [ ] Both surfaces load correctly when reopening template
- [ ] Existing templates continue working (no back page yet)
- [ ] Campaign generation produces 2-page PDFs with different content
- [ ] PostGrid submissions succeed (100% rate maintained)
- [ ] Zero console errors
- [ ] Zero TypeScript errors

---

**Next Step**: Proceed with Phase 3A implementation (Tabs + State)
