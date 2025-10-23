"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, CheckCircle2, AlertCircle, X, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { PerformanceMatrixGrid } from "@/components/campaigns/performance-matrix-grid";

interface Store {
  store_id: string;
  store_number: string;
  store_name: string;
  city: string;
  state: string;
  region: string;
  total_campaigns: number;
  avg_conversion_rate: number;
  recent_conversion_rate: number;
  top_recommendation: any;
  all_recommendations: any[];
  status: "auto-approve" | "needs-review" | "skip";
  status_reason: string;
}

interface CampaignSummary {
  campaign_id: string;
  campaign_name: string;
  total_stores_recommended: number;
  total_quantity_recommended: number;
  avg_confidence: number;
  expected_total_conversions: number;
}

interface MatrixData {
  stores: Store[];
  campaigns: CampaignSummary[];
  summary: {
    total_stores: number;
    auto_approve_count: number;
    needs_review_count: number;
    skip_count: number;
    total_recommended_quantity: number;
    total_campaigns: number;
  };
  filters: {
    regions: string[];
    states: string[];
    status: string[];
  };
}

export default function PerformanceMatrixPage() {
  const [data, setData] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  useEffect(() => {
    loadMatrix();
  }, [selectedRegion, selectedState, selectedStatus]);

  const loadMatrix = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedRegion !== "all") params.set("region", selectedRegion);
      if (selectedState !== "all") params.set("state", selectedState);
      if (selectedStatus !== "all") params.set("status", selectedStatus);

      const url = `/api/campaigns/performance-matrix?${params.toString()}`;
      console.log("[Matrix Page] Loading data from:", url);

      const response = await fetch(url);
      const result = await response.json();

      if (result.success && result.data) {
        console.log("[Matrix Page] Data loaded:", result.data.summary);
        setData(result.data);
      } else {
        toast.error(result.error || "Failed to load performance matrix");
      }
    } catch (error) {
      console.error("[Matrix Page] Error:", error);
      toast.error("Failed to load performance matrix");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoApproveAll = () => {
    if (!data) return;

    const autoApproveStores = data.stores.filter((s) => s.status === "auto-approve");

    toast.success(
      `Auto-approved ${autoApproveStores.length} stores (${data.summary.auto_approve_count} total)`
    );

    // TODO: Implement actual approval logic
  };

  const handleGenerateOrder = () => {
    if (!data) return;

    const approvedStores = data.stores.filter(
      (s) => s.status === "auto-approve" && s.top_recommendation
    );

    toast.success(`Generating order for ${approvedStores.length} stores...`);

    // TODO: Implement order generation
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              <p className="text-slate-600">
                Analyzing performance and generating recommendations...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-slate-600 mb-4">No data available</p>
              <Button onClick={loadMatrix}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Campaign Performance Matrix</h1>
        <p className="text-slate-600 mt-2">
          AI-powered recommendations for all stores based on historical performance
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-900">
              Total Stores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">
              {data.summary.total_stores}
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-900 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Auto-Approve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">
              {data.summary.auto_approve_count}
            </div>
            <p className="text-xs text-green-700 mt-1">
              {((data.summary.auto_approve_count / data.summary.total_stores) * 100).toFixed(1)}% of
              stores
            </p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-900 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Needs Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-900">
              {data.summary.needs_review_count}
            </div>
            <p className="text-xs text-yellow-700 mt-1">
              {((data.summary.needs_review_count / data.summary.total_stores) * 100).toFixed(1)}% of
              stores
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-slate-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-900 flex items-center gap-2">
              <X className="h-4 w-4" />
              Skip
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {data.summary.skip_count}
            </div>
            <p className="text-xs text-slate-700 mt-1">
              {((data.summary.skip_count / data.summary.total_stores) * 100).toFixed(1)}% of stores
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-900">
              Total Quantity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">
              {data.summary.total_recommended_quantity.toLocaleString()}
            </div>
            <p className="text-xs text-purple-700 mt-1">DM pieces recommended</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions & Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {data.filters.regions.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {data.filters.states.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="auto-approve">Auto-Approve Only</SelectItem>
                  <SelectItem value="needs-review">Needs Review Only</SelectItem>
                  <SelectItem value="skip">Skip Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleAutoApproveAll}
                className="bg-green-600 hover:bg-green-700 gap-2"
                disabled={data.summary.auto_approve_count === 0}
              >
                <Sparkles className="h-4 w-4" />
                Auto-Approve All ({data.summary.auto_approve_count})
              </Button>

              <Button
                onClick={handleGenerateOrder}
                className="bg-blue-600 hover:bg-blue-700 gap-2"
              >
                <FileText className="h-4 w-4" />
                Generate Order
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Matrix Grid */}
      <PerformanceMatrixGrid stores={data.stores} />
    </div>
  );
}
