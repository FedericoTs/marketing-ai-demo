"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Download, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { parseCSV, generateSampleCSV } from "@/lib/csv-processor";
import { RecipientData, DirectMailData } from "@/types/dm-creative";
import { toast } from "sonner";
import { generateQRCode } from "@/lib/qr-generator";
import { generateTrackingId, storeLandingPageData } from "@/lib/tracking";
import { useSettings } from "@/lib/contexts/settings-context";

interface CSVUploaderProps {
  onBatchGenerated: (dmDataList: DirectMailData[]) => void;
  message: string;
}

export function CSVUploader({ onBatchGenerated, message }: CSVUploaderProps) {
  const { settings } = useSettings();
  const [recipients, setRecipients] = useState<RecipientData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      const result = await parseCSV(file);

      if (!result.success || result.errors.length > 0) {
        result.errors.forEach((error) => toast.error(error));
        if (result.recipients.length > 0) {
          toast.warning(
            `Loaded ${result.recipients.length} valid recipients with some errors`
          );
        }
      } else {
        toast.success(`Loaded ${result.recipients.length} recipients`);
      }

      setRecipients(result.recipients);
    } catch (error) {
      console.error("Error processing CSV:", error);
      toast.error("Failed to process CSV file");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateBatch = async () => {
    if (recipients.length === 0) {
      toast.error("Please upload a CSV file first");
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter a marketing message");
      return;
    }

    setIsProcessing(true);

    try {
      const dmDataList: DirectMailData[] = [];

      for (const recipient of recipients) {
        const trackingId = generateTrackingId();
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const landingPageUrl = `${baseUrl}/lp/${trackingId}`;
        const qrCodeDataUrl = await generateQRCode(landingPageUrl);

        const finalMessage = recipient.customMessage || message;

        const dmData: DirectMailData = {
          trackingId,
          recipient,
          message: finalMessage,
          qrCodeDataUrl,
          landingPageUrl,
          createdAt: new Date(),
        };

        // Store landing page data
        storeLandingPageData({
          trackingId,
          recipient,
          message: finalMessage,
          companyName: settings.companyName,
          createdAt: dmData.createdAt,
          visits: 0,
        });

        dmDataList.push(dmData);
      }

      onBatchGenerated(dmDataList);
      toast.success(`Generated ${dmDataList.length} direct mails!`);
    } catch (error) {
      console.error("Error generating batch:", error);
      toast.error("Failed to generate batch");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = generateSampleCSV();
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dm-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Template downloaded!");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Upload (CSV)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Upload a CSV file with recipient information for batch processing
          </p>

          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            className="w-full gap-2"
          >
            <Download className="h-4 w-4" />
            Download CSV Template
          </Button>

          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-full gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload CSV File
                </>
              )}
            </Button>
          </div>
        </div>

        {recipients.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>{recipients.length} recipients loaded</span>
            </div>

            <div className="max-h-48 overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">City</th>
                  </tr>
                </thead>
                <tbody>
                  {recipients.slice(0, 10).map((recipient, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-3 py-2">
                        {recipient.name} {recipient.lastname}
                      </td>
                      <td className="px-3 py-2">{recipient.city || "-"}</td>
                    </tr>
                  ))}
                  {recipients.length > 10 && (
                    <tr className="border-t bg-slate-50">
                      <td colSpan={2} className="px-3 py-2 text-center text-slate-600">
                        ... and {recipients.length - 10} more
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Button
              onClick={handleGenerateBatch}
              disabled={isProcessing}
              className="w-full gap-2"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating {recipients.length} DMs...
                </>
              ) : (
                <>
                  <FileText className="h-5 w-5" />
                  Generate {recipients.length} Direct Mails
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
