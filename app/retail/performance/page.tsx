"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  TrendingUp,
  Users,
  Target,
  Award,
  MapPin,
  Loader2,
  RefreshCw,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Stats {
  totalStores: number;
  storesWithDeployments: number;
  totalDeployments: number;
  totalRecipients: number;
  totalVisitors: number;
  totalConversions: number;
  avgConversionRate: number;
}

interface TopStore {
  id: string;
  store_number: string;
  store_name: string;
  city: string;
  state: string;
  region: string;
  campaigns_count: number;
  recipients_count: number;
  visitors_count: number;
  conversions_count: number;
  conversion_rate: number;
}

interface Regional {
  region: string;
  stores_count: number;
  total_campaigns: number;
  total_recipients: number;
  total_visitors: number;
  total_conversions: number;
  avg_conversion_rate: number;
}

export default function PerformancePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [topStores, setTopStores] = useState<TopStore[]>([]);
  const [regions, setRegions] = useState<Regional[]>([]);
  const [loading, setLoading] = useState(true);
  const [aggregating, setAggregating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load all data in parallel
      const [statsRes, topStoresRes, regionsRes] = await Promise.all([
        fetch("/api/retail/performance/stats"),
        fetch("/api/retail/performance/top-stores?limit=5"),
        fetch("/api/retail/performance/regions"),
      ]);

      const [statsData, topStoresData, regionsData] = await Promise.all([
        statsRes.json(),
        topStoresRes.json(),
        regionsRes.json(),
      ]);

      if (statsData.success) setStats(statsData.data);
      if (topStoresData.success) setTopStores(topStoresData.data);
      if (regionsData.success) setRegions(regionsData.data);
    } catch (error) {
      console.error("Failed to load performance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setAggregating(true);
    try {
      const response = await fetch("/api/retail/performance/aggregate", {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Performance data refreshed!");
        await loadData(); // Reload all data
      } else {
        toast.error(result.error || "Failed to refresh data");
      }
    } catch (error) {
      console.error("Error refreshing performance:", error);
      toast.error("Failed to refresh performance data");
    } finally {
      setAggregating(false);
    }
  };

  const getMedalEmoji = (index: number) => {
    switch (index) {
      case 0:
        return "🥇";
      case 1:
        return "🥈";
      case 2:
        return "🥉";
      default:
        return `#${index + 1}`;
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400 mb-4" />
              <p className="text-slate-600">Loading performance data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if we have any deployment data
  const hasData = stats && stats.totalDeployments > 0;

  if (!hasData) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Retail Performance</h1>
          <p className="text-slate-600">
            Track store performance and identify top performers
          </p>
        </div>

        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="p-4 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No Performance Data Yet
              </h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                Create campaigns with store deployments to start tracking performance
                across your retail network.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/dm-creative">
                  <Button className="gap-2">
                    <Target className="h-4 w-4" />
                    Create Campaign
                  </Button>
                </Link>
                <Link href="/retail/stores">
                  <Button variant="outline" className="gap-2">
                    <Store className="h-4 w-4" />
                    Manage Stores
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Retail Performance</h1>
          <Button
            onClick={handleRefresh}
            disabled={aggregating}
            variant="outline"
            className="gap-2"
          >
            {aggregating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Refresh Data
              </>
            )}
          </Button>
        </div>
        <p className="text-slate-600">
          Track store performance and identify top performers across your network
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Store className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.storesWithDeployments}/{stats.totalStores}
                </p>
                <p className="text-xs text-slate-600">Active Stores</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.totalDeployments}
                </p>
                <p className="text-xs text-slate-600">Campaign Deployments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.totalConversions}
                </p>
                <p className="text-xs text-slate-600">Total Conversions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {stats.avgConversionRate.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-600">Avg Conversion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Top Performing Stores */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-600" />
              <CardTitle>Top Performing Stores</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {topStores.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-600">No performance data available yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topStores.map((store, index) => (
                  <div
                    key={store.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="text-2xl">{getMedalEmoji(index)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">
                            Store #{store.store_number}
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {store.conversion_rate.toFixed(1)}%
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">{store.store_name}</p>
                        <p className="text-xs text-slate-500">
                          {store.city}, {store.state}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {store.conversions_count}/{store.recipients_count}
                      </p>
                      <p className="text-xs text-slate-500">Conversions</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Regional Performance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              <CardTitle>Regional Performance</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {regions.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-600">
                  No regional data available. Add regions to stores.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {regions.map((region, index) => (
                  <div
                    key={index}
                    className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-slate-900">{region.region}</p>
                      <Badge className="bg-blue-600">
                        {region.avg_conversion_rate
                          ? region.avg_conversion_rate.toFixed(1)
                          : "0.0"}
                        %
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-slate-500">Stores</p>
                        <p className="font-semibold text-slate-900">
                          {region.stores_count}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Recipients</p>
                        <p className="font-semibold text-slate-900">
                          {region.total_recipients || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Conversions</p>
                        <p className="font-semibold text-slate-900">
                          {region.total_conversions || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/retail/deployments">
              <Button variant="outline" className="gap-2">
                <Target className="h-4 w-4" />
                View All Deployments
              </Button>
            </Link>
            <Link href="/retail/stores">
              <Button variant="outline" className="gap-2">
                <Store className="h-4 w-4" />
                Manage Stores
              </Button>
            </Link>
            <Link href="/dm-creative">
              <Button variant="outline" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Create New Campaign
              </Button>
            </Link>
            <Link href="/analytics">
              <Button variant="outline" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                View Campaign Analytics
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
