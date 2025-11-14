"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Eye, TrendingUp, Target, QrCode, CheckCircle, Loader2, Clock, BarChart3, Phone } from "lucide-react";
import { DateRangePicker } from "./date-range-picker";
import { SankeyChart } from "./sankey-chart";
import { InvestmentDashboard } from "./investment-dashboard";
import { CampaignCostComparison } from "./campaign-cost-comparison";
// Import standardized KPI utilities for consistent calculations
import { calculateConversionRate, formatPercentage, formatDuration } from "@/lib/utils/kpi-calculator";

interface EngagementMetric {
  value: number;
  unit: string;
  display: string;
  seconds: number;
}

interface CallMetrics {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  unknown_calls: number;
  conversions: number;
  conversion_rate: number;
  average_duration: number;
  calls_today: number;
  calls_this_week: number;
  calls_this_month: number;
}

interface DashboardStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalRecipients: number;
  totalPageViews: number;
  totalConversions: number;
  overallConversionRate: number;
  qrScans: number;
  formSubmissions: number;
  callMetrics?: CallMetrics;
  engagementMetrics?: {
    avgTimeToFirstView: EngagementMetric | null;
    avgTimeToConversion: EngagementMetric | null;
    avgTotalTimeToConversion: EngagementMetric | null;
    avgTimeToAppointment: EngagementMetric | null;
  };
}

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});

  useEffect(() => {
    loadStats();
  }, []);

  // Separate effect for auto-refresh to avoid recreating interval
  useEffect(() => {
    const interval = setInterval(() => {
      loadStats(dateRange.start, dateRange.end, false);
    }, 30000);

    return () => clearInterval(interval);
  }, [dateRange]);

  const loadStats = async (startDate?: string, endDate?: string, showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams();
      if (startDate && endDate) {
        params.set("startDate", startDate);
        params.set("endDate", endDate);
      }

      const url = `/api/analytics/overview${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error("Failed to load dashboard stats:", error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const handleDateRangeChange = (start: string, end: string) => {
    setDateRange({ start, end });
    loadStats(start, end);
  };

  const handleResetDateRange = () => {
    setDateRange({});
    loadStats();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400 mb-4" />
            <p className="text-slate-600">Loading analytics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-slate-600">Failed to load statistics</p>
        </CardContent>
      </Card>
    );
  }

  // Response rate calculation using standardized utility
  const responseRate = formatPercentage(
    calculateConversionRate(stats.totalPageViews, stats.totalRecipients),
    1
  );

  return (
    <div className="space-y-6">
      {/* Data Scope Banner */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <BarChart3 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-1">
                Platform-Wide Analytics (All Campaigns)
              </h4>
              <p className="text-xs text-blue-700">
                This view shows metrics across <strong>all campaign types</strong> (Direct Mail, Retail Deployments, etc.).
                For retail-specific insights, see <a href="/retail/performance" className="underline font-medium">Retail Performance</a> or <a href="/retail/insights" className="underline font-medium">AI Insights</a>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                {dateRange.start && dateRange.end ? "Filtered Overview" : "Overall Performance"}
              </h3>
              <p className="text-sm text-slate-600">
                {dateRange.start && dateRange.end
                  ? `Showing metrics for ${dateRange.start} to ${dateRange.end}`
                  : "Select a date range to filter metrics"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <DateRangePicker onRangeChange={handleDateRangeChange} defaultDays={30} />
              {dateRange.start && dateRange.end && (
                <button
                  onClick={handleResetDateRange}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                >
                  Show All Time
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Investment Tracking Dashboard - Phase 5.7 Module 1 */}
      <InvestmentDashboard />

      {/* Campaign Cost Comparison Table - Phase 5.7 Module 3 */}
      <CampaignCostComparison />

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Campaigns */}
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Campaigns</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {stats.totalCampaigns}
                </p>
                <p className="text-xs text-green-600 mt-1 font-medium">
                  {stats.activeCampaigns} active
                </p>
              </div>
              <Target className="h-10 w-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* Total Recipients */}
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Recipients</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {stats.totalRecipients}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Direct mails sent
                </p>
              </div>
              <Users className="h-10 w-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        {/* Page Views */}
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Page Views</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {stats.totalPageViews}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {responseRate} response rate
                </p>
              </div>
              <Eye className="h-10 w-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        {/* Conversions */}
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-900">Conversions</p>
                <p className="text-3xl font-bold text-orange-900 mt-2">
                  {stats.totalConversions}
                </p>
                <p className="text-xs text-orange-700 mt-1 font-semibold">
                  {stats.overallConversionRate}% conversion rate
                </p>
                <p className="text-[10px] text-orange-600 mt-0.5">
                  = Conversions ÷ Recipients
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* QR Scans */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <QrCode className="h-5 w-5 text-blue-600" />
              QR Code Scans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold text-slate-900">{stats.qrScans}</p>
              <p className="text-sm text-slate-600">total scans</p>
            </div>
            <div className="mt-4 w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{
                  width: `${Math.min(calculateConversionRate(stats.qrScans, stats.totalRecipients) * 100, 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {formatPercentage(calculateConversionRate(stats.qrScans, stats.totalRecipients), 1)} scan rate
            </p>
          </CardContent>
        </Card>

        {/* Form Submissions */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Form Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold text-slate-900">{stats.formSubmissions}</p>
              <p className="text-sm text-slate-600">submissions</p>
            </div>
            <div className="mt-4 w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{
                  width: `${Math.min(calculateConversionRate(stats.formSubmissions, stats.totalPageViews) * 100, 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {formatPercentage(calculateConversionRate(stats.formSubmissions, stats.totalPageViews), 1)} of page views
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Visitor engagement (Forms ÷ Views)
            </p>
          </CardContent>
        </Card>

        {/* Calls Received */}
        {stats.callMetrics && (
          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="h-5 w-5 text-purple-600" />
                Calls Received
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold text-purple-900">{stats.callMetrics.total_calls}</p>
                <p className="text-sm text-purple-700">total calls</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-purple-900 font-semibold">✓ {stats.callMetrics.successful_calls}</p>
                  <p className="text-purple-600">successful</p>
                </div>
                <div>
                  <p className="text-purple-900 font-semibold">{formatDuration(stats.callMetrics.average_duration)}</p>
                  <p className="text-purple-600">avg duration</p>
                </div>
              </div>
              <p className="text-[10px] text-purple-600 mt-2">
                AI Call Center tracking
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Engagement Metrics */}
      {stats.engagementMetrics && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Engagement Timing Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Time to First Visit */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Eye className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600">Avg. Time to First Visit</p>
                  </div>
                </div>
                {stats.engagementMetrics.avgTimeToFirstView ? (
                  <>
                    <p className="text-2xl font-bold text-slate-900">
                      {stats.engagementMetrics.avgTimeToFirstView.display}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      From mail sent to landing page view
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-400 mt-2">No data yet</p>
                )}
              </div>

              {/* Time to Conversion (from first view) */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600">Avg. Time to Conversion</p>
                  </div>
                </div>
                {stats.engagementMetrics.avgTimeToConversion ? (
                  <>
                    <p className="text-2xl font-bold text-slate-900">
                      {stats.engagementMetrics.avgTimeToConversion.display}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      From first view to form submission
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-400 mt-2">No data yet</p>
                )}
              </div>

              {/* Total Time to Conversion */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600">Total Time to Convert</p>
                  </div>
                </div>
                {stats.engagementMetrics.avgTotalTimeToConversion ? (
                  <>
                    <p className="text-2xl font-bold text-slate-900">
                      {stats.engagementMetrics.avgTotalTimeToConversion.display}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      From mail sent to conversion
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-400 mt-2">No data yet</p>
                )}
              </div>

              {/* Time to Appointment */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600">Avg. Time to Appointment</p>
                  </div>
                </div>
                {stats.engagementMetrics.avgTimeToAppointment ? (
                  <>
                    <p className="text-2xl font-bold text-slate-900">
                      {stats.engagementMetrics.avgTimeToAppointment.display}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      From mail sent to appointment booking
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-400 mt-2">No data yet</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Journey Sankey Chart */}
      <SankeyChart startDate={dateRange.start} endDate={dateRange.end} />
    </div>
  );
}
