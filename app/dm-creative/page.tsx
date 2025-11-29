"use client";

import { useState, Suspense } from "react";
import { DMBuilder } from "@/components/dm-creative/dm-builder";
import { CSVUploader } from "@/components/dm-creative/csv-uploader";
import { BatchResults } from "@/components/dm-creative/batch-results";
import { SmartCampaignOptimizer } from "@/components/retail/smart-campaign-optimizer";
import { DirectMailData } from "@/types/dm-creative";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QrCode, MapPin, BarChart3, Loader2 } from "lucide-react";
import { useIndustryModule } from "@/lib/contexts/industry-module-context";

function DMCreativeContent() {
  const [batchDMs, setBatchDMs] = useState<DirectMailData[]>([]);
  const [batchMessage, setBatchMessage] = useState("");
  const industryModule = useIndustryModule();

  // Check if retail module and AI features are enabled
  const isRetailModuleEnabled = industryModule.isModuleEnabled() && industryModule.getModuleType() === 'retail';
  const isAIEnabled = isRetailModuleEnabled && industryModule.isFeatureEnabled('enableAIRecommendations');

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">Direct Mail Creative</h1>
            <p className="text-slate-600">
              Create personalized direct mail with QR codes and dedicated landing pages
            </p>
          </div>
          {isAIEnabled && (
            <div className="ml-4">
              <SmartCampaignOptimizer />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <QrCode className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">QR Code Generation</h3>
                  <p className="text-sm text-slate-600">
                    Unique QR codes for each recipient
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MapPin className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Landing Pages</h3>
                  <p className="text-sm text-slate-600">
                    Personalized landing page per DM
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Tracking</h3>
                  <p className="text-sm text-slate-600">
                    Monitor engagement with unique IDs
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="single">Single DM</TabsTrigger>
          <TabsTrigger value="batch">Batch Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="mt-6">
          <DMBuilder />
        </TabsContent>

        <TabsContent value="batch" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="batchMessage">Default Marketing Message</Label>
                    <Textarea
                      id="batchMessage"
                      value={batchMessage}
                      onChange={(e) => setBatchMessage(e.target.value)}
                      placeholder="Enter your marketing message for all recipients..."
                      rows={5}
                    />
                    <p className="text-xs text-slate-500">
                      This message will be used for all recipients unless they have a customMessage in the CSV
                    </p>
                  </div>
                </CardContent>
              </Card>

              <CSVUploader
                message={batchMessage}
                onBatchGenerated={setBatchDMs}
              />
            </div>

            {batchDMs.length > 0 ? (
              <BatchResults dmDataList={batchDMs} />
            ) : (
              <Card className="flex items-center justify-center min-h-[400px]">
                <CardContent className="text-center">
                  <QrCode className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">
                    Upload a CSV file to generate batch direct mails
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function DMCreativePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <DMCreativeContent />
    </Suspense>
  );
}
