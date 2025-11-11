# Phase 3A Implementation Map

## Current Status
- ✅ Step 1: Tabs + icons imports added
- ✅ Step 2: Dual canvas refs + state added
- ✅ Step 3: Computed canvas pattern implemented
- ⏳ Step 4: Update canvas initialization useEffect (IN PROGRESS)

## Remaining Changes in useEffect (Lines 126-485)

### Section 1: Canvas Creation (DONE ✅)
- ✅ Create fabricFrontCanvas
- ✅ Create fabricBackCanvas

### Section 2: Load Initial Data (TO DO)

**Current Code** (lines 159-187):
```typescript
if (initialData?.canvasJSON) {
  fabricCanvas.loadFromJSON(initialData.canvasJSON, () => {
    // Apply variable mappings...
  });
}
```

**New Code Needed**:
```typescript
// Load FRONT surface (backwards compatible)
const frontData = initialData?.surfaces?.[0]?.canvas_json || initialData?.canvasJSON;
if (frontData) {
  const frontJSON = typeof frontData === 'string' ? frontData : JSON.stringify(frontData);
  fabricFrontCanvas.loadFromJSON(frontJSON, () => {
    // Apply variable mappings from surfaces[0] OR old variableMappings
    const frontMappings = initialData?.surfaces?.[0]?.variable_mappings || initialData?.variableMappings;
    if (frontMappings) {
      applyVariableMappings(fabricFrontCanvas, frontMappings);
    }
  });
}

// Load BACK surface (if exists)
const backData = initialData?.surfaces?.[1]?.canvas_json;
if (backData) {
  const backJSON = typeof backData === 'string' ? backData : JSON.stringify(backData);
  fabricBackCanvas.loadFromJSON(backJSON, () => {
    // Apply variable mappings from surfaces[1]
    const backMappings = initialData?.surfaces?.[1]?.variable_mappings;
    if (backMappings) {
      applyVariableMappings(fabricBackCanvas, backMappings);
    }
  });
}
```

### Section 3: Event Listeners (TO DO)

**Need to apply to BOTH canvases**:
- `object:modified`, `object:added`, `object:removed` → saveToHistory
- `object:scaling` → textbox scaling fix
- `selection:created`, `selection:updated`, `selection:cleared` → setSelectedObject
- `text:changed` → auto-detect variables

**Strategy**: Create helper function to avoid duplication

```typescript
function attachCanvasEventListeners(canvas: Canvas) {
  canvas.on('object:modified', () => saveToHistory(canvas));
  canvas.on('object:added', () => saveToHistory(canvas));
  canvas.on('object:removed', () => saveToHistory(canvas));
  // ... all other events
}

attachCanvasEventListeners(fabricFrontCanvas);
attachCanvasEventListeners(fabricBackCanvas);
```

### Section 4: Set State (TO DO)

**Current** (line 292):
```typescript
setCanvas(fabricCanvas);
```

**New**:
```typescript
setFrontCanvas(fabricFrontCanvas);
setBackCanvas(fabricBackCanvas);
```

### Section 5: Cleanup (TO DO)

**Current** (lines 470-484):
```typescript
return () => {
  clearTimeout(initTimeout);
  if (handleKeyDown) {
    window.removeEventListener('keydown', handleKeyDown);
  }
  try {
    if (fabricCanvas && fabricCanvas.dispose) {
      fabricCanvas.dispose();
    }
  } catch (err) {
    console.warn('Canvas disposal warning:', err);
  }
};
```

**New**:
```typescript
return () => {
  clearTimeout(initTimeout);
  if (handleKeyDown) {
    window.removeEventListener('keydown', handleKeyDown);
  }
  try {
    if (fabricFrontCanvas && fabricFrontCanvas.dispose) {
      fabricFrontCanvas.dispose();
    }
    if (fabricBackCanvas && fabricBackCanvas.dispose) {
      fabricBackCanvas.dispose();
    }
  } catch (err) {
    console.warn('Canvas disposal warning:', err);
  }
};
```

## Keyboard Event Handler (TO DO)

**Current** (lines 294-465):
```typescript
handleKeyDown = (e: KeyboardEvent) => {
  const activeObject = fabricCanvas.getActiveObject();
  // ... uses fabricCanvas
};
```

**New**:
```typescript
handleKeyDown = (e: KeyboardEvent) => {
  // Use the ACTIVE canvas (computed)
  const activeCanvas = activeSide === 'front' ? fabricFrontCanvas : fabricBackCanvas;
  if (!activeCanvas) return;

  const activeObject = activeCanvas.getActiveObject();
  // ... rest of logic uses activeCanvas
};
```

## Next Steps After useEffect Complete

1. Update render section to show BOTH canvas elements
2. Add Tabs UI component
3. Add address block overlay component
4. Update save logic

## Estimated Time
- Complete useEffect updates: 1 hour
- Render + Tabs UI: 30 minutes
- Address block overlay: 30 minutes
- Save logic: 30 minutes
- Testing: 1 hour

**Total: 3.5 hours**

## Safety Checks Before Each Change
- [ ] Read surrounding code carefully
- [ ] Understand all dependencies
- [ ] Make minimal changes
- [ ] Test compilation after each change
- [ ] Keep backwards compatibility
