"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Download, FileText, Upload, Sparkles } from "lucide-react";
import Image from "next/image";

interface TemplateData {
  id: string;
  campaignId: string;
  name: string;
  canvasJSON: string;
  backgroundImage: string;
  canvasWidth: number;
  canvasHeight: number;
  previewImage?: string;
  variableMappings?: string;
}

export default function DMResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const templateId = searchParams?.get("template");

  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!templateId) {
      toast.error("No template ID provided");
      router.push("/dm-creative");
      return;
    }

    const loadTemplate = async () => {
      try {
        const response = await fetch(`/api/dm-template?id=${templateId}`);
        const result = await response.json();

        if (!result.success || !result.data) {
          throw new Error(result.error || "Template not found");
        }

        setTemplate(result.data);
      } catch (error) {
        console.error("Error loading template:", error);
        toast.error(error instanceof Error ? error.message : "Failed to load template");
        router.push("/dm-creative");
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [templateId, router]);

  const handleDownloadSingle = async () => {
    if (!template || !template.previewImage) return;

    try {
      // Convert base64 to blob and download
      const link = document.createElement("a");
      link.href = template.previewImage;
      link.download = `${template.name.replace(/\s+/g, "_")}.png`;
      link.click();
      toast.success("DM downloaded successfully!");
    } catch (error) {
      console.error("Error downloading DM:", error);
      toast.error("Failed to download DM");
    }
  };

  const handleBatchCSV = () => {
    if (!templateId) return;
    router.push(`/dm-creative/batch?template=${templateId}`);
  };

  const handleEditTemplate = () => {
    toast.info("Edit functionality coming soon!");
    // Future: Navigate back to editor with template loaded
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading template...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <p className="text-gray-600 mb-4">Template not found</p>
          <Button onClick={() => router.push("/dm-creative")}>
            Back to DM Creative
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-6 w-6 text-blue-600" />
          <h1 className="text-3xl font-bold">Your DM is Ready!</h1>
        </div>
        <p className="text-gray-600">
          Choose how you want to use this design
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Preview */}
        <div>
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">Preview</h2>
            {template.previewImage ? (
              <div className="relative aspect-[3/2] bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={template.previewImage}
                  alt="DM Preview"
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="aspect-[3/2] bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">No preview available</p>
              </div>
            )}

            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Template Name:</span>
                <span className="font-medium">{template.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Dimensions:</span>
                <span className="font-medium">
                  {template.canvasWidth} × {template.canvasHeight}px
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Campaign ID:</span>
                <span className="font-medium font-mono text-xs">
                  {template.campaignId.substring(0, 12)}...
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          {/* Single Recipient */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">
                  Download This DM
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Download the direct mail piece for the current recipient.
                  Perfect for single-use or testing.
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleDownloadSingle} className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Download PNG
                  </Button>
                  <Button variant="outline" onClick={handleEditTemplate}>
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Batch Processing */}
          <Card className="p-6 border-2 border-blue-200 bg-blue-50">
            <div className="flex items-start gap-4">
              <div className="bg-blue-600 p-3 rounded-lg">
                <Upload className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">
                  Batch Process with CSV
                </h3>
                <p className="text-gray-700 text-sm mb-4">
                  Upload a CSV file with multiple recipients. We'll generate a
                  personalized DM for each one with unique tracking codes.
                </p>
                <ul className="text-sm text-gray-700 mb-4 space-y-1">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-blue-600 rounded-full"></div>
                    Reuse this design for all recipients
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-blue-600 rounded-full"></div>
                    Auto-replace names, addresses, messages
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-blue-600 rounded-full"></div>
                    Generate unique QR codes per recipient
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-blue-600 rounded-full"></div>
                    Download as ZIP (PNG + PDF)
                  </li>
                </ul>
                <Button
                  onClick={handleBatchCSV}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Start Batch Processing
                </Button>
              </div>
            </div>
          </Card>

          {/* Back Button */}
          <Button
            variant="outline"
            onClick={() => router.push("/dm-creative")}
            className="w-full"
          >
            Create New DM
          </Button>
        </div>
      </div>
    </div>
  );
}
