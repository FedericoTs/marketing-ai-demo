"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  DollarSign,
  TrendingUp,
  Target,
  BarChart3,
  PieChart,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

interface AnalyticsData {
  totalAudiences: number;
  totalContactsPurchased: number;
  totalSpent: number;
  avgConversionRate: number;
  topPerformers: any[];
  savedAudiences: any[];
}

/**
 * Audience Analytics - Performance Overview
 *
 * Displays aggregated metrics for all saved audiences:
 * - Total audiences created
 * - Total contacts purchased
 * - Average conversion rates
 * - Cost savings vs. external brokers
 * - Top performing audiences
 */
export function AudienceAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalAudiences: 0,
    totalContactsPurchased: 0,
    totalSpent: 0,
    avgConversionRate: 0,
    topPerformers: [],
    savedAudiences: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/audience/analytics');

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data.analytics);
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Audiences
            </CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {analytics.totalAudiences}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Saved segments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-600">
              Contacts Purchased
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {analytics.totalContactsPurchased.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Across all campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Spent
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              ${analytics.totalSpent.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              On audience targeting
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-600">
              Avg. Conversion
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {analytics.avgConversionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Coming soon - requires campaign tracking
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      {analytics.totalAudiences === 0 && (
        <Card className="border-2 border-dashed border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100">
              <BarChart3 className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">
              No analytics yet
            </h3>
            <p className="max-w-md text-center text-slate-600">
              Create and use audiences in your campaigns to see performance analytics here.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Top Performers (when data is available) */}
      {analytics.totalAudiences > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Audiences</CardTitle>
              <CardDescription>
                Coming soon - requires campaign tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topPerformers.length === 0 ? (
                  <div className="py-8 text-center text-slate-500">
                    <PieChart className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <p>Campaign performance tracking will be added in future updates</p>
                    <p className="text-xs mt-2">Track conversion rates and ROI per audience</p>
                  </div>
                ) : (
                  analytics.topPerformers.map((audience: any, index) => (
                    <div
                      key={audience.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {audience.name}
                          </div>
                          <div className="text-sm text-slate-500">
                            {audience.campaigns} campaigns
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-green-600">
                          <TrendingUp className="h-4 w-4" />
                          <span className="font-bold">
                            {(audience.conversionRate * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          conversion rate
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cost Savings */}
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-900">
                <DollarSign className="h-5 w-5" />
                Cost Savings vs. External Brokers
              </CardTitle>
              <CardDescription>
                Free audience count previews via Data Axle integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-700 mb-2">
                Unlimited
              </div>
              <p className="text-sm text-green-800">
                Preview audience sizes for free before purchasing • Typically $50-100 per broker quote
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
