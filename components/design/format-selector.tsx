'use client';

import { useState } from 'react';
import { Canvas } from 'fabric';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  PrintFormat,
  getAllFormats,
  getFormatsByCategory,
} from '@/lib/design/print-formats';
import {
  resizeCanvas,
  recommendResizeStrategy,
  type ResizeStrategy,
} from '@/lib/design/resize-engine';
import { Maximize2, AlertTriangle, CheckCircle } from 'lucide-react';

interface FormatSelectorProps {
  canvas: Canvas | null;
  currentFormat: PrintFormat;
  onFormatChange: (format: PrintFormat) => void;
}

export function FormatSelector({
  canvas,
  currentFormat,
  onFormatChange,
}: FormatSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<PrintFormat>(currentFormat);
  const [resizeStrategy, setResizeStrategy] = useState<ResizeStrategy>('scale');
  const [isResizing, setIsResizing] = useState(false);
  const [resizeProgress, setResizeProgress] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const formats = getAllFormats();
  const postcardFormats = getFormatsByCategory('postcard');
  const letterFormats = getFormatsByCategory('letter');
  const specialtyFormats = getFormatsByCategory('specialty');

  // Auto-recommend resize strategy when format changes
  const handleFormatSelect = (formatId: string) => {
    const format = formats.find((f) => f.id === formatId);
    if (format) {
      setSelectedFormat(format);
      const recommended = recommendResizeStrategy(currentFormat, format);
      setResizeStrategy(recommended);
    }
  };

  // Apply format change with intelligent resize
  const handleApplyFormatChange = async () => {
    if (!canvas || selectedFormat.id === currentFormat.id) {
      setIsOpen(false);
      return;
    }

    setIsResizing(true);
    setResizeProgress(0);

    try {
      console.log(`🔄 Changing format from ${currentFormat.name} to ${selectedFormat.name}`);
      console.log(`   Using resize strategy: ${resizeStrategy}`);

      const result = await resizeCanvas(canvas, currentFormat, selectedFormat, {
        strategy: resizeStrategy,
        maintainAspectRatio: true,
        centerContent: true,
        onProgress: (percent) => {
          setResizeProgress(percent);
        },
      });

      console.log('✅ Format change complete:', result);

      // Notify parent component
      onFormatChange(selectedFormat);

      // Show success message
      toast.success(`Format changed to ${selectedFormat.name}`, {
        description: `${result.objectsModified} objects resized using ${result.strategy} strategy`,
      });

      // Show warnings if any
      if (result.warnings.length > 0) {
        result.warnings.forEach((warning) => {
          toast.warning(warning);
        });
      }

      setIsOpen(false);
    } catch (error) {
      console.error('❌ Format change failed:', error);
      toast.error('Failed to change format', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsResizing(false);
      setResizeProgress(0);
    }
  };

  // Get aspect ratio comparison
  const getAspectRatioDiff = () => {
    if (!selectedFormat) return 0;
    const currentAspect = currentFormat.widthInches / currentFormat.heightInches;
    const targetAspect = selectedFormat.widthInches / selectedFormat.heightInches;
    return Math.abs(currentAspect - targetAspect);
  };

  const aspectRatioDiff = getAspectRatioDiff();
  const isMajorChange = aspectRatioDiff > 0.3;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 text-xs"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          {currentFormat.name}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Change Print Format</DialogTitle>
          <DialogDescription>
            Select a new format and choose how to resize your design
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Format Info */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-700">Current Format</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {currentFormat.name} - {currentFormat.widthInches}″ × {currentFormat.heightInches}″
              </div>
            </div>
            {currentFormat.uspsCompliant && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                USPS Compliant
              </Badge>
            )}
          </div>

          {/* Format Selection */}
          <div className="space-y-2">
            <Label>New Format</Label>
            <Select
              value={selectedFormat.id}
              onValueChange={handleFormatSelect}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a format" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Postcards</SelectLabel>
                  {postcardFormats.map((format) => (
                    <SelectItem key={format.id} value={format.id}>
                      {format.name} - {format.description}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Letters</SelectLabel>
                  {letterFormats.map((format) => (
                    <SelectItem key={format.id} value={format.id}>
                      {format.name} - {format.description}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Specialty</SelectLabel>
                  {specialtyFormats.map((format) => (
                    <SelectItem key={format.id} value={format.id}>
                      {format.name} - {format.description}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {/* Selected Format Details */}
            {selectedFormat && selectedFormat.id !== currentFormat.id && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex-1">
                  <div className="text-sm font-medium text-blue-900">
                    {selectedFormat.name}
                  </div>
                  <div className="text-xs text-blue-700 mt-0.5">
                    {selectedFormat.widthInches}″ × {selectedFormat.heightInches}″ ({selectedFormat.widthPixels} × {selectedFormat.heightPixels}px @ {selectedFormat.dpi} DPI)
                  </div>
                </div>
                {selectedFormat.uspsCompliant && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    USPS Compliant
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Resize Strategy */}
          {selectedFormat && selectedFormat.id !== currentFormat.id && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Resize Strategy</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    {showAdvanced ? 'Hide' : 'Show'} Details
                  </Button>
                </div>
                <Select
                  value={resizeStrategy}
                  onValueChange={(value) => setResizeStrategy(value as ResizeStrategy)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scale">
                      <div className="flex items-center gap-2">
                        <span>Scale (Recommended)</span>
                        {resizeStrategy === 'scale' && <CheckCircle className="h-3 w-3 text-green-600" />}
                      </div>
                    </SelectItem>
                    <SelectItem value="crop">
                      <div className="flex items-center gap-2">
                        <span>Crop/Expand</span>
                        {resizeStrategy === 'crop' && <CheckCircle className="h-3 w-3 text-green-600" />}
                      </div>
                    </SelectItem>
                    <SelectItem value="reflow">
                      <div className="flex items-center gap-2">
                        <span>AI Reflow (Coming Soon)</span>
                        {resizeStrategy === 'reflow' && <CheckCircle className="h-3 w-3 text-green-600" />}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Strategy Descriptions */}
                {showAdvanced && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <div className="text-xs">
                      <div className="font-medium text-slate-700 mb-1">Strategy Details:</div>
                      {resizeStrategy === 'scale' && (
                        <p className="text-slate-600">
                          Proportionally scales all objects to fit the new canvas size. Maintains aspect ratio and relative positioning.
                        </p>
                      )}
                      {resizeStrategy === 'crop' && (
                        <p className="text-slate-600">
                          Keeps elements at their original size and position, adding or removing space around edges. Best for minor size changes.
                        </p>
                      )}
                      {resizeStrategy === 'reflow' && (
                        <p className="text-slate-600">
                          AI intelligently repositions elements for the new dimensions while maintaining visual hierarchy. (Not yet implemented - falls back to scale)
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Warning for major changes */}
              {isMajorChange && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-800">
                    <div className="font-medium mb-1">Major aspect ratio change detected</div>
                    <p>
                      The new format has a significantly different aspect ratio. Some manual adjustments may be needed after resizing.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Resize Progress */}
          {isResizing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Resizing objects...</span>
                <span className="font-medium text-slate-700">{resizeProgress}%</span>
              </div>
              <Progress value={resizeProgress} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isResizing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApplyFormatChange}
            disabled={isResizing || selectedFormat.id === currentFormat.id}
          >
            {isResizing ? 'Resizing...' : 'Apply Format Change'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
