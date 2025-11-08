'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  Plus,
  Send,
  Search,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  Pause,
  AlertCircle,
  FileText,
} from 'lucide-react';
import type { Campaign } from '@/lib/database/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    icon: Clock,
    color: 'text-slate-600 bg-slate-100',
  },
  scheduled: {
    label: 'Scheduled',
    icon: Calendar,
    color: 'text-blue-600 bg-blue-100',
  },
  sending: {
    label: 'Sending',
    icon: Send,
    color: 'text-orange-600 bg-orange-100',
  },
  sent: {
    label: 'Sent',
    icon: Send,
    color: 'text-purple-600 bg-purple-100',
  },
  paused: {
    label: 'Paused',
    icon: Pause,
    color: 'text-amber-600 bg-amber-100',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    color: 'text-green-600 bg-green-100',
  },
  failed: {
    label: 'Failed',
    icon: AlertCircle,
    color: 'text-red-600 bg-red-100',
  },
};

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function loadCampaigns() {
    try {
      const response = await fetch('/api/campaigns');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load campaigns');
      }

      const { data } = await response.json();
      setCampaigns(data?.campaigns || []);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateCampaign = () => {
    router.push('/campaigns/create');
  };

  const handleViewCampaign = (campaignId: string) => {
    // TODO: Navigate to campaign detail page
    console.log('View campaign:', campaignId);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Campaigns</h1>
              <p className="text-slate-600 mt-2">
                Manage your direct mail campaigns
              </p>
            </div>
            <Button
              onClick={handleCreateCampaign}
              size="lg"
              className="gap-2"
            >
              <Plus className="h-5 w-5" />
              Create Campaign
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Campaign List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Send className="h-16 w-16 text-slate-400 mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                No Campaigns Yet
              </h3>
              <p className="text-slate-600 text-center mb-6 max-w-md">
                {searchQuery
                  ? 'No campaigns match your search. Try a different query.'
                  : 'Get started by creating your first direct mail campaign with our easy-to-use wizard.'}
              </p>
              {!searchQuery && (
                <Button onClick={handleCreateCampaign} className="gap-2">
                  <Plus className="h-5 w-5" />
                  Create Your First Campaign
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredCampaigns.map((campaign) => {
              const status = campaign.status || 'draft';
              const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
              const StatusIcon = statusConfig.icon;

              return (
                <Card
                  key={campaign.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewCampaign(campaign.id)}
                >
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      {/* Template Thumbnail */}
                      <div className="flex-shrink-0">
                        {campaign.template?.preview_image_url ? (
                          <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                            <Image
                              src={campaign.template.preview_image_url}
                              alt={campaign.template.name || 'Template preview'}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-24 h-24 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                            <FileText className="h-8 w-8 text-slate-400" />
                          </div>
                        )}
                      </div>

                      {/* Campaign Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-xl mb-2">{campaign.name}</CardTitle>
                            {campaign.description && (
                              <p className="text-sm text-slate-600 line-clamp-2">
                                {campaign.description}
                              </p>
                            )}
                          </div>
                          <div className={cn(
                            'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium flex-shrink-0',
                            statusConfig.color
                          )}>
                            <StatusIcon className="h-4 w-4" />
                            {statusConfig.label}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      {/* Recipients */}
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-slate-400" />
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {campaign.total_recipients.toLocaleString()}
                          </div>
                          <div className="text-xs text-slate-500">Recipients</div>
                        </div>
                      </div>

                      {/* Created Date */}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-slate-400" />
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {new Date(campaign.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-slate-500">Created</div>
                        </div>
                      </div>

                      {/* Sent Date (if applicable) */}
                      {campaign.sent_at && (
                        <div className="flex items-center gap-2">
                          <Send className="h-5 w-5 text-slate-400" />
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {new Date(campaign.sent_at).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-slate-500">Sent</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
