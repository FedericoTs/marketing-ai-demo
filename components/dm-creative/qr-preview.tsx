"use client";

import { DirectMailData } from "@/types/dm-creative";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";
import { generateDirectMailPDFImproved } from "@/lib/pdf-generator-improved";
import { toast } from "sonner";
import { useState } from "react";
import { useSettings } from "@/lib/contexts/settings-context";

interface QRPreviewProps {
  dmData: DirectMailData;
}

export function QRPreview({ dmData }: QRPreviewProps) {
  const { settings } = useSettings();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const pdfBlob = await generateDirectMailPDFImproved(dmData, settings.companyName);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `direct-mail-${dmData.recipient.name}-${dmData.trackingId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleOpenLandingPage = () => {
    window.open(dmData.landingPageUrl, "_blank");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview & Download</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {dmData.creativeImageUrl && (
          <div className="space-y-3">
            <h3 className="font-semibold">AI-Generated Direct Mail Creative</h3>
            <div className="border rounded-lg overflow-hidden bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={dmData.creativeImageUrl}
                alt="Direct Mail Creative"
                className="w-full h-auto"
              />
            </div>
            <p className="text-xs text-slate-500">
              Professional direct mail creative with personalized content and QR code
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="font-semibold">Recipient</h3>
            <div className="text-sm text-slate-600 space-y-1">
              <p>
                {dmData.recipient.name} {dmData.recipient.lastname}
              </p>
              {dmData.recipient.address && <p>{dmData.recipient.address}</p>}
              {dmData.recipient.city && dmData.recipient.zip && (
                <p>
                  {dmData.recipient.city}, {dmData.recipient.zip}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">QR Code</h3>
            <div className="bg-white p-4 rounded-lg border inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={dmData.qrCodeDataUrl}
                alt="QR Code"
                className="w-32 h-32"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold">Landing Page URL</h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-slate-100 px-3 py-2 rounded text-sm">
              {dmData.landingPageUrl}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenLandingPage}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Tracking ID: {dmData.trackingId}
          </p>
        </div>

        <div className="pt-4 border-t">
          <Button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="w-full gap-2"
            size="lg"
          >
            {isGeneratingPDF ? (
              <>
                <Download className="h-5 w-5 animate-pulse" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Download Printable PDF
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
