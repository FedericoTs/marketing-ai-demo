"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { FileSpreadsheet, Upload, Download, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  parseStoreAssignments,
  downloadSampleCSV,
  type StoreAssignment,
  type ParseResult,
} from "@/lib/csv/parse-store-assignments";

interface Store {
  id: string;
  store_number: string;
  name: string;
  city: string | null;
  state: string | null;
  region: string | null;
}

interface Campaign {
  id: string;
  name: string;
}

interface CSVBulkUploadProps {
  campaigns: Campaign[];
  onAddStores: (
    stores: Store[],
    campaignId: string,
    quantity: number,
    assignments?: Map<string, { campaignId: string; quantity: number; notes?: string }>
  ) => void;
  defaultCampaignId?: string;
}

export function CSVBulkUpload({ campaigns, onAddStores, defaultCampaignId }: CSVBulkUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Matched stores (after validation against database)
  const [matchedStores, setMatchedStores] = useState<
    Array<{ store: Store; campaignId: string; quantity: number; notes?: string }>
  >([]);
  const [notFoundStores, setNotFoundStores] = useState<string[]>([]);
  const [validating, setValidating] = useState(false);

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      // Read file content
      const content = await readFileContent(file);

      // Parse CSV
      const result = parseStoreAssignments(content);
      setParseResult(result);

      if (result.valid.length === 0) {
        toast.error("No valid rows found in CSV");
        return;
      }

      // Validate stores against database
      await validateStores(result.valid);

      toast.success(
        `Parsed ${result.valid.length} valid rows (${result.invalid.length} invalid)`
      );
    } catch (error) {
      console.error("Error processing CSV:", error);
      toast.error(error instanceof Error ? error.message : "Failed to process CSV");
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Read file content
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  // Validate stores against database
  const validateStores = async (assignments: StoreAssignment[]) => {
    setValidating(true);

    try {
      // Get unique store numbers
      const storeNumbers = [...new Set(assignments.map((a) => a.storeNumber))];

      // Fetch stores from database
      const response = await fetch("/api/retail-stores/bulk-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeNumbers }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to validate stores");
      }

      const storesMap = new Map<string, Store>();
      (result.data.stores || []).forEach((store: Store) => {
        storesMap.set(store.store_number, store);
      });

      // Match assignments with stores
      const matched: Array<{
        store: Store;
        campaignId: string;
        quantity: number;
        notes?: string;
      }> = [];
      const notFound: string[] = [];

      assignments.forEach((assignment) => {
        const store = storesMap.get(assignment.storeNumber);

        if (!store) {
          notFound.push(assignment.storeNumber);
          return;
        }

        // Find campaign by name
        const campaign = campaigns.find(
          (c) => c.name.toLowerCase() === assignment.campaignName.toLowerCase()
        );

        if (!campaign) {
          notFound.push(`${assignment.storeNumber} (campaign "${assignment.campaignName}" not found)`);
          return;
        }

        matched.push({
          store,
          campaignId: campaign.id,
          quantity: assignment.quantity,
          notes: assignment.notes,
        });
      });

      setMatchedStores(matched);
      setNotFoundStores(notFound);

      // Show preview
      setShowPreview(true);
    } catch (error) {
      console.error("Error validating stores:", error);
      toast.error("Failed to validate stores");
    } finally {
      setValidating(false);
    }
  };

  // Handle add stores from CSV
  const handleAddStores = () => {
    if (matchedStores.length === 0) {
      toast.error("No valid stores to add");
      return;
    }

    // Group by campaign and quantity for bulk add
    // For simplicity, we'll add each store individually with its specific assignment
    matchedStores.forEach(({ store, campaignId, quantity, notes }) => {
      onAddStores([store], campaignId, quantity);
    });

    toast.success(`Added ${matchedStores.length} stores to order`);

    // Reset
    setParseResult(null);
    setMatchedStores([]);
    setNotFoundStores([]);
    setShowPreview(false);
  };

  // Handle download template
  const handleDownloadTemplate = () => {
    downloadSampleCSV();
    toast.success("Downloaded CSV template");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          CSV Bulk Upload
        </CardTitle>
        <CardDescription>
          Upload a CSV file with store numbers, campaigns, and quantities to bulk add stores to
          your order.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Area */}
        <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 hover:border-gray-400 transition-colors">
          <FileSpreadsheet className="h-16 w-16 text-gray-400 mb-4" />
          <p className="text-lg font-medium mb-2">Upload Store Assignments CSV</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
            Drag and drop a CSV file here or click to browse
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex gap-3">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || validating}
              className="gap-2"
            >
              {uploading || validating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Choose File
                </>
              )}
            </Button>

            <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
              <Download className="h-4 w-4" />
              Download Template
            </Button>
          </div>
        </div>

        {/* CSV Format Info */}
        <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="font-medium text-blue-900 dark:text-blue-100">Expected CSV Format:</p>
          <div className="text-sm text-blue-800 dark:text-blue-200 font-mono">
            <p>Store Number, Campaign, Quantity, Notes</p>
            <p className="text-blue-600 dark:text-blue-400">
              101, Holiday Campaign, 150, Rush delivery
            </p>
            <p className="text-blue-600 dark:text-blue-400">102, Holiday Campaign, 200,</p>
            <p className="text-blue-600 dark:text-blue-400">103, Spring Promo, 100,</p>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            • First row must be headers
            <br />
            • Store numbers must match existing stores in the database
            <br />
            • Campaign names must match existing campaigns exactly
            <br />• Quantity must be a positive number
          </p>
        </div>

        {/* Parse Result Summary */}
        {parseResult && (
          <div className="space-y-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-green-900 dark:text-green-100">
                  CSV Parsed Successfully
                </p>
                <div className="mt-2 text-sm text-green-800 dark:text-green-200">
                  <p>Total rows: {parseResult.summary.totalRows}</p>
                  <p>Valid rows: {parseResult.summary.validRows}</p>
                  {parseResult.summary.invalidRows > 0 && (
                    <p className="text-red-600 dark:text-red-400">
                      Invalid rows: {parseResult.summary.invalidRows}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Preview Store Assignments</DialogTitle>
              <DialogDescription>
                Review the matched stores before adding them to your order.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Matched Stores */}
              {matchedStores.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h3 className="font-medium">
                      Matched Stores ({matchedStores.length})
                    </h3>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {matchedStores.map(({ store, campaignId, quantity, notes }, index) => {
                      const campaign = campaigns.find((c) => c.id === campaignId);
                      return (
                        <div
                          key={`${store.id}-${index}`}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium">
                              #{store.store_number} - {store.name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {store.city}, {store.state} • {campaign?.name} • {quantity} pieces
                              {notes && ` • ${notes}`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Not Found Stores */}
              {notFoundStores.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <h3 className="font-medium text-red-900 dark:text-red-100">
                      Not Found ({notFoundStores.length})
                    </h3>
                  </div>

                  <div className="space-y-1 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 max-h-32 overflow-y-auto">
                    {notFoundStores.map((storeNumber, index) => (
                      <p
                        key={index}
                        className="text-sm text-red-800 dark:text-red-200"
                      >
                        {storeNumber}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddStores}
                disabled={matchedStores.length === 0}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Add {matchedStores.length} Store{matchedStores.length !== 1 ? "s" : ""}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
