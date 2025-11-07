'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import type { DesignTemplate, RecipientList, VariableMapping } from '@/lib/database/types';
import { cn } from '@/lib/utils';

interface CampaignPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: DesignTemplate;
  recipientList: RecipientList;
  variableMappings: VariableMapping[];
}

interface SampleRecipient {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip_code: string;
  country: string;
}

export function CampaignPreviewModal({
  isOpen,
  onClose,
  template,
  recipientList,
  variableMappings,
}: CampaignPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [sampleRecipients, setSampleRecipients] = useState<SampleRecipient[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSampleRecipients();
    }
  }, [isOpen, recipientList.id]);

  useEffect(() => {
    if (sampleRecipients.length > 0 && isOpen) {
      generatePreview(sampleRecipients[currentIndex]);
    }
  }, [currentIndex, sampleRecipients.length, isOpen]); // Only depend on length to avoid unnecessary re-renders

  async function loadSampleRecipients() {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/audience/recipient-lists/${recipientList.id}/contacts?limit=5`
      );

      if (!response.ok) {
        throw new Error('Failed to load sample recipients');
      }

      const data = await response.json();
      setSampleRecipients(data.contacts || []);
    } catch (error) {
      console.error('Error loading sample recipients:', error);
      setSampleRecipients([]);
    } finally {
      setLoading(false);
    }
  }

  async function generatePreview(recipient: SampleRecipient) {
    try {
      setGeneratingPreview(true);

      // 🔍 Check if we actually need to do variable replacement
      const hasVariablesToReplace = variableMappings.length > 0;

      if (!hasVariablesToReplace) {
        // No variables to replace - just use the static thumbnail
        console.log('✅ No variables to replace, using static thumbnail');
        if (template.thumbnail_url) {
          setPreviewImage(template.thumbnail_url);
        } else {
          setPreviewImage(null);
        }
        setGeneratingPreview(false);
        return;
      }

      console.log('🎨 Starting personalized preview generation...');
      console.log('📋 Template canvas_json type:', typeof template.canvas_json);
      console.log('📋 Template canvas_json keys:', Object.keys(template.canvas_json || {}));
      console.log('📋 Canvas JSON objects:', template.canvas_json?.objects?.length || 0);

      // Check if canvas_json is valid
      if (!template.canvas_json || !template.canvas_json.objects || template.canvas_json.objects.length === 0) {
        console.warn('⚠️ Template has no canvas objects, using thumbnail');
        if (template.thumbnail_url) {
          setPreviewImage(template.thumbnail_url);
        }
        setGeneratingPreview(false);
        return;
      }

      // 🎯 PERSONALIZED PREVIEW: Render template with recipient data
      const { Canvas, Image, Textbox } = await import('fabric');

      // Create a hidden canvas element in the DOM (required for Fabric.js v6)
      const canvasElement = document.createElement('canvas');
      canvasElement.width = template.canvas_width;
      canvasElement.height = template.canvas_height;
      canvasElement.style.position = 'absolute';
      canvasElement.style.left = '-9999px';
      canvasElement.style.top = '-9999px';
      document.body.appendChild(canvasElement);

      // Create canvas instance
      const canvas = new Canvas(canvasElement, {
        width: template.canvas_width,
        height: template.canvas_height,
        backgroundColor: '#FFFFFF'
      });

      console.log('🎨 Canvas created:', {
        width: template.canvas_width,
        height: template.canvas_height,
        zoom: canvas.getZoom(), // Should be 1.0
        viewport: canvas.viewportTransform // Should be [1,0,0,1,0,0]
      });

      // Load template canvas JSON (Fabric.js v6 Promise-based API)
      try {
        await canvas.loadFromJSON(template.canvas_json);
        console.log('✅ Canvas loaded successfully, objects:', canvas.getObjects().length);
      } catch (loadError) {
        console.error('❌ Failed to load canvas JSON:', loadError);
        throw loadError;
      }

      // Apply variable mappings from template to canvas objects
      const objects = canvas.getObjects();

      // Safety check: If no objects loaded, fall back to thumbnail
      if (objects.length === 0) {
        console.warn('⚠️ Canvas loaded but has 0 objects, using thumbnail');
        canvas.dispose();
        document.body.removeChild(canvasElement);
        if (template.thumbnail_url) {
          setPreviewImage(template.thumbnail_url);
        }
        setGeneratingPreview(false);
        return;
      }
      if (template.variable_mappings) {
        Object.entries(template.variable_mappings).forEach(([idx, mapping]) => {
          const index = parseInt(idx);
          if (objects[index]) {
            (objects[index] as any).variableType = mapping.variableType;
            (objects[index] as any).isReusable = mapping.isReusable;
          }
        });
      }

      // Replace variable text with recipient data
      console.log('🔍 Variable Mappings:', variableMappings);
      console.log('🔍 Sample Recipient:', recipient);

      for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        const variableType = (obj as any).variableType;

        console.log(`📝 Object ${i}:`, {
          type: obj.type,
          variableType: variableType,
          text: obj.type === 'textbox' ? (obj as any).text : undefined
        });

        if (variableType && obj.type === 'textbox') {
          const textObj = obj as any;
          const textContent = textObj.text || '';

          // Extract variable name from {variableName} pattern in the text
          const match = textContent.match(/\{([^}]+)\}/);
          const extractedVariableName = match ? match[1] : null;

          console.log(`  📝 Textbox analysis:`, {
            text: textContent,
            extractedVariableName,
            variableType,
          });

          // Remove purple highlighting
          textObj.set({
            backgroundColor: 'transparent',
            fill: '#000000' // Default to black text
          });

          // Replace with actual data based on variable mappings
          // Match against the EXTRACTED variable name from {variableName}, not the variableType
          let replaced = false;
          for (const mapping of variableMappings) {
            console.log(`  🔄 Checking mapping:`, {
              templateVariable: mapping.templateVariable,
              extractedVariableName,
              recipientField: mapping.recipientField,
              matches: mapping.templateVariable === extractedVariableName
            });

            // Match the extracted variable name (e.g., "firstName" from "{firstName}")
            // with mapping.templateVariable (e.g., "firstName" that maps to "first_name" field)
            if (extractedVariableName && mapping.templateVariable === extractedVariableName) {
              const recipientValue = recipient[mapping.recipientField as keyof SampleRecipient];
              console.log(`  ✅ Match found! Recipient value:`, recipientValue);

              if (recipientValue) {
                textObj.set({ text: String(recipientValue) });
                console.log(`  🎯 Replaced "${variableType}" with "${recipientValue}"`);
                replaced = true;
              } else {
                console.warn(`  ⚠️ Recipient field "${mapping.recipientField}" is empty`);
              }
              break;
            }
          }

          if (!replaced && variableType) {
            console.warn(`  ⚠️ No mapping found for variable "${variableType}"`);
          }
        }

        // Generate unique QR code for this recipient
        if (variableType === 'qrCode' && obj.type === 'image') {
          try {
            const trackingCode = `${template.id}-${recipient.id}`;
            const qrUrl = `${window.location.origin}/lp/${trackingCode}`;
            const qrDataUrl = await generateQRCodeImage(qrUrl);

            console.log(`  🔲 Generating QR code for tracking: ${trackingCode}`);

            await new Promise<void>((resolve) => {
              Image.fromURL(qrDataUrl, { crossOrigin: 'anonymous' }).then((qrImg) => {
                if (qrImg && obj.width && obj.height) {
                  qrImg.scaleToWidth(obj.width * ((obj as any).scaleX || 1));
                  qrImg.scaleToHeight(obj.height * ((obj as any).scaleY || 1));
                  qrImg.set({
                    left: obj.left,
                    top: obj.top,
                    angle: obj.angle,
                  });
                  canvas.remove(obj);
                  canvas.add(qrImg);
                  console.log('  ✅ QR code replaced');
                }
                resolve();
              }).catch((error) => {
                console.error('  ❌ QR code generation failed:', error);
                resolve();
              });
            });
          } catch (error) {
            console.error('Failed to generate QR code:', error);
          }
        }
      }

      canvas.renderAll();

      // Export to data URL at full resolution
      const dataUrl = canvas.toDataURL({
        format: 'png',
        quality: 1.0,
        multiplier: 1 // No scaling, use full canvas resolution
      });

      console.log('✅ Preview generated:', {
        width: template.canvas_width,
        height: template.canvas_height,
        dataUrlLength: dataUrl.length
      });

      setPreviewImage(dataUrl);

      // Cleanup
      try {
        canvas.dispose();
        // Remove the hidden canvas element from DOM
        const hiddenCanvases = document.querySelectorAll('canvas[style*="-9999px"]');
        hiddenCanvases.forEach(el => el.remove());
        console.log('🧹 Cleaned up canvas elements');
      } catch (cleanupError) {
        console.warn('Cleanup warning:', cleanupError);
      }

    } catch (error) {
      console.error('❌ Error generating preview:', error);

      // Cleanup on error
      try {
        const hiddenCanvases = document.querySelectorAll('canvas[style*="-9999px"]');
        hiddenCanvases.forEach(el => el.remove());
      } catch (cleanupError) {
        console.warn('Cleanup error:', cleanupError);
      }

      // Fallback to thumbnail if personalization fails
      if (template.thumbnail_url) {
        console.log('⚠️ Falling back to static thumbnail');
        setPreviewImage(template.thumbnail_url);
      } else {
        setPreviewImage(null);
      }
    } finally {
      setGeneratingPreview(false);
    }
  }

  async function generateQRCodeImage(url: string): Promise<string> {
    const QRCode = (await import('qrcode')).default;
    return await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' }
    });
  }

  const currentRecipient = sampleRecipients[currentIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-600" />
            Campaign Preview
          </DialogTitle>
          <DialogDescription>
            Preview how your campaign will look with sample recipient data. Navigate between samples to see different personalizations.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-slate-600">Loading sample recipients...</span>
          </div>
        ) : sampleRecipients.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-600">No recipients found in this list.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Recipient Info */}
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900">
                  Sample {currentIndex + 1} of {sampleRecipients.length}
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentIndex((i) => Math.min(sampleRecipients.length - 1, i + 1))}
                    disabled={currentIndex === sampleRecipients.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {currentRecipient && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-600">Name:</span>{' '}
                    <span className="font-medium text-slate-900">
                      {currentRecipient.first_name} {currentRecipient.last_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600">Email:</span>{' '}
                    <span className="font-medium text-slate-900">
                      {currentRecipient.email || 'N/A'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-600">Address:</span>{' '}
                    <span className="font-medium text-slate-900">
                      {currentRecipient.address_line1}, {currentRecipient.city}, {currentRecipient.state} {currentRecipient.zip_code}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Preview Image */}
            <div className="border-2 border-slate-200 rounded-lg bg-slate-50 p-6">
              <div className="flex items-center justify-center">
                {generatingPreview ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
                    <span className="text-slate-600">Generating preview...</span>
                  </div>
                ) : previewImage ? (
                  <img
                    src={previewImage}
                    alt="Campaign Preview"
                    className="max-w-full h-auto object-contain shadow-lg rounded"
                  />
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-slate-600">Preview not available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Variable Mappings Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Variable Mappings Applied:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {variableMappings.map((mapping, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-blue-700">{mapping.templateVariable}</span>
                    <span className="text-blue-600">→</span>
                    <span className="text-blue-900 font-medium">
                      {currentRecipient?.[mapping.recipientField as keyof SampleRecipient] || '(empty)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Info Notice */}
            <div className="text-xs text-slate-500 text-center">
              This is a preview using sample data. Each recipient will receive a personalized version
              with their own data and a unique tracking QR code.
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
