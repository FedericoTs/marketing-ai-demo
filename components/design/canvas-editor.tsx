'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, IText, Rect, Circle as FabricCircle, FabricImage, FabricObject } from 'fabric';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Type,
  Square,
  Circle as CircleIcon,
  Image as ImageIcon,
  Save,
  Download,
  Trash2,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
  ChevronLeft,
  ChevronRight,
  PanelLeft,
  PanelRight,
  Maximize2,
  Menu
} from 'lucide-react';
import { toast } from 'sonner';
import { PropertyPanel } from './property-panel';
import { LayersPanel } from './layers-panel';
import { AIDesignAssistant } from './ai-design-assistant';
import { Sidebar } from '@/components/sidebar';

// Canvas dimensions for 6x4 postcard at 300 DPI
const CANVAS_WIDTH_INCHES = 6;
const CANVAS_HEIGHT_INCHES = 4;
const DPI = 300;
const CANVAS_WIDTH = CANVAS_WIDTH_INCHES * DPI; // 1800px
const CANVAS_HEIGHT = CANVAS_HEIGHT_INCHES * DPI; // 1200px

// Display scale (show canvas at 25% size for editing)
const DISPLAY_SCALE = 0.25;
const DISPLAY_WIDTH = CANVAS_WIDTH * DISPLAY_SCALE; // 450px
const DISPLAY_HEIGHT = CANVAS_HEIGHT * DISPLAY_SCALE; // 300px

export interface CanvasEditorProps {
  onSave?: (data: {
    canvasJSON: string;
    variableMappings: Record<string, any>;
    preview: string;
  }) => void;
  initialData?: {
    canvasJSON?: string;
    variableMappings?: Record<string, any>;
  };
  templateName?: string;
  templateDescription?: string;
  onTemplateNameChange?: (name: string) => void;
  onTemplateDescriptionChange?: (description: string) => void;
}

export function CanvasEditor({
  onSave,
  initialData,
  templateName,
  templateDescription,
  onTemplateNameChange,
  onTemplateDescriptionChange
}: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState<number>(-1);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [showLayersPanel, setShowLayersPanel] = useState(true);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true);
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    // Create canvas with 300 DPI dimensions
    const fabricCanvas = new Canvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: '#ffffff',
    });

    // Initial scale (will be overridden by auto-fit, but set for immediate display)
    fabricCanvas.setZoom(DISPLAY_SCALE);
    fabricCanvas.setDimensions({
      width: CANVAS_WIDTH * DISPLAY_SCALE,
      height: CANVAS_HEIGHT * DISPLAY_SCALE
    }, { cssOnly: true });

    // Load initial data if provided
    if (initialData?.canvasJSON) {
      fabricCanvas.loadFromJSON(initialData.canvasJSON, () => {
        fabricCanvas.renderAll();

        // Apply variable mappings
        if (initialData.variableMappings) {
          const objects = fabricCanvas.getObjects();
          Object.entries(initialData.variableMappings).forEach(([idx, mapping]) => {
            const index = parseInt(idx);
            if (objects[index]) {
              const obj = objects[index];
              (obj as any).variableType = mapping.variableType;
              (obj as any).isReusable = mapping.isReusable;

              // Apply visual styling for variables
              if (mapping.variableType && mapping.variableType !== 'none') {
                obj.set({
                  borderColor: '#9333ea',
                  borderScaleFactor: 3,
                  borderDashArray: [5, 5],
                  cornerColor: '#9333ea',
                  cornerSize: 8,
                  transparentCorners: false,
                } as any);
              }
            }
          });
          fabricCanvas.renderAll();
        }
      });
    }

    // Save initial state to history
    saveToHistory(fabricCanvas);

    // Listen for object modifications
    fabricCanvas.on('object:modified', () => saveToHistory(fabricCanvas));
    fabricCanvas.on('object:added', () => saveToHistory(fabricCanvas));
    fabricCanvas.on('object:removed', () => saveToHistory(fabricCanvas));

    // Listen for selection changes
    fabricCanvas.on('selection:created', (e: any) => setSelectedObject(e.selected?.[0] || null));
    fabricCanvas.on('selection:updated', (e: any) => setSelectedObject(e.selected?.[0] || null));
    fabricCanvas.on('selection:cleared', () => setSelectedObject(null));

    setCanvas(fabricCanvas);

    // Keyboard event handler for delete functionality
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Delete or Backspace key is pressed
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Get the active object
        const activeObject = fabricCanvas.getActiveObject();

        if (activeObject) {
          // Check if user is editing text (don't delete the object, let them edit)
          const isEditingText = (activeObject as any).isEditing;

          if (isEditingText) {
            // User is editing text, don't interfere
            return;
          }

          // Prevent default behavior (e.g., browser back navigation for Backspace)
          e.preventDefault();

          // Remove the object from canvas
          fabricCanvas.remove(activeObject);
          fabricCanvas.discardActiveObject(); // Clear selection
          fabricCanvas.renderAll();

          // History will be automatically saved by object:removed event listener
          console.log('🗑️ Deleted object:', activeObject.type);
        }
      }
    };

    // Add keyboard event listener
    window.addEventListener('keydown', handleKeyDown);

    // Auto-fit canvas to screen after initialization
    // Delay to ensure Fabric.js DOM managers are fully initialized
    setTimeout(() => {
      // Get the actual flex container (the one with "flex-1 flex items-center justify-center")
      const canvasWrapper = canvasRef.current?.parentElement?.parentElement;
      const container = canvasWrapper?.parentElement;

      if (container && fabricCanvas.lowerCanvasEl) { // Check that canvas DOM is ready
        // Get the actual available space (generous padding for UI elements)
        const containerWidth = container.clientWidth - 100; // Account for padding, borders, and spacing
        const containerHeight = container.clientHeight - 100;

        // Calculate scale to fit while maintaining aspect ratio
        const scaleX = containerWidth / CANVAS_WIDTH;
        const scaleY = containerHeight / CANVAS_HEIGHT;
        const scale = Math.min(scaleX, scaleY); // Fit to screen, no arbitrary max limit

        // Set zoom for internal rendering
        fabricCanvas.setZoom(scale);

        // CRITICAL: Set CSS dimensions to match zoomed size
        // Internal canvas stays 1800x1200 (for 300 DPI export)
        // CSS dimensions scale down for display
        try {
          fabricCanvas.setDimensions({
            width: CANVAS_WIDTH * scale,
            height: CANVAS_HEIGHT * scale
          }, { cssOnly: true });
        } catch (err) {
          console.error('Failed to set canvas dimensions:', err);
        }

        fabricCanvas.renderAll();

        console.log('📐 Canvas auto-fit:', {
          containerWidth,
          containerHeight,
          canvasWidth: CANVAS_WIDTH,
          canvasHeight: CANVAS_HEIGHT,
          scaleX: scaleX.toFixed(3),
          scaleY: scaleY.toFixed(3),
          finalScale: scale.toFixed(3),
          displayWidth: Math.round(CANVAS_WIDTH * scale),
          displayHeight: Math.round(CANVAS_HEIGHT * scale)
        });
      }
    }, 250);

    return () => {
      // Clean up keyboard event listener
      window.removeEventListener('keydown', handleKeyDown);
      // Dispose canvas
      fabricCanvas.dispose();
    };
  }, []);

  // Save canvas state to history
  const saveToHistory = useCallback((canvas: Canvas) => {
    const json = JSON.stringify(canvas.toJSON());
    setHistory(prev => {
      const newHistory = prev.slice(0, historyStep + 1);
      newHistory.push(json);
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryStep(prev => Math.min(prev + 1, 49));
  }, [historyStep]);

  // Undo
  const handleUndo = useCallback(() => {
    if (!canvas || historyStep <= 0) return;

    const newStep = historyStep - 1;
    canvas.loadFromJSON(history[newStep], () => {
      canvas.renderAll();
      setHistoryStep(newStep);
    });
  }, [canvas, history, historyStep]);

  // Redo
  const handleRedo = useCallback(() => {
    if (!canvas || historyStep >= history.length - 1) return;

    const newStep = historyStep + 1;
    canvas.loadFromJSON(history[newStep], () => {
      canvas.renderAll();
      setHistoryStep(newStep);
    });
  }, [canvas, history, historyStep]);

  // Add text
  const addText = useCallback(() => {
    if (!canvas) return;

    const text = new IText('Double-click to edit', {
      left: CANVAS_WIDTH / 2,
      top: CANVAS_HEIGHT / 2,
      fontSize: 60, // Scaled for 300 DPI
      fontFamily: 'Arial',
      fill: '#000000',
      originX: 'center',
      originY: 'center',
      centeredRotation: true,
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  }, [canvas]);

  // Add rectangle
  const addRectangle = useCallback(() => {
    if (!canvas) return;

    const rect = new Rect({
      left: CANVAS_WIDTH / 2,
      top: CANVAS_HEIGHT / 2,
      width: 300,
      height: 200,
      fill: '#FF6B35',
      stroke: '#000000',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center',
      centeredRotation: true,
    });

    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
  }, [canvas]);

  // Add circle
  const addCircle = useCallback(() => {
    if (!canvas) return;

    const circle = new FabricCircle({
      left: CANVAS_WIDTH / 2,
      top: CANVAS_HEIGHT / 2,
      radius: 100,
      fill: '#4ECDC4',
      stroke: '#000000',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center',
      centeredRotation: true,
    });

    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.renderAll();
  }, [canvas]);

  // Add image from upload
  const addImage = useCallback(() => {
    if (!canvas) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const imgUrl = event.target?.result as string;

        try {
          // Fabric.js v6 async pattern
          const img = await FabricImage.fromURL(imgUrl);

          // Scale image to fit canvas (max 50% width)
          const maxWidth = CANVAS_WIDTH * 0.5;
          const scale = maxWidth / (img.width || 1);

          img.set({
            left: CANVAS_WIDTH / 2,
            top: CANVAS_HEIGHT / 2,
            scaleX: scale,
            scaleY: scale,
            originX: 'center',
            originY: 'center',
            centeredRotation: true,
          });

          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.renderAll();
          toast.success('Image added to canvas');
        } catch (error) {
          console.error('Failed to load image:', error);
          toast.error('Failed to load image');
        }
      };

      reader.readAsDataURL(file);
    };

    input.click();
  }, [canvas]);

  // Delete selected object
  const deleteSelected = useCallback(() => {
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length === 0) {
      toast.error('No objects selected');
      return;
    }

    activeObjects.forEach(obj => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.renderAll();
  }, [canvas]);

  // Zoom in
  const zoomIn = useCallback(() => {
    if (!canvas) return;
    const currentZoom = canvas.getZoom();
    const newZoom = Math.min(currentZoom * 1.2, 3); // Max 3x zoom
    canvas.setZoom(newZoom);

    // Update CSS dimensions to match zoom
    canvas.setDimensions({
      width: CANVAS_WIDTH * newZoom,
      height: CANVAS_HEIGHT * newZoom
    }, { cssOnly: true });

    canvas.renderAll();
    setForceUpdate(prev => prev + 1); // Trigger re-render for container resize
  }, [canvas]);

  // Zoom out
  const zoomOut = useCallback(() => {
    if (!canvas) return;
    const currentZoom = canvas.getZoom();
    const newZoom = Math.max(currentZoom / 1.2, 0.1); // Min 0.1x zoom
    canvas.setZoom(newZoom);

    // Update CSS dimensions to match zoom
    canvas.setDimensions({
      width: CANVAS_WIDTH * newZoom,
      height: CANVAS_HEIGHT * newZoom
    }, { cssOnly: true });

    canvas.renderAll();
    setForceUpdate(prev => prev + 1); // Trigger re-render for container resize
  }, [canvas]);

  // Fit to screen
  const fitToScreen = useCallback(() => {
    if (!canvas || !canvasRef.current) return;

    // Get the actual flex container (go up 3 levels: canvas -> border div -> wrapper div -> flex container)
    const canvasWrapper = canvasRef.current.parentElement?.parentElement;
    const container = canvasWrapper?.parentElement;
    if (!container) return;

    const containerWidth = container.clientWidth - 100; // Account for padding, borders, and spacing
    const containerHeight = container.clientHeight - 100;

    // Calculate scale to fit while maintaining aspect ratio
    const scaleX = containerWidth / CANVAS_WIDTH;
    const scaleY = containerHeight / CANVAS_HEIGHT;
    const scale = Math.min(scaleX, scaleY); // Fit to available space

    canvas.setZoom(scale);

    // Update CSS dimensions to match zoom
    canvas.setDimensions({
      width: CANVAS_WIDTH * scale,
      height: CANVAS_HEIGHT * scale
    }, { cssOnly: true });

    canvas.renderAll();
    setForceUpdate(prev => prev + 1); // Trigger re-render for container resize

    console.log('📐 Fit to screen:', {
      containerWidth,
      containerHeight,
      scale: `${Math.round(scale * 100)}%`,
      displayWidth: Math.round(CANVAS_WIDTH * scale),
      displayHeight: Math.round(CANVAS_HEIGHT * scale)
    });
  }, [canvas]);

  // Save template
  const handleSave = useCallback(() => {
    if (!canvas || !onSave) return;

    try {
      // Get canvas JSON
      const canvasJSON = JSON.stringify(canvas.toJSON());

      // Extract variable mappings (separate from canvas JSON)
      const objects = canvas.getObjects();
      const variableMappings: Record<string, any> = {};

      objects.forEach((obj: any, idx: number) => {
        if (obj.variableType) {
          variableMappings[idx.toString()] = {
            variableType: obj.variableType,
            isReusable: obj.isReusable || false,
          };
        }
      });

      // Generate preview image (scaled down)
      const preview = canvas.toDataURL({
        format: 'png',
        quality: 0.8,
        multiplier: 0.2, // Small preview
      });

      onSave({
        canvasJSON,
        variableMappings,
        preview,
      });

      toast.success('Template saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save template');
    }
  }, [canvas, onSave]);

  // Download as PNG (full 300 DPI)
  const downloadPNG = useCallback(() => {
    if (!canvas) return;

    // Temporarily set zoom to 1:1 for export
    const currentZoom = canvas.getZoom();
    canvas.setZoom(1);
    // Note: Don't update CSS dimensions here - export is instant and we restore immediately

    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1.0,
      multiplier: 1, // Full 300 DPI resolution
    });

    // Restore zoom
    canvas.setZoom(currentZoom);
    // CSS dimensions remain unchanged since we only temporarily changed zoom

    // Download
    const link = document.createElement('a');
    link.download = `design-${Date.now()}.png`;
    link.href = dataURL;
    link.click();

    toast.success('Downloaded as PNG!');
  }, [canvas]);

  // Trigger re-render when panels update canvas
  const handleCanvasUpdate = useCallback(() => {
    if (canvas) {
      canvas.renderAll();
    }
    setForceUpdate(prev => prev + 1);
  }, [canvas]);

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Top Toolbar - Minimal Spline Style */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200">
        {/* Left: Hamburger + Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsNavMenuOpen(true)}
            className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
            title="Open menu"
          >
            <Menu className="h-4 w-4 text-slate-700" />
          </button>
          <h3 className="text-sm font-medium text-slate-700">Template Editor</h3>
          <span className="text-xs text-slate-400">|</span>
          <div className="text-xs text-slate-500">
            {CANVAS_WIDTH} × {CANVAS_HEIGHT}px
          </div>
        </div>

        {/* Center: Main Tools */}
        <div className="flex items-center gap-1">
          {/* Undo/Redo */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-slate-100"
            onClick={handleUndo}
            disabled={historyStep <= 0}
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-slate-100"
            onClick={handleRedo}
            disabled={historyStep >= history.length - 1}
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </Button>

          <div className="w-px h-5 bg-slate-200 mx-1" />

          {/* Add Tools */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-slate-100"
            onClick={() => { setSelectedTool('text'); addText(); }}
            title="Add Text"
          >
            <Type className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-slate-100"
            onClick={() => { setSelectedTool('rectangle'); addRectangle(); }}
            title="Add Rectangle"
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-slate-100"
            onClick={() => { setSelectedTool('circle'); addCircle(); }}
            title="Add Circle"
          >
            <CircleIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-slate-100"
            onClick={() => { setSelectedTool('image'); addImage(); }}
            title="Add Image"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>

          <div className="w-px h-5 bg-slate-200 mx-1" />

          {/* Delete */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-slate-100 hover:text-red-600"
            onClick={deleteSelected}
            title="Delete Selected"
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <div className="w-px h-5 bg-slate-200 mx-1" />

          {/* Zoom Controls */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-slate-100"
            onClick={zoomOut}
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-slate-600 w-12 text-center">{Math.round((canvas?.getZoom() || DISPLAY_SCALE) * 100)}%</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-slate-100"
            onClick={zoomIn}
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-slate-100"
            onClick={fitToScreen}
            title="Fit to Screen"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs hover:bg-slate-100"
            onClick={downloadPNG}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleSave}
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            Save
          </Button>
        </div>
      </div>

      {/* Sliding Sidebar Navigation */}
      <Sidebar
        isOpen={isNavMenuOpen}
        onClose={() => setIsNavMenuOpen(false)}
        hideButton={true}
        alwaysCollapsible={true}
        showCloseButton={true}
      />

      {/* Main Layout: 3 Columns */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Panel - Layers */}
        {showLayersPanel && (
          <div className="w-60 flex-shrink-0 bg-white border-r border-slate-200">
            <LayersPanel
              canvas={canvas}
              onUpdate={handleCanvasUpdate}
              templateName={templateName}
              templateDescription={templateDescription}
              onTemplateNameChange={onTemplateNameChange}
              onTemplateDescriptionChange={onTemplateDescriptionChange}
            />
          </div>
        )}

        {/* Left Panel Toggle */}
        {!showLayersPanel && (
          <button
            onClick={() => setShowLayersPanel(true)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-slate-50 border border-slate-200 rounded-r-md h-16 w-5 flex items-center justify-center shadow-sm transition-all"
            title="Show Layers"
          >
            <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
          </button>
        )}

        {/* Center - Canvas */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto relative bg-slate-50">
          {/* Panel Toggle Buttons */}
          {showLayersPanel && (
            <button
              onClick={() => setShowLayersPanel(false)}
              className="absolute left-3 top-3 z-10 h-7 w-7 rounded-md hover:bg-white/80 bg-white/60 backdrop-blur-sm border border-slate-200 flex items-center justify-center transition-all"
              title="Hide Layers"
            >
              <PanelLeft className="h-3.5 w-3.5 text-slate-600" />
            </button>
          )}
          {showPropertiesPanel && (
            <button
              onClick={() => setShowPropertiesPanel(false)}
              className="absolute right-3 top-3 z-10 h-7 w-7 rounded-md hover:bg-white/80 bg-white/60 backdrop-blur-sm border border-slate-200 flex items-center justify-center transition-all"
              title="Hide Properties"
            >
              <PanelRight className="h-3.5 w-3.5 text-slate-600" />
            </button>
          )}

          {/* Canvas wrapper with proper spacing */}
          <div className="flex items-center justify-center w-full h-full">
            <div className="border-2 border-slate-300 shadow-2xl bg-white rounded-sm relative inline-block">
              <canvas ref={canvasRef} />

              {/* Corner markers for visibility */}
              <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 rounded-full opacity-30"></div>
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full opacity-30"></div>
              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 rounded-full opacity-30"></div>
              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 rounded-full opacity-30"></div>
            </div>
          </div>
        </div>

        {/* Right Panel Toggle */}
        {!showPropertiesPanel && (
          <button
            onClick={() => setShowPropertiesPanel(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-slate-50 border border-slate-200 rounded-l-md h-16 w-5 flex items-center justify-center shadow-sm transition-all"
            title="Show Properties"
          >
            <ChevronLeft className="h-3.5 w-3.5 text-slate-500" />
          </button>
        )}

        {/* Right Panel - Properties */}
        {showPropertiesPanel && (
          <div className="w-60 flex-shrink-0 bg-white border-l border-slate-200">
            <PropertyPanel selectedObject={selectedObject} onUpdate={handleCanvasUpdate} forceUpdate={forceUpdate} />
          </div>
        )}
      </div>

      {/* AI Design Assistant */}
      <AIDesignAssistant canvas={canvas} onUpdate={handleCanvasUpdate} />
    </div>
  );
}
