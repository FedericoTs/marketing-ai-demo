"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Store,
  Target,
  Lightbulb,
  AlertCircle,
  CheckCircle,
  Info,
  Sparkles,
  RefreshCw,
  BarChart3,
  MapPin,
  Calendar,
  Award,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface AIInsight {
  type: 'success' | 'warning' | 'info' | 'recommendation';
  title: string;
  description: string;
  actionable: boolean;
  action?: string;
}

interface StoreCluster {
  cluster: 'high' | 'medium' | 'low';
  stores: any[];
  avgConversionRate: number;
  storeCount: number;
}

interface AnalyticsSummary {
  totalStores: number;
  activeStores: number;
  totalDeployments: number;
  totalRecipients: number;
  totalConversions: number;
  overallConversionRate: number;
  avgConversionsPerStore: number;
  bestPerformingRegion: string | null;
  worstPerformingRegion: string | null;
}

interface TopPerformer {
  id: string;
  store_number: string;
  name: string;
  city: string;
  state: string;
  conversion_rate: number;
  conversions: number;
  recipients: number;
}

interface CorrelationInsight {
  factor: string;
  correlation: 'positive' | 'negative' | 'neutral';
  strength: 'strong' | 'moderate' | 'weak';
  description: string;
}

export default function RetailInsightsPage() {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [clusters, setClusters] = useState<StoreCluster[]>([]);
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [underperformers, setUnderperformers] = useState<TopPerformer[]>([]);
  const [correlations, setCorrelations] = useState<CorrelationInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingInsights, setGeneratingInsights] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    setLoading(true);
    try {
      // Load all analytics data in parallel
      const [summaryRes, clustersRes, topRes, underRes, correlationsRes] = await Promise.all([
        fetch('/api/retail/analytics?type=summary'),
        fetch('/api/retail/analytics?type=clusters'),
        fetch('/api/retail/analytics?type=top-performers&limit=5'),
        fetch('/api/retail/analytics?type=underperformers&threshold=5'),
        fetch('/api/retail/analytics?type=correlations'),
      ]);

      const [summaryData, clustersData, topData, underData, correlationsData] =
        await Promise.all([
          summaryRes.json(),
          clustersRes.json(),
          topRes.json(),
          underRes.json(),
          correlationsRes.json(),
        ]);

      if (summaryData.success) setSummary(summaryData.data);
      if (clustersData.success) setClusters(clustersData.data);
      if (topData.success) setTopPerformers(topData.data);
      if (underData.success) setUnderperformers(underData.data);
      if (correlationsData.success) setCorrelations(correlationsData.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }

  async function generateAIInsights() {
    setGeneratingInsights(true);
    try {
      const response = await fetch('/api/retail/insights');
      const result = await response.json();

      if (result.success) {
        setInsights(result.data);
        toast.success('AI insights generated successfully');
      } else {
        toast.error(result.error || 'Failed to generate insights');
      }
    } catch (error) {
      console.error('Error generating insights:', error);
      toast.error('Failed to generate AI insights');
    } finally {
      setGeneratingInsights(false);
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
      case 'recommendation':
        return <Lightbulb className="h-5 w-5 text-purple-600" />;
      default:
        return <Sparkles className="h-5 w-5 text-slate-600" />;
    }
  };

  const getInsightBadgeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-orange-100 text-orange-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      case 'recommendation':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  // Empty state - no retail data yet
  if (!summary || summary.totalStores === 0) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Brain className="h-8 w-8 text-purple-600" />
            AI Insights
          </h1>
          <p className="text-slate-600 mt-2">AI-powered retail performance intelligence</p>
        </div>

        <Card className="border-2 border-dashed">
          <CardContent className="py-16">
            <div className="text-center max-w-md mx-auto">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-slate-100 p-6">
                  <Store className="h-12 w-12 text-slate-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                No Retail Data Available
              </h3>
              <p className="text-slate-600 mb-6">
                Get started by adding stores and deploying campaigns. Once you have performance
                data, AI will generate powerful insights to optimize your campaigns.
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/retail/stores">
                  <Button>
                    <Store className="h-4 w-4 mr-2" />
                    Add Stores
                  </Button>
                </Link>
                <Link href="/retail/deployments">
                  <Button variant="outline">
                    <Target className="h-4 w-4 mr-2" />
                    View Deployments
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const highCluster = clusters.find((c) => c.cluster === 'high');
  const mediumCluster = clusters.find((c) => c.cluster === 'medium');
  const lowCluster = clusters.find((c) => c.cluster === 'low');

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900">AI Insights & Optimization</h1>
            </div>
            <p className="text-slate-600">
              Data-driven recommendations and pattern analysis for your retail campaigns
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={generateAIInsights} disabled={generatingInsights} className="gap-2">
              {generatingInsights ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate AI Insights
            </Button>
            <Link href="/retail/deployments">
              <Button variant="outline" className="gap-2">
                <Target className="h-4 w-4" />
                Create Deployment
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Data Scope Banner */}
      <Card className="border-purple-200 bg-purple-50 mb-8">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Brain className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-purple-900 mb-1">
                Retail Module AI Intelligence (Store Deployments Only)
              </h4>
              <p className="text-xs text-purple-700">
                AI-powered insights analyze <strong>retail store campaign data only</strong>. Conversion rate = (Conversions / Recipients) × 100.
                Statistical patterns and correlations calculated from store performance aggregates.
                For all campaigns, see <a href="/analytics" className="underline font-medium">Analytics Dashboard</a>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Stores</p>
                  <p className="text-2xl font-bold text-slate-900">{summary.activeStores}</p>
                </div>
                <Store className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Conversion Rate</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {summary.overallConversionRate.toFixed(1)}%
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Conversions</p>
                  <p className="text-2xl font-bold text-slate-900">{summary.totalConversions}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Best Region</p>
                  <p className="text-lg font-bold text-slate-900">
                    {summary.bestPerformingRegion || 'N/A'}
                  </p>
                </div>
                <MapPin className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Insights Panel */}
      {insights.length > 0 && (
        <Card className="mb-8 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <CardTitle>AI-Generated Insights</CardTitle>
            </div>
            <CardDescription>Powered by GPT-4o-mini for cost-efficient analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div
                  key={index}
                  className="flex gap-4 p-4 bg-white rounded-lg border border-slate-200"
                >
                  <div className="flex-shrink-0 mt-0.5">{getInsightIcon(insight.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-slate-900">{insight.title}</h4>
                      <Badge className={getInsightBadgeColor(insight.type)}>
                        {insight.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{insight.description}</p>
                    {insight.actionable && insight.action && (
                      <p className="text-sm font-medium text-purple-600">
                        → {insight.action}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Clusters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* High Performers */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-green-600" />
              <CardTitle className="text-green-900">High Performers</CardTitle>
            </div>
            <CardDescription>
              {highCluster?.storeCount || 0} stores ·{' '}
              {highCluster?.avgConversionRate.toFixed(1)}% avg conversion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {highCluster?.stores.slice(0, 3).map((store: any) => (
                <div
                  key={store.id}
                  className="flex items-center justify-between p-2 bg-white rounded border border-green-200"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{store.name}</p>
                    <p className="text-xs text-slate-600">{store.city}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800 ml-2">
                    {store.conversion_rate.toFixed(1)}%
                  </Badge>
                </div>
              ))}
              {(highCluster?.storeCount || 0) > 3 && (
                <p className="text-xs text-slate-600 text-center pt-2">
                  +{(highCluster?.storeCount || 0) - 3} more stores
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Medium Performers */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-blue-900">Medium Performers</CardTitle>
            </div>
            <CardDescription>
              {mediumCluster?.storeCount || 0} stores ·{' '}
              {mediumCluster?.avgConversionRate.toFixed(1)}% avg conversion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mediumCluster?.stores.slice(0, 3).map((store: any) => (
                <div
                  key={store.id}
                  className="flex items-center justify-between p-2 bg-white rounded border border-blue-200"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{store.name}</p>
                    <p className="text-xs text-slate-600">{store.city}</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 ml-2">
                    {store.conversion_rate.toFixed(1)}%
                  </Badge>
                </div>
              ))}
              {(mediumCluster?.storeCount || 0) > 3 && (
                <p className="text-xs text-slate-600 text-center pt-2">
                  +{(mediumCluster?.storeCount || 0) - 3} more stores
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Low Performers */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-900">Needs Attention</CardTitle>
            </div>
            <CardDescription>
              {lowCluster?.storeCount || 0} stores ·{' '}
              {lowCluster?.avgConversionRate.toFixed(1)}% avg conversion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowCluster?.stores.slice(0, 3).map((store: any) => (
                <div
                  key={store.id}
                  className="flex items-center justify-between p-2 bg-white rounded border border-orange-200"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{store.name}</p>
                    <p className="text-xs text-slate-600">{store.city}</p>
                  </div>
                  <Badge className="bg-orange-100 text-orange-800 ml-2">
                    {store.conversion_rate.toFixed(1)}%
                  </Badge>
                </div>
              ))}
              {(lowCluster?.storeCount || 0) > 3 && (
                <p className="text-xs text-slate-600 text-center pt-2">
                  +{(lowCluster?.storeCount || 0) - 3} more stores
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Correlation Insights */}
      {correlations.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Performance Patterns</CardTitle>
            <CardDescription>Statistical correlations discovered in your data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {correlations.map((corr, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-shrink-0 mt-0.5">
                    {corr.strength === 'strong' ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : corr.strength === 'moderate' ? (
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900">{corr.factor}</span>
                      <Badge
                        className={
                          corr.strength === 'strong'
                            ? 'bg-green-100 text-green-800'
                            : corr.strength === 'moderate'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-600'
                        }
                      >
                        {corr.strength} correlation
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">{corr.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top & Bottom Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-green-600" />
              Top 5 Performing Stores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPerformers.map((store, index) => (
                <div
                  key={store.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-green-100 text-green-700 rounded-full font-bold text-sm">
                    #{index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{store.name}</p>
                    <p className="text-sm text-slate-600">
                      {store.city}, {store.state}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      {store.conversion_rate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500">
                      {store.conversions}/{store.recipients}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Underperformers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Stores Needing Attention
            </CardTitle>
            <CardDescription>Conversion rate below 5%</CardDescription>
          </CardHeader>
          <CardContent>
            {underperformers.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-slate-500">
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                All stores performing well!
              </div>
            ) : (
              <div className="space-y-3">
                {underperformers.slice(0, 5).map((store) => (
                  <div
                    key={store.id}
                    className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200"
                  >
                    <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900">{store.name}</p>
                      <p className="text-sm text-slate-600">
                        {store.city}, {store.state}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-600">
                        {store.conversion_rate.toFixed(1)}%
                      </p>
                      <p className="text-xs text-slate-500">
                        {store.conversions}/{store.recipients}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
