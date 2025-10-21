"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Info,
  Phone,
  Mail,
  MapPin,
  User,
  X,
  Zap,
  QrCode as QrCodeIcon
} from "lucide-react";
import type { ValidationResult } from "@/lib/template-validator";
import { toast } from "sonner";

export interface PreviewData {
  recipientIndex: number;
  recipientName: string;
  recipientData: {
    name: string;
    lastname: string;
    address?: string;
    city?: string;
    zip?: string;
    email?: string;
    phone?: string;
  };
  previewImageUrl: string; // Base64 or URL
  qrCodeUrl: string;
  renderTime: number;
  warnings: string[];
  validation: ValidationResult;
}

interface BatchPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  previews: PreviewData[];
  totalRecipients: number;
  templateName: string;
}

export function BatchPreviewModal({
  isOpen,
  onClose,
  onApprove,
  previews,
  totalRecipients,
  templateName
}: BatchPreviewModalProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showQRZoom, setShowQRZoom] = useState(false);

  // Reset to first preview when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setShowQRZoom(false);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Enter') {
        handleApprove();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex]);

  const handlePrevious = () => {
    setCurrentIndex(Math.max(0, currentIndex - 1));
    setShowQRZoom(false);
  };

  const handleNext = () => {
    setCurrentIndex(Math.min(previews.length - 1, currentIndex + 1));
    setShowQRZoom(false);
  };

  const handleApprove = () => {
    onApprove();
  };

  const handleAdjustTemplate = () => {
    toast.info("Select a different template or create a new one", {
      description: "You'll return to the batch processing page after selecting a template"
    });
    router.push('/templates');
  };

  if (previews.length === 0) return null;

  const currentPreview = previews[currentIndex];
  const hasErrors = currentPreview.validation.errors.length > 0;
  const hasWarnings = currentPreview.validation.warnings.length > 0;
  const hasInfo = currentPreview.validation.info.length > 0;

  // Calculate overall batch stats
  const totalErrors = previews.reduce((sum, p) => sum + p.validation.errors.length, 0);
  const totalWarnings = previews.reduce((sum, p) => sum + p.validation.warnings.length, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <div>
              <DialogTitle className="text-2xl">Batch Preview - {templateName}</DialogTitle>
              <DialogDescription>
                Previewing first {previews.length} of {totalRecipients} recipients
              </DialogDescription>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-slate-900">
                Preview {currentIndex + 1} of {previews.length}
              </div>
              <div className="text-sm text-slate-600">
                Use ← → arrow keys to navigate
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid lg:grid-cols-3 gap-6 mt-4">
          {/* Left Side: Preview Image + Navigation */}
          <div className="lg:col-span-2 space-y-4">
            {/* Preview Image */}
            <Card>
              <CardContent className="p-6">
                <div className="relative bg-slate-100 rounded-lg overflow-hidden">
                  <img
                    src={currentPreview.previewImageUrl}
                    alt={`Preview for ${currentPreview.recipientName}`}
                    className="w-full h-auto"
                    style={{ maxHeight: '600px', objectFit: 'contain' }}
                  />
                  {/* QR Code Zoom Button */}
                  <button
                    onClick={() => setShowQRZoom(!showQRZoom)}
                    className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm hover:bg-white p-3 rounded-lg shadow-lg transition-all"
                    title="View QR Code"
                  >
                    <QrCodeIcon className="h-5 w-5 text-slate-700" />
                  </button>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                    className="gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  <div className="flex gap-2">
                    {previews.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentIndex
                            ? 'bg-blue-600 w-8'
                            : 'bg-slate-300 hover:bg-slate-400'
                        }`}
                        title={`Preview ${index + 1}`}
                      />
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleNext}
                    disabled={currentIndex === previews.length - 1}
                    className="gap-2"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* QR Code Zoom Overlay */}
            {showQRZoom && (
              <div
                className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
                onClick={() => setShowQRZoom(false)}
              >
                <div className="bg-white p-6 rounded-lg shadow-2xl">
                  <img
                    src={currentPreview.qrCodeUrl}
                    alt="QR Code"
                    className="w-80 h-80"
                  />
                  <p className="text-center text-sm text-slate-600 mt-4">
                    Click anywhere to close
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Side: Recipient Details + Validation */}
          <div className="space-y-4">
            {/* Recipient Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Recipient Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-slate-500 mt-1" />
                  <div>
                    <div className="font-medium text-slate-900">
                      {currentPreview.recipientData.name} {currentPreview.recipientData.lastname}
                    </div>
                    <div className="text-xs text-slate-500">Name</div>
                  </div>
                </div>

                {currentPreview.recipientData.email && (
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-slate-500 mt-1" />
                    <div>
                      <div className="font-medium text-slate-900">
                        {currentPreview.recipientData.email}
                      </div>
                      <div className="text-xs text-slate-500">Email</div>
                    </div>
                  </div>
                )}

                {currentPreview.recipientData.phone && (
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-slate-500 mt-1" />
                    <div>
                      <div className="font-medium text-slate-900">
                        {currentPreview.recipientData.phone}
                      </div>
                      <div className="text-xs text-slate-500">Phone</div>
                    </div>
                  </div>
                )}

                {currentPreview.recipientData.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-slate-500 mt-1" />
                    <div>
                      <div className="font-medium text-slate-900">
                        {currentPreview.recipientData.address}
                        {currentPreview.recipientData.city && (
                          <>
                            <br />
                            {currentPreview.recipientData.city}
                            {currentPreview.recipientData.zip && `, ${currentPreview.recipientData.zip}`}
                          </>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">Address</div>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <div className="text-xs text-slate-500">Render Time</div>
                  <div className="font-medium text-slate-900">
                    {currentPreview.renderTime}ms
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Validation Status */}
            {(hasErrors || hasWarnings || hasInfo) && (
              <Card className={hasErrors ? 'border-red-300 bg-red-50' : hasWarnings ? 'border-yellow-300 bg-yellow-50' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {hasErrors ? (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    ) : hasWarnings ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    ) : (
                      <Info className="h-5 w-5 text-blue-600" />
                    )}
                    {hasErrors ? 'Errors Found' : hasWarnings ? 'Warnings' : 'Information'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {currentPreview.validation.errors.map((error, idx) => (
                    <div key={`error-${idx}`} className="flex items-start gap-2 text-sm">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-red-900">{error.field}</div>
                        <div className="text-red-700">{error.message}</div>
                      </div>
                    </div>
                  ))}

                  {currentPreview.validation.warnings.map((warning, idx) => (
                    <div key={`warning-${idx}`} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-yellow-900">{warning.field}</div>
                        <div className="text-yellow-700">{warning.message}</div>
                      </div>
                    </div>
                  ))}

                  {currentPreview.validation.info.map((info, idx) => (
                    <div key={`info-${idx}`} className="flex items-start gap-2 text-sm">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-blue-900">{info.field}</div>
                        <div className="text-blue-700">{info.message}</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* All Good Status */}
            {!hasErrors && !hasWarnings && !hasInfo && (
              <Card className="border-green-300 bg-green-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                    <div>
                      <div className="font-semibold text-green-900">All Checks Passed</div>
                      <div className="text-sm text-green-700">
                        This recipient's data looks good!
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Batch Summary */}
        <Card className="mt-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="h-6 w-6 text-blue-600" />
                <div>
                  <div className="font-semibold text-blue-900">
                    Preview Complete
                  </div>
                  <div className="text-sm text-blue-700">
                    {totalErrors === 0 ? (
                      <span>✓ All previews look good! Ready to generate full batch.</span>
                    ) : (
                      <span>⚠️ {totalErrors} error(s) and {totalWarnings} warning(s) across all previews.</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-blue-900">{totalRecipients}</div>
                <div className="text-sm text-blue-700">Total DMs to generate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <Button
            variant="ghost"
            onClick={onClose}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Close Preview
          </Button>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleAdjustTemplate}
              className="gap-2"
            >
              Adjust Template
            </Button>

            <Button
              onClick={handleApprove}
              size="lg"
              className="gap-2 bg-green-600 hover:bg-green-700"
              disabled={totalErrors > 0}
            >
              <Zap className="h-4 w-4" />
              Looks Good - Generate All {totalRecipients} DMs
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
