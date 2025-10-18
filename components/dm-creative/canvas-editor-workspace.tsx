"use client";

/**
 * Canvas Editor Workspace - Full-Page Fabric.js-based composition editor
 * Professional workspace for Direct Mail composition
 *
 * Features:
 * - Full-page dedicated workspace
 * - Drag & drop elements (logo, text, QR code)
 * - Double-click to edit text inline
 * - Logo library with upload capability
 * - Properties panel for fine control
 * - Layer management
 * - Undo/Redo history
 * - Premium UX optimized for full-screen editing
 */

import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import * as fabric from "fabric";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  Upload,
  Type,
  Palette,
  Grid3x3,
  Undo,
  Redo,
  RotateCcw,
  Check,
  X,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import { RecipientData } from "@/types/dm-creative";

export interface CanvasEditorWorkspaceProps {
  onSave: (finalImage: string) => void;
  backgroundImage: string;
  canvasWidth: number;
  canvasHeight: number;
  companyName: string;
  message: string;
  recipient: RecipientData;
  qrCodeDataUrl: string;
  phoneNumber: string;
  logoUrl?: string;
  brandColors?: {
    primary?: string;
    text?: string;
  };
  zoom?: number; // Zoom level percentage (25-200)
}

export interface CanvasEditorWorkspaceHandle {
  save: () => void;
}

interface CanvasElement {
  id: string;
  type: "logo" | "headline" | "message" | "qrcode" | "customer-name" | "customer-address" | "phone";
  fabricObject?: fabric.Object;
  locked: boolean;
  visible: boolean;
}

const GOOGLE_FONTS = [
  "Arial",
  "Helvetica",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Verdana",
  "Trebuchet MS",
  "Comic Sans MS",
  "Impact",
  "Palatino",
  "Garamond",
  "Bookman",
  "Tahoma",
  "Open Sans",
  "Roboto",
  "Lato",
  "Montserrat",
  "Poppins",
  "Raleway",
  "Merriweather",
];

export const CanvasEditorWorkspace = forwardRef<CanvasEditorWorkspaceHandle, CanvasEditorWorkspaceProps>(({
  onSave,
  backgroundImage,
  canvasWidth,
  canvasHeight,
  companyName,
  message,
  recipient,
  qrCodeDataUrl,
  phoneNumber,
  logoUrl,
  brandColors,
  zoom = 100,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [gridEnabled, setGridEnabled] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [logoLibrary, setLogoLibrary] = useState<string[]>([]);
  const [customImageCounter, setCustomImageCounter] = useState(1);  // Track custom images

  // Properties for selected element
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontSize, setFontSize] = useState(24);
  const [fontColor, setFontColor] = useState(brandColors?.text || "#1F2937");
  const [fontWeight, setFontWeight] = useState<"normal" | "bold">("normal");
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("left");
  const [opacity, setOpacity] = useState(100);

  /**
   * Export final image
   */
  const handleSave = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      toast.error("Canvas not initialized");
      return;
    }

    // Deselect all objects
    canvas.discardActiveObject();
    canvas.renderAll();

    // Export as data URL
    const dataURL = canvas.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 1,
    });

    onSave(dataURL);
  }, [onSave]);

  // Expose save method to parent via ref
  useImperativeHandle(ref, () => ({
    save: handleSave,
  }), [handleSave]);

  /**
   * Initialize Fabric.js canvas
   */
  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Fabric canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: "#ffffff",
      selection: true,
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;

    // Load background image
    fabric.Image.fromURL(backgroundImage, {crossOrigin: 'anonymous'})
      .then((img: any) => {
        img.set({
          left: 0,
          top: 0,
          scaleX: canvasWidth / (img.width || canvasWidth),
          scaleY: canvasHeight / (img.height || canvasHeight),
          selectable: false,
          evented: false,
          lockMovementX: true,
          lockMovementY: true,
        });
        canvas.backgroundImage = img;
        canvas.renderAll();

        // Add all elements
        initializeElements(canvas);
      })
      .catch((err: any) => {
        console.error('Error loading background:', err);
        toast.error("Failed to load background image");
        initializeElements(canvas);
      });

    // Selection event handlers
    canvas.on("selection:created", handleSelection);
    canvas.on("selection:updated", handleSelection);
    canvas.on("selection:cleared", () => setSelectedElement(null));

    // Object modified event for history
    canvas.on("object:modified", saveToHistory);

    // Enable snapping guidelines
    if (gridEnabled) {
      enableSnapping(canvas);
    }

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [backgroundImage, canvasWidth, canvasHeight]);

  /**
   * PHASE 2: Keyboard event handler (Delete key)
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete/Backspace key
      if (e.key === "Delete" || e.key === "Backspace") {
        // Don't trigger if user is typing in an input/textarea
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextArea) {
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
  }, [handleDelete]);  // Include handleDelete in dependencies

  /**
   * Apply zoom changes to canvas
   */
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const zoomFactor = zoom / 100;
    canvas.setZoom(zoomFactor);
    canvas.setDimensions({
      width: canvasWidth * zoomFactor,
      height: canvasHeight * zoomFactor,
    });
    canvas.renderAll();
  }, [zoom, canvasWidth, canvasHeight]);

  /**
   * Initialize all canvas elements (logo, text, QR code)
   */
  const initializeElements = useCallback((canvas: fabric.Canvas) => {
    const padding = 30;
    const primaryColor = brandColors?.primary || "#003E7E";
    const textColor = brandColors?.text || "#1F2937";

    // Add logo
    if (logoUrl) {
      fabric.Image.fromURL(logoUrl, { crossOrigin: 'anonymous' })
        .then((img: any) => {
          // PRESERVE ASPECT RATIO: Scale to max width of 200px
          const maxLogoWidth = 200;
          const scale = maxLogoWidth / (img.width || maxLogoWidth);

          img.set({
            left: padding,
            top: padding,
            scaleX: scale,  // Same scale for both dimensions
            scaleY: scale,  // This preserves aspect ratio
          });

          // Use data attribute for custom properties in Fabric.js v6
          (img as any).data = {
            id: "logo",
            type: "logo",
            // Enhanced metadata for layer management
            displayName: "Company Logo",
            variableType: "logo",  // Immutable reference for programmatic replacement
            category: "standard"
          };

          canvas.add(img);
          registerElement("logo", "logo", img);
        })
        .catch((error) => {
          console.error("Failed to load logo:", error);
          toast.error("Failed to load logo");
        });
    }

    // Add headline (company name)
    const headline = new fabric.Text(companyName, {
      left: padding,
      top: padding + 90,
      fontSize: 42,
      fontFamily: "Arial",
      fontWeight: "bold",
      fill: primaryColor,
    });
    (headline as any).data = { id: "headline", type: "headline" };
    canvas.add(headline);
    registerElement("headline", "headline", headline);

    // Add marketing message
    const messageText = new fabric.Textbox(message, {
      left: padding,
      top: padding + 160,
      width: 400,
      fontSize: 20,
      fontFamily: "Arial",
      fill: textColor,
    });
    (messageText as any).data = { id: "message", type: "message" };
    canvas.add(messageText);
    registerElement("message", "message", messageText);

    // Add customer name
    const customerName = new fabric.Text(`${recipient.name} ${recipient.lastname}`, {
      left: padding,
      top: canvasHeight - 120,
      fontSize: 16,
      fontFamily: "Arial",
      fill: "#6B7280",
    });
    (customerName as any).data = { id: "customer-name", type: "customer-name" };
    canvas.add(customerName);
    registerElement("customer-name", "customer-name", customerName);

    // Add customer address
    const customerAddress = new fabric.Text(`${recipient.address}, ${recipient.city}, ${recipient.zip}`, {
      left: padding,
      top: canvasHeight - 90,
      fontSize: 14,
      fontFamily: "Arial",
      fill: "#6B7280",
    });
    (customerAddress as any).data = { id: "customer-address", type: "customer-address" };
    canvas.add(customerAddress);
    registerElement("customer-address", "customer-address", customerAddress);

    // Add phone number
    const phone = new fabric.Text(`📞 ${phoneNumber}`, {
      left: padding,
      top: canvasHeight - 60,
      fontSize: 18,
      fontFamily: "Arial",
      fontWeight: "bold",
      fill: primaryColor,
    });
    (phone as any).data = { id: "phone", type: "phone" };
    canvas.add(phone);
    registerElement("phone", "phone", phone);

    // Add QR code
    fabric.Image.fromURL(qrCodeDataUrl, { crossOrigin: 'anonymous' })
      .then((img: any) => {
        img.set({
          left: canvasWidth - 180 - padding,
          top: canvasHeight - 180 - padding,
          scaleX: 150 / (img.width || 150),
          scaleY: 150 / (img.height || 150),
        });
        (img as any).data = { id: "qrcode", type: "qrcode" };
        canvas.add(img);
        registerElement("qrcode", "qrcode", img);
      })
      .catch((error) => {
        console.error("Failed to load QR code:", error);
        toast.error("Failed to load QR code");
      });

    canvas.renderAll();
  }, [companyName, message, recipient, qrCodeDataUrl, phoneNumber, logoUrl, brandColors, canvasWidth, canvasHeight]);

  /**
   * Register element in state
   */
  const registerElement = (id: string, type: string, obj: fabric.Object) => {
    setElements((prev) => [
      ...prev,
      {
        id,
        type: type as any,
        fabricObject: obj,
        locked: false,
        visible: true,
      },
    ]);
  };

  /**
   * Handle selection changes
   */
  const handleSelection = (e: any) => {
    const activeObject = e.selected?.[0];
    if (activeObject && (activeObject as any).data?.id) {
      const id = (activeObject as any).data.id;
      setSelectedElement(id);

      // Update properties based on selected object
      if (activeObject.type === "text" || activeObject.type === "textbox" || activeObject.type === "i-text") {
        const textObj = activeObject as fabric.Text;
        setFontFamily(textObj.fontFamily || "Arial");
        setFontSize(textObj.fontSize || 24);
        setFontColor(textObj.fill as string || "#000000");
        setFontWeight((textObj.fontWeight === "bold" || textObj.fontWeight === 700) ? "bold" : "normal");
        setTextAlign((textObj.textAlign as "left" | "center" | "right") || "left");
        setOpacity((textObj.opacity || 1) * 100);
      } else if (activeObject.type === "image") {
        setOpacity((activeObject.opacity || 1) * 100);
      }
    }
  };

  /**
   * Save canvas state to history
   */
  const saveToHistory = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const json = JSON.stringify(canvas.toJSON());
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, json];
    });
    setHistoryIndex((prev) => prev + 1);
  };

  /**
   * Undo last action
   */
  const handleUndo = () => {
    if (historyIndex <= 0) return;

    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const prevState = history[historyIndex - 1];
    canvas.loadFromJSON(prevState, () => {
      canvas.renderAll();
      setHistoryIndex((prev) => prev - 1);
    });
  };

  /**
   * Redo last action
   */
  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return;

    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const nextState = history[historyIndex + 1];
    canvas.loadFromJSON(nextState, () => {
      canvas.renderAll();
      setHistoryIndex((prev) => prev + 1);
    });
  };

  /**
   * Reset canvas to defaults
   */
  const handleReset = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.clear();
    initializeElements(canvas);
    setHistory([]);
    setHistoryIndex(-1);
    toast.success("Canvas reset to defaults");
  };

  /**
   * Upload new logo
   */
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;

      // Add to logo library
      setLogoLibrary((prev) => [...prev, dataUrl]);

      // Replace current logo
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const logoObj = canvas.getObjects().find((obj) => (obj as any).data?.id === "logo");
      if (logoObj) {
        canvas.remove(logoObj);
      }

      fabric.Image.fromURL(dataUrl, { crossOrigin: 'anonymous' })
        .then((img: any) => {
          // PRESERVE ASPECT RATIO: Scale to max width of 200px
          const maxLogoWidth = 200;
          const scale = maxLogoWidth / (img.width || maxLogoWidth);

          img.set({
            left: 30,
            top: 30,
            scaleX: scale,  // Same scale for both dimensions
            scaleY: scale,  // This preserves aspect ratio
          });

          (img as any).data = {
            id: "logo",
            type: "logo",
            displayName: "Company Logo",
            variableType: "logo",
            category: "standard"
          };

          canvas.add(img);
          canvas.renderAll();
          saveToHistory();
          toast.success("Logo uploaded and added to library");
        })
        .catch((error) => {
          console.error("Failed to upload logo:", error);
          toast.error("Failed to upload logo");
        });
    };
    reader.readAsDataURL(file);
  };

  /**
   * PHASE 2: Delete selected object (with confirmation for standard layers)
   */
  const handleDelete = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) {
      toast.error("Please select an object to delete");
      return;
    }

    const objData = (activeObject as any).data;
    const variableType = objData?.variableType || objData?.type;
    const displayName = objData?.displayName || variableType || "this object";

    // Check if this is a standard layer (requires confirmation)
    const standardLayers = ['logo', 'background-image', 'message', 'qr-code', 'customer-name', 'customer-address', 'phone-number'];
    const isStandardLayer = standardLayers.includes(variableType);

    if (isStandardLayer) {
      // Confirmation required for standard layers
      if (!window.confirm(`Are you sure you want to delete "${displayName}"? This is a standard layer used for variable replacement.`)) {
        return;
      }
    }

    // Remove from canvas
    canvas.remove(activeObject);
    canvas.renderAll();
    saveToHistory();

    // Remove from elements state
    const objId = objData?.id;
    if (objId) {
      setElements((prev) => prev.filter((el) => el.id !== objId));
    }

    toast.success(`Deleted ${displayName}`);
    setSelectedElement(null);
  };

  /**
   * PHASE 2: Upload custom image (decorative, not a standard layer)
   */
  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      fabric.Image.fromURL(dataUrl, { crossOrigin: 'anonymous' })
        .then((img: any) => {
          // PRESERVE ASPECT RATIO: Scale to max width of 300px
          const maxWidth = 300;
          const scale = Math.min(maxWidth / (img.width || maxWidth), 1);  // Don't upscale

          // Generate unique variableType
          const variableType = `decorative-image-${customImageCounter}`;

          img.set({
            left: canvasWidth / 2 - (img.width * scale) / 2,  // Center horizontally
            top: canvasHeight / 2 - (img.height * scale) / 2,  // Center vertically
            scaleX: scale,
            scaleY: scale,
          });

          // Enhanced metadata for layer management
          (img as any).data = {
            id: variableType,
            type: "image",
            displayName: `Image ${customImageCounter}`,
            variableType: variableType,
            category: "custom-image",
            imageData: dataUrl,  // Store base64 for template saving
          };

          canvas.add(img);
          canvas.setActiveObject(img);  // Auto-select after adding
          canvas.renderAll();
          saveToHistory();

          registerElement(variableType, "image", img);
          setCustomImageCounter((prev) => prev + 1);

          toast.success(`Added Image ${customImageCounter}`);
        })
        .catch((error) => {
          console.error("Failed to upload image:", error);
          toast.error("Failed to upload image");
        });
    };
    reader.readAsDataURL(file);
  };

  /**
   * Update font family of selected text
   */
  const updateFontFamily = (font: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (activeObject && (activeObject.type === "text" || activeObject.type === "textbox" || activeObject.type === "i-text")) {
      (activeObject as fabric.Text).set({ fontFamily: font });
      canvas.renderAll();
      setFontFamily(font);
      saveToHistory();
    }
  };

  /**
   * Update font size of selected text
   */
  const updateFontSize = (size: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (activeObject && (activeObject.type === "text" || activeObject.type === "textbox" || activeObject.type === "i-text")) {
      (activeObject as fabric.Text).set({ fontSize: size });
      canvas.renderAll();
      setFontSize(size);
      saveToHistory();
    }
  };

  /**
   * Update text color of selected text
   */
  const updateTextColor = (color: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (activeObject && (activeObject.type === "text" || activeObject.type === "textbox" || activeObject.type === "i-text")) {
      (activeObject as fabric.Text).set({ fill: color });
      canvas.renderAll();
      setFontColor(color);
      saveToHistory();
    }
  };

  /**
   * Update font weight of selected text
   */
  const updateFontWeight = (weight: "normal" | "bold") => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (activeObject && (activeObject.type === "text" || activeObject.type === "textbox" || activeObject.type === "i-text")) {
      (activeObject as fabric.Text).set({ fontWeight: weight });
      canvas.renderAll();
      setFontWeight(weight);
      saveToHistory();
    }
  };

  /**
   * Update text alignment of selected text
   */
  const updateTextAlign = (align: "left" | "center" | "right") => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (activeObject && (activeObject.type === "text" || activeObject.type === "textbox" || activeObject.type === "i-text")) {
      (activeObject as fabric.Text).set({ textAlign: align });
      canvas.renderAll();
      setTextAlign(align);
      saveToHistory();
    }
  };

  /**
   * Update opacity of selected object
   */
  const updateOpacity = (value: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      activeObject.set({ opacity: value / 100 });
      canvas.renderAll();
      setOpacity(value);
      saveToHistory();
    }
  };

  /**
   * Enable snapping guidelines
   */
  const enableSnapping = (canvas: fabric.Canvas) => {
    // TODO: Implement snapping logic with guidelines
    // This would show red lines when objects align
  };

  /**
   * Toggle grid
   */
  const toggleGrid = () => {
    setGridEnabled(!gridEnabled);
    // TODO: Implement grid overlay
  };

  /**
   * Toggle layer visibility
   */
  const toggleVisibility = (id: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const obj = canvas.getObjects().find((o) => (o as any).data?.id === id);
    if (obj) {
      obj.set({ visible: !obj.visible });
      canvas.renderAll();

      setElements((prev) =>
        prev.map((el) => (el.id === id ? { ...el, visible: !el.visible } : el))
      );
    }
  };

  /**
   * Toggle layer lock
   */
  const toggleLock = (id: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const obj = canvas.getObjects().find((o) => (o as any).data?.id === id);
    if (obj) {
      const isLocked = !obj.selectable;
      obj.set({
        selectable: isLocked,
        evented: isLocked,
      });
      canvas.renderAll();

      setElements((prev) =>
        prev.map((el) => (el.id === id ? { ...el, locked: !el.locked } : el))
      );
    }
  };

  /**
   * Bring element forward/backward
   */
  const changeLayer = (id: string, direction: "up" | "down") => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const obj = canvas.getObjects().find((o) => (o as any).data?.id === id);
    if (obj) {
      if (direction === "up") {
        (canvas as any).bringObjectForward(obj);
      } else {
        (canvas as any).sendObjectBackwards(obj);
      }
      canvas.renderAll();
      saveToHistory();
    }
  };

  // Apply zoom to canvas display
  const scaledWidth = (canvasWidth * zoom) / 100;
  const scaledHeight = (canvasHeight * zoom) / 100;

  return (
    <div className="h-full flex bg-white">
      {/* LEFT TOOLBAR - Clean minimal tools */}
      <div className="w-16 bg-gray-100 border-r border-gray-200 flex flex-col items-center py-4 gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => document.getElementById("logo-upload")?.click()}
          className="w-12 h-12 p-0"
          title="Upload Logo"
        >
          <Upload className="w-5 h-5" />
        </Button>
        <input
          id="logo-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleLogoUpload}
        />

        {/* PHASE 2: Custom Image Upload */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => document.getElementById("custom-image-upload")?.click()}
          className="w-12 h-12 p-0"
          title="Add Image"
        >
          <ImageIcon className="w-5 h-5" />
        </Button>
        <input
          id="custom-image-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCustomImageUpload}
        />

        <div className="h-px w-8 bg-gray-300 my-2" />

        <Button
          variant="ghost"
          size="sm"
          onClick={handleUndo}
          disabled={historyIndex <= 0}
          className="w-12 h-12 p-0"
          title="Undo"
        >
          <Undo className="w-5 h-5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleRedo}
          disabled={historyIndex >= history.length - 1}
          className="w-12 h-12 p-0"
          title="Redo"
        >
          <Redo className="w-5 h-5" />
        </Button>

        <div className="h-px w-8 bg-gray-300 my-2" />

        {/* PHASE 2: Delete Tool */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={!selectedElement}
          className="w-12 h-12 p-0 hover:bg-red-50 hover:text-red-600"
          title="Delete (Del)"
        >
          <Trash2 className="w-5 h-5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="w-12 h-12 p-0"
          title="Reset"
        >
          <RotateCcw className="w-5 h-5" />
        </Button>
      </div>

      {/* MAIN CANVAS AREA - Canva-like centered workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Workspace */}
        <div className="flex-1 flex items-center justify-center overflow-auto bg-gradient-to-br from-gray-50 to-gray-100 p-8">
          <div
            className="bg-white shadow-2xl rounded-sm"
            style={{
              width: `${scaledWidth}px`,
              height: `${scaledHeight}px`,
            }}
          >
            <canvas ref={canvasRef} />
          </div>
        </div>

        {/* RIGHT PROPERTIES PANEL - Collapsible */}
        <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto shadow-lg">
          <h4 className="font-semibold mb-4">Properties</h4>

          {selectedElement ? (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-gray-500">Selected Element</Label>
                <p className="font-medium capitalize">{selectedElement.replace("-", " ")}</p>
              </div>

              {/* Text properties */}
              {(selectedElement === "headline" ||
                selectedElement === "message" ||
                selectedElement === "customer-name" ||
                selectedElement === "customer-address" ||
                selectedElement === "phone") && (
                <>
                  <div>
                    <Label>Font Family</Label>
                    <Select value={fontFamily} onValueChange={updateFontFamily}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GOOGLE_FONTS.map((font) => (
                          <SelectItem key={font} value={font}>
                            {font}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Font Size</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[fontSize]}
                        onValueChange={([val]) => updateFontSize(val)}
                        min={12}
                        max={96}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-sm w-10 text-right">{fontSize}px</span>
                    </div>
                  </div>

                  <div>
                    <Label>Text Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={fontColor}
                        onChange={(e) => updateTextColor(e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        type="text"
                        value={fontColor}
                        onChange={(e) => updateTextColor(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Font Weight</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={fontWeight === "normal" ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateFontWeight("normal")}
                      >
                        Normal
                      </Button>
                      <Button
                        variant={fontWeight === "bold" ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateFontWeight("bold")}
                      >
                        <Bold className="w-4 h-4 mr-2" />
                        Bold
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Text Alignment</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={textAlign === "left" ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateTextAlign("left")}
                      >
                        <AlignLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={textAlign === "center" ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateTextAlign("center")}
                      >
                        <AlignCenter className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={textAlign === "right" ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateTextAlign("right")}
                      >
                        <AlignRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Opacity for all elements */}
              <div>
                <Label>Opacity</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[opacity]}
                    onValueChange={([val]) => updateOpacity(val)}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm w-10 text-right">{opacity}%</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Select an element to edit its properties</p>
          )}

          {/* Logo Library */}
          {logoLibrary.length > 0 && (
            <div className="mt-6">
              <Label className="mb-2 block">Logo Library</Label>
              <div className="grid grid-cols-3 gap-2">
                {logoLibrary.map((logo, idx) => (
                  <button
                    key={idx}
                    className="border rounded p-2 hover:border-blue-500 transition"
                    onClick={() => {
                      // Replace logo with selected one from library
                      const canvas = fabricCanvasRef.current;
                      if (!canvas) return;

                      const logoObj = canvas.getObjects().find((obj) => (obj as any).id === "logo");
                      if (logoObj) {
                        canvas.remove(logoObj);
                      }

                      fabric.Image.fromURL(logo, { crossOrigin: 'anonymous' })
                        .then((img: any) => {
                          img.set({
                            left: 30,
                            top: 30,
                            scaleX: 150 / (img.width || 150),
                            scaleY: 70 / (img.height || 70),
                          });
                          img.set({ id: "logo", type: "logo" } as any);
                          canvas.add(img);
                          canvas.renderAll();
                        })
                        .catch((error) => {
                          console.error("Failed to load logo from library:", error);
                          toast.error("Failed to load logo from library");
                        });
                    }}
                  >
                    <img src={logo} alt={`Logo ${idx + 1}`} className="w-full h-auto" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Layers */}
          <div className="mt-6">
            <Label className="mb-2 block flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Layers
            </Label>
            <div className="space-y-1">
              {elements.map((el) => (
                <div
                  key={el.id}
                  className={`flex items-center gap-2 p-2 rounded text-sm ${
                    selectedElement === el.id ? "bg-blue-100" : "hover:bg-gray-100"
                  }`}
                >
                  <span className="flex-1 capitalize">{el.id.replace("-", " ")}</span>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => toggleVisibility(el.id)}
                  >
                    {el.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => toggleLock(el.id)}
                  >
                    {el.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => changeLayer(el.id, "up")}
                  >
                    <ChevronUp className="w-3 h-3" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => changeLayer(el.id, "down")}
                  >
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Tip */}
      <div className="px-4 py-2 bg-blue-50 text-sm text-blue-700 border-t">
        💡 <strong>Tip:</strong> Double-click text to edit, drag to move, use handles to resize. Press Delete to remove selected element.
      </div>
    </div>
  );
});

CanvasEditorWorkspace.displayName = "CanvasEditorWorkspace";
