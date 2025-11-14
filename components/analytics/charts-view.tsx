"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "./date-range-picker";
import { TimeSeriesChart } from "./time-series-chart";
import { ConversionFunnel } from "./conversion-funnel";
import { CampaignComparison } from "./campaign-comparison";
import { GeographicPerformance } from "./geographic-performance";
import { Loader2 } from "lucide-react";

interface TimeSeriesData {
  date: string;
  pageViews: number;
  conversions: number;
  uniqueVisitors: number;
}

interface FunnelData {
  stage: string;
  count: number;
  percentage: number;
}

interface Campaign {
  id: string;
  name: string;
  [key: string]: any;
}

export function ChartsView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [loading, setLoading] = useState({ timeSeries: true, funnel: true, comparison: false });
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    loadCampaigns();
    loadTimeSeriesData();
    loadFunnelData();
  }, []);

  const loadCampaigns = async () => {
    try {
      const response = await fetch("/api/analytics/campaigns");
      const result = await response.json();
      if (result.success) {
        setCampaigns(result.data);
        // Auto-select top 3 campaigns by conversion rate
        const topCampaigns = result.data
          .sort((a: any, b: any) => b.conversionRate - a.conversionRate)
          .slice(0, 3)
          .map((c: any) => c.id);
        setSelectedCampaigns(topCampaigns);
        if (topCampaigns.length > 0) {
          loadComparisonData(topCampaigns);
        }
      }
    } catch (error) {
      console.error("Failed to load campaigns:", error);
    }
  };

  const loadTimeSeriesData = async (start?: string, end?: string) => {
    setLoading((prev) => ({ ...prev, timeSeries: true }));
    try {
      const params = new URLSearchParams({
        type: "timeseries",
        ...(start && { startDate: start }),
        ...(end && { endDate: end }),
      });
      const response = await fetch(`/api/analytics/charts?${params}`);
      const result = await response.json();
      if (result.success) {
        setTimeSeriesData(result.data);
      }
    } catch (error) {
      console.error("Failed to load time series data:", error);
    } finally {
      setLoading((prev) => ({ ...prev, timeSeries: false }));
    }
  };

  const loadFunnelData = async () => {
    setLoading((prev) => ({ ...prev, funnel: true }));
    try {
      const response = await fetch("/api/analytics/charts?type=funnel");
      const result = await response.json();
      if (result.success) {
        setFunnelData(result.data);
      }
    } catch (error) {
      console.error("Failed to load funnel data:", error);
    } finally {
      setLoading((prev) => ({ ...prev, funnel: false }));
    }
  };

  const loadComparisonData = async (campaignIds: string[]) => {
    if (campaignIds.length === 0) {
      setComparisonData([]);
      return;
    }
    setLoading((prev) => ({ ...prev, comparison: true }));
    try {
      const params = new URLSearchParams({
        type: "comparison",
        campaignIds: campaignIds.join(","),
      });
      const response = await fetch(`/api/analytics/charts?${params}`);
      const result = await response.json();
      if (result.success) {
        setComparisonData(result.data);
      }
    } catch (error) {
      console.error("Failed to load comparison data:", error);
    } finally {
      setLoading((prev) => ({ ...prev, comparison: false }));
    }
  };

  const handleDateRangeChange = (start: string, end: string) => {
    setDateRange({ start, end });
    loadTimeSeriesData(start, end);
  };

  const handleCampaignSelection = (campaignId: string) => {
    let newSelection: string[];
    if (selectedCampaigns.includes(campaignId)) {
      newSelection = selectedCampaigns.filter((id) => id !== campaignId);
    } else {
      if (selectedCampaigns.length >= 5) {
        // Limit to 5 campaigns for comparison
        return;
      }
      newSelection = [...selectedCampaigns, campaignId];
    }
    setSelectedCampaigns(newSelection);
    loadComparisonData(newSelection);
  };

  return (
    <div className="space-y-6">
      {/* Date Range Picker */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">Select Date Range</h3>
              <p className="text-sm text-slate-600">Choose a time period for analytics</p>
            </div>
            <DateRangePicker onRangeChange={handleDateRangeChange} defaultDays={30} />
          </div>
        </CardContent>
      </Card>

      {/* Time Series Chart */}
      <TimeSeriesChart
        data={timeSeriesData}
        loading={loading.timeSeries}
        title="Performance Trends"
      />

      {/* Two Column Layout for Funnel and Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <ConversionFunnel data={funnelData} loading={loading.funnel} />

        {/* Campaign Comparison Selector */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">
              Select Campaigns to Compare
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Choose up to 5 campaigns (currently {selectedCampaigns.length} selected)
            </p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedCampaigns.includes(campaign.id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                  onClick={() => handleCampaignSelection(campaign.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedCampaigns.includes(campaign.id)}
                    onChange={() => {}}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{campaign.name}</p>
                  </div>
                </div>
              ))}
            </div>
            {campaigns.length === 0 && (
              <p className="text-center text-sm text-slate-500 py-8">
                No campaigns available
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Campaign Comparison Chart */}
      {selectedCampaigns.length > 0 && (
        <CampaignComparison
          data={comparisonData}
          loading={loading.comparison}
          title="Campaign Performance Comparison"
        />
      )}

      {/* Geographic Performance - Phase 5.7 Module 2 */}
      <GeographicPerformance />
    </div>
  );
}
