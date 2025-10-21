"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Download, FileText, Loader2, CheckCircle2, Library, X, Eye } from "lucide-react";
import { parseCSV, generateSampleCSV, analyzeStoreDistribution } from "@/lib/csv-processor";
import { RecipientData, DirectMailData } from "@/types/dm-creative";
import { toast } from "sonner";
import { storeLandingPageData } from "@/lib/tracking";
import { useSettings } from "@/lib/contexts/settings-context";
import { StoreDistributionPreview } from "@/components/dm-creative/store-distribution-preview";
import { BatchPreviewModal, PreviewData } from "@/components/dm-creative/batch-preview";
import { validateTemplate, type RecipientData as ValidatorRecipientData } from "@/lib/template-validator";

interface CSVUploaderProps {
  onBatchGenerated: (dmDataList: DirectMailData[]) => void;
  message: string;
}

export function CSVUploader({ onBatchGenerated, message }: CSVUploaderProps) {
  const router = useRouter();
  const { settings } = useSettings();
  const [recipients, setRecipients] = useState<RecipientData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [storeDistribution, setStoreDistribution] = useState<ReturnType<typeof analyzeStoreDistribution> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // NEW: Preview state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData[]>([]);
  const [isGeneratingPreviews, setIsGeneratingPreviews] = useState(false);

  // Template state (loaded from localStorage)
  const [loadedTemplate, setLoadedTemplate] = useState<{
    templateId: string;
    templateName: string;
    hasDesign: boolean;
    dmTemplateId?: string;
  } | null>(null);

  // Load template from localStorage on mount (same as dm-builder.tsx)
  useEffect(() => {
    const templateData = localStorage.getItem("selectedTemplate");
    if (templateData) {
      try {
        const template = JSON.parse(templateData);
        setLoadedTemplate({
          templateId: template.templateId,
          templateName: template.templateName,
          hasDesign: template.hasDesign || false,
          dmTemplateId: template.dmTemplateId,
        });
        toast.success(`✨ Template "${template.templateName}" loaded for batch processing`);
      } catch (error) {
        console.error("Error loading template:", error);
      }
    }
  }, []);

  const clearTemplate = () => {
    setLoadedTemplate(null);
    localStorage.removeItem("selectedTemplate");
    toast.info("Template cleared");
  };

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

      // PHASE 8C: Analyze store distribution
      if (result.recipients.length > 0) {
        const distribution = analyzeStoreDistribution(result.recipients);
        setStoreDistribution(distribution);

        if (distribution.hasStoreNumbers) {
          toast.info(
            `Store deployment detected: ${distribution.uniqueStores.length} store${distribution.uniqueStores.length === 1 ? '' : 's'}`
          );
        }
      }
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
      // ALWAYS use background queue for proper template rendering
      // Small batches complete in seconds anyway, and this ensures template support
      await handleLargeBatch();
    } catch (error) {
      console.error("Error generating batch:", error);
      toast.error("Failed to generate batch");
    } finally {
      setIsProcessing(false);
    }
  };

  // BACKGROUND QUEUE FLOW: Handles all batch sizes with proper template rendering
  const handleLargeBatch = async () => {
    if (!loadedTemplate?.dmTemplateId) {
      toast.error("Template is required for batch processing. Please select a template first.");
      return;
    }

    toast.info(`Creating background job for ${recipients.length} recipients...`);

    // First, create campaign and recipients using existing batch API
    const batchResponse = await fetch("/api/dm-creative/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipients,
        message,
        companyContext: {
          companyName: settings.companyName,
          industry: settings.industry,
          brandVoice: settings.brandVoice,
          targetAudience: settings.targetAudience,
        },
        campaignName: `Batch Campaign - ${new Date().toLocaleDateString()}`,
      }),
    });

    const batchResult = await batchResponse.json();

    if (!batchResult.success || !batchResult.data) {
      toast.error("Failed to create campaign");
      return;
    }

    const dmDataList: DirectMailData[] = batchResult.data;

    // Now create background batch job
    const jobResponse = await fetch("/api/batch-jobs/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId: batchResult.campaignId,
        templateId: loadedTemplate.dmTemplateId,
        recipients: dmDataList.map((dm) => ({
          recipientId: dm.recipient.id || dm.trackingId,
          trackingId: dm.trackingId,
          name: dm.recipient.name,
          lastname: dm.recipient.lastname,
          address: dm.recipient.address,
          city: dm.recipient.city,
          zip: dm.recipient.zip,
          message: dm.message,
          phoneNumber: dm.recipient.phone || "", // Use CSV phone if provided, empty = keep template default
          qrCodeDataUrl: dm.qrCodeDataUrl,
          landingPageUrl: dm.landingPageUrl,
        })),
        userEmail: "federicosciuca@gmail.com", // Email for notifications
        settings: {
          companyName: settings.companyName,
          industry: settings.industry,
          brandVoice: settings.brandVoice,
        },
      }),
    });

    const jobResult = await jobResponse.json();

    if (jobResult.success) {
      toast.success(
        `🎉 Batch job created! Processing ${recipients.length} recipients in background.`,
        { duration: 5000 }
      );
      toast.info(
        `📧 You'll receive an email at federicosciuca@gmail.com when complete.`,
        { duration: 5000 }
      );

      // Redirect to batch jobs dashboard (will be created next)
      setTimeout(() => {
        router.push(`/batch-jobs/${jobResult.data.batchJobId}`);
      }, 2000);
    } else {
      toast.error(jobResult.error || "Failed to create batch job");
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

  // NEW: Handle batch preview
  const handlePreviewBatch = async () => {
    if (recipients.length === 0) {
      toast.error("Please upload a CSV file first");
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter a marketing message");
      return;
    }

    if (!loadedTemplate?.dmTemplateId) {
      toast.error("Template is required for preview. Please select a template first.");
      return;
    }

    setIsGeneratingPreviews(true);

    try {
      // Preview first 5 recipients
      const previewRecipients = recipients.slice(0, Math.min(5, recipients.length));

      toast.info(`Generating preview for ${previewRecipients.length} recipients...`);

      // Use existing batch API to generate preview data (simplified approach)
      const batchResponse = await fetch("/api/dm-creative/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: previewRecipients,
          message,
          companyContext: {
            companyName: settings.companyName,
            industry: settings.industry,
            brandVoice: settings.brandVoice,
            targetAudience: settings.targetAudience,
          },
          campaignName: `Preview - ${new Date().toLocaleDateString()}`,
        }),
      });

      const batchResult = await batchResponse.json();

      if (!batchResult.success || !batchResult.data) {
        toast.error("Failed to generate preview");
        return;
      }

      const dmDataList: DirectMailData[] = batchResult.data;

      // Transform to PreviewData format with validation
      const previews: PreviewData[] = dmDataList.map((dm, index) => {
        const recipientData: ValidatorRecipientData = {
          name: dm.recipient.name,
          lastname: dm.recipient.lastname,
          address: dm.recipient.address,
          city: dm.recipient.city,
          zip: dm.recipient.zip,
          email: dm.recipient.email,
          phone: dm.recipient.phone,
          trackingId: dm.trackingId,
        };

        // Validate this recipient
        const validation = validateTemplate(
          null, // Canvas JSON not needed for basic validation
          {}, // Variable mappings not needed for basic validation
          recipientData
        );

        return {
          recipientIndex: index,
          recipientName: `${dm.recipient.name} ${dm.recipient.lastname}`,
          recipientData: {
            name: dm.recipient.name,
            lastname: dm.recipient.lastname,
            address: dm.recipient.address,
            city: dm.recipient.city,
            zip: dm.recipient.zip,
            email: dm.recipient.email,
            phone: dm.recipient.phone,
          },
          previewImageUrl: dm.qrCodeDataUrl, // Using QR code as preview for now
          qrCodeUrl: dm.qrCodeDataUrl,
          renderTime: 0,
          warnings: validation.warnings.map(w => w.message),
          validation: validation,
        };
      });

      setPreviewData(previews);
      setShowPreviewModal(true);

      toast.success(`Preview ready! Showing ${previews.length} of ${recipients.length} recipients`);
    } catch (error) {
      console.error("Error generating preview:", error);
      toast.error("Failed to generate preview");
    } finally {
      setIsGeneratingPreviews(false);
    }
  };

  // NEW: Handle approve preview and generate full batch
  const handleApprovePreview = async () => {
    setShowPreviewModal(false);
    // Call existing batch generation function
    await handleGenerateBatch();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Upload (CSV)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Loaded Banner */}
        {loadedTemplate && (
          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Library className="h-5 w-5 text-purple-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-purple-900">
                  ✨ Template: {loadedTemplate.templateName}
                </p>
                <p className="text-sm text-purple-700">
                  All {recipients.length > 0 ? recipients.length : ""} recipients will use this template design
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearTemplate}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

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
          <div className="space-y-4">
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

            {/* PHASE 8C: Show store distribution preview if store numbers detected */}
            {storeDistribution && storeDistribution.hasStoreNumbers && (
              <StoreDistributionPreview distribution={storeDistribution} />
            )}

            {/* Preview Button - NEW FEATURE */}
            <Button
              onClick={handlePreviewBatch}
              disabled={!loadedTemplate || recipients.length === 0 || isGeneratingPreviews || isProcessing}
              variant="outline"
              className="w-full gap-2"
              size="lg"
            >
              {isGeneratingPreviews ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating Preview...
                </>
              ) : (
                <>
                  <Eye className="h-5 w-5" />
                  Preview Batch (First {Math.min(5, recipients.length)})
                </>
              )}
            </Button>

            {/* Generate Batch Button - EXISTING (unchanged) */}
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

            {/* Batch processing info */}
            {recipients.length > 0 && (
              <p className="text-sm text-slate-600 text-center">
                {recipients.length < 10
                  ? "✅ Small batches complete in seconds"
                  : "⏱️ Batch will be processed in background. You'll receive an email when complete."
                }
              </p>
            )}
          </div>
        )}
      </CardContent>

      {/* Batch Preview Modal - NEW FEATURE */}
      <BatchPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        onApprove={handleApprovePreview}
        previews={previewData}
        totalRecipients={recipients.length}
        templateName={loadedTemplate?.templateName || "Template"}
      />
    </Card>
  );
}
