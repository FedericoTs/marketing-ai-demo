"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Store,
  Target,
  TrendingUp,
  Brain,
  ArrowRight,
  Loader2,
  Mail,
  BarChart3,
} from "lucide-react";
import Link from "next/link";

export default function RetailLandingPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch("/api/retail/performance/stats");
      const result = await response.json();

      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🏪 Retail Module</h1>
        <p className="text-slate-600">
          Manage your retail store network and track campaign performance across locations
        </p>
      </div>

      {/* Quick Stats */}
      {!loading && stats && stats.totalStores > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Store className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalStores}</p>
                  <p className="text-xs text-slate-600">Total Stores</p>
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
                  <p className="text-2xl font-bold text-slate-900">{stats.totalDeployments}</p>
                  <p className="text-xs text-slate-600">Deployments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalConversions}</p>
                  <p className="text-xs text-slate-600">Conversions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.avgConversionRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-slate-600">Avg Conv. Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Features */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Store Management */}
        <Card className="border-blue-200 hover:border-blue-400 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Store className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Store Management</CardTitle>
            </div>
            <CardDescription>
              Manage your retail store network with unlimited scalability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-4 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Add, edit, and manage store locations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Bulk import stores from CSV</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Organize by region and district</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Track store demographics and details</span>
              </li>
            </ul>
            <Link href="/retail/stores">
              <Button className="w-full gap-2">
                Manage Stores
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Campaign Deployments */}
        <Card className="border-purple-200 hover:border-purple-400 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>Campaign Deployments</CardTitle>
            </div>
            <CardDescription>
              View all campaign deployments across your store network
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-4 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">•</span>
                <span>Track which campaigns are deployed where</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">•</span>
                <span>Monitor recipient counts per store</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">•</span>
                <span>Filter by store, campaign, or status</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">•</span>
                <span>Quick access to store and campaign details</span>
              </li>
            </ul>
            <Link href="/retail/deployments">
              <Button className="w-full gap-2" variant="outline">
                View Deployments
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Performance Dashboard */}
        <Card className="border-green-200 hover:border-green-400 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Performance Dashboard</CardTitle>
            </div>
            <CardDescription>
              Analyze performance and identify top-performing stores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-4 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span>View overall retail performance metrics</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span>See top-performing stores leaderboard</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span>Analyze performance by region</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span>Track conversion rates and engagement</span>
              </li>
            </ul>
            <Link href="/retail/performance">
              <Button className="w-full gap-2" variant="outline">
                View Performance
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* AI Insights (Future Feature) */}
        <Card className="border-slate-200 bg-slate-50">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-slate-200 rounded-lg">
                <Brain className="h-6 w-6 text-slate-500" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-slate-700">AI Insights</CardTitle>
                <span className="text-xs bg-slate-300 text-slate-700 px-2 py-0.5 rounded-full">
                  Coming Soon
                </span>
              </div>
            </div>
            <CardDescription>
              AI-powered recommendations and creative insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-4 text-sm text-slate-500">
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>Automatic performance pattern detection</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>Personalized campaign recommendations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>Predictive analytics for store performance</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>Creative optimization suggestions</span>
              </li>
            </ul>
            <Button disabled className="w-full gap-2" variant="outline">
              Coming Soon
            </Button>
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
            <Link href="/dm-creative">
              <Button variant="outline" className="gap-2">
                <Mail className="h-4 w-4" />
                Create Campaign with Store Deployment
              </Button>
            </Link>
            <Link href="/retail/stores">
              <Button variant="outline" className="gap-2">
                <Store className="h-4 w-4" />
                Import Stores from CSV
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

      {/* Getting Started Guide */}
      {(!stats || stats.totalStores === 0) && !loading && (
        <Card className="mt-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">🚀 Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm text-blue-900">
              <li className="flex gap-3">
                <span className="font-bold">1.</span>
                <div>
                  <p className="font-semibold">Import your stores</p>
                  <p className="text-blue-700">
                    Go to Store Management and import your retail locations from CSV
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">2.</span>
                <div>
                  <p className="font-semibold">Create a campaign with store numbers</p>
                  <p className="text-blue-700">
                    Upload a CSV with storeNumber column in DM Creative
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">3.</span>
                <div>
                  <p className="font-semibold">Track performance</p>
                  <p className="text-blue-700">
                    Monitor store-level analytics in the Performance Dashboard
                  </p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
