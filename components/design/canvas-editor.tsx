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
  PanelRight
} from 'lucide-react';
import { toast } from 'sonner';
import { PropertyPanel } from './property-panel';
import { LayersPanel } from './layers-panel';
import { AlignmentTools } from './alignment-tools';
import { AIDesignAssistant } from './ai-design-assistant';

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
}

export function CanvasEditor({ onSave, initialData }: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState<number>(-1);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [showLayersPanel, setShowLayersPanel] = useState(true);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    // Create canvas with 300 DPI dimensions
    const fabricCanvas = new Canvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: '#ffffff',
    });

    // Scale down for display
    fabricCanvas.setZoom(DISPLAY_SCALE);

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
              (objects[index] as any).variableType = mapping.variableType;
              (objects[index] as any).isReusable = mapping.isReusable;
            }
          });
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

    return () => {
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
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  }, [canvas]);

  // Add rectangle
  const addRectangle = useCallback(() => {
    if (!canvas) return;

    const rect = new Rect({
      left: CANVAS_WIDTH / 2 - 150,
      top: CANVAS_HEIGHT / 2 - 100,
      width: 300,
      height: 200,
      fill: '#FF6B35',
      stroke: '#000000',
      strokeWidth: 2,
    });

    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
  }, [canvas]);

  // Add circle
  const addCircle = useCallback(() => {
    if (!canvas) return;

    const circle = new FabricCircle({
      left: CANVAS_WIDTH / 2 - 100,
      top: CANVAS_HEIGHT / 2 - 100,
      radius: 100,
      fill: '#4ECDC4',
      stroke: '#000000',
      strokeWidth: 2,
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
    const zoom = canvas.getZoom();
    canvas.setZoom(Math.min(zoom * 1.2, 2));
  }, [canvas]);

  // Zoom out
  const zoomOut = useCallback(() => {
    if (!canvas) return;
    const zoom = canvas.getZoom();
    canvas.setZoom(Math.max(zoom / 1.2, 0.1));
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

    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1.0,
      multiplier: 1, // Full 300 DPI resolution
    });

    // Restore zoom
    canvas.setZoom(currentZoom);

    // Download
    const link = document.createElement('a');
    link.download = `design-${Date.now()}.png`;
    link.href = dataURL;
    link.click();

    toast.success('Downloaded as PNG!');
  }, [canvas]);

  // Trigger re-render when panels update canvas
  const handleCanvasUpdate = useCallback(() => {
    setForceUpdate(prev => prev + 1);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      {/* Top Toolbar */}
      <Card className="p-3 rounded-none border-x-0 border-t-0">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Tool Buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant={selectedTool === 'text' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setSelectedTool('text'); addText(); }}
            >
              <Type className="h-4 w-4 mr-2" />
              Text
            </Button>

            <Button
              variant={selectedTool === 'rectangle' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setSelectedTool('rectangle'); addRectangle(); }}
            >
              <Square className="h-4 w-4 mr-2" />
              Rectangle
            </Button>

            <Button
              variant={selectedTool === 'circle' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setSelectedTool('circle'); addCircle(); }}
            >
              <CircleIcon className="h-4 w-4 mr-2" />
              Circle
            </Button>

            <Button
              variant={selectedTool === 'image' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setSelectedTool('image'); addImage(); }}
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Image
            </Button>
          </div>

          <Separator orientation="vertical" className="h-8" />

          {/* Alignment Tools */}
          <AlignmentTools canvas={canvas} onUpdate={handleCanvasUpdate} />

          <Separator orientation="vertical" className="h-8" />

          {/* Edit Actions */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={handleUndo} disabled={historyStep <= 0}>
              <Undo className="h-4 w-4 mr-2" />
              Undo
            </Button>

            <Button variant="outline" size="sm" onClick={handleRedo} disabled={historyStep >= history.length - 1}>
              <Redo className="h-4 w-4 mr-2" />
              Redo
            </Button>

            <Button variant="outline" size="sm" onClick={deleteSelected}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>

          <Separator orientation="vertical" className="h-8" />

          {/* View Controls */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={zoomIn}>
              <ZoomIn className="h-4 w-4 mr-2" />
              Zoom In
            </Button>

            <Button variant="outline" size="sm" onClick={zoomOut}>
              <ZoomOut className="h-4 w-4 mr-2" />
              Zoom Out
            </Button>
          </div>

          <Separator orientation="vertical" className="h-8" />

          {/* Save/Export */}
          <div className="flex items-center gap-1 ml-auto">
            <Button variant="outline" size="sm" onClick={downloadPNG}>
              <Download className="h-4 w-4 mr-2" />
              Download PNG
            </Button>

            <Button variant="default" size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Layout: 3 Columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Layers */}
        {showLayersPanel && (
          <div className="border-r w-60 flex-shrink-0">
            <LayersPanel canvas={canvas} onUpdate={handleCanvasUpdate} />
          </div>
        )}

        {/* Left Panel Toggle */}
        {!showLayersPanel && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-r-md rounded-l-none h-12 w-6"
            onClick={() => setShowLayersPanel(true)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {/* Center - Canvas */}
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-4 overflow-auto relative">
          {/* Panel Toggle Buttons */}
          {showLayersPanel && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-2 z-10 h-8 w-8"
              onClick={() => setShowLayersPanel(false)}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}
          {showPropertiesPanel && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 z-10 h-8 w-8"
              onClick={() => setShowPropertiesPanel(false)}
            >
              <PanelRight className="h-4 w-4" />
            </Button>
          )}

          <div
            className="border-2 border-gray-300 shadow-lg bg-white"
            style={{
              width: `${DISPLAY_WIDTH}px`,
              height: `${DISPLAY_HEIGHT}px`,
            }}
          >
            <canvas ref={canvasRef} />
          </div>

          {/* Canvas Info */}
          <div className="mt-4 text-xs text-slate-600">
            <strong>Canvas:</strong> {CANVAS_WIDTH} x {CANVAS_HEIGHT}px ({CANVAS_WIDTH_INCHES}" x {CANVAS_HEIGHT_INCHES}" @ {DPI} DPI)
            {' • '}
            <strong>Display:</strong> {DISPLAY_SCALE * 100}% scale
          </div>
        </div>

        {/* Right Panel Toggle */}
        {!showPropertiesPanel && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-l-md rounded-r-none h-12 w-6"
            onClick={() => setShowPropertiesPanel(true)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        {/* Right Panel - Properties */}
        {showPropertiesPanel && (
          <div className="border-l w-60 flex-shrink-0">
            <PropertyPanel selectedObject={selectedObject} onUpdate={handleCanvasUpdate} />
          </div>
        )}
      </div>

      {/* AI Design Assistant */}
      <AIDesignAssistant canvas={canvas} onUpdate={handleCanvasUpdate} />
    </div>
  );
}
