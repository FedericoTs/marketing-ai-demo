"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Eye, TrendingUp, Target, QrCode, CheckCircle, Loader2 } from "lucide-react";

interface DashboardStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalRecipients: number;
  totalPageViews: number;
  totalConversions: number;
  overallConversionRate: number;
  qrScans: number;
  formSubmissions: number;
}

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch("/api/analytics/overview");
      const result = await response.json();

      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error("Failed to load dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
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

  // Response rate calculation
  const responseRate = stats.totalRecipients > 0
    ? ((stats.totalPageViews / stats.totalRecipients) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6">
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
                  {responseRate}% response rate
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
              </div>
              <TrendingUp className="h-10 w-10 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  width: `${stats.totalRecipients > 0 ? Math.min((stats.qrScans / stats.totalRecipients) * 100, 100) : 0}%`,
                }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {stats.totalRecipients > 0
                ? ((stats.qrScans / stats.totalRecipients) * 100).toFixed(1)
                : "0.0"}% scan rate
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
                  width: `${stats.totalPageViews > 0 ? Math.min((stats.formSubmissions / stats.totalPageViews) * 100, 100) : 0}%`,
                }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {stats.totalPageViews > 0
                ? ((stats.formSubmissions / stats.totalPageViews) * 100).toFixed(1)
                : "0.0"}% of page views
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Response Rate</span>
                <span className="text-sm font-semibold text-blue-600">{responseRate}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(parseFloat(responseRate), 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Conversion Rate</span>
                <span className="text-sm font-semibold text-orange-600">
                  {stats.overallConversionRate}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="bg-orange-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(stats.overallConversionRate, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
