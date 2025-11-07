"use client";

/**
 * PROFESSIONAL CANVAS EDITOR - Canva-Like UX
 * Built with Fabric.js v6 best practices
 *
 * NEW ARCHITECTURE:
 * - Loads data from database using session ID (no sessionStorage)
 * - Dynamically imports Fabric.js to avoid bundling issues
 * - Simple, clean data flow with server-side persistence
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, ZoomIn, ZoomOut, Maximize2, Type, Square, Circle, Upload, Library, X, Trash2, Image as ImageIcon, Layers, Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown, Edit2, FileText, Minus, AlignLeft, AlignCenter, AlignRight, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, Palette, Bold, Globe } from "lucide-react";
import { LandingPageCustomizationModal } from "@/components/landing-page/customization-modal";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EditorData {
  backgroundImage: string;
  qrCodeDataUrl: string;
  trackingId: string;
  landingPageUrl: string;
  recipientName: string;
  recipientLastname: string;
  recipientAddress: string;
  recipientCity: string;
  recipientZip: string;
  message: string;
  companyName: string;
  campaignName?: string;
  campaignId?: number;
  logoUrl?: string;
  primaryColor?: string;
  textColor?: string;
  canvasWidth: number;
  canvasHeight: number;
  phoneNumber: string;
  dmTemplateId?: number; // Template ID if loading from saved template
}

export default function CanvasEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get('session');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const fabricRef = useRef<any>(null); // Store fabric namespace

  const [editorData, setEditorData] = useState<EditorData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [customImageCounter, setCustomImageCounter] = useState(1);
  const [selectedElement, setSelectedElement] = useState<any>(null);

  // Landing Page Customization Modal
  const [showLPCustomizationModal, setShowLPCustomizationModal] = useState(false);

  // PHASE 3: Layer Management
  const [layers, setLayers] = useState<any[]>([]);
  const [showLayerPanel, setShowLayerPanel] = useState(true);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingLayerName, setEditingLayerName] = useState("");

  // PHASE 4: Shape counters for unique naming
  const [rectangleCounter, setRectangleCounter] = useState(1);
  const [circleCounter, setCircleCounter] = useState(1);
  const [lineCounter, setLineCounter] = useState(1);

  // PHASE 5: Properties panel state
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [objectFill, setObjectFill] = useState("#000000");
  const [objectStroke, setObjectStroke] = useState("#000000");
  const [objectFontSize, setObjectFontSize] = useState(16);
  const [objectFontWeight, setObjectFontWeight] = useState("normal");
  const [objectFontFamily, setObjectFontFamily] = useState("Arial");

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: "",
    description: "",
    category: "general",
    targetAudience: "",
    tone: "",
    industry: "",
  });

  // Load Fabric.js dynamically and fetch session data
  useEffect(() => {
    const loadFabricAndData = async () => {
      console.log('🎨 Loading Fabric.js and session data...');

      if (!sessionId) {
        toast.error("No session ID provided");
        router.push("/dm-creative");
        return;
      }

      try {
        // 1. Load Fabric.js dynamically
        console.log('📦 Loading Fabric.js library...');
        const fabricModule = await import('fabric');
        // Fabric.js v6 uses named exports, not default export
        fabricRef.current = fabricModule;
        console.log('✅ Fabric.js loaded successfully');
        console.log('Module keys:', Object.keys(fabricModule).slice(0, 20));

        // 2. Fetch session data from database
        console.log('🔍 Fetching session data:', sessionId);
        const response = await fetch(`/api/canvas-session?id=${sessionId}`);
        const result = await response.json();

        if (!result.success || !result.data) {
          toast.error("Session not found");
          router.push("/dm-creative");
          return;
        }

        const data = result.data;
        console.log('✅ Session data loaded:', {
          hasBackground: !!data.backgroundImage,
          hasQR: !!data.qrCodeDataUrl,
          hasLogo: !!data.logoUrl,
          dimensions: `${data.canvasWidth}x${data.canvasHeight}`,
        });

        setEditorData(data);
        setIsLoading(false);
      } catch (error) {
        console.error('❌ Error loading:', error);
        toast.error("Failed to load editor");
        router.push("/dm-creative");
      }
    };

    loadFabricAndData();
  }, [sessionId, router]);

  // Initialize canvas when data is ready
  useEffect(() => {
    if (!canvasRef.current || !editorData || !fabricRef.current || fabricCanvasRef.current) {
      return;
    }

    // Flag to prevent operations after cleanup (React StrictMode double-mount protection)
    let isActive = true;

    const fabricModule = fabricRef.current;
    console.log('🎨 Initializing canvas with Fabric.js');
    console.log('Fabric module keys:', Object.keys(fabricModule).slice(0, 20));

    try {
      // Use named exports from Fabric.js v6
      const { Canvas, FabricImage } = fabricModule;
      console.log('Canvas class:', Canvas?.name);
      console.log('FabricImage class:', FabricImage?.name);

      // Create canvas using Canvas class
      const canvas = new Canvas(canvasRef.current, {
        width: editorData.canvasWidth,
        height: editorData.canvasHeight,
        backgroundColor: "#ffffff",
      });

      fabricCanvasRef.current = canvas;
      console.log('✅ Canvas initialized');
      console.log('Canvas type:', canvas.constructor.name);
      console.log('Has setBackgroundImage:', typeof canvas.setBackgroundImage);
      console.log('Canvas methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(canvas)).filter(m => m.includes('Background')));

      // PHASE 2: Track object selection for Delete button state
      // PHASE 5: Also update properties panel when selection changes
      canvas.on('selection:created', (e: any) => {
        const obj = e.selected?.[0] || null;
        setSelectedElement(obj);
        updatePropertiesFromSelection(obj);
      });
      canvas.on('selection:updated', (e: any) => {
        const obj = e.selected?.[0] || null;
        setSelectedElement(obj);
        updatePropertiesFromSelection(obj);
      });
      canvas.on('selection:cleared', () => {
        setSelectedElement(null);
        updatePropertiesFromSelection(null);
      });

      // PHASE 3: Auto-sync layers on canvas changes
      canvas.on('object:added', syncLayers);
      canvas.on('object:removed', syncLayers);
      canvas.on('object:modified', syncLayers);

      // Check if we should load from template
      if (editorData.dmTemplateId) {
        console.log('📋 Loading template design:', editorData.dmTemplateId);
        // Pass isActive flag to loadTemplateDesign
        loadTemplateDesign(canvas, editorData, fabricModule, isActive);
      } else {
        // Load background using FabricImage (standard flow)
        FabricImage.fromURL(editorData.backgroundImage, {crossOrigin: 'anonymous'}).then((img: any) => {
          if (!isActive) {
            console.log('⏭️ Component unmounted, skipping background load');
            return;
          }
          console.log('✅ Background image loaded');

          // COVER STRATEGY: Scale uniformly to fill canvas (no distortion, may crop)
          // Like CSS: background-size: cover; background-position: center;
          const imgWidth = img.width || editorData.canvasWidth;
          const imgHeight = img.height || editorData.canvasHeight;

          // Calculate uniform scale to cover entire canvas
          const scale = Math.max(
            editorData.canvasWidth / imgWidth,
            editorData.canvasHeight / imgHeight
          );

          // Center the image on canvas
          const scaledWidth = imgWidth * scale;
          const scaledHeight = imgHeight * scale;
          const left = (editorData.canvasWidth - scaledWidth) / 2;
          const top = (editorData.canvasHeight - scaledHeight) / 2;

          console.log('📐 Background scaling (COVER strategy):');
          console.log(`   Image: ${imgWidth}x${imgHeight}`);
          console.log(`   Canvas: ${editorData.canvasWidth}x${editorData.canvasHeight}`);
          console.log(`   Uniform scale: ${scale.toFixed(4)} (no distortion)`);
          console.log(`   Position: (${left.toFixed(0)}, ${top.toFixed(0)})`);

          img.set({
            scaleX: scale,
            scaleY: scale, // Same as scaleX (uniform scaling = no distortion)
            left: left,
            top: top,
            selectable: false,
            evented: false,
          });

          // Fabric.js v6: setBackgroundImage is deprecated, set property directly
          canvas.backgroundImage = img;
          canvas.renderAll();
          console.log('✅ Background set on canvas (COVER mode)');

          if (isActive) {
            addDMElements(canvas, editorData, fabricModule);
          }
        }).catch((err: any) => {
          if (isActive) {
            console.error('❌ Error loading background:', err);
            toast.error('Failed to load background image');
          }
        });
      }

    } catch (error) {
      if (isActive) {
        console.error('❌ Error initializing canvas:', error);
        toast.error('Failed to initialize canvas');
      }
    }

    return () => {
      // Set flag to prevent async operations from completing
      isActive = false;
      console.log('🧹 Cleaning up canvas...');
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [editorData]);

  // Set default template name when editor data loads
  useEffect(() => {
    if (editorData && !templateForm.name) {
      const defaultName = editorData.campaignName
        || `DM Template - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      setTemplateForm(prev => ({ ...prev, name: defaultName }));
    }
  }, [editorData]);

  // PHASE 3: Layer Management - Sync layers from canvas (useCallback to stabilize reference)
  const syncLayers = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const objects = canvas.getObjects();
    const layerList = objects.map((obj: any, index: number) => {
      const variableType = obj.variableType || 'custom';
      const displayName = obj.displayName || variableType || `Layer ${index + 1}`;

      return {
        id: obj.id || `layer-${index}`,
        index,
        displayName,
        variableType,
        type: obj.type,
        visible: obj.visible !== false,
        locked: obj.lockMovementX || false,
        isStandard: ['logo', 'message', 'qrCode', 'recipientName', 'recipientAddress', 'phoneNumber', 'background-image'].includes(variableType),
        fabricObject: obj,
      };
    }).reverse(); // Reverse to show top layer first

    setLayers(layerList);
  }, []); // Empty deps - uses ref which is stable

  // PHASE 2: Delete Tool - useCallback to stabilize reference
  const handleDelete = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) {
      toast.error("Please select an object to delete");
      return;
    }

    const variableType = (activeObject as any).variableType;
    const displayName = variableType || "this object";

    // Check if this is a standard layer (requires confirmation)
    const standardLayers = ['logo', 'background-image', 'message', 'qrCode', 'recipientName', 'recipientAddress', 'phoneNumber'];
    const isStandardLayer = standardLayers.includes(variableType);

    if (isStandardLayer) {
      if (!window.confirm(`Are you sure you want to delete "${displayName}"? This is a standard template element.`)) {
        return;
      }
    }

    canvas.remove(activeObject);
    canvas.renderAll();
    toast.success(`Deleted ${displayName}`);
    setSelectedElement(null);
  }, []); // Empty deps - uses refs which are stable

  // PHASE 5: Update properties panel when object is selected
  const updatePropertiesFromSelection = useCallback((obj: any) => {
    if (!obj) {
      setShowPropertiesPanel(false);
      return;
    }

    setShowPropertiesPanel(true);

    // Update fill color (for text and shapes)
    if (obj.fill) {
      setObjectFill(typeof obj.fill === 'string' ? obj.fill : '#000000');
    }

    // Update stroke color (for shapes)
    if (obj.stroke) {
      setObjectStroke(typeof obj.stroke === 'string' ? obj.stroke : '#000000');
    }

    // Update font properties (for text objects)
    if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
      if (obj.fontSize) setObjectFontSize(obj.fontSize);
      if (obj.fontWeight) setObjectFontWeight(obj.fontWeight);
      if (obj.fontFamily) setObjectFontFamily(obj.fontFamily);
    }
  }, []); // Empty deps - uses state setters which are stable

  // PHASE 2: Keyboard handler for Delete key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        // Don't trigger if user is typing in an input field
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        e.preventDefault();
        handleDelete();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleDelete]); // Now handleDelete is stable via useCallback

  // Add all DM elements
  const addDMElements = async (canvas: any, data: EditorData, fabricModule: any) => {
    console.log('🎯 Adding DM elements');

    const { FabricImage, Textbox, IText } = fabricModule;
    const padding = 30;
    const primaryColor = data.primaryColor || "#003E7E";
    const textColor = data.textColor || "#1F2937";

    // Logo - MARK as reusable (NOT variable)
    if (data.logoUrl) {
      console.log('🏷️ Adding logo');
      try {
        const logoImg = await FabricImage.fromURL(data.logoUrl, {crossOrigin: 'anonymous'});

        // PRESERVE ASPECT RATIO: Scale to max width of 200px
        const maxLogoWidth = 200;
        const scale = maxLogoWidth / (logoImg.width || maxLogoWidth);

        logoImg.set({
          left: padding,
          top: padding,
          scaleX: scale,  // Same scale for both dimensions
          scaleY: scale,  // This preserves aspect ratio
          variableType: 'logo', // IMPORTANT: Mark as logo (reusable, NOT replaceable)
          isReusable: true, // Flag for batch processing
        });
        canvas.add(logoImg);
        console.log('✅ Logo added with preserved aspect ratio');
      } catch (err) {
        console.error('❌ Error loading logo:', err);
      }
    }

    // Message - MARK as variable field
    const messageText = new Textbox(data.message, {
      left: padding,
      top: padding + 90,
      width: 400,
      fontSize: 20,
      fontFamily: "Arial",
      fill: textColor,
      variableType: 'message', // Custom property for identification
    });
    canvas.add(messageText);

    // Customer name - MARK as variable field
    const customerName = new IText(`${data.recipientName} ${data.recipientLastname}`, {
      left: padding,
      top: data.canvasHeight - 120,
      fontSize: 16,
      fontFamily: "Arial",
      fill: "#6B7280",
      variableType: 'recipientName', // Custom property for identification
    });
    canvas.add(customerName);

    // Address - MARK as variable field
    if (data.recipientAddress) {
      const address = new IText(
        `${data.recipientAddress}, ${data.recipientCity}, ${data.recipientZip}`,
        {
          left: padding,
          top: data.canvasHeight - 90,
          fontSize: 14,
          fontFamily: "Arial",
          fill: "#6B7280",
          variableType: 'recipientAddress', // Custom property for identification
        }
      );
      canvas.add(address);
    }

    // Phone - MARK as variable field
    const phone = new IText(`📞 ${data.phoneNumber}`, {
      left: padding,
      top: data.canvasHeight - 60,
      fontSize: 18,
      fontFamily: "Arial",
      fontWeight: "bold",
      fill: primaryColor,
      variableType: 'phoneNumber', // Custom property for identification
      isReusable: false, // CRITICAL: Must be replaced per recipient
    });
    canvas.add(phone);

    // QR Code - MARK as variable field
    console.log('📱 Adding QR code');
    try {
      const qrImg = await FabricImage.fromURL(data.qrCodeDataUrl, {crossOrigin: 'anonymous'});
      qrImg.set({
        left: data.canvasWidth - 180 - padding,
        top: data.canvasHeight - 180 - padding,
        scaleX: 150 / (qrImg.width || 150),
        scaleY: 150 / (qrImg.height || 150),
        variableType: 'qrCode', // Custom property for identification
      });
      canvas.add(qrImg);
      console.log('✅ QR code added');
    } catch (err) {
      console.error('❌ Error loading QR:', err);
    }

    canvas.renderAll();
    console.log('✅ All elements added');

    // DEBUG: Verify custom properties were set on canvas objects
    console.log('🔍 Verifying custom properties on canvas objects:');
    const objects = canvas.getObjects();
    objects.forEach((obj: any, idx: number) => {
      console.log(`   Object ${idx}: type=${obj.type}, variableType=${obj.variableType}, isReusable=${obj.isReusable}`);
    });

    // PHASE 3: Initial layer sync
    syncLayers();
  };

  // Load template design from saved DM template
  const loadTemplateDesign = async (canvas: any, data: EditorData, fabricModule: any, isActive?: boolean) => {
    console.log('📋 Loading template design:', data.dmTemplateId);

    try {
      // Fetch DM template
      const response = await fetch(`/api/dm-template?id=${data.dmTemplateId}`);
      const result = await response.json();

      // Check if canvas is still valid after async fetch
      if (!canvas || canvas.disposed) {
        console.log('⏭️ Canvas disposed during template fetch, aborting');
        return;
      }

      if (!result.success || !result.data) {
        console.error('❌ Failed to load template');
        toast.error('Template not found, using standard layout');
        // Fallback to standard flow
        const { FabricImage } = fabricModule;
        FabricImage.fromURL(data.backgroundImage, {crossOrigin: 'anonymous'}).then((img: any) => {
          // Check if canvas is still valid (safely)
          if (!canvas || canvas.disposed) {
            console.log('⏭️ Canvas disposed, skipping fallback');
            return;
          }

          // COVER STRATEGY: Scale uniformly to fill canvas (no distortion, may crop)
          const imgWidth = img.width || data.canvasWidth;
          const imgHeight = img.height || data.canvasHeight;
          const scale = Math.max(
            data.canvasWidth / imgWidth,
            data.canvasHeight / imgHeight
          );
          const scaledWidth = imgWidth * scale;
          const scaledHeight = imgHeight * scale;
          const left = (data.canvasWidth - scaledWidth) / 2;
          const top = (data.canvasHeight - scaledHeight) / 2;

          console.log('📐 Fallback background (COVER): scale=' + scale.toFixed(4));

          img.set({
            scaleX: scale,
            scaleY: scale,
            left: left,
            top: top,
            selectable: false,
            evented: false,
          });
          canvas.backgroundImage = img;
          canvas.renderAll();
          addDMElements(canvas, data, fabricModule);
        });
        return;
      }

      const template = result.data;
      console.log('✅ Template loaded:', template.name);

      // Parse canvas JSON
      const canvasJSON = JSON.parse(template.canvasJSON);
      console.log('📦 Loading canvas from JSON...');

      // Check if canvas is still valid before loadFromJSON
      if (!canvas || canvas.disposed) {
        console.log('⏭️ Canvas disposed before loadFromJSON, aborting');
        return;
      }

      // Load canvas from JSON and restore variable mappings
      canvas.loadFromJSON(canvasJSON).then(async () => {
        // Check if canvas is still valid after async load
        if (!canvas || canvas.disposed) {
          console.log('⏭️ Canvas disposed after loadFromJSON, aborting');
          return;
        }
        console.log('✅ Canvas loaded from template');

        // CRITICAL FIX: Apply variable mappings from separate storage
        // Fabric.js v6 doesn't serialize custom properties, so we store them separately
        const objects = canvas.getObjects();
        console.log(`📊 Canvas has ${objects.length} objects, applying variable mappings...`);

        // Parse variable mappings from template
        let variableMappings: Record<string, { variableType?: string; isReusable?: boolean }> = {};
        if (template.variableMappings) {
          try {
            variableMappings = JSON.parse(template.variableMappings);
            console.log(`📦 Loaded ${Object.keys(variableMappings).length} variable mappings from template`);
          } catch (error) {
            console.error('❌ Failed to parse variable mappings:', error);
          }
        }

        // PHASE 5: Apply enhanced mappings to canvas objects by index
        let hasVariableTypes = 0;
        let hasReusableFlags = 0;

        Object.entries(variableMappings).forEach(([indexStr, mapping]: [string, any]) => {
          const idx = parseInt(indexStr);
          if (idx >= 0 && idx < objects.length) {
            const obj = objects[idx];

            // Restore core markers
            if (mapping.variableType) {
              obj.variableType = mapping.variableType;
              hasVariableTypes++;
            }
            if (mapping.isReusable !== undefined) {
              obj.isReusable = mapping.isReusable;
              hasReusableFlags++;
            }

            // PHASE 5: Restore enhanced metadata
            if (mapping.displayName) obj.displayName = mapping.displayName;
            if (mapping.category) obj.category = mapping.category;
            if (mapping.imageData) obj.imageData = mapping.imageData;
            if (mapping.shapeData) obj.shapeData = mapping.shapeData;

            // PHASE 5: Restore layer state (visibility, lock)
            if (mapping.isVisible !== undefined) {
              obj.visible = mapping.isVisible;
            }
            if (mapping.isLocked !== undefined) {
              obj.set({
                lockMovementX: mapping.isLocked,
                lockMovementY: mapping.isLocked,
                lockRotation: mapping.isLocked,
                lockScalingX: mapping.isLocked,
                lockScalingY: mapping.isLocked,
                selectable: !mapping.isLocked,
                evented: !mapping.isLocked,
              });
            }

            console.log(`   ✅ Applied enhanced mapping to Object ${idx}:`, {
              variableType: obj.variableType,
              displayName: obj.displayName,
              category: obj.category,
              visible: obj.visible,
              locked: obj.lockMovementX
            });
          }
        });

        console.log(`📊 Summary: ${hasVariableTypes} objects with variableType, ${hasReusableFlags} with isReusable flag`);

        if (hasVariableTypes === 0) {
          console.warn('⚠️ WARNING: No objects have variableType markers! Template may be outdated.');
          toast.error('Template is missing markers. Please recreate template with latest version.');
          return;
        }

        // Update variable fields with current recipient data (AWAIT this)
        await updateTemplateVariables(canvas, data, fabricModule);

        // PHASE 3: Sync layers after template load
        syncLayers();

        // NO duplicate renderAll - updateTemplateVariables already calls it
        toast.success(`Template "${template.name}" loaded successfully`);
      }).catch((err: any) => {
        console.error('❌ Error loading canvas JSON:', err);
        toast.error('Failed to load template design');
      });

    } catch (error) {
      console.error('❌ Error loading template:', error);
      toast.error('Failed to load template');
    }
  };

  // Update variable fields in template with current recipient data
  const updateTemplateVariables = async (canvas: any, data: EditorData, fabricModule: any) => {
    console.log('🔄 Updating template variables with recipient data');
    console.log('📋 Recipient data:', {
      name: data.recipientName,
      lastname: data.recipientLastname,
      address: data.recipientAddress,
      city: data.recipientCity,
      zip: data.recipientZip,
      message: data.message?.substring(0, 50) + '...',
      hasQR: !!data.qrCodeDataUrl,
      phone: data.phoneNumber,
      hasNewBackground: !!data.backgroundImage,
    });

    const { FabricImage } = fabricModule;
    const objects = canvas.getObjects();
    const replacements: Promise<void>[] = [];

    console.log(`📊 Processing ${objects.length} objects in template`);

    // === CRITICAL FIX: Replace template background with NEW AI-generated image ===
    if (data.backgroundImage) {
      console.log('🖼️ Replacing template background with new AI-generated image');
      console.log('   Old background:', canvas.backgroundImage ? 'exists' : 'none');

      const bgReplacement = FabricImage.fromURL(data.backgroundImage, {crossOrigin: 'anonymous'})
        .then((newBg: any) => {
          if (!canvas || canvas.disposed) {
            console.error('❌ Canvas disposed, skipping background replacement');
            return;
          }

          // COVER STRATEGY: Scale uniformly to fill canvas (no distortion, may crop)
          // Like CSS: background-size: cover; background-position: center;
          const imgWidth = newBg.width || data.canvasWidth;
          const imgHeight = newBg.height || data.canvasHeight;
          const canvasAspect = data.canvasWidth / data.canvasHeight;
          const imageAspect = imgWidth / imgHeight;

          // Calculate uniform scale to cover entire canvas
          const scale = Math.max(
            data.canvasWidth / imgWidth,
            data.canvasHeight / imgHeight
          );

          // Center the image on canvas
          const scaledWidth = imgWidth * scale;
          const scaledHeight = imgHeight * scale;
          const left = (data.canvasWidth - scaledWidth) / 2;
          const top = (data.canvasHeight - scaledHeight) / 2;

          console.log('📐 Background scaling (COVER strategy):');
          console.log(`   Image: ${imgWidth}x${imgHeight} (${imageAspect.toFixed(2)}:1)`);
          console.log(`   Canvas: ${data.canvasWidth}x${data.canvasHeight} (${canvasAspect.toFixed(2)}:1)`);
          console.log(`   Scale: ${scale.toFixed(4)} (uniform, no distortion)`);
          console.log(`   Scaled dimensions: ${scaledWidth.toFixed(0)}x${scaledHeight.toFixed(0)}`);
          console.log(`   Position: (${left.toFixed(0)}, ${top.toFixed(0)})`);
          console.log(`   Overflow: ${scaledWidth > data.canvasWidth || scaledHeight > data.canvasHeight ? 'YES (edges cropped)' : 'NO'}`);

          newBg.set({
            scaleX: scale,
            scaleY: scale, // Same as scaleX (uniform scaling = no distortion)
            left: left,
            top: top,
            selectable: false,
            evented: false,
          });

          // Replace canvas background
          canvas.backgroundImage = newBg;
          console.log('✅ Background image replaced successfully (COVER mode)');
        })
        .catch((err: any) => {
          console.error('❌ Error replacing background image:', err);
        });

      replacements.push(bgReplacement);
    }

    // Process each object
    for (const obj of objects) {
      // Use variableType marker for reliable detection
      const varType = obj.variableType;
      const isReusable = obj.isReusable;

      // Skip objects without markers
      if (!varType) {
        console.log(`⏭️ Skipping unmarked object (type: ${obj.type})`);
        continue;
      }

      // PRESERVE reusable elements (logo, background elements)
      if (isReusable) {
        console.log(`🔒 Preserving reusable element: ${varType}`);
        continue; // Do NOT modify reusable elements
      }

      // === TEXT FIELD REPLACEMENTS (variable data) ===
      if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
        switch (varType) {
          case 'message':
            obj.set({ text: data.message });
            console.log('📝 Updated message field');
            break;

          case 'recipientName':
            obj.set({ text: `${data.recipientName} ${data.recipientLastname}` });
            console.log('👤 Updated recipient name');
            break;

          case 'recipientAddress':
            const address = `${data.recipientAddress}, ${data.recipientCity}, ${data.recipientZip}`;
            obj.set({ text: address });
            console.log('📍 Updated recipient address');
            break;

          case 'phoneNumber':
            obj.set({ text: `📞 ${data.phoneNumber}` });
            console.log('📞 Updated phone number');
            break;

          default:
            console.log(`⚠️ Unknown text field type: ${varType}`);
        }
      }

      // === QR CODE REPLACEMENT (variable data) ===
      // ONLY replace if explicitly marked as 'qrCode' AND is an image
      if (varType === 'qrCode' && obj.type === 'image') {
        console.log('🔄 Replacing QR code with new tracking ID');
        console.log(`   Old QR position: (${obj.left}, ${obj.top}), scale: (${obj.scaleX}, ${obj.scaleY})`);

        const replacement = FabricImage.fromURL(data.qrCodeDataUrl, {crossOrigin: 'anonymous'})
          .then((newQR: any) => {
            // Verify canvas is still valid
            if (!canvas || canvas.disposed) {
              console.error('❌ Canvas disposed, skipping QR replacement');
              return;
            }

            // CRITICAL: Preserve original QR code's displayed size
            // Calculate old QR code's actual displayed dimensions (accounting for scale)
            const oldQRDisplayWidth = (obj.width || 150) * (obj.scaleX || 1);
            const oldQRDisplayHeight = (obj.height || 150) * (obj.scaleY || 1);

            // Use the smaller dimension to ensure square aspect ratio
            const oldQRDisplaySize = Math.min(oldQRDisplayWidth, oldQRDisplayHeight);

            // Calculate new scale to match old display size
            const qrNaturalSize = newQR.width || 300; // QR codes are square
            const properScale = oldQRDisplaySize / qrNaturalSize;

            console.log(`   QR natural size: ${qrNaturalSize}x${qrNaturalSize}, preserving old size: ${oldQRDisplaySize.toFixed(2)}x${oldQRDisplaySize.toFixed(2)}, scale: ${properScale.toFixed(4)}`);

            // Transfer position and properties from old QR
            newQR.set({
              left: obj.left,
              top: obj.top,
              scaleX: properScale, // Use calculated scale (1:1 ratio)
              scaleY: properScale, // Same scale for both (square)
              angle: obj.angle || 0,
              variableType: 'qrCode', // Preserve marker
              isReusable: false, // QR code is variable (changes per recipient)
            });

            // Remove old and add new (batch operations to avoid intermediate renders)
            canvas.remove(obj);
            canvas.add(newQR);

            console.log('✅ QR code replaced successfully');
          })
          .catch((err: any) => {
            console.error('❌ Error updating QR code:', err);
          });

        replacements.push(replacement);
      }

      // === SAFETY CHECK: Never touch logo ===
      if (varType === 'logo') {
        console.log('🛡️ SAFETY: Logo detected but should be preserved (isReusable check)');
        // This should never happen because we already checked isReusable above
        // But adding explicit check for extra safety
        continue;
      }
    }

    // Wait for all async replacements to complete
    console.log(`⏳ Waiting for ${replacements.length} async replacements...`);
    await Promise.all(replacements);

    // Render once after all updates (with safety check)
    if (canvas && !canvas.disposed) {
      canvas.renderAll();
      console.log('✅ Template variables updated successfully');
    } else {
      console.error('❌ Canvas disposed, cannot render');
      throw new Error('Canvas disposed');
    }
  };

  // Toolbar functions
  const addText = () => {
    if (!fabricCanvasRef.current || !fabricRef.current) return;
    const { IText } = fabricRef.current;
    const text = new IText("Click to edit", {
      left: 100,
      top: 100,
      fontSize: 24,
      fill: "#000000",
    });
    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
    fabricCanvasRef.current.renderAll();
  };

  // PHASE 4: Enhanced Rectangle tool with metadata
  const addRectangle = () => {
    if (!fabricCanvasRef.current || !fabricRef.current || !editorData) return;
    const { Rect } = fabricRef.current;
    const canvas = fabricCanvasRef.current;

    const variableType = `custom-rectangle-${rectangleCounter}`;

    const rect = new Rect({
      left: editorData.canvasWidth / 2 - 100,
      top: editorData.canvasHeight / 2 - 50,
      width: 200,
      height: 100,
      fill: "#4F46E5",
      stroke: "#3730A3",
      strokeWidth: 2,
    });

    // Add metadata for layer management
    (rect as any).variableType = variableType;
    (rect as any).displayName = `Rectangle ${rectangleCounter}`;
    (rect as any).category = "custom-shape";

    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();

    setRectangleCounter((prev) => prev + 1);
    toast.success(`Added Rectangle ${rectangleCounter}`);
  };

  // PHASE 4: Enhanced Circle tool with metadata
  const addCircle = () => {
    if (!fabricCanvasRef.current || !fabricRef.current || !editorData) return;
    const { Circle } = fabricRef.current;
    const canvas = fabricCanvasRef.current;

    const variableType = `custom-circle-${circleCounter}`;

    const circle = new Circle({
      left: editorData.canvasWidth / 2 - 50,
      top: editorData.canvasHeight / 2 - 50,
      radius: 50,
      fill: "#10B981",
      stroke: "#059669",
      strokeWidth: 2,
    });

    // Add metadata for layer management
    (circle as any).variableType = variableType;
    (circle as any).displayName = `Circle ${circleCounter}`;
    (circle as any).category = "custom-shape";

    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.renderAll();

    setCircleCounter((prev) => prev + 1);
    toast.success(`Added Circle ${circleCounter}`);
  };

  // PHASE 4: New Line tool
  const addLine = () => {
    if (!fabricCanvasRef.current || !fabricRef.current || !editorData) return;
    const { Line } = fabricRef.current;
    const canvas = fabricCanvasRef.current;

    const variableType = `custom-line-${lineCounter}`;
    const centerX = editorData.canvasWidth / 2;
    const centerY = editorData.canvasHeight / 2;

    const line = new Line([centerX - 100, centerY, centerX + 100, centerY], {
      stroke: "#EF4444",
      strokeWidth: 3,
      selectable: true,
    });

    // Add metadata for layer management
    (line as any).variableType = variableType;
    (line as any).displayName = `Line ${lineCounter}`;
    (line as any).category = "custom-shape";

    canvas.add(line);
    canvas.setActiveObject(line);
    canvas.renderAll();

    setLineCounter((prev) => prev + 1);
    toast.success(`Added Line ${lineCounter}`);
  };

  // PHASE 4: Alignment Tools

  // Align selected object to left edge of canvas
  const alignLeft = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !editorData) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) {
      toast.error("Please select an object to align");
      return;
    }

    activeObject.set({ left: 20 });
    canvas.renderAll();
    toast.success("Aligned to left");
  };

  // Align selected object to horizontal center of canvas
  const alignCenterHorizontal = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !editorData) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) {
      toast.error("Please select an object to align");
      return;
    }

    const objectWidth = activeObject.width! * (activeObject.scaleX || 1);
    activeObject.set({ left: (editorData.canvasWidth - objectWidth) / 2 });
    canvas.renderAll();
    toast.success("Centered horizontally");
  };

  // Align selected object to right edge of canvas
  const alignRight = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !editorData) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) {
      toast.error("Please select an object to align");
      return;
    }

    const objectWidth = activeObject.width! * (activeObject.scaleX || 1);
    activeObject.set({ left: editorData.canvasWidth - objectWidth - 20 });
    canvas.renderAll();
    toast.success("Aligned to right");
  };

  // Align selected object to top edge of canvas
  const alignTop = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !editorData) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) {
      toast.error("Please select an object to align");
      return;
    }

    activeObject.set({ top: 20 });
    canvas.renderAll();
    toast.success("Aligned to top");
  };

  // Align selected object to vertical center of canvas
  const alignCenterVertical = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !editorData) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) {
      toast.error("Please select an object to align");
      return;
    }

    const objectHeight = activeObject.height! * (activeObject.scaleY || 1);
    activeObject.set({ top: (editorData.canvasHeight - objectHeight) / 2 });
    canvas.renderAll();
    toast.success("Centered vertically");
  };

  // Align selected object to bottom edge of canvas
  const alignBottom = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !editorData) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) {
      toast.error("Please select an object to align");
      return;
    }

    const objectHeight = activeObject.height! * (activeObject.scaleY || 1);
    activeObject.set({ top: editorData.canvasHeight - objectHeight - 20 });
    canvas.renderAll();
    toast.success("Aligned to bottom");
  };

  // PHASE 2: Custom Image Upload
  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const canvas = fabricCanvasRef.current;
      const fabric = fabricRef.current;
      if (!canvas || !fabric || !editorData) return;

      const { FabricImage } = fabric;

      FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' })
        .then((img: any) => {
          // PRESERVE ASPECT RATIO: Scale to max width of 300px
          const maxWidth = 300;
          const scale = Math.min(maxWidth / (img.width || maxWidth), 1);

          const variableType = `decorative-image-${customImageCounter}`;

          img.set({
            left: editorData.canvasWidth / 2 - (img.width * scale) / 2,
            top: editorData.canvasHeight / 2 - (img.height * scale) / 2,
            scaleX: scale,
            scaleY: scale,
          });

          (img as any).variableType = variableType;
          (img as any).category = "custom-image";
          (img as any).imageData = dataUrl;

          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.renderAll();

          setCustomImageCounter((prev) => prev + 1);
          toast.success(`Added Image ${customImageCounter}`);
        })
        .catch((err: any) => {
          console.error('Error loading image:', err);
          toast.error('Failed to load image');
        });
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be uploaded again
    e.target.value = '';
  };

  // PHASE 3: Layer Management Helper Functions

  // Get icon for layer type
  const getLayerIcon = (layer: any) => {
    if (layer.type === 'textbox' || layer.type === 'i-text' || layer.type === 'text') {
      return <FileText className="w-4 h-4" />;
    }
    if (layer.type === 'image') {
      return <ImageIcon className="w-4 h-4" />;
    }
    if (layer.type === 'rect') {
      return <Square className="w-4 h-4" />;
    }
    if (layer.type === 'circle') {
      return <Circle className="w-4 h-4" />;
    }
    if (layer.type === 'line') {
      return <Minus className="w-4 h-4" />;
    }
    return <Layers className="w-4 h-4" />;
  };

  // Toggle visibility
  const toggleLayerVisibility = (layer: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const obj = layer.fabricObject;
    obj.visible = !obj.visible;
    canvas.renderAll();
    syncLayers();
  };

  // Toggle lock
  const toggleLayerLock = (layer: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const obj = layer.fabricObject;
    const newLockState = !obj.lockMovementX;

    obj.set({
      lockMovementX: newLockState,
      lockMovementY: newLockState,
      lockRotation: newLockState,
      lockScalingX: newLockState,
      lockScalingY: newLockState,
      selectable: !newLockState,
      evented: !newLockState,
    });

    canvas.renderAll();
    syncLayers();
  };

  // Move layer up (increase z-index)
  const moveLayerUp = (layer: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const obj = layer.fabricObject;
    canvas.bringObjectForward(obj);
    canvas.renderAll();
    syncLayers();
  };

  // Move layer down (decrease z-index)
  const moveLayerDown = (layer: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const obj = layer.fabricObject;
    canvas.sendObjectBackwards(obj);
    canvas.renderAll();
    syncLayers();
  };

  // Start editing layer name
  const startEditingLayerName = (layer: any) => {
    if (layer.isStandard) {
      toast.error("Cannot rename standard template elements");
      return;
    }
    setEditingLayerId(layer.id);
    setEditingLayerName(layer.displayName);
  };

  // Save layer name
  const saveLayerName = (layer: any) => {
    if (!editingLayerName.trim()) {
      toast.error("Layer name cannot be empty");
      return;
    }

    const obj = layer.fabricObject;
    obj.displayName = editingLayerName.trim();

    setEditingLayerId(null);
    setEditingLayerName("");
    syncLayers();
    toast.success("Layer renamed");
  };

  // Delete layer from panel
  const deleteLayerFromPanel = (layer: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (layer.isStandard) {
      if (!window.confirm(`Are you sure you want to delete "${layer.displayName}"? This is a standard template element.`)) {
        return;
      }
    }

    canvas.remove(layer.fabricObject);
    canvas.renderAll();
    syncLayers();
    toast.success(`Deleted ${layer.displayName}`);
  };

  // Select layer from panel
  const selectLayer = (layer: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.setActiveObject(layer.fabricObject);
    canvas.renderAll();
  };

  // PHASE 5: Property Application Functions

  // Apply fill color change (silently - no toast to avoid spam when dragging)
  const applyFillColor = (color: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return; // Silent fail - user will see no change

    activeObject.set({ fill: color });
    canvas.renderAll();
    setObjectFill(color);
    // No toast - this fires continuously when dragging color picker
  };

  // Apply stroke color change (silently - no toast to avoid spam when dragging)
  const applyStrokeColor = (color: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return; // Silent fail - user will see no change

    activeObject.set({ stroke: color });
    canvas.renderAll();
    setObjectStroke(color);
    // No toast - this fires continuously when dragging color picker
  };

  // Apply font size change
  const applyFontSize = (size: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) {
      toast.error("Please select an object first");
      return;
    }

    if (activeObject.type !== 'textbox' && activeObject.type !== 'i-text' && activeObject.type !== 'text') {
      toast.error("Please select a text object");
      return;
    }

    activeObject.set({ fontSize: size });
    canvas.renderAll();
    setObjectFontSize(size);
  };

  // Apply font weight change
  const applyFontWeight = (weight: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) {
      toast.error("Please select an object first");
      return;
    }

    if (activeObject.type !== 'textbox' && activeObject.type !== 'i-text' && activeObject.type !== 'text') {
      toast.error("Please select a text object");
      return;
    }

    activeObject.set({ fontWeight: weight });
    canvas.renderAll();
    setObjectFontWeight(weight);
    toast.success(`Font weight: ${weight}`);
  };

  // Apply font family change
  const applyFontFamily = (family: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) {
      toast.error("Please select an object first");
      return;
    }

    if (activeObject.type !== 'textbox' && activeObject.type !== 'i-text' && activeObject.type !== 'text') {
      toast.error("Please select a text object");
      return;
    }

    activeObject.set({ fontFamily: family });
    canvas.renderAll();
    setObjectFontFamily(family);
    toast.success(`Font: ${family}`);
  };

  // Save as reusable template (NEW - saves both campaign_template + dm_template)
  const handleSaveAsTemplate = async () => {
    if (!fabricCanvasRef.current || !editorData) {
      toast.error("Canvas not ready");
      return;
    }

    // Validate required fields
    if (!templateForm.name.trim()) {
      toast.error("Template name is required");
      return;
    }

    try {
      setIsSavingTemplate(true);

      // CRITICAL FIX: Reset zoom to 100% before saving
      // With CSS-only zoom, we just need to reset the CSS scaling
      if (zoomLevel !== 100) {
        console.log(`⚠️ Canvas is zoomed to ${zoomLevel}%, resetting to 100% for save`);
        fabricCanvasRef.current.setDimensions({
          width: editorData.canvasWidth,
          height: editorData.canvasHeight,
        }, { cssOnly: true });
        setZoomLevel(100);
      }

      // Note: No need to reset viewport transform since we're using CSS-only zoom
      console.log('🔧 Canvas at 100% before save (logical dimensions preserved)');

      // Deselect all objects
      fabricCanvasRef.current.discardActiveObject();
      fabricCanvasRef.current.renderAll();

      // Export canvas as JSON (standard properties only - custom properties don't serialize properly in Fabric.js v6)
      const canvasJSON = fabricCanvasRef.current.toJSON([
        'id', 'selectable', 'evented', 'lockMovementX', 'lockMovementY'
      ]);

      // CRITICAL FIX: Create variable mappings from actual canvas objects
      // PHASE 5: Enhanced to save all metadata (displayName, category, imageData, shapeData, visibility, lock)
      // Map object index → variable markers (bypasses Fabric.js serialization issue)
      const objects = fabricCanvasRef.current.getObjects();
      const variableMappings: Record<string, any> = {};

      console.log('📸 Creating enhanced variable mappings from canvas objects');
      objects.forEach((obj: any, idx: number) => {
        const mapping: any = {
          variableType: obj.variableType,
          isReusable: obj.isReusable,
          displayName: obj.displayName,
          category: obj.category,
          isVisible: obj.visible !== false,
          isLocked: obj.lockMovementX || false,
        };

        // PHASE 5: Save image data for custom images
        if (obj.category === 'custom-image' && obj.imageData) {
          mapping.imageData = obj.imageData;
        }

        // PHASE 5: Save shape data for custom shapes
        if (obj.category === 'custom-shape') {
          mapping.shapeData = {
            shapeType: obj.type, // 'rect', 'circle', 'line'
            fill: obj.fill,
            stroke: obj.stroke,
            strokeWidth: obj.strokeWidth,
          };
        }

        variableMappings[idx.toString()] = mapping;
        console.log(`   Mapped Object ${idx}:`, mapping);
      });

      console.log(`📊 Created enhanced mappings for ${Object.keys(variableMappings).length} objects`);

      // Generate preview image
      const previewImage = fabricCanvasRef.current.toDataURL({
        format: "png",
        quality: 0.8,
        multiplier: 0.5,
      });

      console.log("💾 Saving as full template (campaign + design)...");

      // Call unified save API
      const response = await fetch('/api/templates/save-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignData: {
            name: templateForm.name,
            description: templateForm.description,
            category: templateForm.category,
            message: editorData.message,
            targetAudience: templateForm.targetAudience,
            tone: templateForm.tone,
            industry: templateForm.industry,
          },
          dmData: {
            campaignId: editorData.campaignId,
            canvasSessionId: sessionId,
            name: templateForm.name,
            canvasJSON: JSON.stringify(canvasJSON),
            backgroundImage: editorData.backgroundImage,
            canvasWidth: editorData.canvasWidth,
            canvasHeight: editorData.canvasHeight,
            previewImage,
            variableMappings: JSON.stringify(variableMappings),
          },
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to save template');
      }

      console.log(`✅ Full template saved! Campaign: ${result.data.campaignTemplateId}, DM: ${result.data.dmTemplateId}`);

      toast.success("Template saved successfully!");
      setShowTemplateModal(false);

      // Navigate to Template Library
      setTimeout(() => {
        router.push('/analytics?tab=templates');
      }, 1000);

    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save template');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Save and continue (EXISTING - keeps current single-use workflow)
  const handleSave = async () => {
    if (!fabricCanvasRef.current || !editorData) {
      toast.error("Canvas not ready");
      return;
    }

    try {
      toast.loading("Saving template...");

      // CRITICAL FIX: Reset zoom to 100% before saving
      // With CSS-only zoom, we just need to reset the CSS scaling
      if (zoomLevel !== 100) {
        console.log(`⚠️ Canvas is zoomed to ${zoomLevel}%, resetting to 100% for save`);
        fabricCanvasRef.current.setDimensions({
          width: editorData.canvasWidth,
          height: editorData.canvasHeight,
        }, { cssOnly: true });
        setZoomLevel(100);
      }

      // Note: No need to reset viewport transform since we're using CSS-only zoom
      console.log('🔧 Canvas at 100% before save (logical dimensions preserved)');

      // Deselect all objects
      fabricCanvasRef.current.discardActiveObject();
      fabricCanvasRef.current.renderAll();

      // Export canvas as JSON (standard properties only - custom properties don't serialize properly in Fabric.js v6)
      const canvasJSON = fabricCanvasRef.current.toJSON([
        'id', 'selectable', 'evented', 'lockMovementX', 'lockMovementY'
      ]);

      // CRITICAL FIX: Create variable mappings from actual canvas objects
      // PHASE 5: Enhanced to save all metadata (displayName, category, imageData, shapeData, visibility, lock)
      // Map object index → variable markers (bypasses Fabric.js serialization issue)
      const objects = fabricCanvasRef.current.getObjects();
      const variableMappings: Record<string, any> = {};

      console.log('💾 Save and Continue - Creating enhanced variable mappings from canvas objects');
      objects.forEach((obj: any, idx: number) => {
        const mapping: any = {
          variableType: obj.variableType,
          isReusable: obj.isReusable,
          displayName: obj.displayName,
          category: obj.category,
          isVisible: obj.visible !== false,
          isLocked: obj.lockMovementX || false,
        };

        // PHASE 5: Save image data for custom images
        if (obj.category === 'custom-image' && obj.imageData) {
          mapping.imageData = obj.imageData;
        }

        // PHASE 5: Save shape data for custom shapes
        if (obj.category === 'custom-shape') {
          mapping.shapeData = {
            shapeType: obj.type, // 'rect', 'circle', 'line'
            fill: obj.fill,
            stroke: obj.stroke,
            strokeWidth: obj.strokeWidth,
          };
        }

        variableMappings[idx.toString()] = mapping;
        console.log(`   Mapped Object ${idx}:`, mapping);
      });

      console.log(`📊 Created enhanced mappings for ${Object.keys(variableMappings).length} objects`);

      // Generate preview image (smaller size for storage)
      const previewImage = fabricCanvasRef.current.toDataURL({
        format: "png",
        quality: 0.8,
        multiplier: 0.5, // 50% size for preview
      });

      // Save to database
      const response = await fetch('/api/dm-template/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: editorData.campaignId,
          canvasSessionId: sessionId,
          name: editorData.campaignName || `DM Template - ${new Date().toLocaleDateString()}`,
          canvasJSON: JSON.stringify(canvasJSON),
          backgroundImage: editorData.backgroundImage,
          canvasWidth: editorData.canvasWidth,
          canvasHeight: editorData.canvasHeight,
          previewImage,
          variableMappings: JSON.stringify(variableMappings),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to save template');
      }

      toast.dismiss();
      toast.success("Template saved successfully!");

      // Navigate to results page with template ID
      router.push(`/dm-creative/results?template=${result.templateId}`);

    } catch (error) {
      toast.dismiss();
      console.error('Error saving template:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save template');
    }
  };

  const handleZoomIn = () => {
    if (!fabricCanvasRef.current || !editorData) return;
    const newZoom = Math.min(zoomLevel + 10, 200);
    setZoomLevel(newZoom);
    const factor = newZoom / 100;

    // CRITICAL FIX: Use CSS-only zoom to preserve object coordinates
    // Previous bug: using setZoom() AND setDimensions() together created double-transform
    // Objects were positioned based on enlarged canvas (e.g., 2160x1440) instead of logical 1800x1200
    fabricCanvasRef.current.setDimensions({
      width: editorData.canvasWidth * factor,
      height: editorData.canvasHeight * factor,
    }, { cssOnly: true });

    fabricCanvasRef.current.renderAll();
    console.log(`🔍 Zoom: ${newZoom}% (CSS-only, logical canvas: ${editorData.canvasWidth}x${editorData.canvasHeight})`);
  };

  const handleZoomOut = () => {
    if (!fabricCanvasRef.current || !editorData) return;
    const newZoom = Math.max(zoomLevel - 10, 25);
    setZoomLevel(newZoom);
    const factor = newZoom / 100;

    // CRITICAL FIX: CSS-only zoom
    fabricCanvasRef.current.setDimensions({
      width: editorData.canvasWidth * factor,
      height: editorData.canvasHeight * factor,
    }, { cssOnly: true });

    fabricCanvasRef.current.renderAll();
    console.log(`🔍 Zoom: ${newZoom}% (CSS-only, logical canvas: ${editorData.canvasWidth}x${editorData.canvasHeight})`);
  };

  const handleZoomFit = () => {
    if (!fabricCanvasRef.current || !editorData) return;
    setZoomLevel(100);

    // CRITICAL FIX: Reset to 100% with CSS-only
    fabricCanvasRef.current.setDimensions({
      width: editorData.canvasWidth,
      height: editorData.canvasHeight,
    }, { cssOnly: true });

    fabricCanvasRef.current.renderAll();
    console.log(`🔍 Zoom: 100% (logical canvas: ${editorData.canvasWidth}x${editorData.canvasHeight})`);
  };

  if (isLoading || !editorData) {
    return (
      <div className="fixed inset-0 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4" />
          <p className="text-lg font-medium">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white flex flex-col">
      {/* TOP TOOLBAR */}
      <header className="h-16 bg-white border-b flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dm-creative")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="border-l h-8 border-gray-300" />
          <div>
            <h1 className="font-semibold">{editorData.campaignName || "Direct Mail Editor"}</h1>
            <p className="text-xs text-gray-500">
              {editorData.recipientName} {editorData.recipientLastname}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowTemplateModal(true)}
            className="gap-2"
          >
            <Library className="w-4 h-4" />
            Save as Template
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowLPCustomizationModal(true)}
            className="gap-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50"
            disabled={!editorData?.campaignId}
          >
            <Globe className="w-4 h-4 text-purple-600" />
            Customize Landing Page
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Save className="w-4 h-4" />
            Save & Continue
          </Button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT TOOLBAR */}
        <div className="w-20 bg-gray-50 border-r flex flex-col items-center py-4 gap-3">
          <Button variant="ghost" size="sm" onClick={addText} className="w-14 h-14 flex flex-col p-0" title="Add Text">
            <Type className="w-6 h-6" />
            <span className="text-[10px] mt-1">Text</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={addRectangle} className="w-14 h-14 flex flex-col p-0" title="Add Rectangle">
            <Square className="w-6 h-6" />
            <span className="text-[10px] mt-1">Box</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={addCircle} className="w-14 h-14 flex flex-col p-0" title="Add Circle">
            <Circle className="w-6 h-6" />
            <span className="text-[10px] mt-1">Circle</span>
          </Button>

          {/* PHASE 4: Line Tool */}
          <Button variant="ghost" size="sm" onClick={addLine} className="w-14 h-14 flex flex-col p-0" title="Add Line">
            <Minus className="w-6 h-6" />
            <span className="text-[10px] mt-1">Line</span>
          </Button>

          {/* PHASE 2: Image Upload Tool */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => document.getElementById("custom-image-upload")?.click()}
            className="w-14 h-14 flex flex-col p-0"
            title="Add Image"
          >
            <ImageIcon className="w-6 h-6" />
            <span className="text-[10px] mt-1">Image</span>
          </Button>
          <input
            id="custom-image-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCustomImageUpload}
          />

          <div className="border-t w-12 my-2" />

          {/* PHASE 2: Delete Tool */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={!selectedElement}
            className="w-14 h-14 flex flex-col p-0 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            title="Delete (Del)"
          >
            <Trash2 className="w-6 h-6" />
            <span className="text-[10px] mt-1">Delete</span>
          </Button>

          <div className="border-t w-12 my-2" />

          {/* PHASE 4: Alignment Tools Section */}
          <div className="text-[10px] text-gray-500 mb-1 text-center">Align</div>

          {/* Horizontal Alignment */}
          <Button
            variant="ghost"
            size="sm"
            onClick={alignLeft}
            disabled={!selectedElement}
            className="w-12 h-8 p-0 disabled:opacity-50"
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={alignCenterHorizontal}
            disabled={!selectedElement}
            className="w-12 h-8 p-0 disabled:opacity-50"
            title="Center Horizontally"
          >
            <AlignCenter className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={alignRight}
            disabled={!selectedElement}
            className="w-12 h-8 p-0 disabled:opacity-50"
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </Button>

          <div className="border-t w-12 my-1" />

          {/* Vertical Alignment */}
          <Button
            variant="ghost"
            size="sm"
            onClick={alignTop}
            disabled={!selectedElement}
            className="w-12 h-8 p-0 disabled:opacity-50"
            title="Align Top"
          >
            <AlignVerticalJustifyStart className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={alignCenterVertical}
            disabled={!selectedElement}
            className="w-12 h-8 p-0 disabled:opacity-50"
            title="Center Vertically"
          >
            <AlignVerticalJustifyCenter className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={alignBottom}
            disabled={!selectedElement}
            className="w-12 h-8 p-0 disabled:opacity-50"
            title="Align Bottom"
          >
            <AlignVerticalJustifyEnd className="w-4 h-4" />
          </Button>
        </div>

        {/* CANVAS WORKSPACE */}
        <div className="flex-1 flex items-center justify-center overflow-auto bg-gradient-to-br from-gray-100 to-gray-200 p-8">
          <div
            className="bg-white shadow-2xl"
            style={{
              width: `${(editorData.canvasWidth * zoomLevel) / 100}px`,
              height: `${(editorData.canvasHeight * zoomLevel) / 100}px`,
            }}
          >
            <canvas ref={canvasRef} />
          </div>
        </div>

        {/* RIGHT SIDEBAR: PROPERTIES + LAYERS */}
        {showLayerPanel && (
          <div className="w-80 bg-white border-l flex flex-col overflow-hidden">
            {/* PHASE 5: PROPERTIES PANEL */}
            {showPropertiesPanel && selectedElement && (
              <div className="border-b bg-white">
                {/* Header */}
                <div className="h-12 border-b flex items-center justify-between px-4 bg-blue-50">
                  <div className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-blue-700" />
                    <h3 className="font-semibold text-blue-900">Properties</h3>
                  </div>
                </div>

                {/* Properties Content */}
                <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                  {/* Fill Color */}
                  <div>
                    <Label className="text-xs font-medium text-gray-700 mb-2 block">
                      Fill Color
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={objectFill}
                        onChange={(e) => applyFillColor(e.target.value)}
                        className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={objectFill}
                        onChange={(e) => {
                          setObjectFill(e.target.value);
                          if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                            applyFillColor(e.target.value);
                          }
                        }}
                        className="flex-1 h-10 text-sm font-mono"
                        placeholder="#000000"
                      />
                    </div>
                  </div>

                  {/* Stroke Color (for shapes) */}
                  {selectedElement.type !== 'textbox' && selectedElement.type !== 'i-text' && selectedElement.type !== 'text' && (
                    <div>
                      <Label className="text-xs font-medium text-gray-700 mb-2 block">
                        Stroke Color
                      </Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={objectStroke}
                          onChange={(e) => applyStrokeColor(e.target.value)}
                          className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={objectStroke}
                          onChange={(e) => {
                            setObjectStroke(e.target.value);
                            if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                              applyStrokeColor(e.target.value);
                            }
                          }}
                          className="flex-1 h-10 text-sm font-mono"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                  )}

                  {/* Font Controls (for text only) */}
                  {(selectedElement.type === 'textbox' || selectedElement.type === 'i-text' || selectedElement.type === 'text') && (
                    <>
                      {/* Font Size */}
                      <div>
                        <Label className="text-xs font-medium text-gray-700 mb-2 block">
                          Font Size: {objectFontSize}px
                        </Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="8"
                            max="120"
                            value={objectFontSize}
                            onChange={(e) => applyFontSize(Number(e.target.value))}
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <Input
                            type="number"
                            value={objectFontSize}
                            onChange={(e) => applyFontSize(Number(e.target.value))}
                            className="w-16 h-10 text-sm"
                            min="8"
                            max="120"
                          />
                        </div>
                      </div>

                      {/* Font Weight */}
                      <div>
                        <Label className="text-xs font-medium text-gray-700 mb-2 block">
                          Font Weight
                        </Label>
                        <div className="flex gap-2">
                          <Button
                            variant={objectFontWeight === 'normal' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => applyFontWeight('normal')}
                            className="flex-1"
                          >
                            Normal
                          </Button>
                          <Button
                            variant={objectFontWeight === 'bold' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => applyFontWeight('bold')}
                            className="flex-1 gap-1"
                          >
                            <Bold className="w-4 h-4" />
                            Bold
                          </Button>
                        </div>
                      </div>

                      {/* Font Family */}
                      <div>
                        <Label className="text-xs font-medium text-gray-700 mb-2 block">
                          Font Family
                        </Label>
                        <Select
                          value={objectFontFamily}
                          onValueChange={applyFontFamily}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Arial">Arial</SelectItem>
                            <SelectItem value="Helvetica">Helvetica</SelectItem>
                            <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                            <SelectItem value="Courier New">Courier New</SelectItem>
                            <SelectItem value="Georgia">Georgia</SelectItem>
                            <SelectItem value="Verdana">Verdana</SelectItem>
                            <SelectItem value="Comic Sans MS">Comic Sans MS</SelectItem>
                            <SelectItem value="Impact">Impact</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* PHASE 3: LAYER PANEL */}
            {/* Header */}
            <div className="h-14 border-b flex items-center justify-between px-4 bg-gray-50">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-gray-700" />
                <h3 className="font-semibold text-gray-900">Layers</h3>
                <span className="text-xs text-gray-500">({layers.length})</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLayerPanel(false)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Layer List */}
            <div className="flex-1 overflow-y-auto p-2">
              {layers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <Layers className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">No layers yet</p>
                  <p className="text-xs text-gray-400 mt-1">Add elements to see them here</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {layers.map((layer) => (
                    <div
                      key={layer.id}
                      className={`
                        group relative flex items-center gap-2 p-2 rounded-lg border-2 transition-all
                        ${selectedElement === layer.fabricObject
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                        }
                        ${!layer.visible ? 'opacity-50' : ''}
                      `}
                      onClick={() => selectLayer(layer)}
                    >
                      {/* Layer Icon */}
                      <div className="flex-shrink-0 text-gray-600">
                        {getLayerIcon(layer)}
                      </div>

                      {/* Layer Name */}
                      <div className="flex-1 min-w-0">
                        {editingLayerId === layer.id ? (
                          <Input
                            value={editingLayerName}
                            onChange={(e) => setEditingLayerName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveLayerName(layer);
                              if (e.key === 'Escape') {
                                setEditingLayerId(null);
                                setEditingLayerName('');
                              }
                            }}
                            onBlur={() => saveLayerName(layer)}
                            className="h-7 text-sm"
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium truncate">
                              {layer.displayName}
                            </span>
                            {!layer.isStandard && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditingLayerName(layer);
                                }}
                                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                                title="Rename"
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        )}
                        {layer.isStandard && (
                          <p className="text-[10px] text-gray-500">Standard layer</p>
                        )}
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1">
                        {/* Visibility Toggle */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLayerVisibility(layer);
                          }}
                          className="h-7 w-7 p-0"
                          title={layer.visible ? "Hide" : "Show"}
                        >
                          {layer.visible ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          )}
                        </Button>

                        {/* Lock Toggle */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLayerLock(layer);
                          }}
                          className="h-7 w-7 p-0"
                          title={layer.locked ? "Unlock" : "Lock"}
                        >
                          {layer.locked ? (
                            <Lock className="w-4 h-4 text-orange-500" />
                          ) : (
                            <Unlock className="w-4 h-4" />
                          )}
                        </Button>

                        {/* Reorder Buttons */}
                        <div className="flex flex-col">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveLayerUp(layer);
                            }}
                            className="h-3 w-5 p-0"
                            title="Move up"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveLayerDown(layer);
                            }}
                            className="h-3 w-5 p-0"
                            title="Move down"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        </div>

                        {/* Delete Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteLayerFromPanel(layer);
                          }}
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Info */}
            <div className="border-t px-4 py-2 bg-gray-50">
              <p className="text-xs text-gray-600">
                💡 <strong>Tip:</strong> Click to select, double-click name to rename custom layers
              </p>
            </div>
          </div>
        )}

        {/* Layer Panel Toggle (when hidden) */}
        {!showLayerPanel && (
          <div className="absolute right-4 top-20">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLayerPanel(true)}
              className="gap-2 shadow-lg"
            >
              <Layers className="w-4 h-4" />
              Show Layers
            </Button>
          </div>
        )}
      </div>

      {/* BOTTOM BAR - Zoom Controls */}
      <div className="h-14 bg-white border-t flex items-center justify-between px-6">
        <div className="text-sm text-gray-600">
          {editorData.canvasWidth} × {editorData.canvasHeight}px
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleZoomOut} disabled={zoomLevel <= 25}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <div className="w-16 text-center">
            <span className="text-sm font-medium">{zoomLevel}%</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleZoomIn} disabled={zoomLevel >= 200}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <div className="border-l h-6 mx-2" />
          <Button variant="ghost" size="sm" onClick={handleZoomFit} className="gap-2">
            <Maximize2 className="w-4 h-4" />
            Fit
          </Button>
        </div>
        <div className="text-xs text-gray-500">Page 1 of 1</div>
      </div>

      {/* TEMPLATE SAVE MODAL */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Library className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Save as Reusable Template</h2>
                  <p className="text-sm text-gray-600">Create a template you can use for future campaigns</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplateModal(false)}
                disabled={isSavingTemplate}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-5">
              {/* Template Name */}
              <div>
                <Label htmlFor="template-name" className="text-sm font-medium">
                  Template Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="template-name"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                  placeholder="e.g., Spring Sale Postcard 2024"
                  className="mt-1.5"
                  disabled={isSavingTemplate}
                />
                <p className="text-xs text-gray-500 mt-1">Give your template a memorable name</p>
              </div>

              {/* Category */}
              <div>
                <Label htmlFor="template-category" className="text-sm font-medium">
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={templateForm.category}
                  onValueChange={(value) => setTemplateForm({...templateForm, category: value})}
                  disabled={isSavingTemplate}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="seasonal">Seasonal</SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">Helps organize templates in your library</p>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="template-description" className="text-sm font-medium">
                  Description <span className="text-gray-400">(optional)</span>
                </Label>
                <Textarea
                  id="template-description"
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({...templateForm, description: e.target.value})}
                  placeholder="Describe when and how to use this template..."
                  rows={3}
                  maxLength={500}
                  className="mt-1.5"
                  disabled={isSavingTemplate}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {templateForm.description.length}/500 characters
                </p>
              </div>

              {/* Optional Fields - Collapsed by default */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Additional Details <span className="text-gray-400">(optional)</span>
                </p>

                <div className="space-y-4">
                  {/* Target Audience */}
                  <div>
                    <Label htmlFor="target-audience" className="text-sm">
                      Target Audience
                    </Label>
                    <Input
                      id="target-audience"
                      value={templateForm.targetAudience}
                      onChange={(e) => setTemplateForm({...templateForm, targetAudience: e.target.value})}
                      placeholder="e.g., First-time customers 25-45, Homeowners"
                      className="mt-1.5"
                      disabled={isSavingTemplate}
                    />
                  </div>

                  {/* Tone */}
                  <div>
                    <Label htmlFor="tone" className="text-sm">
                      Tone & Style
                    </Label>
                    <Input
                      id="tone"
                      value={templateForm.tone}
                      onChange={(e) => setTemplateForm({...templateForm, tone: e.target.value})}
                      placeholder="e.g., Warm and reassuring, Professional, Urgent"
                      className="mt-1.5"
                      disabled={isSavingTemplate}
                    />
                  </div>

                  {/* Industry */}
                  <div>
                    <Label htmlFor="industry" className="text-sm">
                      Industry
                    </Label>
                    <Input
                      id="industry"
                      value={templateForm.industry}
                      onChange={(e) => setTemplateForm({...templateForm, industry: e.target.value})}
                      placeholder="e.g., Healthcare, Retail, Finance"
                      className="mt-1.5"
                      disabled={isSavingTemplate}
                    />
                  </div>
                </div>
              </div>

              {/* What Gets Saved Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">What's included in this template:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-blue-600 rounded-full"></div>
                    Marketing message and copy
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-blue-600 rounded-full"></div>
                    Complete design layout and styling
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-blue-600 rounded-full"></div>
                    AI-generated background image (reusable)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-blue-600 rounded-full"></div>
                    Variable fields for personalization (name, address, etc.)
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => setShowTemplateModal(false)}
                disabled={isSavingTemplate}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAsTemplate}
                disabled={isSavingTemplate || !templateForm.name.trim()}
                className="bg-blue-600 hover:bg-blue-700 min-w-[140px]"
              >
                {isSavingTemplate ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Template
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Landing Page Customization Modal */}
      {editorData?.campaignId && (
        <LandingPageCustomizationModal
          open={showLPCustomizationModal}
          campaignId={editorData.campaignId.toString()}
          campaignName={editorData.campaignName || "Campaign"}
          companyName={editorData.companyName} // Pass company name for brand profile lookup
          campaignMessage={editorData.message}
          onClose={() => setShowLPCustomizationModal(false)}
          onSave={() => {
            toast.success("Landing page customization saved!");
            setShowLPCustomizationModal(false);
          }}
        />
      )}
    </div>
  );
}
