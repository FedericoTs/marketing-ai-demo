"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, RotateCcw, Move, Type, Image as ImageIcon, QrCode, User, Palette } from "lucide-react";
import { CompositionSettings, getDefaultCompositionSettings } from "@/types/composition";
import { toast } from "sonner";

interface CompositionFineTuneModalProps {
  open: boolean;
  onClose: () => void;
  onAccept: (settings: CompositionSettings) => void;

  // Input data
  backgroundImage: string; // base64 data URL
  canvasWidth: number;
  canvasHeight: number;
  aspectRatio: string;
  template: 'classic' | 'modern' | 'minimal' | 'premium';
  companyName: string;
  message: string;
  logoUrl?: string;
  brandColors?: { primary?: string; secondary?: string; text?: string; };
}

type DraggableElement = 'logo' | 'headline' | 'message' | 'qrCode' | 'recipientInfo' | null;

export function CompositionFineTuneModal({
  open,
  onClose,
  onAccept,
  backgroundImage,
  canvasWidth,
  canvasHeight,
  aspectRatio,
  template,
  companyName,
  message,
  logoUrl,
  brandColors,
}: CompositionFineTuneModalProps) {
  const [settings, setSettings] = useState<CompositionSettings>(
    getDefaultCompositionSettings(canvasWidth, canvasHeight, aspectRatio, template, companyName, message, brandColors)
  );

  const [selectedElement, setSelectedElement] = useState<DraggableElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scale factor to fit canvas in modal (max 600px wide)
  const maxPreviewWidth = 600;
  const scale = Math.min(maxPreviewWidth / canvasWidth, 1);
  const previewWidth = canvasWidth * scale;
  const previewHeight = canvasHeight * scale;

  // Redraw canvas whenever settings change
  useEffect(() => {
    if (!canvasRef.current || !open) return;
    drawPreview();
  }, [settings, open, backgroundImage, logoUrl]);

  const drawPreview = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set actual canvas size
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw background image
    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';
    bgImg.onload = () => {
      ctx.drawImage(bgImg, 0, 0, canvasWidth, canvasHeight);

      // Draw logo if available
      if (logoUrl) {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        logoImg.onload = () => {
          ctx.globalAlpha = settings.logo.opacity / 100;
          ctx.drawImage(
            logoImg,
            settings.logo.position.x,
            settings.logo.position.y,
            settings.logo.size.width,
            settings.logo.size.height
          );
          ctx.globalAlpha = 1;

          // Highlight if selected
          if (selectedElement === 'logo') {
            ctx.strokeStyle = '#3B82F6';
            ctx.lineWidth = 3;
            ctx.strokeRect(
              settings.logo.position.x - 2,
              settings.logo.position.y - 2,
              settings.logo.size.width + 4,
              settings.logo.size.height + 4
            );
          }
        };
        logoImg.src = logoUrl;
      }

      // Draw headline text
      ctx.font = `${settings.headline.fontWeight} ${settings.headline.fontSize}px ${settings.headline.fontFamily}`;
      ctx.fillStyle = settings.headline.color;
      ctx.textAlign = settings.headline.textAlign;

      const headlineX = settings.headline.textAlign === 'center'
        ? settings.headline.position.x
        : settings.headline.textAlign === 'right'
        ? settings.headline.position.x + settings.headline.maxWidth
        : settings.headline.position.x;

      ctx.fillText(settings.headline.content, headlineX, settings.headline.position.y);

      if (selectedElement === 'headline') {
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 3;
        const metrics = ctx.measureText(settings.headline.content);
        ctx.strokeRect(
          settings.headline.position.x - 5,
          settings.headline.position.y - settings.headline.fontSize - 5,
          settings.headline.maxWidth + 10,
          settings.headline.fontSize + 15
        );
      }

      // Draw message text (wrapped)
      ctx.font = `${settings.message.fontWeight} ${settings.message.fontSize}px ${settings.message.fontFamily}`;
      ctx.fillStyle = settings.message.color;
      ctx.textAlign = settings.message.textAlign;

      const words = settings.message.content.split(' ');
      const lines: string[] = [];
      let currentLine = words[0];

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + ' ' + word).width;
        if (width < settings.message.maxWidth) {
          currentLine += ' ' + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      lines.push(currentLine);

      const messageX = settings.message.textAlign === 'center'
        ? settings.message.position.x
        : settings.message.textAlign === 'right'
        ? settings.message.position.x + settings.message.maxWidth
        : settings.message.position.x;

      lines.forEach((line, index) => {
        ctx.fillText(line, messageX, settings.message.position.y + (index * settings.message.fontSize * settings.message.lineHeight));
      });

      if (selectedElement === 'message') {
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 3;
        ctx.strokeRect(
          settings.message.position.x - 5,
          settings.message.position.y - settings.message.fontSize - 5,
          settings.message.maxWidth + 10,
          (lines.length * settings.message.fontSize * settings.message.lineHeight) + 15
        );
      }

      // Draw QR code placeholder
      ctx.fillStyle = '#E5E7EB';
      ctx.fillRect(
        settings.qrCode.position.x,
        settings.qrCode.position.y,
        settings.qrCode.size,
        settings.qrCode.size
      );

      ctx.strokeStyle = settings.qrCode.borderColor;
      ctx.lineWidth = settings.qrCode.borderWidth;
      ctx.strokeRect(
        settings.qrCode.position.x,
        settings.qrCode.position.y,
        settings.qrCode.size,
        settings.qrCode.size
      );

      // Draw "QR" text in center
      ctx.fillStyle = '#9CA3AF';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('QR', settings.qrCode.position.x + settings.qrCode.size / 2, settings.qrCode.position.y + settings.qrCode.size / 2);

      if (selectedElement === 'qrCode') {
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 3;
        ctx.strokeRect(
          settings.qrCode.position.x - 2,
          settings.qrCode.position.y - 2,
          settings.qrCode.size + 4,
          settings.qrCode.size + 4
        );
      }

      // Draw recipient info placeholder
      ctx.fillStyle = settings.recipientInfo.color;
      ctx.font = `${settings.recipientInfo.fontSize}px ${settings.recipientInfo.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      let recipientText = '';
      if (settings.recipientInfo.showName) recipientText += 'John Doe\n';
      if (settings.recipientInfo.showAddress) recipientText += '123 Main St, City, ST 12345';

      const recipientLines = recipientText.split('\n');
      recipientLines.forEach((line, i) => {
        ctx.fillText(line, settings.recipientInfo.position.x, settings.recipientInfo.position.y + (i * settings.recipientInfo.fontSize * 1.4));
      });

      if (selectedElement === 'recipientInfo') {
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 3;
        ctx.strokeRect(
          settings.recipientInfo.position.x - 5,
          settings.recipientInfo.position.y - 5,
          300,
          recipientLines.length * settings.recipientInfo.fontSize * 1.4 + 10
        );
      }
    };
    bgImg.src = backgroundImage;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    // Check which element was clicked
    const clickedElement = getElementAtPosition(x, y);
    setSelectedElement(clickedElement);

    if (clickedElement) {
      setIsDragging(true);
      setDragStart({ x, y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedElement) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    const deltaX = x - dragStart.x;
    const deltaY = y - dragStart.y;

    setSettings(prev => {
      const newSettings = { ...prev, customized: true };

      if (selectedElement === 'logo') {
        newSettings.logo.position.x = Math.max(0, Math.min(canvasWidth - prev.logo.size.width, prev.logo.position.x + deltaX));
        newSettings.logo.position.y = Math.max(0, Math.min(canvasHeight - prev.logo.size.height, prev.logo.position.y + deltaY));
      } else if (selectedElement === 'headline') {
        newSettings.headline.position.x += deltaX;
        newSettings.headline.position.y += deltaY;
      } else if (selectedElement === 'message') {
        newSettings.message.position.x += deltaX;
        newSettings.message.position.y += deltaY;
      } else if (selectedElement === 'qrCode') {
        newSettings.qrCode.position.x = Math.max(0, Math.min(canvasWidth - prev.qrCode.size, prev.qrCode.position.x + deltaX));
        newSettings.qrCode.position.y = Math.max(0, Math.min(canvasHeight - prev.qrCode.size, prev.qrCode.position.y + deltaY));
      } else if (selectedElement === 'recipientInfo') {
        newSettings.recipientInfo.position.x += deltaX;
        newSettings.recipientInfo.position.y += deltaY;
      }

      return newSettings;
    });

    setDragStart({ x, y });
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const getElementAtPosition = (x: number, y: number): DraggableElement => {
    // Check logo
    if (logoUrl &&
        x >= settings.logo.position.x && x <= settings.logo.position.x + settings.logo.size.width &&
        y >= settings.logo.position.y && y <= settings.logo.position.y + settings.logo.size.height) {
      return 'logo';
    }

    // Check QR code
    if (x >= settings.qrCode.position.x && x <= settings.qrCode.position.x + settings.qrCode.size &&
        y >= settings.qrCode.position.y && y <= settings.qrCode.position.y + settings.qrCode.size) {
      return 'qrCode';
    }

    // Check headline (approximate)
    if (x >= settings.headline.position.x - 10 && x <= settings.headline.position.x + settings.headline.maxWidth + 10 &&
        y >= settings.headline.position.y - settings.headline.fontSize - 10 && y <= settings.headline.position.y + 10) {
      return 'headline';
    }

    // Check message
    if (x >= settings.message.position.x - 10 && x <= settings.message.position.x + settings.message.maxWidth + 10 &&
        y >= settings.message.position.y - settings.message.fontSize - 10 && y <= settings.message.position.y + 100) {
      return 'message';
    }

    // Check recipient info
    if (x >= settings.recipientInfo.position.x - 10 && x <= settings.recipientInfo.position.x + 300 &&
        y >= settings.recipientInfo.position.y - 10 && y <= settings.recipientInfo.position.y + 60) {
      return 'recipientInfo';
    }

    return null;
  };

  const handleReset = () => {
    setSettings(getDefaultCompositionSettings(canvasWidth, canvasHeight, aspectRatio, template, companyName, message, brandColors));
    setSelectedElement(null);
    toast.info('Composition reset to template defaults');
  };

  const handleAccept = () => {
    console.log('✅ Composition settings accepted:', settings);
    onAccept(settings);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Move className="w-5 h-5 text-primary" />
            Fine-Tune Composition
            {settings.customized && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Customized</span>}
          </DialogTitle>
          <DialogDescription>
            Drag elements to reposition. Click to select and use controls to adjust size, colors, and content.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Left: Canvas Preview */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Live Preview {selectedElement && `- ${selectedElement} selected`}</Label>
            <div
              ref={containerRef}
              className="border-2 border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center"
              style={{ width: previewWidth, height: previewHeight }}
            >
              <canvas
                ref={canvasRef}
                style={{ width: previewWidth, height: previewHeight, cursor: isDragging ? 'grabbing' : 'grab' }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Click and drag any element to reposition it on the canvas
            </p>
          </div>

          {/* Right: Controls */}
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            {/* Logo Controls */}
            {logoUrl && (
              <div className={`p-4 rounded-lg border-2 ${selectedElement === 'logo' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                <Label className="flex items-center gap-2 font-semibold mb-3">
                  <ImageIcon className="w-4 h-4" />
                  Logo
                </Label>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">Variant</Label>
                    <Select
                      value={settings.logo.variant}
                      onValueChange={(value: 'auto' | 'color' | 'white') =>
                        setSettings(prev => ({ ...prev, logo: { ...prev.logo, variant: value }, customized: true }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto (AI decides)</SelectItem>
                        <SelectItem value="color">Color Version</SelectItem>
                        <SelectItem value="white">White Version</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">Size: {Math.round(settings.logo.size.width)}px</Label>
                    <Slider
                      value={[settings.logo.size.width]}
                      onValueChange={(values) => {
                        const aspectRatio = settings.logo.size.width / settings.logo.size.height;
                        setSettings(prev => ({
                          ...prev,
                          logo: {
                            ...prev.logo,
                            size: { width: values[0], height: values[0] / aspectRatio }
                          },
                          customized: true
                        }));
                      }}
                      min={50}
                      max={400}
                      step={10}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Headline Controls */}
            <div className={`p-4 rounded-lg border-2 ${selectedElement === 'headline' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
              <Label className="flex items-center gap-2 font-semibold mb-3">
                <Type className="w-4 h-4" />
                Headline
              </Label>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Text</Label>
                  <Input
                    value={settings.headline.content}
                    onChange={(e) => setSettings(prev => ({ ...prev, headline: { ...prev.headline, content: e.target.value }, customized: true }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-sm">Font Size: {settings.headline.fontSize}px</Label>
                    <Slider
                      value={[settings.headline.fontSize]}
                      onValueChange={(values) => setSettings(prev => ({ ...prev, headline: { ...prev.headline, fontSize: values[0] }, customized: true }))}
                      min={20}
                      max={80}
                      step={2}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Color</Label>
                    <Input
                      type="color"
                      value={settings.headline.color}
                      onChange={(e) => setSettings(prev => ({ ...prev, headline: { ...prev.headline, color: e.target.value }, customized: true }))}
                      className="h-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Message Controls */}
            <div className={`p-4 rounded-lg border-2 ${selectedElement === 'message' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
              <Label className="flex items-center gap-2 font-semibold mb-3">
                <Type className="w-4 h-4" />
                Message
              </Label>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Text</Label>
                  <Textarea
                    value={settings.message.content}
                    onChange={(e) => setSettings(prev => ({ ...prev, message: { ...prev.message, content: e.target.value }, customized: true }))}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-sm">Font Size: {settings.message.fontSize}px</Label>
                    <Slider
                      value={[settings.message.fontSize]}
                      onValueChange={(values) => setSettings(prev => ({ ...prev, message: { ...prev.message, fontSize: values[0] }, customized: true }))}
                      min={12}
                      max={40}
                      step={2}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Color</Label>
                    <Input
                      type="color"
                      value={settings.message.color}
                      onChange={(e) => setSettings(prev => ({ ...prev, message: { ...prev.message, color: e.target.value }, customized: true }))}
                      className="h-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code Controls */}
            <div className={`p-4 rounded-lg border-2 ${selectedElement === 'qrCode' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
              <Label className="flex items-center gap-2 font-semibold mb-3">
                <QrCode className="w-4 h-4" />
                QR Code
              </Label>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Size: {settings.qrCode.size}px</Label>
                  <Slider
                    value={[settings.qrCode.size]}
                    onValueChange={(values) => setSettings(prev => ({ ...prev, qrCode: { ...prev.qrCode, size: values[0] }, customized: true }))}
                    min={80}
                    max={300}
                    step={10}
                  />
                </div>
                <div>
                  <Label className="text-sm">Border Color</Label>
                  <Input
                    type="color"
                    value={settings.qrCode.borderColor}
                    onChange={(e) => setSettings(prev => ({ ...prev, qrCode: { ...prev.qrCode, borderColor: e.target.value }, customized: true }))}
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t-2">
              <Button onClick={handleReset} variant="outline" className="flex-1">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button onClick={handleAccept} className="flex-1 bg-green-600 hover:bg-green-700">
                <Check className="w-4 h-4 mr-2" />
                Accept
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
