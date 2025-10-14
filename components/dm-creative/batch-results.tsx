"use client";

import { DirectMailData } from "@/types/dm-creative";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";
import { generateDirectMailPDF } from "@/lib/pdf-generator";
import { toast } from "sonner";
import { useState } from "react";
import { useSettings } from "@/lib/contexts/settings-context";

interface BatchResultsProps {
  dmDataList: DirectMailData[];
}

export function BatchResults({ dmDataList }: BatchResultsProps) {
  const { settings } = useSettings();
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);

  const handleDownloadPDF = async (dmData: DirectMailData, index: number) => {
    setDownloadingIndex(index);
    try {
      const pdfBlob = await generateDirectMailPDF(dmData, settings.companyName);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dm-${dmData.recipient.name}-${dmData.trackingId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setDownloadingIndex(null);
    }
  };

  const handleDownloadAll = async () => {
    toast.info("Downloading all PDFs...");
    for (let i = 0; i < dmDataList.length; i++) {
      await handleDownloadPDF(dmDataList[i], i);
      // Small delay between downloads
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    toast.success("All PDFs downloaded!");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Batch Results ({dmDataList.length})</CardTitle>
          <Button onClick={handleDownloadAll} size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Download All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[500px] overflow-auto space-y-3">
          {dmDataList.map((dmData, index) => (
            <div
              key={dmData.trackingId}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
            >
              <div className="flex-1">
                <p className="font-medium">
                  {dmData.recipient.name} {dmData.recipient.lastname}
                </p>
                <p className="text-sm text-slate-600">
                  {dmData.recipient.city || "No city"} • {dmData.trackingId}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(dmData.landingPageUrl, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadPDF(dmData, index)}
                  disabled={downloadingIndex === index}
                >
                  {downloadingIndex === index ? (
                    <Download className="h-4 w-4 animate-pulse" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
