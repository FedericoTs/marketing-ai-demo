"use client";

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, Download, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { parseStoreCSV, downloadStoreCSVTemplate } from '@/lib/csv/store-csv-processor';

interface StoreImportDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function StoreImportDialog({ onClose, onSuccess }: StoreImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (!droppedFile.name.endsWith('.csv')) {
        toast.error('Please drop a CSV file');
        return;
      }
      setFile(droppedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setProcessing(true);
    try {
      // Parse CSV
      const parseResult = await parseStoreCSV(file);

      if (parseResult.errors.length > 0) {
        setResult(parseResult);
        toast.error(`Found ${parseResult.errors.length} validation errors`);
        setProcessing(false);
        return;
      }

      // Import to database
      const response = await fetch('/api/retail/stores/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stores: parseResult.stores }),
      });

      const importResult = await response.json();

      if (importResult.success) {
        toast.success(importResult.message);
        onSuccess();
      } else {
        setResult({ ...parseResult, importErrors: importResult.errors });
        toast.error('Some stores failed to import');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import stores');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Import Stores from CSV</CardTitle>
              <CardDescription>
                Upload a CSV file to import multiple stores at once
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Download Template */}
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">Need a template?</p>
                <p className="text-xs text-blue-700">Download our CSV template with sample data</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadStoreCSVTemplate}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download Template
            </Button>
          </div>

          {/* File Upload */}
          {!file ? (
            <div
              className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center cursor-pointer hover:border-slate-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-900 mb-2">
                Drop your CSV file here
              </p>
              <p className="text-sm text-slate-600 mb-4">
                or click to browse files
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <p className="text-xs text-slate-500">
                Supports unlimited number of stores • CSV format only
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected File */}
              <div className="flex items-center justify-between p-4 bg-slate-50 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-slate-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setResult(null);
                  }}
                >
                  Remove
                </Button>
              </div>

              {/* Results */}
              {result && (
                <div className="space-y-3">
                  {result.success ? (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-900">
                          Validation Passed
                        </p>
                        <p className="text-xs text-green-700">
                          {result.validRows} stores ready to import
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <div>
                          <p className="text-sm font-medium text-red-900">
                            {result.errors.length} Validation Errors
                          </p>
                          <p className="text-xs text-red-700">
                            Please fix errors before importing
                          </p>
                        </div>
                      </div>

                      {/* Error List */}
                      <div className="max-h-48 overflow-y-auto border rounded-lg p-3 bg-white">
                        {result.errors.slice(0, 10).map((error: any, index: number) => (
                          <div key={index} className="text-xs text-slate-600 py-1">
                            <span className="font-medium">Row {error.row}</span>
                            {' • '}
                            <span className="text-red-600">{error.field}</span>
                            {': '}
                            {error.message}
                          </div>
                        ))}
                        {result.errors.length > 10 && (
                          <p className="text-xs text-slate-500 mt-2">
                            ...and {result.errors.length - 10} more errors
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleImport}
                  disabled={processing || (result && !result.success)}
                  className="flex-1 gap-2"
                >
                  {processing ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Import {result?.validRows || 0} Stores
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
