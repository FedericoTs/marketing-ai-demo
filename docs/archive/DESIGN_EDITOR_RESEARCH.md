# Professional Design Editor UI/UX Research & Implementation Guide

**Research Date**: 2025-10-31
**Purpose**: Build a professional direct mail design platform to compete with Canva
**Technology Stack**: React, TypeScript, Fabric.js v6, Next.js

---

## Executive Summary

This research analyzes professional design editor patterns from Canva, Figma, and other leading tools to build a competitive direct mail design platform. The analysis covers UI architecture, essential features, Fabric.js capabilities, and implementation priorities.

**Key Findings:**
- Fabric.js v6 (2024) provides 60% of needed functionality out-of-the-box
- Modern React patterns with TypeScript enable professional editor architecture
- Several open-source projects provide implementation blueprints
- Missing features require custom implementation (alignment guides, layer panels, property panels)

---

## Table of Contents

1. [UI Layout Architecture](#1-ui-layout-architecture)
2. [Essential Editor Features](#2-essential-editor-features)
3. [Fabric.js Native Capabilities](#3-fabricjs-native-capabilities)
4. [Property Panel Implementation](#4-property-panel-implementation)
5. [Layer Management](#5-layer-management)
6. [Color System](#6-color-system)
7. [Typography Controls](#7-typography-controls)
8. [Object Manipulation](#8-object-manipulation)
9. [Alignment & Distribution](#9-alignment--distribution)
10. [Advanced Features](#10-advanced-features)
11. [Keyboard Shortcuts & UX](#11-keyboard-shortcuts--ux)
12. [NPM Libraries & Tools](#12-npm-libraries--tools)
13. [Implementation Priorities](#13-implementation-priorities)
14. [Open Source Reference Projects](#14-open-source-reference-projects)

---

## 1. UI Layout Architecture

### Professional Editor Layout Pattern

Based on Canva 2024 redesign and Figma's interface:

```
┌─────────────────────────────────────────────────────────────┐
│ Top Menu Bar (File, Edit, View, etc.)                      │
├──────┬──────────────────────────────────────────────┬───────┤
│      │                                              │       │
│ Left │          Main Canvas Area                    │ Right │
│ Side │                                              │ Props │
│ Panel│          (Fabric.js Canvas)                  │ Panel │
│      │                                              │       │
│ Tools│                                              │ Cont- │
│ &    │                                              │ ext   │
│ Temp-│                                              │ Sen-  │
│ lates│                                              │ sitive│
│      │                                              │       │
├──────┴──────────────────────────────────────────────┴───────┤
│ Bottom Panel (Layers, Pages, Timeline - Optional)          │
└─────────────────────────────────────────────────────────────┘
```

### Canva 2024 Design Principles

**Floating Toolbar Approach:**
- Context-sensitive toolbar appears when objects are selected
- Suggests relevant editing options (crop for images, font for text)
- Reduces clutter compared to fixed toolbars

**Collapsible Side Panels:**
- Left panel: Tools, templates, elements, uploads
- Hover to preview, click to pin open
- Gives more space to canvas when collapsed

**Key Recommendations:**
- Use 8px spacing grid for consistency
- Breakpoints: Small (600px), Medium (900px)
- Stack components vertically in narrow panels
- Full-width buttons for better visual balance

### Implementation Complexity: **Medium**
- Layout structure: **Easy** (CSS Grid/Flexbox)
- Responsive panels: **Medium** (React state management)
- Floating toolbar positioning: **Medium** (absolute positioning + selection detection)

---

## 2. Essential Editor Features

Categorized by priority for a professional direct mail editor:

### Phase 1: Core Features (Must-Have)

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Canvas Management** | Create, zoom, pan canvas | Easy |
| **Object Selection** | Click to select, multi-select with Ctrl/Cmd | Easy |
| **Basic Shapes** | Rectangle, circle, line, polygon | Easy |
| **Text Objects** | Add text, edit inline | Easy |
| **Image Upload** | Drag-drop or browse to upload | Medium |
| **Delete Objects** | Delete key or button | Easy |
| **Undo/Redo** | Ctrl+Z/Ctrl+Y history management | Medium |
| **Copy/Paste** | Ctrl+C/Ctrl+V clipboard | Medium |
| **Basic Properties** | Color, size, position | Easy |
| **Save/Export** | JSON save, PNG/PDF export | Medium |
| **Layer Ordering** | Bring front, send back | Easy |

### Phase 2: Professional Features (Important)

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Layer Panel** | Visual hierarchy with thumbnails | Medium |
| **Property Panel** | Context-sensitive controls | Medium |
| **Alignment Tools** | Align left/center/right/top/middle/bottom | Medium |
| **Smart Guides** | Snapping guides when aligning | Hard |
| **Grid & Rulers** | Visual measurement aids | Medium |
| **Grouping** | Group/ungroup objects | Easy |
| **Locking** | Lock objects to prevent editing | Easy |
| **Opacity Control** | Transparency slider | Easy |
| **Font Selector** | Google Fonts integration | Medium |
| **Color Picker** | Hex, RGB, HSL, eyedropper | Easy |
| **Shadows** | Drop shadow effects | Easy |
| **Gradients** | Linear/radial gradients | Medium |

### Phase 3: Advanced Features (Nice-to-Have)

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Filters** | Blur, brightness, contrast | Medium |
| **Blending Modes** | Multiply, screen, overlay | Medium |
| **Masking** | Image masks and clipping | Hard |
| **Distribution** | Evenly space objects | Medium |
| **Templates** | Pre-built design templates | Easy |
| **Element Library** | Stock shapes, icons, illustrations | Medium |
| **Auto-save** | Periodic JSON state saving | Easy |
| **Collaboration** | Real-time multi-user (future) | Very Hard |
| **Animation** | Object animations (future) | Hard |
| **3D Objects** | 3D shapes (future) | Very Hard |

---

## 3. Fabric.js Native Capabilities

### What Fabric.js v6 Provides Out-of-the-Box

#### ✅ **Native Support (60% of Features)**

1. **Canvas Management**
   - Create canvas: `new fabric.Canvas('canvasId')`
   - Zoom: `canvas.setZoom(level)`
   - Pan: `canvas.relativePan({ x, y })`
   - Clear: `canvas.clear()`

2. **Object Creation**
   - Shapes: `fabric.Rect`, `fabric.Circle`, `fabric.Triangle`, `fabric.Polygon`
   - Text: `fabric.Text`, `fabric.Textbox`, `fabric.IText`
   - Images: `fabric.Image.fromURL()`
   - Lines: `fabric.Line`, `fabric.Path`

3. **Object Manipulation**
   - Selection: Built-in click and drag-select
   - Transform controls: Scale, rotate, skew (customizable)
   - Properties: `fill`, `stroke`, `strokeWidth`, `opacity`
   - Position: `left`, `top`, `angle`, `scaleX`, `scaleY`

4. **Layer Control**
   - `canvas.sendBackwards(obj)`
   - `canvas.sendToBack(obj)`
   - `canvas.bringForward(obj)`
   - `canvas.bringToFront(obj)`
   - `canvas.insertAt(obj, index)`

5. **Grouping**
   - `new fabric.Group([obj1, obj2])`
   - Group objects act as single entity

6. **Events**
   - `object:modified`, `object:added`, `object:removed`
   - `object:moving`, `object:scaling`, `object:rotating`
   - `selection:created`, `selection:updated`, `selection:cleared`
   - `mouse:down`, `mouse:move`, `mouse:up`

7. **Serialization**
   - `canvas.toJSON()` - Export state
   - `canvas.loadFromJSON(json)` - Restore state
   - `canvas.toSVG()` - Export as SVG
   - `canvas.toDataURL()` - Export as image

8. **Effects**
   - Shadows: `new fabric.Shadow({ color, blur, offsetX, offsetY })`
   - Filters: `fabric.Image.filters.Blur`, `Brightness`, `Contrast`, etc.

9. **TypeScript Support (v6)**
   - Built-in type definitions
   - Better IDE autocomplete
   - Modular imports: `import { Canvas, Rect } from 'fabric'`

#### ❌ **Custom Implementation Required (40% of Features)**

1. **UI Components**
   - Toolbar buttons
   - Property panels
   - Layer panel
   - Color picker
   - Font selector
   - File upload dialog

2. **Advanced Interactions**
   - Alignment guides (smart snapping)
   - Distribution tools
   - Keyboard shortcuts
   - Undo/redo history
   - Copy/paste clipboard

3. **Design Tools**
   - Rulers and measurements
   - Grid overlay
   - Snap-to-grid
   - Guideline creation
   - Multi-select operations

4. **Data Management**
   - Template library
   - Asset management
   - Auto-save system
   - Export workflows

---

## 4. Property Panel Implementation

### Context-Sensitive Property Panel Pattern

**Concept**: Show different controls based on selected object type

```typescript
// Example React component structure
function PropertyPanel({ selectedObject }) {
  if (!selectedObject) return <NoSelection />;

  const objectType = selectedObject.type;

  return (
    <div className="property-panel">
      {/* Common properties for all objects */}
      <PositionControls object={selectedObject} />
      <SizeControls object={selectedObject} />
      <OpacitySlider object={selectedObject} />

      {/* Type-specific properties */}
      {objectType === 'rect' && <RectProperties object={selectedObject} />}
      {objectType === 'circle' && <CircleProperties object={selectedObject} />}
      {objectType === 'text' && <TextProperties object={selectedObject} />}
      {objectType === 'image' && <ImageProperties object={selectedObject} />}

      {/* Advanced properties */}
      <ShadowControls object={selectedObject} />
      <EffectsControls object={selectedObject} />
    </div>
  );
}
```

### Property Categories

#### 1. **Common Properties (All Objects)**
- Position (X, Y)
- Size (Width, Height)
- Rotation (Angle)
- Opacity (0-100%)
- Lock/Unlock
- Layer order controls

#### 2. **Shape Properties (Rect, Circle, etc.)**
- Fill color
- Stroke color
- Stroke width
- Border radius (rounded corners)

#### 3. **Text Properties**
- Font family
- Font size
- Font weight (bold, normal)
- Font style (italic)
- Text align (left, center, right, justify)
- Line height
- Letter spacing
- Text decoration (underline, strikethrough)
- Text color

#### 4. **Image Properties**
- Filters (brightness, contrast, saturation, blur)
- Crop tool
- Replace image
- Flip horizontal/vertical
- Original size reset

#### 5. **Advanced Properties**
- Shadow (color, blur, offset X/Y)
- Blending mode
- Gradient fill
- Border style (dashed, dotted)

### Implementation Complexity: **Medium**
- React component structure: **Easy**
- Binding to Fabric.js objects: **Medium**
- Real-time updates: **Medium** (event listeners)

---

## 5. Layer Management

### Professional Layer Panel Features

#### Essential Features:
1. **Visual Hierarchy**
   - Tree structure showing object nesting
   - Thumbnails for visual identification
   - Object names (editable)

2. **Layer Controls**
   - Visibility toggle (eye icon)
   - Lock toggle (lock icon)
   - Delete layer
   - Duplicate layer

3. **Drag & Drop Reordering**
   - Drag layers up/down to change z-index
   - Drag into groups for nesting

4. **Multi-Select**
   - Ctrl+Click for multiple layers
   - Shift+Click for range selection

### Fabric.js Layer Management

**Z-Index in Fabric.js:**
- Fabric doesn't use CSS z-index
- Objects stored in array (index = stack order)
- Lower index = behind, higher index = front

**Key Methods:**
```javascript
// Get z-index
const index = canvas.getObjects().indexOf(object);

// Change order
canvas.sendBackwards(object);
canvas.sendToBack(object);
canvas.bringForward(object);
canvas.bringToFront(object);

// Specific index
canvas.insertAt(object, newIndex);

// Preserve stacking when selecting
const canvas = new fabric.Canvas('canvas', {
  preserveObjectStacking: true
});
```

**Known Issues:**
- Z-index methods don't work well inside groups
- Nested groups have stacking quirks
- Workaround: Use `moveTo(index)` for groups

### Implementation Example

```typescript
// React Layer Panel Component
function LayerPanel({ canvas }) {
  const [layers, setLayers] = useState([]);

  useEffect(() => {
    if (!canvas) return;

    const updateLayers = () => {
      const objects = canvas.getObjects();
      setLayers(objects.map((obj, index) => ({
        id: obj.id || index,
        type: obj.type,
        name: obj.name || `${obj.type} ${index}`,
        visible: obj.visible,
        locked: obj.selectable === false,
        thumbnail: generateThumbnail(obj),
        zIndex: index
      })));
    };

    canvas.on('object:added', updateLayers);
    canvas.on('object:removed', updateLayers);
    canvas.on('object:modified', updateLayers);

    updateLayers();

    return () => {
      canvas.off('object:added', updateLayers);
      canvas.off('object:removed', updateLayers);
      canvas.off('object:modified', updateLayers);
    };
  }, [canvas]);

  const handleReorder = (fromIndex, toIndex) => {
    const objects = canvas.getObjects();
    const obj = objects[fromIndex];
    canvas.moveTo(obj, toIndex);
    canvas.renderAll();
  };

  const toggleVisibility = (layer) => {
    const obj = canvas.getObjects()[layer.zIndex];
    obj.set('visible', !obj.visible);
    canvas.renderAll();
  };

  const toggleLock = (layer) => {
    const obj = canvas.getObjects()[layer.zIndex];
    obj.set('selectable', !obj.selectable);
    canvas.renderAll();
  };

  return (
    <div className="layer-panel">
      {layers.map((layer) => (
        <LayerItem
          key={layer.id}
          layer={layer}
          onToggleVisibility={toggleVisibility}
          onToggleLock={toggleLock}
          onReorder={handleReorder}
        />
      ))}
    </div>
  );
}
```

### Implementation Complexity: **Medium**
- Basic list display: **Easy**
- Drag & drop reordering: **Medium** (use react-beautiful-dnd)
- Thumbnail generation: **Medium** (canvas.toDataURL for each object)
- Nested groups visualization: **Hard**

---

## 6. Color System

### Professional Color Picker Requirements

#### Essential Features:
1. **Color Input Methods**
   - Visual picker (hue, saturation, lightness)
   - Hex input (#FF0000)
   - RGB sliders (0-255)
   - HSL sliders (0-360, 0-100%, 0-100%)
   - Opacity/Alpha slider

2. **Color Presets**
   - Recent colors
   - Brand colors (from settings)
   - Predefined color palettes

3. **Advanced Features**
   - Eyedropper (pick from canvas)
   - Gradient builder (linear, radial)
   - Color history

### Fabric.js Color Support

**Native Color API:**
```javascript
// Solid colors
obj.set('fill', '#FF0000');
obj.set('fill', 'rgb(255, 0, 0)');
obj.set('fill', 'rgba(255, 0, 0, 0.5)');

// Gradients
const gradient = new fabric.Gradient({
  type: 'linear',
  gradientUnits: 'pixels',
  coords: { x1: 0, y1: 0, x2: 100, y2: 0 },
  colorStops: [
    { offset: 0, color: '#FF0000' },
    { offset: 1, color: '#0000FF' }
  ]
});
obj.set('fill', gradient);

// Color class
const color = new fabric.Color('#FF0000');
color.toRgb(); // "rgb(255,0,0)"
color.toRgba(); // "rgba(255,0,0,1)"
color.toHex(); // "FF0000"
```

### Recommended NPM Packages

#### 1. **react-colorful** (Recommended)
- Lightweight (2.8 KB)
- No dependencies
- Fast performance
- Supports Hex, RGB, HSL, HSV

```bash
npm install react-colorful
```

```typescript
import { HexColorPicker } from 'react-colorful';

function ColorPicker({ color, onChange }) {
  return <HexColorPicker color={color} onChange={onChange} />;
}
```

#### 2. **react-color** (Full-featured)
- Multiple picker styles (Sketch, Chrome, Photoshop)
- 13 KB (larger but more features)

```bash
npm install react-color
```

```typescript
import { SketchPicker } from 'react-color';

function ColorPicker({ color, onChange }) {
  return <SketchPicker color={color} onChangeComplete={onChange} />;
}
```

#### 3. **Eyedropper Implementation**
Custom implementation using canvas pixel reading:

```typescript
function useEyedropper(canvas: fabric.Canvas) {
  const pickColor = (event: MouseEvent) => {
    const pointer = canvas.getPointer(event);
    const ctx = canvas.getContext();
    const imageData = ctx.getImageData(pointer.x, pointer.y, 1, 1);
    const [r, g, b, a] = imageData.data;
    return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
  };

  return pickColor;
}
```

### Implementation Complexity: **Easy**
- Color picker integration: **Easy** (use library)
- Gradient builder UI: **Medium**
- Eyedropper tool: **Medium** (canvas pixel reading)

---

## 7. Typography Controls

### Professional Font Selector Requirements

#### Essential Features:
1. **Font Family Selector**
   - Search/filter fonts
   - Font previews (WYSIWYG)
   - Recent fonts
   - Favorite fonts
   - Font categories (serif, sans-serif, monospace)

2. **Text Formatting**
   - Font size (dropdown + input)
   - Font weight (100-900, bold)
   - Font style (italic)
   - Text decoration (underline, strikethrough)
   - Text transform (uppercase, lowercase, capitalize)

3. **Advanced Typography**
   - Line height (leading)
   - Letter spacing (tracking)
   - Text alignment (left, center, right, justify)
   - Vertical alignment (top, middle, bottom)

### Fabric.js Text Support

**Text Objects:**
```javascript
// Simple text (fixed size)
const text = new fabric.Text('Hello World', {
  fontFamily: 'Arial',
  fontSize: 24,
  fontWeight: 'bold',
  fontStyle: 'italic',
  fill: '#000000',
  textAlign: 'center',
  underline: true,
  linethrough: false,
  textBackgroundColor: '#FFFF00'
});

// Textbox (wrappable)
const textbox = new fabric.Textbox('Hello World', {
  width: 200,
  fontSize: 18,
  textAlign: 'left'
});

// IText (editable)
const itext = new fabric.IText('Editable text', {
  fontSize: 20,
  editable: true
});

canvas.add(text);
```

**Advanced Properties:**
```javascript
text.set({
  lineHeight: 1.5,        // Line spacing
  charSpacing: 100,       // Letter spacing (in 1/1000 em)
  textAlign: 'justify',   // Alignment
  fontFamily: 'Roboto',   // Font family
  fontWeight: 700,        // Font weight
  shadow: new fabric.Shadow({ color: '#000', blur: 5 })
});
```

### Google Fonts Integration

#### Option 1: **fontsource** (Self-hosted)
```bash
npm install @fontsource/roboto @fontsource/open-sans
```

```typescript
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/700.css';

// Use in Fabric.js
const text = new fabric.Text('Hello', { fontFamily: 'Roboto' });
```

#### Option 2: **Google Fonts API** (CDN)
```typescript
// Load font dynamically
function loadGoogleFont(fontName: string) {
  const link = document.createElement('link');
  link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;700&display=swap`;
  link.rel = 'stylesheet';
  document.head.appendChild(link);
}

// Use after loading
loadGoogleFont('Roboto');
setTimeout(() => {
  const text = new fabric.Text('Hello', { fontFamily: 'Roboto' });
  canvas.add(text);
}, 500); // Wait for font to load
```

#### Option 3: **react-font-picker**
```bash
npm install font-picker-react
```

```typescript
import FontPicker from 'font-picker-react';

function FontSelector({ activeFontFamily, onChange }) {
  return (
    <FontPicker
      apiKey={process.env.NEXT_PUBLIC_GOOGLE_FONTS_API_KEY}
      activeFontFamily={activeFontFamily}
      onChange={(nextFont) => onChange(nextFont.family)}
    />
  );
}
```

### Implementation Complexity: **Medium**
- Basic font dropdown: **Easy**
- Google Fonts integration: **Medium** (async loading)
- Font preview in dropdown: **Medium** (custom select component)
- Advanced typography controls: **Easy** (sliders + inputs)

---

## 8. Object Manipulation

### Essential Manipulation Features

#### 1. **Transform Controls**
Fabric.js provides built-in controls:
- **Scale**: Corner handles
- **Rotate**: Top-center rotating handle
- **Skew**: Side handles (optional)

**Customization:**
```javascript
// Customize controls
fabric.Object.prototype.set({
  borderColor: '#2196F3',
  cornerColor: '#FFF',
  cornerStrokeColor: '#2196F3',
  transparentCorners: false,
  cornerSize: 12,
  cornerStyle: 'circle'
});

// Disable specific controls
obj.setControlsVisibility({
  mt: false, // middle-top
  mb: false, // middle-bottom
  ml: false, // middle-left
  mr: false  // middle-right
});
```

#### 2. **Rotation**
```javascript
// Set rotation
obj.set('angle', 45);

// Rotate by delta
obj.rotate(obj.angle + 15);

// Set rotation point
obj.set('originX', 'center');
obj.set('originY', 'center');

canvas.renderAll();
```

#### 3. **Scaling**
```javascript
// Uniform scale
obj.scale(1.5);

// Non-uniform scale
obj.set({
  scaleX: 2,
  scaleY: 1.5
});

// Get actual size after scaling
const width = obj.width * obj.scaleX;
const height = obj.height * obj.scaleY;
```

#### 4. **Locking**
```javascript
// Lock position
obj.set({
  lockMovementX: true,
  lockMovementY: true
});

// Lock scaling
obj.set({
  lockScalingX: true,
  lockScalingY: true
});

// Lock rotation
obj.set('lockRotation', true);

// Lock everything (non-selectable)
obj.set('selectable', false);
obj.set('evented', false);
```

#### 5. **Grouping**
```javascript
// Create group
const group = new fabric.Group([obj1, obj2, obj3], {
  left: 100,
  top: 100
});
canvas.add(group);

// Ungroup
group.toActiveSelection(); // Convert to active selection
canvas.discardActiveObject(); // Deselect
canvas.renderAll();

// Get group items
const items = group.getObjects();
```

#### 6. **Duplication**
```javascript
// Clone object
obj.clone((cloned) => {
  cloned.set({
    left: obj.left + 10,
    top: obj.top + 10
  });
  canvas.add(cloned);
  canvas.setActiveObject(cloned);
  canvas.renderAll();
});
```

#### 7. **Flipping**
```javascript
// Flip horizontal
obj.set('flipX', !obj.flipX);

// Flip vertical
obj.set('flipY', !obj.flipY);

canvas.renderAll();
```

### Implementation Complexity: **Easy to Medium**
- Built-in transform controls: **Easy** (Fabric.js native)
- Custom control styling: **Easy**
- Grouping UI: **Medium** (multi-select detection)
- Lock/unlock UI: **Easy**

---

## 9. Alignment & Distribution

### Alignment Tools

#### Essential Alignment Options:
1. **Horizontal Alignment**
   - Align Left
   - Align Center
   - Align Right

2. **Vertical Alignment**
   - Align Top
   - Align Middle
   - Align Bottom

3. **Distribution** (Multiple objects)
   - Distribute Horizontally
   - Distribute Vertically

### Implementation

```typescript
// Alignment helper functions
function alignObjects(canvas: fabric.Canvas, alignment: string) {
  const activeObjects = canvas.getActiveObjects();
  if (activeObjects.length < 2) return;

  // Get bounding box of all selected objects
  const selection = canvas.getActiveObject();
  const selectionBounds = selection.getBoundingRect();

  activeObjects.forEach((obj) => {
    const objBounds = obj.getBoundingRect();

    switch (alignment) {
      case 'left':
        obj.set('left', selectionBounds.left - (objBounds.width / 2));
        break;
      case 'center':
        obj.set('left', selectionBounds.left + (selectionBounds.width / 2));
        break;
      case 'right':
        obj.set('left', selectionBounds.left + selectionBounds.width - (objBounds.width / 2));
        break;
      case 'top':
        obj.set('top', selectionBounds.top - (objBounds.height / 2));
        break;
      case 'middle':
        obj.set('top', selectionBounds.top + (selectionBounds.height / 2));
        break;
      case 'bottom':
        obj.set('top', selectionBounds.top + selectionBounds.height - (objBounds.height / 2));
        break;
    }

    obj.setCoords();
  });

  canvas.renderAll();
}

// Distribution helper
function distributeObjects(canvas: fabric.Canvas, direction: 'horizontal' | 'vertical') {
  const activeObjects = canvas.getActiveObjects();
  if (activeObjects.length < 3) return;

  // Sort by position
  const sorted = [...activeObjects].sort((a, b) => {
    const posA = direction === 'horizontal' ? a.left : a.top;
    const posB = direction === 'horizontal' ? b.left : b.top;
    return posA - posB;
  });

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const totalGap = direction === 'horizontal'
    ? last.left - first.left
    : last.top - first.top;

  const gap = totalGap / (sorted.length - 1);

  sorted.forEach((obj, index) => {
    if (index === 0 || index === sorted.length - 1) return;

    if (direction === 'horizontal') {
      obj.set('left', first.left + gap * index);
    } else {
      obj.set('top', first.top + gap * index);
    }

    obj.setCoords();
  });

  canvas.renderAll();
}
```

### Smart Guides & Snapping

**Implementation Pattern:**
Smart guides show temporary lines when objects align with other objects or canvas center.

```typescript
// SnappyRect implementation (from research)
class SnappyRect extends fabric.Rect {
  // Add guide lines for snapping
  guides = {
    top: null,
    bottom: null,
    left: null,
    right: null,
    centerX: null,
    centerY: null
  };

  // Update guides during movement
  onMoving(e) {
    const snapDistance = 5; // pixels
    const canvasObjects = this.canvas.getObjects();

    canvasObjects.forEach((obj) => {
      if (obj === this) return;

      // Check horizontal alignment
      if (Math.abs(this.left - obj.left) < snapDistance) {
        this.set('left', obj.left);
        this.showGuide('vertical', obj.left);
      }

      // Check vertical alignment
      if (Math.abs(this.top - obj.top) < snapDistance) {
        this.set('top', obj.top);
        this.showGuide('horizontal', obj.top);
      }

      // Additional center, edge checks...
    });
  }

  showGuide(direction, position) {
    // Draw temporary line
    const line = new fabric.Line([...], {
      stroke: '#FF00FF',
      strokeWidth: 1,
      selectable: false,
      evented: false
    });
    this.canvas.add(line);
    setTimeout(() => this.canvas.remove(line), 500);
  }
}
```

**Snap to Grid:**
```typescript
// Grid snapping
function snapToGrid(value: number, gridSize: number = 10): number {
  return Math.round(value / gridSize) * gridSize;
}

canvas.on('object:moving', (e) => {
  const obj = e.target;
  obj.set({
    left: snapToGrid(obj.left),
    top: snapToGrid(obj.top)
  });
});
```

### Resources:
- **SnappyRect Class**: HackerNoon article with full implementation
- **Aligning Guidelines (v6)**: `initAligningGuidelines(canvas)` - Fabric.js v6 feature
- **Grid Examples**: JSFiddle demos available

### Implementation Complexity: **Medium to Hard**
- Basic alignment functions: **Medium**
- Distribution: **Medium**
- Snap to grid: **Easy**
- Smart guides: **Hard** (complex geometry calculations)

---

## 10. Advanced Features

### Shadows & Effects

#### Shadows
```javascript
// Create shadow
const shadow = new fabric.Shadow({
  color: 'rgba(0, 0, 0, 0.3)',
  blur: 20,
  offsetX: 10,
  offsetY: 10
});

obj.set('shadow', shadow);
canvas.renderAll();
```

**UI Implementation:**
```typescript
function ShadowControls({ object, canvas }) {
  const [shadow, setShadow] = useState({
    color: 'rgba(0, 0, 0, 0.3)',
    blur: 10,
    offsetX: 5,
    offsetY: 5
  });

  const updateShadow = (key, value) => {
    const newShadow = { ...shadow, [key]: value };
    setShadow(newShadow);

    object.set('shadow', new fabric.Shadow(newShadow));
    canvas.renderAll();
  };

  return (
    <div>
      <ColorPicker value={shadow.color} onChange={(c) => updateShadow('color', c)} />
      <Slider label="Blur" value={shadow.blur} onChange={(v) => updateShadow('blur', v)} />
      <Slider label="Offset X" value={shadow.offsetX} onChange={(v) => updateShadow('offsetX', v)} />
      <Slider label="Offset Y" value={shadow.offsetY} onChange={(v) => updateShadow('offsetY', v)} />
    </div>
  );
}
```

**Implementation Complexity: Easy**

---

### Image Filters

Fabric.js includes many built-in filters:

```javascript
// Available filters
const filters = [
  new fabric.Image.filters.Blur({ blur: 0.5 }),
  new fabric.Image.filters.Brightness({ brightness: 0.2 }),
  new fabric.Image.filters.Contrast({ contrast: 0.3 }),
  new fabric.Image.filters.Saturation({ saturation: -0.5 }),
  new fabric.Image.filters.Grayscale(),
  new fabric.Image.filters.Sepia(),
  new fabric.Image.filters.Invert(),
  new fabric.Image.filters.Pixelate({ blocksize: 10 }),
  new fabric.Image.filters.Noise({ noise: 100 }),
  new fabric.Image.filters.Gamma({ gamma: [1, 0.5, 2.1] }),
  new fabric.Image.filters.HueRotation({ rotation: 0.5 }),
  new fabric.Image.filters.Vibrance({ vibrance: 0.5 })
];

// Apply filter
image.filters.push(new fabric.Image.filters.Blur({ blur: 0.5 }));
image.applyFilters();
canvas.renderAll();

// Remove all filters
image.filters = [];
image.applyFilters();
canvas.renderAll();
```

**Note**: Blur value is in percentage (0-1) relative to image dimensions.

**Implementation Complexity: Medium**
- Applying filters: **Easy**
- Filter UI controls: **Medium** (sliders for each filter)
- Preview system: **Medium** (real-time rendering)

---

### Gradients

```javascript
// Linear gradient
const gradient = new fabric.Gradient({
  type: 'linear',
  gradientUnits: 'pixels',
  coords: { x1: 0, y1: 0, x2: 200, y2: 0 },
  colorStops: [
    { offset: 0, color: '#FF0000' },
    { offset: 0.5, color: '#FFFF00' },
    { offset: 1, color: '#0000FF' }
  ]
});

rect.set('fill', gradient);

// Radial gradient
const radialGradient = new fabric.Gradient({
  type: 'radial',
  gradientUnits: 'pixels',
  coords: {
    x1: 100, y1: 100, r1: 0,
    x2: 100, y2: 100, r2: 100
  },
  colorStops: [
    { offset: 0, color: '#FF0000' },
    { offset: 1, color: '#0000FF' }
  ]
});
```

**Gradient Builder UI:**
- Visual gradient preview
- Color stop editor (add/remove/reorder stops)
- Angle control for linear gradients
- Center point control for radial gradients

**Implementation Complexity: Medium**

---

### Blending Modes

```javascript
// Set blend mode
obj.set('globalCompositeOperation', 'multiply');

// Available blend modes
const blendModes = [
  'source-over',    // Normal (default)
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity'
];
```

**Implementation Complexity: Easy**

---

### Opacity

```javascript
// Set opacity (0-1)
obj.set('opacity', 0.5);

// UI: Slider from 0-100%
<Slider
  value={obj.opacity * 100}
  onChange={(v) => {
    obj.set('opacity', v / 100);
    canvas.renderAll();
  }}
/>
```

**Implementation Complexity: Easy**

---

### Masking & Clipping

```javascript
// Clip object to shape
obj.clipPath = new fabric.Circle({
  radius: 50,
  top: 0,
  left: 0
});

// Complex clip path
const clipPath = new fabric.Path('M 0 0 L 100 0 L 100 100 L 0 100 z');
obj.clipPath = clipPath;

canvas.renderAll();
```

**Implementation Complexity: Hard**
- Requires understanding of paths and clipping
- UI for defining clip regions is complex

---

## 11. Keyboard Shortcuts & UX

### Essential Keyboard Shortcuts

| Shortcut | Action | Implementation |
|----------|--------|----------------|
| **Ctrl+Z** | Undo | History stack pop |
| **Ctrl+Y** | Redo | History stack push |
| **Ctrl+C** | Copy | Clone to clipboard |
| **Ctrl+V** | Paste | Add from clipboard |
| **Ctrl+X** | Cut | Copy + Delete |
| **Delete** | Delete object | Remove from canvas |
| **Ctrl+A** | Select all | Multi-select |
| **Ctrl+D** | Duplicate | Clone + offset |
| **Ctrl+G** | Group | Create group |
| **Ctrl+Shift+G** | Ungroup | Break group |
| **Arrow keys** | Nudge object | Move 1px |
| **Shift+Arrow** | Nudge 10px | Move 10px |
| **Ctrl+S** | Save | Export JSON |
| **Escape** | Deselect | Clear selection |

### Undo/Redo Implementation

```typescript
// History manager
class HistoryManager {
  private stack: string[] = [];
  private currentIndex = -1;
  private maxHistory = 50;

  constructor(private canvas: fabric.Canvas) {
    this.saveState();

    // Auto-save on changes
    canvas.on('object:modified', () => this.saveState());
    canvas.on('object:added', () => this.saveState());
    canvas.on('object:removed', () => this.saveState());
  }

  saveState() {
    // Remove future states if we're in the middle of history
    this.stack = this.stack.slice(0, this.currentIndex + 1);

    // Add new state
    const json = JSON.stringify(this.canvas.toJSON());
    this.stack.push(json);

    // Limit history size
    if (this.stack.length > this.maxHistory) {
      this.stack.shift();
    } else {
      this.currentIndex++;
    }
  }

  undo() {
    if (this.currentIndex <= 0) return;

    this.currentIndex--;
    this.loadState(this.stack[this.currentIndex]);
  }

  redo() {
    if (this.currentIndex >= this.stack.length - 1) return;

    this.currentIndex++;
    this.loadState(this.stack[this.currentIndex]);
  }

  private loadState(json: string) {
    this.canvas.loadFromJSON(json, () => {
      this.canvas.renderAll();
    });
  }
}

// Usage
const history = new HistoryManager(canvas);

// Keyboard handler
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'z') {
    e.preventDefault();
    history.undo();
  }
  if (e.ctrlKey && e.key === 'y') {
    e.preventDefault();
    history.redo();
  }
});
```

### Copy/Paste Implementation

```typescript
// Clipboard manager
let clipboard: fabric.Object | null = null;

function copyObject(canvas: fabric.Canvas) {
  const activeObject = canvas.getActiveObject();
  if (!activeObject) return;

  activeObject.clone((cloned: fabric.Object) => {
    clipboard = cloned;
  });
}

function pasteObject(canvas: fabric.Canvas) {
  if (!clipboard) return;

  clipboard.clone((clonedObj: fabric.Object) => {
    canvas.discardActiveObject();
    clonedObj.set({
      left: clonedObj.left + 10,
      top: clonedObj.top + 10,
      evented: true,
    });

    if (clonedObj.type === 'activeSelection') {
      // Handle multi-select paste
      clonedObj.canvas = canvas;
      clonedObj.forEachObject((obj: fabric.Object) => {
        canvas.add(obj);
      });
      clonedObj.setCoords();
    } else {
      canvas.add(clonedObj);
    }

    clipboard.top += 10;
    clipboard.left += 10;
    canvas.setActiveObject(clonedObj);
    canvas.requestRenderAll();
  });
}

// Keyboard handler
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'c') {
    e.preventDefault();
    copyObject(canvas);
  }
  if (e.ctrlKey && e.key === 'v') {
    e.preventDefault();
    pasteObject(canvas);
  }
  if (e.ctrlKey && e.key === 'x') {
    e.preventDefault();
    copyObject(canvas);
    canvas.remove(canvas.getActiveObject());
  }
});
```

### Implementation Resources:
- **Full Tutorial**: "Drawing with FabricJS and TypeScript Part 8: Cut/Copy/Paste and Hotkeys"
- **JSFiddle Examples**: Working undo/redo implementations
- **Medium Articles**: Fabric.js history operations guides

### Implementation Complexity: **Medium**
- Keyboard event handling: **Easy**
- Undo/redo stack: **Medium** (JSON serialization)
- Copy/paste: **Medium** (object cloning)
- Multi-select operations: **Medium**

---

## 12. NPM Libraries & Tools

### Essential NPM Packages

#### **Core Libraries**

| Package | Purpose | Size | Stars | Notes |
|---------|---------|------|-------|-------|
| **fabric** | Canvas library | 500 KB | 28.8k | Core dependency (v6 recommended) |
| **react** | UI framework | - | 228k | Required for editor UI |
| **typescript** | Type safety | - | 100k | Recommended for large projects |

#### **Color Pickers**

| Package | Purpose | Size | Stars | Notes |
|---------|---------|------|-------|-------|
| **react-colorful** | Color picker | 2.8 KB | 3.2k | Lightweight, fast (RECOMMENDED) |
| **react-color** | Color picker | 13 KB | 12.3k | Full-featured, multiple styles |

```bash
# Recommended
npm install react-colorful

# Alternative
npm install react-color
```

#### **Font Selectors**

| Package | Purpose | Size | Stars | Notes |
|---------|---------|------|-------|-------|
| **font-picker-react** | Google Fonts picker | 5 KB | 171 | Easy integration |
| **@fontsource/[font]** | Self-hosted fonts | Varies | - | Individual font packages |

```bash
npm install font-picker-react

# Or self-hosted
npm install @fontsource/roboto @fontsource/open-sans
```

#### **UI Components**

| Package | Purpose | Size | Stars | Notes |
|---------|---------|------|-------|-------|
| **@radix-ui/react-***| Headless UI primitives | Small | 16k+ | shadcn/ui foundation |
| **react-beautiful-dnd** | Drag & drop | 40 KB | 33.3k | Layer panel reordering |
| **@dnd-kit/core** | Drag & drop | 28 KB | 12.4k | Modern alternative to react-beautiful-dnd |

```bash
# Already using shadcn/ui (Radix UI)
# Add drag & drop
npm install react-beautiful-dnd
npm install @types/react-beautiful-dnd
```

#### **Utilities**

| Package | Purpose | Size | Stars | Notes |
|---------|---------|------|-------|-------|
| **nanoid** | ID generation | 130 B | 24.3k | For object IDs |
| **file-saver** | Save files | 5 KB | 21.6k | Export downloads |
| **jszip** | ZIP creation | 100 KB | 10k | Batch export |

```bash
npm install nanoid file-saver jszip
npm install @types/file-saver
```

#### **Export/Import**

| Package | Purpose | Size | Stars | Notes |
|---------|---------|------|-------|-------|
| **jspdf** | PDF generation | 200 KB | 29.3k | Alternative to html2canvas |
| **html2canvas** | HTML to canvas | 150 KB | 30.5k | Screenshot export |

```bash
npm install jspdf html2canvas
```

---

### Recommended Tech Stack for Direct Mail Editor

```bash
# Core dependencies
npm install fabric@latest
npm install react react-dom
npm install typescript @types/react @types/react-dom

# UI framework (already using)
# npm install next@15.5.4

# Color picker
npm install react-colorful

# Font selector
npm install font-picker-react

# Drag & drop (for layers panel)
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# File handling
npm install nanoid file-saver jszip
npm install @types/file-saver

# Export
npm install jspdf html2canvas

# Already have shadcn/ui components
# Already have Tailwind CSS v4
```

**Total bundle size estimate**: ~1.2 MB (before tree-shaking and compression)

---

## 13. Implementation Priorities

### Phase 1: Core Editor Foundation (Week 1-2)
**Goal**: Basic functional editor with essential features

#### Tasks:
- [ ] **Canvas Setup** (Day 1)
  - Initialize Fabric.js v6 canvas
  - Responsive canvas sizing
  - Zoom and pan controls
  - Canvas background color/image

- [ ] **Basic Shapes** (Day 1-2)
  - Add rectangle, circle, triangle tools
  - Basic shape properties (fill, stroke)
  - Selection and transform controls

- [ ] **Text Tool** (Day 2)
  - Add text object (IText for editing)
  - Font family selector (5-10 basic fonts)
  - Font size, color, alignment

- [ ] **Image Upload** (Day 3)
  - Drag-drop or browse upload
  - Image positioning and scaling
  - Basic image properties

- [ ] **Layer Control** (Day 3-4)
  - Bring to front / Send to back buttons
  - Delete object
  - Lock/unlock object

- [ ] **Save/Load** (Day 4)
  - Export canvas to JSON
  - Load JSON state
  - localStorage persistence

- [ ] **Export** (Day 5)
  - Export to PNG (300 DPI for print)
  - Export to PDF
  - Export to SVG

**Success Criteria**: Can create a simple direct mail design with text, shapes, and images

**Complexity**: **Easy to Medium**

---

### Phase 2: Professional Controls (Week 3-4)
**Goal**: Add professional-grade editing tools

#### Tasks:
- [ ] **Property Panel** (Day 6-7)
  - Context-sensitive property display
  - Position inputs (X, Y)
  - Size inputs (Width, Height)
  - Rotation input
  - Opacity slider

- [ ] **Advanced Color Picker** (Day 7)
  - Integrate react-colorful
  - Recent colors
  - Brand colors from settings
  - Opacity control

- [ ] **Typography Panel** (Day 8)
  - Google Fonts integration (font-picker-react)
  - Line height control
  - Letter spacing control
  - Text decoration (underline, strikethrough)

- [ ] **Layer Panel** (Day 8-9)
  - Visual layer list with thumbnails
  - Visibility toggle (eye icon)
  - Lock toggle
  - Layer renaming
  - Drag-drop reordering (react-beautiful-dnd)

- [ ] **Alignment Tools** (Day 9-10)
  - Align left/center/right
  - Align top/middle/bottom
  - Distribute horizontally/vertically
  - Toolbar with alignment buttons

- [ ] **Keyboard Shortcuts** (Day 10)
  - Undo/Redo (Ctrl+Z/Y)
  - Copy/Paste (Ctrl+C/V)
  - Delete (Delete key)
  - Select all (Ctrl+A)
  - Duplicate (Ctrl+D)
  - Arrow key nudging

**Success Criteria**: Professional editing experience comparable to Canva basics

**Complexity**: **Medium**

---

### Phase 3: Advanced Features (Week 5-6)
**Goal**: Differentiate from basic editors

#### Tasks:
- [ ] **Smart Guides** (Day 11-12)
  - Snap to object edges
  - Snap to canvas center
  - Snap to other objects
  - Visual guide lines

- [ ] **Grid & Rulers** (Day 12-13)
  - Optional grid overlay
  - Snap to grid
  - Ruler guides
  - Measurement units (px, in, mm)

- [ ] **Shadows & Effects** (Day 13)
  - Shadow controls (color, blur, offset)
  - Opacity per object
  - Blur effect

- [ ] **Gradients** (Day 14)
  - Linear gradient builder
  - Radial gradient builder
  - Multi-stop gradients

- [ ] **Image Filters** (Day 14-15)
  - Brightness, contrast, saturation
  - Grayscale, sepia
  - Blur filter

- [ ] **Grouping** (Day 15)
  - Group objects (Ctrl+G)
  - Ungroup (Ctrl+Shift+G)
  - Edit within group

- [ ] **Template System** (Day 16-17)
  - Save design as template
  - Template library
  - Load from template
  - Template categories

- [ ] **Auto-save** (Day 17)
  - Periodic JSON saving
  - Recovery system
  - Save history

**Success Criteria**: Feature parity with mid-tier design tools

**Complexity**: **Medium to Hard**

---

### Priority Matrix

| Feature | Impact | Complexity | Priority |
|---------|--------|------------|----------|
| Canvas Setup | High | Easy | P0 (Critical) |
| Basic Shapes | High | Easy | P0 |
| Text Tool | High | Easy | P0 |
| Image Upload | High | Medium | P0 |
| Save/Load | High | Medium | P0 |
| Export PNG/PDF | High | Medium | P0 |
| Property Panel | High | Medium | P1 (High) |
| Layer Panel | High | Medium | P1 |
| Alignment Tools | High | Medium | P1 |
| Undo/Redo | High | Medium | P1 |
| Color Picker | Medium | Easy | P1 |
| Font Selector | Medium | Medium | P1 |
| Keyboard Shortcuts | Medium | Medium | P1 |
| Smart Guides | Medium | Hard | P2 (Medium) |
| Gradients | Low | Medium | P2 |
| Image Filters | Low | Medium | P2 |
| Templates | Medium | Medium | P2 |
| Grid/Rulers | Low | Medium | P3 (Low) |
| Blending Modes | Low | Easy | P3 |
| Masking | Low | Hard | P3 |

---

## 14. Open Source Reference Projects

### Top Projects for Learning & Inspiration

#### 1. **react-design-editor** (salgum1114)
- **GitHub**: https://github.com/salgum1114/react-design-editor
- **Stars**: 1.6k
- **Last Updated**: December 2024
- **Tech Stack**: React, TypeScript, Fabric.js, Ant Design
- **Features**:
  - Complete editor with toolbar
  - Layer management
  - Property panels
  - Template system
  - Export to PNG/SVG/JSON
- **Use Case**: Study for overall architecture and UI patterns

#### 2. **vue-fabric-editor**
- **GitHub**: https://github.com/nihaojob/vue-fabric-editor
- **Stars**: 1.1k
- **Tech Stack**: Vue 3, TypeScript, Fabric.js
- **Features**:
  - Poster design
  - Image editing
  - Rich text
  - Filters
  - Alignment guides
- **Use Case**: Study alignment guide implementation

#### 3. **fabric-js-editor** (danielktaylor)
- **GitHub**: https://github.com/danielktaylor/fabric-js-editor
- **Tech Stack**: HTML, JavaScript, Fabric.js
- **Features**:
  - Minimal, clean implementation
  - Basic toolbar
  - Object manipulation
- **Use Case**: Simple reference for beginners

#### 4. **fabricjs-image-editor-origin**
- **GitHub**: https://github.com/CodeHole7/fabricjs-image-editor-origin
- **Features**:
  - Shape drawing
  - Pen tool
  - Configurable toolbar
  - Undo/redo
- **Use Case**: Study toolbar configuration patterns

#### 5. **DrawerJS**
- **Website**: https://carstenschaefer.github.io/DrawerJs/
- **GitHub**: https://github.com/carstenschaefer/DrawerJs
- **Features**:
  - Complete drawing editor
  - Plugin architecture
  - Extensive documentation
- **Use Case**: Study plugin/extension architecture

---

### Code Examples to Study

#### From react-design-editor:
```typescript
// Workspace structure
src/
├── components/
│   ├── canvas/
│   │   ├── Canvas.tsx          // Main canvas component
│   │   └── CanvasObject.tsx    // Object rendering
│   ├── imagemap/
│   │   ├── ImageMapEditor.tsx  // Full editor
│   │   └── ImageMapItems.tsx   // Toolbar items
│   └── common/
│       ├── CommonButton.tsx
│       └── CommonModal.tsx
├── handlers/
│   ├── Handler.ts              // Base handler
│   ├── ImageHandler.ts         // Image operations
│   └── CanvasHandler.ts        // Canvas operations
└── objects/
    ├── Rect.ts
    ├── Circle.ts
    └── Text.ts
```

---

### Key Learnings from Open Source

1. **Separation of Concerns**:
   - Handler classes for business logic
   - React components for UI only
   - Fabric.js for canvas rendering

2. **Event-Driven Architecture**:
   - Listen to Fabric.js events
   - Update React state
   - Re-render UI components

3. **Custom Object Classes**:
   - Extend fabric.Rect, fabric.Text, etc.
   - Add custom properties
   - Override render methods for special effects

4. **State Management**:
   - Canvas state in React context
   - History stack for undo/redo
   - Persistent storage (localStorage/IndexedDB)

5. **Performance Optimization**:
   - Debounce property updates
   - RequestAnimationFrame for smooth rendering
   - Object pooling for repeated operations

---

## Summary & Recommendations

### For Your Direct Mail Design Platform

#### Recommended Approach:

**Phase 1 (Weeks 1-2): Core Editor**
- Focus on P0 features (canvas, shapes, text, images, save/export)
- Use Fabric.js v6 native features
- Simple toolbar with basic controls
- Export to high-res PNG (300 DPI for print)

**Phase 2 (Weeks 3-4): Professional Controls**
- Property panel with context-sensitive controls
- Layer panel with drag-drop
- Alignment tools
- Color picker (react-colorful)
- Font selector (Google Fonts)
- Undo/redo + keyboard shortcuts

**Phase 3 (Weeks 5-6): Advanced Features**
- Smart guides and snapping
- Gradients and shadows
- Image filters
- Template system
- Grid and rulers

#### Technology Stack:
```bash
# Core
fabric@latest
react + typescript
next.js 15.5.4 (already using)

# UI Components
shadcn/ui (already using)
react-colorful (color picker)
font-picker-react (Google Fonts)
@dnd-kit/core (drag & drop)

# Utilities
nanoid (IDs)
file-saver (downloads)
jspdf (PDF export)
```

#### Architecture Pattern:
```
components/
├── editor/
│   ├── Canvas.tsx              // Main Fabric.js canvas
│   ├── Toolbar.tsx             // Top toolbar
│   ├── LeftPanel.tsx           // Tools & elements
│   ├── RightPanel.tsx          // Properties
│   └── BottomPanel.tsx         // Layers (optional)
├── properties/
│   ├── PropertyPanel.tsx       // Context-sensitive
│   ├── TextProperties.tsx
│   ├── ImageProperties.tsx
│   └── ShapeProperties.tsx
├── tools/
│   ├── ColorPicker.tsx
│   ├── FontSelector.tsx
│   └── AlignmentTools.tsx
└── layers/
    └── LayerPanel.tsx

lib/
├── fabric/
│   ├── canvas-manager.ts       // Canvas initialization
│   ├── object-handlers.ts      // Object CRUD
│   ├── history-manager.ts      // Undo/redo
│   └── export-manager.ts       // Export functions
└── utils/
    ├── alignment.ts            // Alignment helpers
    ├── grid.ts                 // Grid/snap helpers
    └── keyboard.ts             // Keyboard shortcuts
```

#### Competitive Advantages for Direct Mail:
1. **300 DPI Print Export** - Canva free tier is 72 DPI
2. **Variable Data Integration** - Connect to recipient database
3. **Postal Compliance Checker** - USPS regulations built-in
4. **Batch Generation** - Create 1000s of personalized designs
5. **QR Code Integration** - Already implemented
6. **Template Marketplace** - Direct mail specific templates

---

## Additional Resources

### Documentation:
- **Fabric.js Official Docs**: https://fabricjs.com/docs/
- **Fabric.js v6 Migration Guide**: https://github.com/fabricjs/fabric.js/wiki/v6-Migration-Guide
- **React + Fabric.js Best Practices**: Search "Managing Canvas Layers with Fabric.js and React"

### Tutorials:
- **LogRocket**: "Build an image editor with Fabric.js v6"
- **Medium**: "Fabric.js History Operations (undo, redo)"
- **ExceptionNotFound**: "Drawing with FabricJS and TypeScript" (8-part series)

### Interactive Examples:
- **Fabric.js Demos**: https://fabricjs.com/demos/
- **JSFiddle Search**: "fabric.js" (100+ examples)
- **CodePen**: Search "Fabric.js editor"

### Communities:
- **GitHub Discussions**: https://github.com/fabricjs/fabric.js/discussions
- **Stack Overflow**: Tag "fabricjs"
- **Reddit**: r/fabricjs (small but active)

---

**End of Report**

This research provides a comprehensive foundation for building a professional direct mail design platform that can compete with Canva. Focus on Phase 1 features first to get a working prototype, then iterate based on user feedback.

The combination of Fabric.js v6 + React + TypeScript + modern UI libraries gives you 80% of what you need out-of-the-box. The remaining 20% (smart guides, advanced features) can be added iteratively.

**Key Success Factor**: Start simple, ship early, iterate based on real usage. Don't try to build everything at once.
