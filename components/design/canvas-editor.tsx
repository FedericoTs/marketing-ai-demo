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
  FileCheck,
  Mail
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
import { getAddressBlockZone, type AddressBlockZone } from '@/lib/database/types';

export interface CanvasEditorProps {
  format?: PrintFormat; // Print format (defaults to 4x6 postcard)
  onFormatChange?: (format: PrintFormat) => void;
  onSave?: (data: {
    canvasJSON: string;
    variableMappings: Record<string, any>;
    preview: string;
    format: PrintFormat;
    surfaces?: any[]; // NEW: Multi-surface support (front + back)
  }) => void;
  initialData?: {
    canvasJSON?: string;
    variableMappings?: Record<string, any>;
    format?: PrintFormat;
    surfaces?: any[]; // NEW: Multi-surface support for loading templates
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
  const [currentScale, setCurrentScale] = useState<number>(1); // Track current canvas scale for zoom display

  // Pan/zoom navigation state (Adobe XD/Figma style)
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Keep ref in sync with state (avoid stale closures)
  useEffect(() => {
    historyStepRef.current = historyStep;
  }, [historyStep]);

  // Initialize Fabric.js canvas with DUAL canvas support (front + back)
  useEffect(() => {
    if (!frontCanvasRef.current || !backCanvasRef.current) return;

    console.log(`🎨 Initializing DUAL canvas with format: ${currentFormat.name}`);
    console.log(`   Dimensions: ${currentFormat.widthPixels}px × ${currentFormat.heightPixels}px (${currentFormat.widthInches}" × ${currentFormat.heightInches}" at ${currentFormat.dpi} DPI)`);

    // Declare variables in useEffect scope so cleanup can access them
    let handleKeyDown: ((e: KeyboardEvent) => void) | null = null;
    let fabricFrontCanvas: Canvas | null = null;
    let fabricBackCanvas: Canvas | null = null;

    // Helper function to attach all event listeners to a canvas (avoid code duplication)
    const attachCanvasEventListeners = (canvas: Canvas) => {
      // Listen for object modifications
      canvas.on('object:modified', () => saveToHistory(canvas));
      canvas.on('object:added', () => saveToHistory(canvas));
      canvas.on('object:removed', () => saveToHistory(canvas));

      // Handle textbox scaling: convert scaleY to height to prevent text distortion
      canvas.on('object:scaling', (e: any) => {
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
          canvas.renderAll();
        }
      });

      // Listen for selection changes
      canvas.on('selection:created', (e: any) => setSelectedObject(e.selected?.[0] || null));
      canvas.on('selection:updated', (e: any) => setSelectedObject(e.selected?.[0] || null));
      canvas.on('selection:cleared', () => setSelectedObject(null));

      // Auto-detect variables in text using {variableName} syntax
      canvas.on('text:changed', (e: any) => {
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
          canvas.renderAll();
        }
      });
    };

    // Small delay to ensure DOM is ready and previous canvas is disposed
    const initTimeout = setTimeout(() => {
      if (!frontCanvasRef.current || !backCanvasRef.current) return;

      // ========================================
      // CREATE FRONT CANVAS
      // ========================================
      console.log('📄 Creating FRONT canvas...');
      fabricFrontCanvas = new Canvas(frontCanvasRef.current, {
        width: currentFormat.widthPixels,
        height: currentFormat.heightPixels,
        backgroundColor: '#ffffff',
      });

      // Load FRONT surface data (backwards compatible with old canvasJSON field)
      const frontData = initialData?.surfaces?.[0]?.canvas_json || initialData?.canvasJSON;
      if (frontData) {
        console.log('📂 Loading FRONT canvas from JSON data...');
        const frontJSON = typeof frontData === 'string' ? frontData : JSON.stringify(frontData);
        fabricFrontCanvas.loadFromJSON(frontJSON, () => {
          console.log('✅ Front canvas JSON loaded, rendering...');
          if (!fabricFrontCanvas) return; // Guard for TypeScript
          fabricFrontCanvas.renderAll();

          // Apply variable mappings (try surfaces[0] first, fallback to old variableMappings)
          const frontMappings = initialData?.surfaces?.[0]?.variable_mappings || initialData?.variableMappings;
          const objects = fabricFrontCanvas.getObjects();

          if (frontMappings && Object.keys(frontMappings).length > 0) {
            console.log('🏷️ Applying stored variable mappings to FRONT canvas...');
            Object.entries(frontMappings).forEach(([idx, mapping]: [string, any]) => {
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
              }
            });
          }

          // CRITICAL: Also scan all text objects for {variables} to detect any variables
          // that weren't stored in mappings (e.g., templates created before variable tracking)
          console.log('🔍 Scanning FRONT canvas text objects for variables...');
          objects.forEach((obj: any) => {
            if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
              const textContent = obj.text || '';
              if (hasVariables(textContent)) {
                const fieldNames = extractFieldNames(textContent);
                console.log(`   Found variables in text object:`, fieldNames);

                // Set variable type and field names
                obj.set({
                  variableType: 'custom',
                  variableFieldNames: fieldNames,
                  isReusable: false,
                  borderColor: VARIABLE_MARKER_STYLES.borderColor,
                  borderScaleFactor: VARIABLE_MARKER_STYLES.borderWidth,
                  borderDashArray: VARIABLE_MARKER_STYLES.borderDashArray,
                  cornerColor: VARIABLE_MARKER_STYLES.cornerColor,
                  cornerSize: VARIABLE_MARKER_STYLES.cornerSize,
                  transparentCorners: VARIABLE_MARKER_STYLES.transparentCorners,
                });

                // Apply chip styling to variable text
                if (!isPreviewMode) {
                  applyVariableChipStyling(obj);
                }
              }
            }
          });

          fabricFrontCanvas.renderAll();
          console.log('✅ Variable detection complete for FRONT canvas');
        });
      }

      // Save initial state to history
      saveToHistory(fabricFrontCanvas);

      // Attach event listeners to FRONT canvas
      attachCanvasEventListeners(fabricFrontCanvas);

      // ========================================
      // CREATE BACK CANVAS
      // ========================================
      console.log('📄 Creating BACK canvas...');
      fabricBackCanvas = new Canvas(backCanvasRef.current, {
        width: currentFormat.widthPixels,
        height: currentFormat.heightPixels,
        backgroundColor: '#ffffff',
      });

      // Load BACK surface data (if exists - new templates only)
      const backData = initialData?.surfaces?.[1]?.canvas_json;
      if (backData) {
        console.log('📂 Loading BACK canvas from JSON data...');
        const backJSON = typeof backData === 'string' ? backData : JSON.stringify(backData);
        fabricBackCanvas.loadFromJSON(backJSON, () => {
          console.log('✅ Back canvas JSON loaded, rendering...');
          if (!fabricBackCanvas) return; // Guard for TypeScript
          fabricBackCanvas.renderAll();

          // Apply variable mappings to back canvas
          const backMappings = initialData?.surfaces?.[1]?.variable_mappings;
          const objects = fabricBackCanvas.getObjects();

          if (backMappings && Object.keys(backMappings).length > 0) {
            console.log('🏷️ Applying stored variable mappings to BACK canvas...');
            Object.entries(backMappings).forEach(([idx, mapping]: [string, any]) => {
              const index = parseInt(idx);
              if (objects[index]) {
                const obj = objects[index];
                (obj as any).variableType = mapping.variableType;
                (obj as any).isReusable = mapping.isReusable;

                // Apply visual styling for variables
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
              }
            });
          }

          // CRITICAL: Also scan all text objects for {variables} to detect any variables
          // that weren't stored in mappings (e.g., templates created before variable tracking)
          console.log('🔍 Scanning BACK canvas text objects for variables...');
          objects.forEach((obj: any) => {
            if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
              const textContent = obj.text || '';
              if (hasVariables(textContent)) {
                const fieldNames = extractFieldNames(textContent);
                console.log(`   Found variables in text object:`, fieldNames);

                // Set variable type and field names
                obj.set({
                  variableType: 'custom',
                  variableFieldNames: fieldNames,
                  isReusable: false,
                  borderColor: VARIABLE_MARKER_STYLES.borderColor,
                  borderScaleFactor: VARIABLE_MARKER_STYLES.borderWidth,
                  borderDashArray: VARIABLE_MARKER_STYLES.borderDashArray,
                  cornerColor: VARIABLE_MARKER_STYLES.cornerColor,
                  cornerSize: VARIABLE_MARKER_STYLES.cornerSize,
                  transparentCorners: VARIABLE_MARKER_STYLES.transparentCorners,
                });

                // Apply chip styling to variable text
                if (!isPreviewMode) {
                  applyVariableChipStyling(obj);
                }
              }
            }
          });

          fabricBackCanvas.renderAll();
          console.log('✅ Variable detection complete for BACK canvas');
        });
      } else {
        console.log('ℹ️ No back surface data found - blank back canvas ready for design');
      }

      // Save initial state to history for back canvas
      saveToHistory(fabricBackCanvas);

      // Attach event listeners to BACK canvas
      attachCanvasEventListeners(fabricBackCanvas);

      // NOTE: Don't set state yet - wait until after auto-fit completes
      // Otherwise tab switch useEffect will run before dimensions are set

    // Keyboard event handler for delete functionality
    handleKeyDown = (e: KeyboardEvent) => {
      // Use the ACTIVE canvas based on current activeSide state
      const activeCanvas = activeSide === 'front' ? fabricFrontCanvas : fabricBackCanvas;
      if (!activeCanvas) return;

      const activeObject = activeCanvas.getActiveObject();
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
            activeCanvas.renderAll();
            saveToHistory(activeCanvas);
            toast.success(newWeight === 700 ? 'Bold applied' : 'Bold removed');
            return;
          }

          // Cmd/Ctrl+I - Italic
          if (e.key === 'i' || e.key === 'I') {
            e.preventDefault();
            const newStyle = textObj.fontStyle === 'italic' ? 'normal' : 'italic';
            textObj.set('fontStyle', newStyle);
            textObj.setCoords();
            activeCanvas.renderAll();
            saveToHistory(activeCanvas);
            toast.success(newStyle === 'italic' ? 'Italic applied' : 'Italic removed');
            return;
          }

          // Cmd/Ctrl+U - Underline
          if (e.key === 'u' || e.key === 'U') {
            e.preventDefault();
            const newUnderline = !textObj.underline;
            textObj.set('underline', newUnderline);
            textObj.setCoords();
            activeCanvas.renderAll();
            saveToHistory(activeCanvas);
            toast.success(newUnderline ? 'Underline applied' : 'Underline removed');
            return;
          }

          // Cmd/Ctrl+Shift+L - Align Left
          if (e.shiftKey && (e.key === 'l' || e.key === 'L')) {
            e.preventDefault();
            textObj.set('textAlign', 'left');
            textObj.setCoords();
            activeCanvas.renderAll();
            saveToHistory(activeCanvas);
            toast.success('Aligned left');
            return;
          }

          // Cmd/Ctrl+Shift+E - Align Center
          if (e.shiftKey && (e.key === 'e' || e.key === 'E')) {
            e.preventDefault();
            textObj.set('textAlign', 'center');
            textObj.setCoords();
            activeCanvas.renderAll();
            saveToHistory(activeCanvas);
            toast.success('Aligned center');
            return;
          }

          // Cmd/Ctrl+Shift+R - Align Right
          if (e.shiftKey && (e.key === 'r' || e.key === 'R')) {
            e.preventDefault();
            textObj.set('textAlign', 'right');
            textObj.setCoords();
            activeCanvas.renderAll();
            saveToHistory(activeCanvas);
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

          // Remove the object from active canvas
          activeCanvas.remove(activeObject);
          activeCanvas.discardActiveObject(); // Clear selection
          activeCanvas.renderAll();

          // History will be automatically saved by object:removed event listener
          console.log('🗑️ Deleted object:', activeObject.type);
        }
      }
    };

    // Add keyboard event listener
    if (handleKeyDown) {
      window.addEventListener('keydown', handleKeyDown);
    }

    // Auto-fit BOTH canvases to screen after initialization
    // Delay to ensure Fabric.js DOM managers are fully initialized
    setTimeout(() => {
      // Canvas structure: <canvas> -> border container -> flex container
      const borderContainer = frontCanvasRef.current?.parentElement;
      const container = borderContainer?.parentElement;

      console.log('📏 Auto-fit measuring:', {
        activeSide,
        borderContainer: !!borderContainer,
        container: !!container,
        frontCanvasPosition: frontCanvasRef.current ?
          window.getComputedStyle(frontCanvasRef.current).position : 'unknown',
        backCanvasPosition: backCanvasRef.current ?
          window.getComputedStyle(backCanvasRef.current).position : 'unknown',
      });

      if (container && fabricFrontCanvas?.lowerCanvasEl && fabricBackCanvas?.lowerCanvasEl) {
        // Get the actual available space for SIDE-BY-SIDE layout
        // Account for: padding (64px), gap between canvases (32px), labels (40px each), borders
        const totalPadding = 64; // p-8 on both sides
        const gap = 32; // gap-8 between canvases
        const labelHeight = 80; // Label + spacing above each canvas
        const borderWidth = 8; // Border on each canvas (2px * 2 sides * 2 canvases)

        const availableWidth = container.clientWidth - totalPadding - gap - borderWidth;
        const availableHeight = container.clientHeight - totalPadding - labelHeight;

        // Each canvas gets half the width
        const perCanvasWidth = availableWidth / 2;

        console.log('📦 Side-by-side container dimensions:', {
          containerWidth: container.clientWidth,
          containerHeight: container.clientHeight,
          availableWidth,
          availableHeight,
          perCanvasWidth,
        });

        // Calculate scale to fit EACH canvas in its allocated space
        const scaleX = perCanvasWidth / currentFormat.widthPixels;
        const scaleY = availableHeight / currentFormat.heightPixels;
        const scale = Math.min(scaleX, scaleY, 1.0); // Never scale larger than 100%

        // 🚨 CRITICAL FIX: DO NOT call setZoom() - it corrupts object coordinates!
        // Only use CSS-only scaling to preserve logical canvas dimensions
        // Internal canvas stays at 1800x1200 (or whatever format) for correct object positioning
        // CSS scaling handles visual zoom for display
        try {
          // Apply to BOTH canvases
          fabricFrontCanvas.setDimensions({
            width: currentFormat.widthPixels * scale,
            height: currentFormat.heightPixels * scale
          }, { cssOnly: true });

          fabricBackCanvas.setDimensions({
            width: currentFormat.widthPixels * scale,
            height: currentFormat.heightPixels * scale
          }, { cssOnly: true });

          // Save scale to state for zoom display
          setCurrentScale(scale);

          // Recalculate offsets for proper mouse interaction
          fabricFrontCanvas.calcOffset();
          fabricBackCanvas.calcOffset();
        } catch (err) {
          console.error('Failed to set canvas dimensions:', err);
        }

        fabricFrontCanvas.renderAll();
        fabricBackCanvas.renderAll();

        console.log('📐 Side-by-side canvas auto-fit:', {
          format: currentFormat.name,
          originalSize: `${currentFormat.widthPixels}×${currentFormat.heightPixels}px`,
          perCanvasWidth,
          availableHeight,
          scaleX: scaleX.toFixed(3),
          scaleY: scaleY.toFixed(3),
          finalScale: scale.toFixed(3),
          scaledSize: `${Math.round(currentFormat.widthPixels * scale)}×${Math.round(currentFormat.heightPixels * scale)}px`
        });

        // ✅ CRITICAL: Set state AFTER auto-fit completes
        // This prevents tab switch useEffect from running before dimensions are set
        setFrontCanvas(fabricFrontCanvas);
        setBackCanvas(fabricBackCanvas);
        console.log('✅ Canvas state set after auto-fit completion');
      }
    }, 250);
    }, 50); // Close initTimeout setTimeout

    return () => {
      clearTimeout(initTimeout);
      // Clean up keyboard event listener
      if (handleKeyDown) {
        window.removeEventListener('keydown', handleKeyDown);
      }
      // Dispose BOTH canvases safely
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
  }, [currentFormat, initialData]);

  // Reapply canvas dimensions when switching tabs to prevent size reset
  useEffect(() => {
    if (!frontCanvas || !backCanvas) return;

    console.log('🔄 Tab switch useEffect triggered:', {
      activeSide,
      frontCanvasExists: !!frontCanvas,
      backCanvasExists: !!backCanvas,
    });

    // Small delay to ensure DOM has updated with new positions (relative/absolute)
    const timeoutId = setTimeout(() => {
      // Get current CSS dimensions from the active canvas
      const activeCanvas = activeSide === 'front' ? frontCanvas : backCanvas;
      const widthStr = activeCanvas.lowerCanvasEl.style.width;
      const heightStr = activeCanvas.lowerCanvasEl.style.height;

      console.log('📐 Current CSS dimensions:', {
        widthStr,
        heightStr,
        activeSide,
      });

      // Skip if CSS dimensions not set yet (still initializing)
      if (!widthStr || !heightStr || widthStr === '' || heightStr === '') {
        console.log('⏭️ Skipping dimension reapply - CSS not set yet');
        return;
      }

      const currentWidth = parseInt(widthStr);
      const currentHeight = parseInt(heightStr);

      console.log('📊 Parsed dimensions:', {
        currentWidth,
        currentHeight,
        expectedWidth: currentFormat.widthPixels,
        expectedHeight: currentFormat.heightPixels,
      });

      // Skip if dimensions are full size (not scaled yet)
      if (currentWidth === currentFormat.widthPixels && currentHeight === currentFormat.heightPixels) {
        console.log('⏭️ Skipping dimension reapply - canvases at full size (not scaled yet)');
        return;
      }

    // Calculate actual scale from CSS dimensions
    const scaleX = currentWidth / currentFormat.widthPixels;
    const scaleY = currentHeight / currentFormat.heightPixels;
    const scale = Math.min(scaleX, scaleY);

    // Verify scale is reasonable (between 10% and 300%)
    if (scale < 0.1 || scale > 3.0) {
      console.warn('⚠️ Invalid scale detected:', scale, '- skipping dimension reapply');
      return;
    }

    // Ensure BOTH canvases have the same scale (in case one was reset)
    try {
      frontCanvas.setDimensions({
        width: currentFormat.widthPixels * scale,
        height: currentFormat.heightPixels * scale
      }, { cssOnly: true });

      backCanvas.setDimensions({
        width: currentFormat.widthPixels * scale,
        height: currentFormat.heightPixels * scale
      }, { cssOnly: true });

      // Update scale in state
      setCurrentScale(scale);

      // 🚨 CRITICAL: Recalculate canvas offsets for proper mouse interaction
      // When switching tabs, Fabric.js needs to recalculate bounding boxes
      // for accurate coordinate conversion (screen coords → canvas coords)
      frontCanvas.calcOffset();
      backCanvas.calcOffset();

      frontCanvas.renderAll();
      backCanvas.renderAll();

      console.log('🔄 Tab switched - reapplied dimensions:', {
        activeSide,
        scale: scale.toFixed(3),
        currentWidth,
        currentHeight,
        displayWidth: Math.round(currentFormat.widthPixels * scale),
        displayHeight: Math.round(currentFormat.heightPixels * scale),
        offsetsRecalculated: true,
      });
    } catch (err) {
      console.error('Failed to reapply canvas dimensions:', err);
    }
    }, 50); // 50ms delay for DOM update

    return () => clearTimeout(timeoutId);
  }, [activeSide, frontCanvas, backCanvas, currentFormat]);

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
    // CRITICAL FIX: Use active canvas directly to avoid stale references
    const activeCanvas = activeSide === 'front' ? frontCanvas : backCanvas;
    if (!activeCanvas) return;

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

    activeCanvas.add(text);
    activeCanvas.setActiveObject(text);
    activeCanvas.renderAll();

    // Save to history
    saveToHistory(activeCanvas);

    toast.success('Text box added! Resize width to wrap text.');
  }, [frontCanvas, backCanvas, activeSide, currentFormat, saveToHistory]);

  // Add Title (H1 - Large heading style)
  const addTitle = useCallback(() => {
    const activeCanvas = activeSide === 'front' ? frontCanvas : backCanvas;
    if (!activeCanvas) return;

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

    activeCanvas.add(title);
    activeCanvas.setActiveObject(title);
    activeCanvas.renderAll();
    saveToHistory(activeCanvas);
    toast.success('Title added (H1)');
  }, [frontCanvas, backCanvas, activeSide, currentFormat, saveToHistory]);

  // Add Heading (H2 - Section heading style)
  const addHeading = useCallback(() => {
    const activeCanvas = activeSide === 'front' ? frontCanvas : backCanvas;
    if (!activeCanvas) return;

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

    activeCanvas.add(heading);
    activeCanvas.setActiveObject(heading);
    activeCanvas.renderAll();
    saveToHistory(activeCanvas);
    toast.success('Heading added (H2)');
  }, [frontCanvas, backCanvas, activeSide, currentFormat, saveToHistory]);

  // Add Subheading (H3 - Subsection heading style)
  const addSubheading = useCallback(() => {
    const activeCanvas = activeSide === 'front' ? frontCanvas : backCanvas;
    if (!activeCanvas) return;

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

    activeCanvas.add(subheading);
    activeCanvas.setActiveObject(subheading);
    activeCanvas.renderAll();
    saveToHistory(activeCanvas);
    toast.success('Subheading added (H3)');
  }, [frontCanvas, backCanvas, activeSide, currentFormat, saveToHistory]);

  // Add Body Text (Regular paragraph text)
  const addBodyText = useCallback(() => {
    const activeCanvas = activeSide === 'front' ? frontCanvas : backCanvas;
    if (!activeCanvas) return;

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

    activeCanvas.add(bodyText);
    activeCanvas.setActiveObject(bodyText);
    activeCanvas.renderAll();
    saveToHistory(activeCanvas);
    toast.success('Body text added');
  }, [frontCanvas, backCanvas, activeSide, currentFormat, saveToHistory]);

  // Add Caption (Small supplementary text)
  const addCaption = useCallback(() => {
    const activeCanvas = activeSide === 'front' ? frontCanvas : backCanvas;
    if (!activeCanvas) return;

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

    activeCanvas.add(caption);
    activeCanvas.setActiveObject(caption);
    activeCanvas.renderAll();
    saveToHistory(activeCanvas);
    toast.success('Caption added');
  }, [frontCanvas, backCanvas, activeSide, currentFormat, saveToHistory]);

  // Add rectangle
  const addRectangle = useCallback(() => {
    const activeCanvas = activeSide === 'front' ? frontCanvas : backCanvas;
    if (!activeCanvas) return;

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

    activeCanvas.add(rect);
    activeCanvas.setActiveObject(rect);
    activeCanvas.renderAll();
    saveToHistory(activeCanvas);
  }, [frontCanvas, backCanvas, activeSide, currentFormat, saveToHistory]);

  // Add circle
  const addCircle = useCallback(() => {
    const activeCanvas = activeSide === 'front' ? frontCanvas : backCanvas;
    if (!activeCanvas) return;

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

    activeCanvas.add(circle);
    activeCanvas.setActiveObject(circle);
    activeCanvas.renderAll();
    saveToHistory(activeCanvas);
  }, [frontCanvas, backCanvas, activeSide, currentFormat, saveToHistory]);

  // Add image from upload
  const addImage = useCallback(() => {
    const activeCanvas = activeSide === 'front' ? frontCanvas : backCanvas;
    if (!activeCanvas) return;

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
            top: currentFormat.heightPixels / 2,  // CRITICAL FIX: Use heightPixels not widthPixels!
            scaleX: scale,
            scaleY: scale,
            originX: 'center',
            originY: 'center',
            centeredRotation: true,
          });

          activeCanvas.add(img);
          activeCanvas.setActiveObject(img);
          activeCanvas.renderAll();
          saveToHistory(activeCanvas);
          toast.success('Image added to canvas');
        } catch (error) {
          console.error('Failed to load image:', error);
          toast.error('Failed to load image');
        }
      };

      reader.readAsDataURL(file);
    };

    input.click();
  }, [frontCanvas, backCanvas, activeSide, currentFormat, saveToHistory]);

  // Add QR code placeholder
  const addQRCode = useCallback(async () => {
    const activeCanvas = activeSide === 'front' ? frontCanvas : backCanvas;
    if (!activeCanvas) return;

    try {
      // Show loading toast
      const loadingToast = toast.loading('Generating QR code placeholder...');

      // Generate placeholder QR code
      const qrDataUrl = await generatePlaceholderQRCode();

      // Create Fabric image from QR code
      const qrImg = await FabricImage.fromURL(qrDataUrl);

      // Scale QR code to fit canvas (max 50% width)
      const maxWidth = currentFormat.widthPixels * 0.5;
      const scale = maxWidth / (qrImg.width || 1);

      // Position QR code at center
      qrImg.set({
        left: currentFormat.widthPixels / 2,
        top: currentFormat.heightPixels / 2,  // CRITICAL FIX: Use heightPixels not widthPixels!
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

      activeCanvas.add(qrImg);
      activeCanvas.setActiveObject(qrImg);
      activeCanvas.renderAll();
      saveToHistory(activeCanvas);

      // Dismiss loading and show success
      toast.dismiss(loadingToast);
      toast.success('QR code placeholder added! Will be replaced with unique codes during generation.');
    } catch (error) {
      console.error('Failed to add QR code:', error);
      toast.error('Failed to add QR code placeholder');
    }
  }, [frontCanvas, backCanvas, activeSide, currentFormat, saveToHistory]);

  // Add asset from library
  const addAssetToCanvas = useCallback(async (asset: any) => {
    const activeCanvas = activeSide === 'front' ? frontCanvas : backCanvas;
    if (!activeCanvas) return;

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

      activeCanvas.add(img);
      activeCanvas.setActiveObject(img);
      activeCanvas.renderAll();
      saveToHistory(activeCanvas);
      toast.success(`${asset.name} added to canvas`);
    } catch (error) {
      console.error('Failed to load asset:', error);
      toast.error('Failed to load asset');
    }
  }, [frontCanvas, backCanvas, activeSide, currentFormat, saveToHistory]);

  // Delete selected object
  const deleteSelected = useCallback(() => {
    const activeCanvas = activeSide === 'front' ? frontCanvas : backCanvas;
    if (!activeCanvas) return;

    const activeObjects = activeCanvas.getActiveObjects();
    if (activeObjects.length === 0) {
      toast.error('No objects selected');
      return;
    }

    activeObjects.forEach(obj => activeCanvas.remove(obj));
    activeCanvas.discardActiveObject();
    activeCanvas.renderAll();
    saveToHistory(activeCanvas);
  }, [frontCanvas, backCanvas, activeSide, saveToHistory]);

  // Zoom in
  const zoomIn = useCallback(() => {
    const activeCanvas = activeSide === 'front' ? frontCanvas : backCanvas;
    if (!activeCanvas) return;

    // Get current CSS dimensions (BOTH width AND height!)
    const currentWidth = parseInt(activeCanvas.lowerCanvasEl.style.width) || currentFormat.widthPixels;
    const currentHeight = parseInt(activeCanvas.lowerCanvasEl.style.height) || currentFormat.heightPixels;

    // Scale BOTH dimensions independently to maintain aspect ratio
    const newWidth = Math.min(currentWidth * 1.2, currentFormat.widthPixels * 3);
    const newHeight = Math.min(currentHeight * 1.2, currentFormat.heightPixels * 3);

    // Calculate new scale
    const newScale = Math.min(newWidth / currentFormat.widthPixels, newHeight / currentFormat.heightPixels);

    // CORRECT FIX: Only use CSS scaling (cssOnly: true) WITHOUT setZoom()
    // This prevents double-transform: CSS stretch alone scales both canvas AND content proportionally
    // Apply to BOTH canvases to keep them in sync
    frontCanvas?.setDimensions({
      width: currentFormat.widthPixels * newScale,
      height: currentFormat.heightPixels * newScale
    }, { cssOnly: true });

    backCanvas?.setDimensions({
      width: currentFormat.widthPixels * newScale,
      height: currentFormat.heightPixels * newScale
    }, { cssOnly: true });

    // Update scale in state
    setCurrentScale(newScale);

    // Recalculate offsets for accurate mouse interaction after zoom
    frontCanvas?.calcOffset();
    backCanvas?.calcOffset();

    // DON'T call setZoom() - CSS scaling handles everything!
    frontCanvas?.renderAll();
    backCanvas?.renderAll();

    setForceUpdate(prev => prev + 1);
  }, [frontCanvas, backCanvas, activeSide, currentFormat]);

  // Zoom out
  const zoomOut = useCallback(() => {
    const activeCanvas = activeSide === 'front' ? frontCanvas : backCanvas;
    if (!activeCanvas) return;

    // Get current CSS dimensions (BOTH width AND height!)
    const currentWidth = parseInt(activeCanvas.lowerCanvasEl.style.width) || currentFormat.widthPixels;
    const currentHeight = parseInt(activeCanvas.lowerCanvasEl.style.height) || currentFormat.heightPixels;

    // Scale BOTH dimensions independently to maintain aspect ratio
    const newWidth = Math.max(currentWidth / 1.2, currentFormat.widthPixels * 0.1);
    const newHeight = Math.max(currentHeight / 1.2, currentFormat.heightPixels * 0.1);

    // Calculate new scale
    const newScale = Math.min(newWidth / currentFormat.widthPixels, newHeight / currentFormat.heightPixels);

    // CORRECT FIX: Only use CSS scaling (cssOnly: true) WITHOUT setZoom()
    // Apply to BOTH canvases to keep them in sync
    frontCanvas?.setDimensions({
      width: currentFormat.widthPixels * newScale,
      height: currentFormat.heightPixels * newScale
    }, { cssOnly: true });

    backCanvas?.setDimensions({
      width: currentFormat.widthPixels * newScale,
      height: currentFormat.heightPixels * newScale
    }, { cssOnly: true });

    // Update scale in state
    setCurrentScale(newScale);

    // Recalculate offsets for accurate mouse interaction after zoom
    frontCanvas?.calcOffset();
    backCanvas?.calcOffset();

    // DON'T call setZoom() - CSS scaling handles everything!
    frontCanvas?.renderAll();
    backCanvas?.renderAll();

    setForceUpdate(prev => prev + 1);
  }, [frontCanvas, backCanvas, activeSide, currentFormat]);

  // Fit to screen
  const fitToScreen = useCallback(() => {
    const activeCanvas = activeSide === 'front' ? frontCanvas : backCanvas;
    const activeCanvasRef = activeSide === 'front' ? frontCanvasRef : backCanvasRef;
    if (!activeCanvas || !activeCanvasRef.current) return;

    // Canvas structure: <canvas> -> border container -> flex container
    const borderContainer = activeCanvasRef.current.parentElement;
    const container = borderContainer?.parentElement;
    if (!container) return;

    const containerWidth = container.clientWidth - 100; // Account for padding, borders, and spacing
    const containerHeight = container.clientHeight - 100;

    // Calculate scale to fit while maintaining aspect ratio
    const scaleX = containerWidth / currentFormat.widthPixels;
    const scaleY = containerHeight / currentFormat.heightPixels;
    const scale = Math.min(scaleX, scaleY); // Fit to available space

    // CORRECT FIX: Only use CSS scaling (cssOnly: true) WITHOUT setZoom()
    // Apply to BOTH canvases to keep them in sync
    frontCanvas?.setDimensions({
      width: currentFormat.widthPixels * scale,
      height: currentFormat.heightPixels * scale
    }, { cssOnly: true });

    backCanvas?.setDimensions({
      width: currentFormat.widthPixels * scale,
      height: currentFormat.heightPixels * scale
    }, { cssOnly: true });

    // Update scale in state
    setCurrentScale(scale);

    // Recalculate offsets for accurate mouse interaction after zoom
    frontCanvas?.calcOffset();
    backCanvas?.calcOffset();

    // DON'T call setZoom() - CSS scaling handles everything!
    frontCanvas?.renderAll();
    backCanvas?.renderAll();

    setForceUpdate(prev => prev + 1);
  }, [frontCanvas, backCanvas, frontCanvasRef, backCanvasRef, activeSide, currentFormat]);

  // Helper function to extract surface data from a canvas
  const extractSurfaceData = useCallback((
    canvasInstance: Canvas,
    side: 'front' | 'back'
  ) => {
    // Save current CSS dimensions
    const currentWidth = canvasInstance.getWidth();
    const currentHeight = canvasInstance.getHeight();

    // Reset CSS dimensions to full resolution for clean export
    canvasInstance.setDimensions({
      width: currentFormat.widthPixels,
      height: currentFormat.heightPixels
    }, { cssOnly: true });
    canvasInstance.renderAll();

    // Get canvas JSON (should have correct coordinates since zoom is always 1)
    const canvas_json = JSON.parse(JSON.stringify(canvasInstance.toJSON()));

    // Extract variable mappings (separate from canvas JSON)
    const objects = canvasInstance.getObjects();
    const variable_mappings: Record<string, any> = {};

    objects.forEach((obj: any, idx: number) => {
      if (obj.variableType) {
        variable_mappings[idx.toString()] = {
          variableType: obj.variableType,
          isReusable: obj.isReusable || false,
        };
      }
    });

    // Generate thumbnail
    const thumbnail_url = canvasInstance.toDataURL({
      format: 'png',
      quality: 0.8,
      multiplier: 0.2, // Small preview (20% of full size)
    });

    // Restore CSS display dimensions
    canvasInstance.setDimensions({
      width: currentWidth,
      height: currentHeight
    }, { cssOnly: true });
    canvasInstance.renderAll();

    // Create surface object
    const surface: any = {
      side,
      canvas_json,
      variable_mappings,
      thumbnail_url,
    };

    // Add address block zone for back page
    if (side === 'back') {
      surface.address_block_zone = getAddressBlockZone(currentFormat.id, 'US');
    }

    return surface;
  }, [currentFormat]);

  // Save template with DUAL SURFACE support
  const handleSave = useCallback(() => {
    if (!frontCanvas || !backCanvas || !onSave) return;

    try {
      console.log('💾 [SAVE] Saving DUAL SURFACE template...');
      console.log('   Format:', currentFormat.name, `(${currentFormat.widthPixels}×${currentFormat.heightPixels})`);

      // Extract FRONT surface
      console.log('📄 Extracting FRONT surface...');
      const frontSurface = extractSurfaceData(frontCanvas, 'front');
      console.log('✅ Front surface extracted:', Object.keys(frontSurface.canvas_json || {}).length, 'objects');

      // Extract BACK surface
      console.log('📄 Extracting BACK surface...');
      const backSurface = extractSurfaceData(backCanvas, 'back');
      console.log('✅ Back surface extracted:', Object.keys(backSurface.canvas_json || {}).length, 'objects');

      // Create surfaces array
      const surfaces = [frontSurface, backSurface];

      console.log('💾 [SAVE] Surfaces ready:', {
        frontObjects: frontCanvas.getObjects().length,
        backObjects: backCanvas.getObjects().length,
        frontMappings: Object.keys(frontSurface.variable_mappings || {}).length,
        backMappings: Object.keys(backSurface.variable_mappings || {}).length,
        hasAddressBlockZone: !!backSurface.address_block_zone,
      });

      // Call onSave with BOTH new surfaces array AND backwards-compatible fields
      onSave({
        // NEW: Multi-surface architecture
        surfaces,

        // BACKWARDS COMPATIBLE: Old single-canvas fields (use front surface)
        canvasJSON: JSON.stringify(frontSurface.canvas_json),
        variableMappings: frontSurface.variable_mappings,
        preview: frontSurface.thumbnail_url,
        format: currentFormat,
      });

      toast.success(`Template saved with front & back pages! (${currentFormat.name})`);
      console.log('✅ [SAVE] Complete - dual surface template saved');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save template');
    }
  }, [frontCanvas, backCanvas, onSave, currentFormat, extractSurfaceData]);

  // Download as PNG (full 300 DPI)
  const downloadPNG = useCallback(() => {
    const activeCanvas = activeSide === 'front' ? frontCanvas : backCanvas;
    if (!activeCanvas) return;

    try {
      console.log('📥 Starting PNG export...');
      console.log('   Canvas dimensions (internal):', currentFormat.widthPixels, 'x', currentFormat.heightPixels);

      // Save current viewport and display state
      const currentZoom = activeCanvas.getZoom();
      const currentVpt = activeCanvas.viewportTransform ? [...activeCanvas.viewportTransform] : [1, 0, 0, 1, 0, 0];
      console.log('   Current zoom:', currentZoom);
      console.log('   Current viewport:', currentVpt);

      // Get current CSS dimensions
      const currentWidth = activeCanvas.getWidth();
      const currentHeight = activeCanvas.getHeight();
      console.log('   Current CSS dimensions:', currentWidth, 'x', currentHeight);

      // Reset to full resolution for export
      // 1. Reset zoom to 1:1
      activeCanvas.setZoom(1);

      // 2. Reset viewport transform to identity
      activeCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

      // 3. Reset CSS dimensions to match internal dimensions
      activeCanvas.setDimensions({
        width: currentFormat.widthPixels,
        height: currentFormat.heightPixels
      }, { cssOnly: true });

      // 4. Force re-render at full resolution
      activeCanvas.renderAll();
      console.log('✅ Canvas reset to full resolution for export');

      // Export at full resolution
      const dataURL = activeCanvas.toDataURL({
        format: 'png',
        quality: 1.0,
        multiplier: 1, // Export at actual canvas internal dimensions (300 DPI)
      });

      console.log('✅ Canvas exported to data URL');
      console.log('   Data URL length:', dataURL.length, 'characters');

      // Restore original state
      // 1. Restore viewport transform to identity (no pan/offset)
      activeCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

      // 2. Keep zoom at 1.0 (NEVER restore a potentially corrupted zoom)
      activeCanvas.setZoom(1);

      // 3. Restore CSS display dimensions
      activeCanvas.setDimensions({
        width: currentWidth,
        height: currentHeight
      }, { cssOnly: true });

      // 4. Force re-render with restored state
      activeCanvas.renderAll();
      console.log('✅ Canvas state restored (zoom locked at 1.0)');

      // Download the image
      const link = document.createElement('a');
      const sideName = activeSide === 'front' ? 'front' : 'back';
      link.download = `design-${sideName}-${currentFormat.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
      link.href = dataURL;
      link.click();

      toast.success(`Exported ${activeSide} page at ${currentFormat.widthPixels}×${currentFormat.heightPixels}px!`);
      console.log('✅ PNG export complete');
    } catch (error) {
      console.error('❌ Export failed:', error);
      toast.error('Failed to export PNG');
    }
  }, [frontCanvas, backCanvas, activeSide, currentFormat]);

  // Toggle Preview Mode (show/hide variable chip styling)
  const togglePreviewMode = useCallback(() => {
    const activeCanvas = activeSide === 'front' ? frontCanvas : backCanvas;
    if (!activeCanvas) return;

    const newPreviewMode = !isPreviewMode;
    setIsPreviewMode(newPreviewMode);

    // Apply or remove chip styling from all text objects with variables
    const objects = activeCanvas.getObjects();
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

    activeCanvas.renderAll();
    toast.success(newPreviewMode ? 'Preview Mode (variables as plain text)' : 'Edit Mode (variables highlighted)');
  }, [frontCanvas, backCanvas, activeSide, isPreviewMode]);

  // Auto-center canvas when clicked (Adobe XD/Figma style)
  const centerCanvas = useCallback((side: 'front' | 'back') => {
    if (!canvasViewportRef.current) return;

    const viewport = canvasViewportRef.current;
    const targetCanvas = side === 'front' ? frontCanvasRef.current : backCanvasRef.current;
    if (!targetCanvas) return;

    // Get the canvas container (includes label)
    const canvasContainer = targetCanvas.parentElement?.parentElement;
    if (!canvasContainer) return;

    // Calculate scroll position to center the canvas
    const viewportRect = viewport.getBoundingClientRect();
    const canvasRect = canvasContainer.getBoundingClientRect();

    const scrollLeft = canvasRect.left - viewportRect.left + viewport.scrollLeft - (viewportRect.width / 2) + (canvasRect.width / 2);
    const scrollTop = canvasRect.top - viewportRect.top + viewport.scrollTop - (viewportRect.height / 2) + (canvasRect.height / 2);

    // Smooth scroll animation
    viewport.scrollTo({
      left: scrollLeft,
      top: scrollTop,
      behavior: 'smooth'
    });

    // Set active side
    setActiveSide(side);
  }, [frontCanvasRef, backCanvasRef]);

  // Pan handling (click and drag to move viewport)
  const handlePanStart = useCallback((e: React.MouseEvent) => {
    // Pan with left mouse button on viewport background (not on canvas elements)
    const target = e.target as HTMLElement;
    const isViewport = target === canvasViewportRef.current || target.classList.contains('inline-flex');

    if (e.button === 0 && isViewport) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || !canvasViewportRef.current) return;

    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;

    canvasViewportRef.current.scrollLeft -= dx;
    canvasViewportRef.current.scrollTop -= dy;

    setPanStart({ x: e.clientX, y: e.clientY });
  }, [isPanning, panStart]);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Center front canvas on initial load
  useEffect(() => {
    if (frontCanvas && backCanvas && canvasViewportRef.current) {
      // Small delay to ensure layout is complete
      setTimeout(() => {
        centerCanvas('front');
      }, 500);
    }
  }, [frontCanvas, backCanvas, centerCanvas]);

  // Trigger re-render when panels update canvas
  const handleCanvasUpdate = useCallback(() => {
    const activeCanvas = activeSide === 'front' ? frontCanvas : backCanvas;
    if (activeCanvas) {
      activeCanvas.renderAll();

      // Save to history for property changes (color, opacity, etc.)
      // This ensures undo/redo works for PropertyPanel changes
      // The saveToHistory function already checks isLoadingHistoryRef to skip during undo/redo
      console.log('🎨 Property changed via panel, saving to history');
      saveToHistory(activeCanvas);
    }
    setForceUpdate(prev => prev + 1);
  }, [frontCanvas, backCanvas, activeSide, saveToHistory]);

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
          <span className="text-xs text-slate-600 w-12 text-center">{Math.round(currentScale * 100)}%</span>
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

        {/* Center - Canvas Viewport (scrollable/pannable) */}
        <div
          ref={canvasViewportRef}
          className={`flex-1 overflow-auto relative bg-slate-50 ${isPanning ? 'cursor-grabbing' : 'cursor-default'}`}
          onMouseDown={handlePanStart}
          onMouseMove={handlePanMove}
          onMouseUp={handlePanEnd}
          onMouseLeave={handlePanEnd}
          style={{ cursor: isPanning ? 'grabbing' : 'default' }}
        >
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

          {/* Side-by-side canvas view - Adobe XD/Figma style with pan/scroll navigation */}
          <div className="inline-flex items-center justify-center gap-8 p-8 min-w-full min-h-full">
            {/* Front Canvas Container */}
            <div
              className="flex flex-col items-center gap-3 cursor-pointer transition-all flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                centerCanvas('front');
              }}
            >
              {/* Label */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeSide === 'front'
                  ? 'bg-blue-100 text-blue-700 font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}>
                <FileText className="w-4 h-4" />
                <span className="text-sm">Front</span>
              </div>

              {/* Canvas Container */}
              <div className={`bg-white rounded-sm transition-all ${
                activeSide === 'front'
                  ? 'ring-4 ring-blue-400 shadow-2xl'
                  : 'border-2 border-slate-300 shadow-lg hover:shadow-xl'
              }`}>
                <canvas ref={frontCanvasRef} style={{ display: 'block' }} />
              </div>
            </div>

            {/* Back Canvas Container */}
            <div
              className="flex flex-col items-center gap-3 cursor-pointer transition-all flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                centerCanvas('back');
              }}
            >
              {/* Label */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeSide === 'back'
                  ? 'bg-blue-100 text-blue-700 font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}>
                <FileCheck className="w-4 h-4" />
                <span className="text-sm">Back</span>
              </div>

              {/* Canvas Container with Address Block Overlay */}
              <div className={`relative bg-white rounded-sm transition-all ${
                activeSide === 'back'
                  ? 'ring-4 ring-blue-400 shadow-2xl'
                  : 'border-2 border-slate-300 shadow-lg hover:shadow-xl'
              }`}>
                <canvas ref={backCanvasRef} style={{ display: 'block' }} />

                {/* PostGrid Address Block Overlay - always visible on back */}
                {(() => {
                // Get PostGrid address block zone for current format
                const zone = getAddressBlockZone(currentFormat.id, 'US');

                // Calculate percentage positioning relative to canvas dimensions
                const leftPercent = (zone.x / currentFormat.widthPixels) * 100;
                const topPercent = (zone.y / currentFormat.heightPixels) * 100;
                const widthPercent = (zone.width / currentFormat.widthPixels) * 100;
                const heightPercent = (zone.height / currentFormat.heightPixels) * 100;

                return (
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                      width: `${widthPercent}%`,
                      height: `${heightPercent}%`,
                      border: '2px dashed #FF6B35',
                      backgroundColor: 'rgba(255, 107, 53, 0.05)',
                      borderRadius: '4px',
                      zIndex: 1000,
                    }}
                  >
                    {/* Label */}
                    <div
                      className="absolute -top-8 left-0 flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-md shadow-sm"
                      style={{ pointerEvents: 'auto' }} // Allow interaction with label
                    >
                      <Mail className="w-3.5 h-3.5 text-orange-600" />
                      <span className="text-xs font-semibold text-orange-700">
                        Reserved for Address (PostGrid)
                      </span>
                    </div>

                    {/* Subtle grid pattern to show it's reserved */}
                    <div
                      className="absolute inset-0 opacity-10"
                      style={{
                        backgroundImage: `repeating-linear-gradient(
                          45deg,
                          transparent,
                          transparent 10px,
                          #FF6B35 10px,
                          #FF6B35 11px
                        )`,
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                );
              })()}

              </div>
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
