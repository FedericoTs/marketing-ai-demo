"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// Using custom modal instead of Dialog to avoid dependency issues
import { Sparkles, Download, Loader2, CheckCircle, TrendingUp, Store, Target } from 'lucide-react';
import { toast } from 'sonner';

interface StoreRecommendation {
  storeId: string;
  storeNumber: string;
  storeName: string;
  city: string;
  state: string;
  confidenceScore: number;
  reasoning: string;
  predictedConversionRate: number;
  estimatedConversions: number;
  priority: 'high' | 'medium' | 'low';
}

interface OptimizationResult {
  recommendedStores: StoreRecommendation[];
  expectedTotalConversions: number;
  expectedConversionRate: number;
  insights: string[];
  warnings: string[];
}

export function SmartCampaignOptimizer() {
  const [isOpen, setIsOpen] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [storeCount, setStoreCount] = useState('15');
  const [optimizing, setOptimizing] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);

  const handleOptimize = async () => {
    if (!campaignName || !message) {
      toast.error('Please enter campaign name and message');
      return;
    }

    setOptimizing(true);
    try {
      const response = await fetch('/api/retail/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName,
          message,
          targetAudience: targetAudience || undefined,
          desiredStoreCount: parseInt(storeCount) || 15,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        toast.success('Campaign optimized successfully!');
      } else {
        toast.error(data.error || 'Optimization failed');
      }
    } catch (error) {
      console.error('Optimization error:', error);
      toast.error('Failed to optimize campaign');
    } finally {
      setOptimizing(false);
    }
  };

  const downloadCSV = () => {
    if (!result) return;

    // Generate CSV content
    const csvHeader = 'store_number,name,lastname,address,city,state,zip\n';
    const csvRows = result.recommendedStores
      .map((store) => {
        // Sample recipient data - user would need to provide actual recipient details
        return `${store.storeNumber},"Valued","Customer","123 Main St","${store.city}","${store.state}","12345"`;
      })
      .join('\n');

    const csvContent = csvHeader + csvRows;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimized-campaign-${campaignName.replace(/\s+/g, '-').toLowerCase()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('CSV downloaded successfully!');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-slate-100 text-slate-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
      >
        <Sparkles className="h-4 w-4" />
        AI Optimize Campaign
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => !optimizing && !result && setIsOpen(false)}
          />

          {/* Modal */}
          <Card className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Sparkles className="h-6 w-6 text-purple-600" />
                  AI Campaign Optimizer
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>
              <CardDescription>
                Get AI-powered store recommendations based on historical performance data
              </CardDescription>
            </CardHeader>

        <div className="space-y-6">
          {/* Input Form */}
          {!result && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Campaign Name *
                </label>
                <Input
                  placeholder="e.g., Summer Hearing Health Promotion"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Campaign Message *
                </label>
                <Textarea
                  placeholder="Enter your marketing message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                    Target Audience (Optional)
                  </label>
                  <Input
                    placeholder="e.g., Adults 55-70"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                    Number of Stores
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={storeCount}
                    onChange={(e) => setStoreCount(e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-purple-900 mb-1">
                      AI-Powered Optimization
                    </p>
                    <p className="text-xs text-purple-700">
                      Our AI analyzes historical performance data to recommend the best stores for
                      your campaign. Uses GPT-4o for balanced cost and accuracy.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleOptimize}
                disabled={optimizing || !campaignName || !message}
                className="w-full gap-2"
                size="lg"
              >
                {optimizing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Analyzing Performance Data...
                  </>
                ) : (
                  <>
                    <Target className="h-5 w-5" />
                    Optimize Campaign
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Store className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">Recommended Stores</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {result.recommendedStores.length}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">Expected Conversions</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {result.expectedTotalConversions}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <CheckCircle className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">Expected Rate</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {result.expectedConversionRate.toFixed(1)}%
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* AI Insights */}
              {result.insights.length > 0 && (
                <Card className="border-purple-200 bg-purple-50">
                  <CardHeader>
                    <CardTitle className="text-base">AI Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.insights.map((insight, index) => (
                        <li key={index} className="flex gap-2 text-sm text-purple-900">
                          <CheckCircle className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Recommended Stores */}
              <Card>
                <CardHeader>
                  <CardTitle>Recommended Stores</CardTitle>
                  <CardDescription>AI-selected stores ranked by success probability</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {result.recommendedStores.map((store, index) => (
                      <div
                        key={store.storeId}
                        className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-700 rounded-full font-bold text-sm">
                          #{index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-slate-900">{store.storeName}</p>
                            <Badge className={getPriorityColor(store.priority)}>
                              {store.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-1">
                            {store.city}, {store.state} • Store #{store.storeNumber}
                          </p>
                          <p className="text-xs text-slate-500 italic">{store.reasoning}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-green-600">
                            {store.confidenceScore}% match
                          </p>
                          <p className="text-xs text-slate-500">
                            ~{store.predictedConversionRate.toFixed(1)}% conversion
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-3">
                <Button onClick={downloadCSV} className="flex-1 gap-2" size="lg">
                  <Download className="h-5 w-5" />
                  Download Store CSV Template
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setResult(null)}
                  className="gap-2"
                  size="lg"
                >
                  Start Over
                </Button>
              </div>

              <p className="text-xs text-slate-500 text-center">
                💡 Download the CSV template and add your recipient details (name, address, etc.)
                before uploading to DM Creative
              </p>
            </div>
          )}
        </div>
          </Card>
        </div>
      )}
    </>
  );
}
