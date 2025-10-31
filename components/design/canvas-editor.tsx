'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, IText, Rect, Circle as FabricCircle, FabricImage } from 'fabric';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  Redo
} from 'lucide-react';
import { toast } from 'sonner';

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
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState<number>(-1);

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

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const imgUrl = event.target?.result as string;

        FabricImage.fromURL(imgUrl, (img) => {
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
        });
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

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {/* Tool Buttons */}
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

          <div className="w-px h-8 bg-border mx-2" />

          {/* Edit Actions */}
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

          <div className="w-px h-8 bg-border mx-2" />

          {/* View Controls */}
          <Button variant="outline" size="sm" onClick={zoomIn}>
            <ZoomIn className="h-4 w-4 mr-2" />
            Zoom In
          </Button>

          <Button variant="outline" size="sm" onClick={zoomOut}>
            <ZoomOut className="h-4 w-4 mr-2" />
            Zoom Out
          </Button>

          <div className="w-px h-8 bg-border mx-2" />

          {/* Save/Export */}
          <Button variant="default" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Template
          </Button>

          <Button variant="outline" size="sm" onClick={downloadPNG}>
            <Download className="h-4 w-4 mr-2" />
            Download PNG
          </Button>
        </div>
      </Card>

      {/* Canvas Container */}
      <Card className="p-4">
        <div
          className="border border-gray-300 overflow-auto"
          style={{
            width: `${DISPLAY_WIDTH}px`,
            height: `${DISPLAY_HEIGHT}px`,
            maxWidth: '100%',
          }}
        >
          <canvas ref={canvasRef} />
        </div>
      </Card>

      {/* Info */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-900">
          <strong>Canvas Size:</strong> {CANVAS_WIDTH} x {CANVAS_HEIGHT}px ({CANVAS_WIDTH_INCHES}" x {CANVAS_HEIGHT_INCHES}" at {DPI} DPI)
          <br />
          <strong>Display Scale:</strong> {DISPLAY_SCALE * 100}% (editing view)
        </p>
      </Card>
    </div>
  );
}
