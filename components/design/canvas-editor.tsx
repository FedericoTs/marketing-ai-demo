'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, IText, Textbox, Rect, Circle as FabricCircle, FabricImage, FabricObject, Point } from 'fabric';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Type,
  Square,
  Circle as CircleIcon,
  Image as ImageIcon,
  QrCode,
  Save,
  Download,
  Trash2,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  PanelLeft,
  PanelRight,
  Maximize2,
  Menu,
  FolderOpen,
  Eye,
  Pencil,
  FileText,
  FileCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { PropertyPanel } from './property-panel';
import { LayersPanel } from './layers-panel';
import { AIDesignAssistant } from './ai-design-assistant';
import { FormatSelector } from './format-selector';
import { AssetLibraryPanel } from './asset-library-panel';
import { Sidebar } from '@/components/sidebar';
import { DEFAULT_FORMAT, type PrintFormat } from '@/lib/design/print-formats';
import { hasVariables, extractFieldNames, applyVariableChipStyling, removeVariableChipStyling } from '@/lib/design/variable-parser';
import { VARIABLE_MARKER_STYLES } from '@/lib/design/variable-types';
import { generatePlaceholderQRCode } from '@/lib/qr-generator';

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
  // Dual canvas refs for front and back pages
  const frontCanvasRef = useRef<HTMLCanvasElement>(null);
  const backCanvasRef = useRef<HTMLCanvasElement>(null);

  // Dual canvas state
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [frontCanvas, setFrontCanvas] = useState<Canvas | null>(null);
  const [backCanvas, setBackCanvas] = useState<Canvas | null>(null);

  // ✨ COMPUTED CANVAS: This makes ALL existing code work with zero changes!
  // All 85+ references to `canvas.something()` will automatically use the active canvas
  const canvas = activeSide === 'front' ? frontCanvas : backCanvas;

  // Keep canvasRef for backwards compatibility with existing code that uses it
  const canvasRef = activeSide === 'front' ? frontCanvasRef : backCanvasRef;
  const [currentFormat, setCurrentFormat] = useState<PrintFormat>(
    initialData?.format || format
  );
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState<number>(-1);
  const historyStepRef = useRef<number>(-1); // Sync ref to avoid stale closures
  const isLoadingHistoryRef = useRef<boolean>(false); // Prevent saving during undo/redo
  const [forceUpdate, setForceUpdate] = useState(0);
  const [showLayersPanel, setShowLayersPanel] = useState(true);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true);
  const [showAssetLibrary, setShowAssetLibrary] = useState(false);
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false); // Toggle for showing/hiding variable chip styling

  // Keep ref in sync with state (avoid stale closures)
  useEffect(() => {
    historyStepRef.current = historyStep;
  }, [historyStep]);

  // Initialize Fabric.js canvas (temporarily keeping single canvas while testing infrastructure)
  // TODO: Will update to dual canvas in next step after testing current changes
  useEffect(() => {
    // Use frontCanvasRef as primary for now (backwards compatible)
    if (!frontCanvasRef.current) return;

    console.log(`🎨 Initializing canvas with format: ${currentFormat.name}`);
    console.log(`   Dimensions: ${currentFormat.widthPixels}px × ${currentFormat.heightPixels}px (${currentFormat.widthInches}" × ${currentFormat.heightInches}" at ${currentFormat.dpi} DPI)`);

    // Declare variables in useEffect scope so cleanup can access them
    let handleKeyDown: ((e: KeyboardEvent) => void) | null = null;
    let fabricCanvas: Canvas | null = null;

    // Small delay to ensure DOM is ready and previous canvas is disposed
    const initTimeout = setTimeout(() => {
      if (!frontCanvasRef.current) return;

      // Create canvas with format dimensions (using frontCanvas for now)
      fabricCanvas = new Canvas(frontCanvasRef.current, {
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
                // NOTE: Skip border styling for image objects (causes zoom drift bug in Fabric.js)
                const isImageObject = obj.type === 'image';

                if (mapping.variableType && mapping.variableType !== 'none' && !isImageObject) {
                  obj.set({
                    borderColor: '#9333ea',
                    borderScaleFactor: 3,
                    borderDashArray: [5, 5],
                    cornerColor: '#9333ea',
                    cornerSize: 8,
                    transparentCorners: false,
                  } as any);
                }
                // For image objects, metadata is set but no visual border (prevents drift)
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

    // Handle textbox scaling: convert scaleY to height to prevent text distortion
    fabricCanvas.on('object:scaling', (e: any) => {
      const obj = e.target;
      if (obj && (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text')) {
        // For horizontal scaling (width change)
        if (obj.scaleX && obj.scaleX !== 1) {
          const newWidth = (obj.width || 100) * obj.scaleX;
          obj.set({
            width: newWidth,
            scaleX: 1,
          });
        }

        // For vertical scaling (height change) - convert to height property
        if (obj.scaleY && obj.scaleY !== 1) {
          const newHeight = (obj.height || 100) * obj.scaleY;
          obj.set({
            height: newHeight,
            scaleY: 1,
          });
        }

        obj.setCoords();
        fabricCanvas.renderAll();
      }
    });

    // Listen for selection changes
    fabricCanvas.on('selection:created', (e: any) => setSelectedObject(e.selected?.[0] || null));
    fabricCanvas.on('selection:updated', (e: any) => setSelectedObject(e.selected?.[0] || null));
    fabricCanvas.on('selection:cleared', () => setSelectedObject(null));

    // Auto-detect variables in text using {variableName} syntax
    fabricCanvas.on('text:changed', (e: any) => {
      const textObj = e.target;
      if (textObj && (textObj.type === 'textbox' || textObj.type === 'i-text' || textObj.type === 'text')) {
        const textContent = textObj.text || '';
        const previousFieldNames = textObj.variableFieldNames || [];

        // Check if text contains variables like {firstName}, {lastName}, etc.
        if (hasVariables(textContent)) {
          const fieldNames = extractFieldNames(textContent);

          // Check if variable list changed (only show toast when variables actually change)
          const fieldNamesChanged =
            previousFieldNames.length !== fieldNames.length ||
            !previousFieldNames.every((name: string) => fieldNames.includes(name)) ||
            !fieldNames.every((name: string) => previousFieldNames.includes(name));

          // Mark as variable type 'custom'
          textObj.set({
            variableType: 'custom',
            variableFieldNames: fieldNames, // Store detected field names
            isReusable: false,
            // Apply visual styling (purple border)
            borderColor: VARIABLE_MARKER_STYLES.borderColor,
            borderScaleFactor: VARIABLE_MARKER_STYLES.borderWidth,
            borderDashArray: VARIABLE_MARKER_STYLES.borderDashArray,
            cornerColor: VARIABLE_MARKER_STYLES.cornerColor,
            cornerSize: VARIABLE_MARKER_STYLES.cornerSize,
            transparentCorners: VARIABLE_MARKER_STYLES.transparentCorners,
          });

          // Apply chip-style highlighting (purple text + background) to {variable} text
          // Only apply if NOT in Preview Mode
          if (!isPreviewMode) {
            applyVariableChipStyling(textObj);
          }

          // Only show toast if variables changed
          if (fieldNamesChanged) {
            console.log(`🔮 Auto-detected ${fieldNames.length} variable(s):`, fieldNames.join(', '));
            toast.success(`Detected ${fieldNames.length} variable${fieldNames.length > 1 ? 's' : ''}: ${fieldNames.join(', ')}`);
          }
        } else {
          // Remove variable styling if no variables detected
          if (textObj.variableType === 'custom') {
            textObj.set({
              variableType: 'none',
              variableFieldNames: undefined,
              borderColor: '#000000',
              borderScaleFactor: 1,
              borderDashArray: null,
              cornerColor: '#000000',
              cornerSize: 7,
              transparentCorners: false,
            });
          }
        }

        textObj.setCoords();
        fabricCanvas.renderAll();
      }
    });

    // Set as front canvas (activeSide starts as 'front', so computed canvas will reference this)
    setFrontCanvas(fabricCanvas);

    // Initialize back canvas as null for now (will create in next step)
    setBackCanvas(null);

    // Keyboard event handler for delete functionality
    handleKeyDown = (e: KeyboardEvent) => {
      const activeObject = fabricCanvas.getActiveObject();
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      // Undo/Redo shortcuts (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z)
      if (cmdKey && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          // Redo
          handleRedo();
        } else {
          // Undo
          handleUndo();
        }
        return;
      }

      // Text formatting shortcuts (only when text is selected, NOT editing)
      if (activeObject && (activeObject.type === 'i-text' || activeObject.type === 'text' || activeObject.type === 'textbox')) {
        const isEditingText = (activeObject as any).isEditing;

        // Only apply shortcuts when text object is selected but NOT being edited
        if (!isEditingText && cmdKey) {
          const textObj = activeObject as any;

          // Cmd/Ctrl+B - Bold
          if (e.key === 'b' || e.key === 'B') {
            e.preventDefault();
            const newWeight = textObj.fontWeight === 700 ? 400 : 700;
            textObj.set('fontWeight', newWeight);
            textObj.setCoords();
            fabricCanvas.renderAll();
            saveToHistory(fabricCanvas);
            toast.success(newWeight === 700 ? 'Bold applied' : 'Bold removed');
            return;
          }

          // Cmd/Ctrl+I - Italic
          if (e.key === 'i' || e.key === 'I') {
            e.preventDefault();
            const newStyle = textObj.fontStyle === 'italic' ? 'normal' : 'italic';
            textObj.set('fontStyle', newStyle);
            textObj.setCoords();
            fabricCanvas.renderAll();
            saveToHistory(fabricCanvas);
            toast.success(newStyle === 'italic' ? 'Italic applied' : 'Italic removed');
            return;
          }

          // Cmd/Ctrl+U - Underline
          if (e.key === 'u' || e.key === 'U') {
            e.preventDefault();
            const newUnderline = !textObj.underline;
            textObj.set('underline', newUnderline);
            textObj.setCoords();
            fabricCanvas.renderAll();
            saveToHistory(fabricCanvas);
            toast.success(newUnderline ? 'Underline applied' : 'Underline removed');
            return;
          }

          // Cmd/Ctrl+Shift+L - Align Left
          if (e.shiftKey && (e.key === 'l' || e.key === 'L')) {
            e.preventDefault();
            textObj.set('textAlign', 'left');
            textObj.setCoords();
            fabricCanvas.renderAll();
            saveToHistory(fabricCanvas);
            toast.success('Aligned left');
            return;
          }

          // Cmd/Ctrl+Shift+E - Align Center
          if (e.shiftKey && (e.key === 'e' || e.key === 'E')) {
            e.preventDefault();
            textObj.set('textAlign', 'center');
            textObj.setCoords();
            fabricCanvas.renderAll();
            saveToHistory(fabricCanvas);
            toast.success('Aligned center');
            return;
          }

          // Cmd/Ctrl+Shift+R - Align Right
          if (e.shiftKey && (e.key === 'r' || e.key === 'R')) {
            e.preventDefault();
            textObj.set('textAlign', 'right');
            textObj.setCoords();
            fabricCanvas.renderAll();
            saveToHistory(fabricCanvas);
            toast.success('Aligned right');
            return;
          }
        }
      }

      // Delete/Backspace - Remove selected object
      if (e.key === 'Delete' || e.key === 'Backspace') {
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

        // 🚨 CRITICAL FIX: DO NOT call setZoom() - it corrupts object coordinates!
        // Only use CSS-only scaling to preserve logical canvas dimensions
        // Internal canvas stays at 1800x1200 (or whatever format) for correct object positioning
        // CSS scaling handles visual zoom for display
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

  // Save canvas state to history
  const saveToHistory = useCallback((canvas: Canvas) => {
    // Skip if we're loading history (undo/redo in progress)
    if (isLoadingHistoryRef.current) {
      console.log('⏭️ SKIPPING SAVE - Loading flag is TRUE (undo/redo in progress)');
      return;
    }

    try {
      const json = JSON.stringify(canvas.toJSON());
      const currentStep = historyStepRef.current; // Use ref for current value
      console.log('💾 Saving to history, current step:', currentStep, '| loading flag:', isLoadingHistoryRef.current);

      setHistory(prev => {
        // Truncate future history if we're not at the end
        const newHistory = prev.slice(0, currentStep + 1);
        // Add new state
        newHistory.push(json);
        // Keep last 100 states (increased from 50 for better UX)
        const trimmed = newHistory.slice(-100);
        console.log('📚 History updated, new length:', trimmed.length);
        console.log('   Trimmed from step:', currentStep + 1, 'items in history:', prev.length, '→', trimmed.length);
        return trimmed;
      });

      // Update step
      const newStep = Math.min(currentStep + 1, 99); // Max 100 states (0-99)
      historyStepRef.current = newStep; // Update ref immediately
      setHistoryStep(newStep);
      console.log('📍 History step updated:', currentStep, '→', newStep);
    } catch (error) {
      console.error('❌ Failed to save history:', error);
    }
  }, []); // No dependencies - uses ref for current step

  // Undo
  const handleUndo = useCallback(() => {
    const currentStep = historyStepRef.current;
    console.log('⏪ UNDO CLICKED - historyStep:', currentStep, 'history length:', history.length);

    if (!canvas) {
      console.warn('⚠️ No canvas available');
      return;
    }

    if (currentStep <= 0) {
      console.warn('⚠️ Already at oldest state');
      toast.info('Nothing to undo');
      return;
    }

    const newStep = currentStep - 1;
    const historyData = history[newStep];

    if (!historyData) {
      console.warn('⚠️ No history data at step', newStep);
      console.warn('   History array:', history);
      toast.error('History data not found');
      return;
    }

    try {
      console.log('🔄 Parsing history data...');
      const jsonData = JSON.parse(historyData);
      console.log('✅ JSON parsed, loading to canvas...');

      // Set flag to prevent saving during load
      console.log('🚫 Setting loading flag TRUE - blocking all saves');
      isLoadingHistoryRef.current = true;

      canvas.loadFromJSON(jsonData, () => {
        console.log('✅ loadFromJSON callback started');
        console.log('   Loading flag:', isLoadingHistoryRef.current);

        canvas.renderAll();
        console.log('   renderAll() called');

        historyStepRef.current = newStep; // Update ref immediately
        setHistoryStep(newStep);
        console.log('   History step updated to:', newStep);

        canvas.discardActiveObject(); // Clear selection after undo
        console.log('   discardActiveObject() called');

        canvas.requestRenderAll();
        console.log('   requestRenderAll() called');

        // CRITICAL: Delay clearing flag to allow async events to finish
        console.log('⏳ Waiting 100ms before clearing loading flag...');
        setTimeout(() => {
          isLoadingHistoryRef.current = false;
          console.log('✅ UNDO COMPLETE - Loading flag cleared, new step:', newStep);
          toast.success(`Undo (${history.length - newStep - 1} more available)`);
        }, 100);
      });
    } catch (error) {
      console.error('❌ Undo failed:', error);
      isLoadingHistoryRef.current = false; // Clear flag on error
      toast.error('Failed to undo');
    }
  }, [canvas, history]); // historyStep removed - using ref instead

  // Redo
  const handleRedo = useCallback(() => {
    const currentStep = historyStepRef.current;
    console.log('⏩ REDO CLICKED - historyStep:', currentStep, 'history length:', history.length);

    if (!canvas) {
      console.warn('⚠️ No canvas available');
      return;
    }

    if (currentStep >= history.length - 1) {
      console.warn('⚠️ Already at newest state');
      toast.info('Nothing to redo');
      return;
    }

    const newStep = currentStep + 1;
    const historyData = history[newStep];

    if (!historyData) {
      console.warn('⚠️ No history data at step', newStep);
      console.warn('   History array:', history);
      toast.error('History data not found');
      return;
    }

    try {
      console.log('🔄 Parsing history data...');
      const jsonData = JSON.parse(historyData);
      console.log('✅ JSON parsed, loading to canvas...');

      // Set flag to prevent saving during load
      console.log('🚫 Setting loading flag TRUE - blocking all saves');
      isLoadingHistoryRef.current = true;

      canvas.loadFromJSON(jsonData, () => {
        console.log('✅ loadFromJSON callback started');
        console.log('   Loading flag:', isLoadingHistoryRef.current);

        canvas.renderAll();
        console.log('   renderAll() called');

        historyStepRef.current = newStep; // Update ref immediately
        setHistoryStep(newStep);
        console.log('   History step updated to:', newStep);

        canvas.discardActiveObject(); // Clear selection after redo
        console.log('   discardActiveObject() called');

        canvas.requestRenderAll();
        console.log('   requestRenderAll() called');

        // CRITICAL: Delay clearing flag to allow async events to finish
        console.log('⏳ Waiting 100ms before clearing loading flag...');
        setTimeout(() => {
          isLoadingHistoryRef.current = false;
          const remainingRedos = history.length - newStep - 1;
          console.log('✅ REDO COMPLETE - Loading flag cleared, new step:', newStep);
          toast.success(`Redo (${remainingRedos} more available)`);
        }, 100);
      });
    } catch (error) {
      console.error('❌ Redo failed:', error);
      isLoadingHistoryRef.current = false; // Clear flag on error
      toast.error('Failed to redo');
    }
  }, [canvas, history]); // historyStep removed - using ref instead

  // Add text
  const addText = useCallback(() => {
    if (!canvas) return;

    // Use Textbox instead of IText to enable text wrapping and prevent stretching
    const text = new Textbox('Double-click to edit', {
      left: currentFormat.widthPixels / 2 - 300, // Offset by half width
      top: currentFormat.heightPixels / 2 - 50, // Offset by half height
      width: 600, // Default width for text box (wraps at this width)
      fontSize: 60, // Scaled for 300 DPI
      fontFamily: 'Inter',
      fontWeight: 400, // Explicit weight prevents font switching in edit mode
      fill: '#000000',
      textAlign: 'center',
      originX: 'left',
      originY: 'top',
      centeredRotation: true,
      // CRITICAL: Prevent text from stretching when resizing
      lockScalingFlip: true, // Prevent flipping during resize
      lockUniScaling: false, // Allow independent width/height resizing
      // Allow width resizing but text reflows instead of stretching
      splitByGrapheme: true, // Better word wrapping
      // Note: scaleX and scaleY are converted to width/height by object:scaling event
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();

    // Save to history
    saveToHistory(canvas);

    toast.success('Text box added! Resize width to wrap text.');
  }, [canvas, currentFormat, saveToHistory]);

  // Add Title (H1 - Large heading style)
  const addTitle = useCallback(() => {
    if (!canvas) return;

    const title = new Textbox('Your Title Here', {
      left: currentFormat.widthPixels / 2 - 400,
      top: 100,
      width: 800,
      fontSize: 96, // Large title size
      fontFamily: 'Inter',
      fontWeight: 800, // ExtraBold
      fill: '#000000',
      textAlign: 'center',
      originX: 'left',
      originY: 'top',
      centeredRotation: true,
      lockScalingFlip: true,
      lockUniScaling: false,
      splitByGrapheme: true,
    });

    canvas.add(title);
    canvas.setActiveObject(title);
    canvas.renderAll();
    saveToHistory(canvas);
    toast.success('Title added (H1)');
  }, [canvas, currentFormat, saveToHistory]);

  // Add Heading (H2 - Section heading style)
  const addHeading = useCallback(() => {
    if (!canvas) return;

    const heading = new Textbox('Section Heading', {
      left: 100,
      top: 250,
      width: 700,
      fontSize: 72, // Medium heading size
      fontFamily: 'Inter',
      fontWeight: 700, // Bold
      fill: '#000000',
      textAlign: 'left',
      originX: 'left',
      originY: 'top',
      centeredRotation: true,
      lockScalingFlip: true,
      lockUniScaling: false,
      splitByGrapheme: true,
    });

    canvas.add(heading);
    canvas.setActiveObject(heading);
    canvas.renderAll();
    saveToHistory(canvas);
    toast.success('Heading added (H2)');
  }, [canvas, currentFormat, saveToHistory]);

  // Add Subheading (H3 - Subsection heading style)
  const addSubheading = useCallback(() => {
    if (!canvas) return;

    const subheading = new Textbox('Subheading Text', {
      left: 100,
      top: 400,
      width: 600,
      fontSize: 48, // Smaller heading size
      fontFamily: 'Inter',
      fontWeight: 600, // SemiBold
      fill: '#000000',
      textAlign: 'left',
      originX: 'left',
      originY: 'top',
      centeredRotation: true,
      lockScalingFlip: true,
      lockUniScaling: false,
      splitByGrapheme: true,
    });

    canvas.add(subheading);
    canvas.setActiveObject(subheading);
    canvas.renderAll();
    saveToHistory(canvas);
    toast.success('Subheading added (H3)');
  }, [canvas, currentFormat, saveToHistory]);

  // Add Body Text (Regular paragraph text)
  const addBodyText = useCallback(() => {
    if (!canvas) return;

    const bodyText = new Textbox('Start typing your body text here. This is perfect for paragraphs and longer content.', {
      left: 100,
      top: 550,
      width: 800,
      fontSize: 32, // Regular body text size
      fontFamily: 'Inter',
      fontWeight: 400, // Regular
      fill: '#000000',
      textAlign: 'left',
      lineHeight: 1.5, // Better readability
      originX: 'left',
      originY: 'top',
      centeredRotation: true,
      lockScalingFlip: true,
      lockUniScaling: false,
      splitByGrapheme: true,
    });

    canvas.add(bodyText);
    canvas.setActiveObject(bodyText);
    canvas.renderAll();
    saveToHistory(canvas);
    toast.success('Body text added');
  }, [canvas, currentFormat, saveToHistory]);

  // Add Caption (Small supplementary text)
  const addCaption = useCallback(() => {
    if (!canvas) return;

    const caption = new Textbox('Caption or small text', {
      left: 100,
      top: 750,
      width: 500,
      fontSize: 20, // Small caption size
      fontFamily: 'Inter',
      fontWeight: 300, // Light
      fill: '#666666',
      textAlign: 'left',
      originX: 'left',
      originY: 'top',
      centeredRotation: true,
      lockScalingFlip: true,
      lockUniScaling: false,
      splitByGrapheme: true,
    });

    canvas.add(caption);
    canvas.setActiveObject(caption);
    canvas.renderAll();
    saveToHistory(canvas);
    toast.success('Caption added');
  }, [canvas, currentFormat, saveToHistory]);

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
            top: currentFormat.widthPixels / 2,
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
  }, [canvas, currentFormat]);

  // Add QR code placeholder
  const addQRCode = useCallback(async () => {
    if (!canvas) return;

    try {
      // Show loading toast
      const loadingToast = toast.loading('Generating QR code placeholder...');

      // Generate placeholder QR code
      const qrDataUrl = await generatePlaceholderQRCode();

      // Create Fabric image from QR code
      const qrImg = await FabricImage.fromURL(qrDataUrl);

      // EXACT COPY of regular image scaling - DO NOT CHANGE ANYTHING!
      const maxWidth = currentFormat.widthPixels * 0.5;
      const scale = maxWidth / (qrImg.width || 1);

      // EXACT COPY of regular image positioning - DO NOT CHANGE ANYTHING!
      qrImg.set({
        left: currentFormat.widthPixels / 2,
        top: currentFormat.widthPixels / 2,
        scaleX: scale,
        scaleY: scale,
        originX: 'center',
        originY: 'center',
        centeredRotation: true,
      });

      // CRITICAL: Mark as variable element for batch replacement
      // Each recipient will get a unique QR code with tracking URL
      (qrImg as any).variableType = 'qrCode';
      (qrImg as any).isReusable = false; // Each contact gets unique QR code

      canvas.add(qrImg);
      canvas.setActiveObject(qrImg);
      canvas.renderAll();

      // Dismiss loading and show success
      toast.dismiss(loadingToast);
      toast.success('QR code placeholder added! Will be replaced with unique codes during generation.');
    } catch (error) {
      console.error('Failed to add QR code:', error);
      toast.error('Failed to add QR code placeholder');
    }
  }, [canvas, currentFormat, saveToHistory]);

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

    // Get current CSS dimensions (BOTH width AND height!)
    const currentWidth = parseInt(canvas.lowerCanvasEl.style.width) || currentFormat.widthPixels;
    const currentHeight = parseInt(canvas.lowerCanvasEl.style.height) || currentFormat.heightPixels;

    // Scale BOTH dimensions independently to maintain aspect ratio
    const newWidth = Math.min(currentWidth * 1.2, currentFormat.widthPixels * 3);
    const newHeight = Math.min(currentHeight * 1.2, currentFormat.heightPixels * 3);

    // CORRECT FIX: Only use CSS scaling (cssOnly: true) WITHOUT setZoom()
    // This prevents double-transform: CSS stretch alone scales both canvas AND content proportionally
    canvas.setDimensions({
      width: newWidth,
      height: newHeight
    }, { cssOnly: true });

    // DON'T call setZoom() - CSS scaling handles everything!
    canvas.renderAll();

    setForceUpdate(prev => prev + 1);
  }, [canvas, currentFormat]);

  // Zoom out
  const zoomOut = useCallback(() => {
    if (!canvas) return;

    // Get current CSS dimensions (BOTH width AND height!)
    const currentWidth = parseInt(canvas.lowerCanvasEl.style.width) || currentFormat.widthPixels;
    const currentHeight = parseInt(canvas.lowerCanvasEl.style.height) || currentFormat.heightPixels;

    // Scale BOTH dimensions independently to maintain aspect ratio
    const newWidth = Math.max(currentWidth / 1.2, currentFormat.widthPixels * 0.1);
    const newHeight = Math.max(currentHeight / 1.2, currentFormat.heightPixels * 0.1);

    // CORRECT FIX: Only use CSS scaling (cssOnly: true) WITHOUT setZoom()
    canvas.setDimensions({
      width: newWidth,
      height: newHeight
    }, { cssOnly: true });

    // DON'T call setZoom() - CSS scaling handles everything!
    canvas.renderAll();

    setForceUpdate(prev => prev + 1);
  }, [canvas, currentFormat]);

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

    // CORRECT FIX: Only use CSS scaling (cssOnly: true) WITHOUT setZoom()
    canvas.setDimensions({
      width: currentFormat.widthPixels * scale,
      height: currentFormat.heightPixels * scale
    }, { cssOnly: true });

    // DON'T call setZoom() - CSS scaling handles everything!
    canvas.renderAll();

    setForceUpdate(prev => prev + 1);
  }, [canvas, currentFormat]);

  // Save template
  const handleSave = useCallback(() => {
    if (!canvas || !onSave) return;

    try {
      // 🚨 Since we NEVER use setZoom(), canvas is always at zoom=1 and viewport=[1,0,0,1,0,0]
      // We only need to save current CSS display dimensions, then reset for export
      const currentWidth = canvas.getWidth();
      const currentHeight = canvas.getHeight();

      console.log('💾 [SAVE] Current state:', {
        zoom: canvas.getZoom(), // Should always be 1
        viewport: canvas.viewportTransform,
        cssWidth: currentWidth,
        cssHeight: currentHeight,
        logicalWidth: currentFormat.widthPixels,
        logicalHeight: currentFormat.heightPixels,
      });

      // Reset CSS dimensions to full resolution for clean export
      canvas.setDimensions({
        width: currentFormat.widthPixels,
        height: currentFormat.heightPixels
      }, { cssOnly: true });
      canvas.renderAll();

      // Get canvas JSON (should have correct coordinates since zoom is always 1)
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

      console.log('💾 [SAVE] Object positions:', objects.map((obj: any) => ({
        type: obj.type,
        left: obj.left,
        top: obj.top,
        text: obj.type === 'Textbox' ? obj.text : undefined,
      })));

      // Generate preview image
      const preview = canvas.toDataURL({
        format: 'png',
        quality: 0.8,
        multiplier: 0.2, // Small preview (20% of full size)
      });

      // Restore CSS display dimensions (for user to continue editing)
      canvas.setDimensions({
        width: currentWidth,
        height: currentHeight
      }, { cssOnly: true });
      canvas.renderAll();

      console.log('💾 [SAVE] Complete - restored display dimensions');

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

    try {
      console.log('📥 Starting PNG export...');
      console.log('   Canvas dimensions (internal):', currentFormat.widthPixels, 'x', currentFormat.heightPixels);

      // Save current viewport and display state
      const currentZoom = canvas.getZoom();
      const currentVpt = canvas.viewportTransform ? [...canvas.viewportTransform] : [1, 0, 0, 1, 0, 0];
      console.log('   Current zoom:', currentZoom);
      console.log('   Current viewport:', currentVpt);

      // Get current CSS dimensions
      const currentWidth = canvas.getWidth();
      const currentHeight = canvas.getHeight();
      console.log('   Current CSS dimensions:', currentWidth, 'x', currentHeight);

      // Reset to full resolution for export
      // 1. Reset zoom to 1:1
      canvas.setZoom(1);

      // 2. Reset viewport transform to identity
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

      // 3. Reset CSS dimensions to match internal dimensions
      canvas.setDimensions({
        width: currentFormat.widthPixels,
        height: currentFormat.heightPixels
      }, { cssOnly: true });

      // 4. Force re-render at full resolution
      canvas.renderAll();
      console.log('✅ Canvas reset to full resolution for export');

      // Export at full resolution
      const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 1.0,
        multiplier: 1, // Export at actual canvas internal dimensions (300 DPI)
      });

      console.log('✅ Canvas exported to data URL');
      console.log('   Data URL length:', dataURL.length, 'characters');

      // Restore original state
      // 1. Restore viewport transform to identity (no pan/offset)
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

      // 2. Keep zoom at 1.0 (NEVER restore a potentially corrupted zoom)
      canvas.setZoom(1);

      // 3. Restore CSS display dimensions
      canvas.setDimensions({
        width: currentWidth,
        height: currentHeight
      }, { cssOnly: true });

      // 4. Force re-render with restored state
      canvas.renderAll();
      console.log('✅ Canvas state restored (zoom locked at 1.0)');

      // Download the image
      const link = document.createElement('a');
      link.download = `design-${currentFormat.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
      link.href = dataURL;
      link.click();

      toast.success(`Exported ${currentFormat.name} at ${currentFormat.widthPixels}×${currentFormat.heightPixels}px!`);
      console.log('✅ PNG export complete');
    } catch (error) {
      console.error('❌ Export failed:', error);
      toast.error('Failed to export PNG');
    }
  }, [canvas, currentFormat]);

  // Toggle Preview Mode (show/hide variable chip styling)
  const togglePreviewMode = useCallback(() => {
    if (!canvas) return;

    const newPreviewMode = !isPreviewMode;
    setIsPreviewMode(newPreviewMode);

    // Apply or remove chip styling from all text objects with variables
    const objects = canvas.getObjects();
    objects.forEach((obj: any) => {
      if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
        const textContent = obj.text || '';

        if (hasVariables(textContent)) {
          if (newPreviewMode) {
            // Preview Mode: Remove chip styling (plain text)
            removeVariableChipStyling(obj);
          } else {
            // Edit Mode: Apply chip styling (purple text + background)
            applyVariableChipStyling(obj);
          }
        }
      }
    });

    canvas.renderAll();
    toast.success(newPreviewMode ? 'Preview Mode (variables as plain text)' : 'Edit Mode (variables highlighted)');
  }, [canvas, isPreviewMode]);

  // Trigger re-render when panels update canvas
  const handleCanvasUpdate = useCallback(() => {
    if (canvas) {
      canvas.renderAll();

      // Save to history for property changes (color, opacity, etc.)
      // This ensures undo/redo works for PropertyPanel changes
      // The saveToHistory function already checks isLoadingHistoryRef to skip during undo/redo
      console.log('🎨 Property changed via panel, saving to history');
      saveToHistory(canvas);
    }
    setForceUpdate(prev => prev + 1);
  }, [canvas, saveToHistory]);

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
          {/* Text Presets Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 hover:bg-slate-100 gap-1"
                title="Add Text"
              >
                <Type className="h-4 w-4" />
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => { setSelectedTool('text'); addTitle(); }} className="cursor-pointer">
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-sm">Title (H1)</span>
                  <span className="text-xs text-muted-foreground">96px Inter</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSelectedTool('text'); addHeading(); }} className="cursor-pointer">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-sm">Heading (H2)</span>
                  <span className="text-xs text-muted-foreground">72px Inter</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSelectedTool('text'); addSubheading(); }} className="cursor-pointer">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-sm">Subheading (H3)</span>
                  <span className="text-xs text-muted-foreground">48px Inter</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setSelectedTool('text'); addBodyText(); }} className="cursor-pointer">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm">Body Text</span>
                  <span className="text-xs text-muted-foreground">32px Inter Regular</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSelectedTool('text'); addCaption(); }} className="cursor-pointer">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs">Caption</span>
                  <span className="text-xs text-muted-foreground">20px Inter Light</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setSelectedTool('text'); addText(); }} className="cursor-pointer">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm">Custom Text</span>
                  <span className="text-xs text-muted-foreground">60px Inter</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-slate-100 hover:bg-purple-50 hover:text-purple-700"
            onClick={() => { setSelectedTool('qrcode'); addQRCode(); }}
            title="Add QR Code (for tracking)"
          >
            <QrCode className="h-4 w-4" />
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

          <div className="w-px h-5 bg-slate-200 mx-1" />

          {/* Preview Mode Toggle - Shows action to take, not current state */}
          <Button
            variant={isPreviewMode ? "default" : "ghost"}
            size="sm"
            className={`h-8 text-xs ${isPreviewMode ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'hover:bg-slate-100'}`}
            onClick={togglePreviewMode}
            title={isPreviewMode ? 'Switch to Edit Mode (show variable styling)' : 'Switch to Preview Mode (hide variable styling)'}
          >
            {isPreviewMode ? (
              <>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                Preview
              </>
            )}
          </Button>

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
              {/* Front canvas (visible for now - will add tabs in next step) */}
              <canvas ref={frontCanvasRef} />
              {/* Back canvas (hidden for now - will add tabs + visibility toggle in next step) */}
              <canvas ref={backCanvasRef} style={{ display: 'none' }} />

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
          <div className="w-72 flex-shrink-0 bg-white border-l border-slate-200">
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
