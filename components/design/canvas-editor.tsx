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
  Menu,
  FolderOpen,
  Magnet
} from 'lucide-react';
import { toast } from 'sonner';
import { PropertyPanel } from './property-panel';
import { LayersPanel } from './layers-panel';
import { AIDesignAssistant } from './ai-design-assistant';
import { FormatSelector } from './format-selector';
import { AssetLibraryPanel } from './asset-library-panel';
import { Sidebar } from '@/components/sidebar';
import { DEFAULT_FORMAT, type PrintFormat } from '@/lib/design/print-formats';
import { detectAlignments, deduplicateLines, type AlignmentLine } from '@/lib/design/alignment-helpers';

export interface CanvasEditorProps {
  format?: PrintFormat; // Print format (defaults to 4x6 postcard)
  onFormatChange?: (format: PrintFormat) => void;
  onSave?: (data: {
    canvasJSON: string;
    variableMappings: Record<string, any>;
    preview: string;
    format: PrintFormat;
  }) => void;
  initialData?: {
    canvasJSON?: string;
    variableMappings?: Record<string, any>;
    format?: PrintFormat;
  };
  templateName?: string;
  templateDescription?: string;
  onTemplateNameChange?: (name: string) => void;
  onTemplateDescriptionChange?: (description: string) => void;
  templateLibraryTrigger?: React.ReactNode;
  onOpenTemplateLibrary?: () => void;
  organizationId?: string; // For asset library
}

export function CanvasEditor({
  format = DEFAULT_FORMAT,
  onFormatChange,
  onSave,
  initialData,
  templateName,
  templateDescription,
  onTemplateNameChange,
  onTemplateDescriptionChange,
  templateLibraryTrigger,
  onOpenTemplateLibrary,
  organizationId = '00000000-0000-0000-0000-000000000000' // Default for testing
}: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [currentFormat, setCurrentFormat] = useState<PrintFormat>(
    initialData?.format || format
  );
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState<number>(-1);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [showLayersPanel, setShowLayersPanel] = useState(true);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true);
  const [showAssetLibrary, setShowAssetLibrary] = useState(false);
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const [alignmentGuidesEnabled, setAlignmentGuidesEnabled] = useState(true);
  const [alignmentLines, setAlignmentLines] = useState<AlignmentLine[]>([]);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    console.log(`🎨 Initializing canvas with format: ${currentFormat.name}`);
    console.log(`   Dimensions: ${currentFormat.widthPixels}px × ${currentFormat.heightPixels}px (${currentFormat.widthInches}" × ${currentFormat.heightInches}" at ${currentFormat.dpi} DPI)`);

    // Declare variables in useEffect scope so cleanup can access them
    let handleKeyDown: ((e: KeyboardEvent) => void) | null = null;
    let fabricCanvas: Canvas | null = null;

    // Small delay to ensure DOM is ready and previous canvas is disposed
    const initTimeout = setTimeout(() => {
      if (!canvasRef.current) return;

      // Create canvas with format dimensions
      fabricCanvas = new Canvas(canvasRef.current, {
        width: currentFormat.widthPixels,
        height: currentFormat.heightPixels,
        backgroundColor: '#ffffff',
      });

      // Load initial data if provided
      if (initialData?.canvasJSON) {
        console.log('📂 Loading canvas from JSON data...');
        fabricCanvas.loadFromJSON(initialData.canvasJSON, () => {
          console.log('✅ Canvas JSON loaded, rendering...');
          fabricCanvas.renderAll();

          // Apply variable mappings
          if (initialData.variableMappings) {
            console.log('🏷️ Applying variable mappings...');
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
            console.log('✅ Variable mappings applied');
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

    // Alignment guides event listeners
    fabricCanvas.on('object:moving', (e: any) => {
      if (!alignmentGuidesEnabled) return;

      const movingObject = e.target;
      if (!movingObject) return;

      const allObjects = fabricCanvas.getObjects().filter(obj => obj !== movingObject);
      const alignments = detectAlignments(
        movingObject,
        allObjects,
        currentFormat.widthPixels,
        currentFormat.heightPixels
      );

      // Show alignment guidelines (visual only, no auto-snap)
      const uniqueLines = deduplicateLines(alignments.lines);
      setAlignmentLines(uniqueLines);
    });

    fabricCanvas.on('object:modified', () => {
      // Clear alignment lines when object stops moving
      setAlignmentLines([]);
    });

    fabricCanvas.on('mouse:up', () => {
      // Also clear on mouse up (safety net)
      setAlignmentLines([]);
    });

    setCanvas(fabricCanvas);

    // Keyboard event handler for delete functionality
    handleKeyDown = (e: KeyboardEvent) => {
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
    if (handleKeyDown) {
      window.addEventListener('keydown', handleKeyDown);
    }

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
        const scaleX = containerWidth / currentFormat.widthPixels;
        const scaleY = containerHeight / currentFormat.heightPixels;
        const scale = Math.min(scaleX, scaleY); // Fit to screen, no arbitrary max limit

        // Set zoom for internal rendering
        fabricCanvas.setZoom(scale);

        // CRITICAL: Set CSS dimensions to match zoomed size
        // Internal canvas stays at 300 DPI dimensions (for print-ready export)
        // CSS dimensions scale down for display
        try {
          fabricCanvas.setDimensions({
            width: currentFormat.widthPixels * scale,
            height: currentFormat.heightPixels * scale
          }, { cssOnly: true });
        } catch (err) {
          console.error('Failed to set canvas dimensions:', err);
        }

        fabricCanvas.renderAll();

        console.log('📐 Canvas auto-fit:', {
          containerWidth,
          containerHeight,
          canvasWidth: currentFormat.widthPixels,
          canvasHeight: currentFormat.heightPixels,
          format: currentFormat.name,
          scaleX: scaleX.toFixed(3),
          scaleY: scaleY.toFixed(3),
          finalScale: scale.toFixed(3),
          displayWidth: Math.round(currentFormat.widthPixels * scale),
          displayHeight: Math.round(currentFormat.heightPixels * scale)
        });
      }
    }, 250);
    }, 50); // Close initTimeout setTimeout

    return () => {
      clearTimeout(initTimeout);
      // Clean up keyboard event listener
      if (handleKeyDown) {
        window.removeEventListener('keydown', handleKeyDown);
      }
      // Dispose canvas safely
      try {
        if (fabricCanvas && fabricCanvas.dispose) {
          fabricCanvas.dispose();
        }
      } catch (err) {
        console.warn('Canvas disposal warning:', err);
      }
    };
  }, [currentFormat, initialData]);

  // Render alignment guide lines
  useEffect(() => {
    if (!canvas) return;

    const renderAlignmentLines = () => {
      const ctx = canvas.getContext();
      if (!ctx) return;

      // Don't call renderAll() here - we're already in after:render event
      // Just draw the alignment lines on top of the existing render
      if (alignmentLines.length === 0) return;

      // Save context state
      ctx.save();

      // Set line style (magenta dashed lines)
      ctx.strokeStyle = '#FF00FF';
      ctx.lineWidth = 1 / canvas.getZoom(); // Adjust for zoom
      ctx.setLineDash([5 / canvas.getZoom(), 5 / canvas.getZoom()]);

      // Draw each alignment line
      alignmentLines.forEach(line => {
        ctx.beginPath();
        if (line.type === 'vertical') {
          ctx.moveTo(line.position, line.start);
          ctx.lineTo(line.position, line.end);
        } else {
          ctx.moveTo(line.start, line.position);
          ctx.lineTo(line.end, line.position);
        }
        ctx.stroke();
      });

      // Restore context state
      ctx.restore();
    };

    // Render lines on every canvas render
    canvas.on('after:render', renderAlignmentLines);

    return () => {
      canvas.off('after:render', renderAlignmentLines);
    };
  }, [canvas, alignmentLines]);

  // Keyboard shortcut: Cmd/Ctrl + ; to toggle alignment guides
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux) + semicolon
      if ((e.metaKey || e.ctrlKey) && e.key === ';') {
        e.preventDefault();
        setAlignmentGuidesEnabled(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
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
      left: currentFormat.widthPixels / 2,
      top: currentFormat.heightPixels / 2,
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
      left: currentFormat.widthPixels / 2,
      top: currentFormat.heightPixels / 2,
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
      left: currentFormat.widthPixels / 2,
      top: currentFormat.heightPixels / 2,
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
          const maxWidth = currentFormat.widthPixels * 0.5;
          const scale = maxWidth / (img.width || 1);

          img.set({
            left: currentFormat.widthPixels / 2,
            top: currentFormat.heightPixels / 2,
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

  // Add asset from library
  const addAssetToCanvas = useCallback(async (asset: any) => {
    if (!canvas) return;

    try {
      // Use signed URL to load image
      const imgUrl = asset.signedUrl || asset.storage_url;
      const img = await FabricImage.fromURL(imgUrl, {
        crossOrigin: 'anonymous'
      });

      // Scale image to fit canvas (max 50% width)
      const maxWidth = currentFormat.widthPixels * 0.5;
      const scale = maxWidth / (img.width || 1);

      img.set({
        left: currentFormat.widthPixels / 2,
        top: currentFormat.heightPixels / 2,
        scaleX: scale,
        scaleY: scale,
        originX: 'center',
        originY: 'center',
        centeredRotation: true,
      });

      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      saveToHistory(canvas);
      toast.success(`${asset.name} added to canvas`);
    } catch (error) {
      console.error('Failed to load asset:', error);
      toast.error('Failed to load asset');
    }
  }, [canvas, currentFormat]);

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
      width: currentFormat.widthPixels * newZoom,
      height: currentFormat.heightPixels * newZoom
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
      width: currentFormat.widthPixels * newZoom,
      height: currentFormat.heightPixels * newZoom
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
    const scaleX = containerWidth / currentFormat.widthPixels;
    const scaleY = containerHeight / currentFormat.heightPixels;
    const scale = Math.min(scaleX, scaleY); // Fit to available space

    canvas.setZoom(scale);

    // Update CSS dimensions to match zoom
    canvas.setDimensions({
      width: currentFormat.widthPixels * scale,
      height: currentFormat.heightPixels * scale
    }, { cssOnly: true });

    canvas.renderAll();
    setForceUpdate(prev => prev + 1); // Trigger re-render for container resize

    console.log('📐 Fit to screen:', {
      containerWidth,
      containerHeight,
      format: currentFormat.name,
      scale: `${Math.round(scale * 100)}%`,
      displayWidth: Math.round(currentFormat.widthPixels * scale),
      displayHeight: Math.round(currentFormat.heightPixels * scale)
    });
  }, [canvas, currentFormat]);

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
        format: currentFormat,
      });

      toast.success(`Template saved successfully! (${currentFormat.name})`);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save template');
    }
  }, [canvas, onSave, currentFormat]);

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
            {currentFormat.widthPixels} × {currentFormat.heightPixels}px
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
          <span className="text-xs text-slate-600 w-12 text-center">{Math.round((canvas?.getZoom() || 0.25) * 100)}%</span>
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

          <div className="w-px h-5 bg-slate-200 mx-1" />

          {/* Alignment Guides Toggle */}
          <Button
            variant={alignmentGuidesEnabled ? "default" : "ghost"}
            size="icon"
            className={`h-8 w-8 ${alignmentGuidesEnabled ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'hover:bg-slate-100'}`}
            onClick={() => setAlignmentGuidesEnabled(!alignmentGuidesEnabled)}
            title={`Alignment Guides ${alignmentGuidesEnabled ? 'On' : 'Off'} (Cmd/Ctrl + ;)`}
          >
            <Magnet className="h-4 w-4" />
          </Button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {onOpenTemplateLibrary && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs hover:bg-slate-100"
              onClick={onOpenTemplateLibrary}
              title="Browse Templates"
            >
              <FolderOpen className="h-4 w-4 mr-1.5" />
              Templates
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs hover:bg-slate-100"
            onClick={() => setShowAssetLibrary(!showAssetLibrary)}
            title="Toggle Asset Library"
          >
            <ImageIcon className="h-4 w-4 mr-1.5" />
            Assets
          </Button>
          <FormatSelector
            canvas={canvas}
            currentFormat={currentFormat}
            onFormatChange={(newFormat) => {
              setCurrentFormat(newFormat);
              if (onFormatChange) {
                onFormatChange(newFormat);
              }
            }}
          />
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

        {/* Asset Library Panel */}
        {showAssetLibrary && (
          <div className="w-72 flex-shrink-0 bg-white border-l border-slate-200">
            <AssetLibraryPanel
              organizationId={organizationId}
              onAssetSelect={addAssetToCanvas}
            />
          </div>
        )}
      </div>

      {/* AI Design Assistant */}
      <AIDesignAssistant canvas={canvas} onUpdate={handleCanvasUpdate} />

      {/* Template Library Dialog Trigger (hidden, controlled by parent) */}
      {templateLibraryTrigger}
    </div>
  );
}
