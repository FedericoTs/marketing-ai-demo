"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Store, Users, Eye, TrendingUp, Loader2 } from 'lucide-react';

interface StoreDeploymentStat {
  deployment_id: string;
  store_id: string;
  store_number: string;
  store_name: string;
  recipients_count: number;
  page_views: number;
  conversions: number;
}

interface CampaignStoreStatsProps {
  campaignId: string;
}

export function CampaignStoreStats({ campaignId }: CampaignStoreStatsProps) {
  const [stats, setStats] = useState<StoreDeploymentStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasDeployments, setHasDeployments] = useState(false);

  useEffect(() => {
    loadStoreStats();
  }, [campaignId]);

  const loadStoreStats = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/store-stats`);
      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        setStats(result.data);
        setHasDeployments(true);
      } else {
        setHasDeployments(false);
      }
    } catch (error) {
      console.error('Failed to load store stats:', error);
      setHasDeployments(false);
    } finally {
      setLoading(false);
    }
  };

  // Don't render if no store deployments
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!hasDeployments) {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm text-blue-900">Store Performance</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            {stats.length} {stats.length === 1 ? 'Store' : 'Stores'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="max-h-64 overflow-y-auto space-y-2">
          {stats.map((stat) => {
            const conversionRate = stat.recipients_count > 0
              ? ((stat.conversions / stat.recipients_count) * 100).toFixed(1)
              : '0.0';

            return (
              <div
                key={stat.deployment_id}
                className="bg-white rounded-lg p-3 border border-blue-100 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="h-3.5 w-3.5 text-blue-600" />
                    <span className="text-sm font-medium text-slate-900">
                      Store #{stat.store_number}
                    </span>
                  </div>
                  <span className="text-xs text-slate-600">{stat.store_name}</span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-slate-50 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <Users className="h-3 w-3 text-slate-500" />
                      <p className="text-xs text-slate-600">Recipients</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">
                      {stat.recipients_count}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <Eye className="h-3 w-3 text-slate-500" />
                      <p className="text-xs text-slate-600">Views</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">
                      {stat.page_views}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <TrendingUp className="h-3 w-3 text-slate-500" />
                      <p className="text-xs text-slate-600">Conversions</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">
                      {stat.conversions}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded p-2">
                    <p className="text-xs text-slate-600 mb-1">Rate</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {conversionRate}%
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 border-t border-blue-200">
          <p className="text-xs text-blue-700">
            Store-level tracking enabled • Individual performance metrics per location
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
