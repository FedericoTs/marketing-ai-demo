'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Users,
  FileText,
  Calendar,
  Loader2,
  AlertCircle,
  Mail,
  Image as ImageIcon,
} from 'lucide-react';
import { CampaignGenerationPanel } from '@/components/campaigns/campaign-generation-panel';
import { ShowExistingPDFsButton } from '@/components/campaigns/show-existing-pdfs-button';
import type { Campaign } from '@/lib/database/types';
import { toast } from 'sonner';

export default function CampaignDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedCount, setGeneratedCount] = useState<number>(0);

  useEffect(() => {
    loadCampaignStats();
  }, [campaignId]);

  async function loadCampaignStats() {
    try {
      console.log('📊 [CampaignDetails] Loading campaign stats...')

      // Use dedicated stats API (server-side, no RLS issues)
      const response = await fetch(`/api/campaigns/${campaignId}/stats`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load campaign stats');
      }

      const result = await response.json();
      const stats = result.data;

      console.log('✅ [CampaignDetails] Stats loaded:', stats)

      // Set campaign data
      setCampaign({
        id: stats.campaignId,
        name: stats.campaignName,
        status: stats.status,
        total_recipients: stats.totalRecipients,
        organization_id: stats.organizationId,
        created_at: stats.createdAt,
      } as Campaign);

      // Set generated count
      setGeneratedCount(stats.generatedCount);

      console.log(`✅ [CampaignDetails] Campaign: ${stats.campaignName}, Generated: ${stats.generatedCount}/${stats.totalRecipients}`)
    } catch (error) {
      console.error('❌ [CampaignDetails] Failed to load stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to load campaign');
      toast.error('Failed to load campaign details');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  {error || 'Campaign Not Found'}
                </h3>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push('/campaigns')}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Campaigns
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'sending':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'sent':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4 gap-2"
            onClick={() => router.push('/campaigns')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Campaigns
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-900">{campaign.name}</h1>
                <span
                  className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(
                    campaign.status || 'draft'
                  )}`}
                >
                  {campaign.status || 'draft'}
                </span>
              </div>
              {campaign.description && (
                <p className="text-slate-600 mt-2">{campaign.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Created {formatDate(campaign.created_at)}
                </span>
                {campaign.scheduled_at && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      Scheduled for {formatDate(campaign.scheduled_at)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Campaign Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recipients</CardTitle>
              <Users className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaign.total_recipients || 0}</div>
              <p className="text-xs text-slate-600 mt-1">
                Direct mail recipients
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Template</CardTitle>
              <FileText className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {campaign.template_id ? '1' : '0'}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Design template
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Generated</CardTitle>
              <ImageIcon className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{generatedCount}</div>
              <p className="text-xs text-slate-600 mt-1">
                Personalized designs
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Campaign Generation Panel */}
        <CampaignGenerationPanel
          campaignId={campaignId}
          organizationId={campaign.organization_id}
          totalRecipients={campaign.total_recipients || 0}
          campaignName={campaign.name}
          campaignStatus={campaign.status || 'draft'}
          generatedCount={generatedCount}
          onGenerationComplete={() => {
            // Refresh stats when generation completes
            loadCampaignStats();
          }}
        />

        {/* BACKUP: Simple Print Button (if campaign is completed) */}
        {campaign.status === 'completed' && (
          <div className="mt-8">
            <ShowExistingPDFsButton
              campaignId={campaignId}
              organizationId={campaign.organization_id}
              campaignName={campaign.name}
            />
          </div>
        )}

        {/* Template Preview (if available) */}
        {campaign.design_snapshot && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Design Template Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-100 rounded-lg p-8 flex items-center justify-center">
                <p className="text-slate-600">
                  Template preview coming soon
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
