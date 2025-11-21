'use client';

/**
 * Campaign Performance Overview Cards
 *
 * Displays key business metrics in a 4-card grid:
 * - Total Campaigns Sent
 * - Active Campaigns
 * - Average Response Rate
 * - Total ROI/Revenue
 *
 * Dashboard Improvement - Nov 21, 2025
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Activity, TrendingUp, DollarSign } from 'lucide-react';

interface PerformanceData {
  totalCampaigns: number;
  sentCampaigns: number;
  activeCampaigns: number;
  responseRate: number;
  totalRevenue: number;
  totalEvents: number;
  totalConversions: number;
}

interface CampaignPerformanceCardsProps {
  data: PerformanceData | null;
  isLoading: boolean;
}

export function CampaignPerformanceCards({ data, isLoading }: CampaignPerformanceCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-slate-200 rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-slate-200 rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Campaigns Sent */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-600">
            <Send className="h-4 w-4 text-blue-600" />
            Campaigns Sent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-slate-900">{data.sentCampaigns}</p>
            <p className="text-xs text-slate-500">
              {data.totalCampaigns} total created
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Active Campaigns */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-600">
            <Activity className="h-4 w-4 text-green-600" />
            Active Campaigns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-green-600">{data.activeCampaigns}</p>
            <p className="text-xs text-slate-500">
              Currently running
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Average Response Rate */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-600">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            Response Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-purple-600">
              {data.responseRate.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500">
              {data.totalEvents} total events
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Total ROI/Revenue */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-600">
            <DollarSign className="h-4 w-4 text-orange-600" />
            Total Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-orange-600">
              ${data.totalRevenue.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500">
              {data.totalConversions} conversions
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
