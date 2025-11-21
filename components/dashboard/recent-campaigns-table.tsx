'use client';

/**
 * Recent Campaigns Table
 *
 * Displays the 5 most recent campaigns with:
 * - Campaign name
 * - Status badge
 * - Recipients count
 * - Response rate
 * - Actions (View Analytics, Duplicate)
 *
 * Dashboard Improvement - Nov 21, 2025
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, Copy, Calendar } from 'lucide-react';
import Link from 'next/link';

interface RecentCampaign {
  id: string;
  name: string;
  status: string;
  recipients: number;
  responseRate: number;
  conversions: number;
  createdAt: string;
  sentAt: string | null;
}

interface RecentCampaignsTableProps {
  campaigns: RecentCampaign[];
  isLoading: boolean;
}

export function RecentCampaignsTable({ campaigns, isLoading }: RecentCampaignsTableProps) {
  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      draft: { label: 'Draft', variant: 'outline' },
      scheduled: { label: 'Scheduled', variant: 'secondary' },
      sending: { label: 'Sending', variant: 'default' },
      sent: { label: 'Sent', variant: 'default' },
      completed: { label: 'Completed', variant: 'default' },
      paused: { label: 'Paused', variant: 'destructive' },
      failed: { label: 'Failed', variant: 'destructive' },
    };

    const { label, variant } = config[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not sent';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-slate-200 rounded w-40 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          Recent Campaigns
        </CardTitle>
        <CardDescription>
          Your latest campaigns and their performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 mb-4">No campaigns yet</p>
            <Link href="/campaigns/create">
              <Button>Create Your First Campaign</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-slate-900 truncate">
                      {campaign.name}
                    </h4>
                    {getStatusBadge(campaign.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span>{campaign.recipients} recipients</span>
                    <span className="text-purple-600 font-medium">
                      {campaign.responseRate.toFixed(1)}% response
                    </span>
                    <span className="text-orange-600 font-medium">
                      {campaign.conversions} conversions
                    </span>
                    <span className="text-slate-400">
                      {formatDate(campaign.sentAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/analytics?campaign=${campaign.id}`}>
                    <Button variant="outline" size="sm">
                      <BarChart3 className="h-4 w-4 mr-1" />
                      Analytics
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" title="Duplicate campaign">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {campaigns.length >= 5 && (
              <div className="text-center pt-4 border-t">
                <Link href="/campaigns">
                  <Button variant="link">
                    View All Campaigns →
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
