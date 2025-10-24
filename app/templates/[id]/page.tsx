"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  TrendingUp,
  Users,
  Eye,
  Target,
  Calendar,
  Trash2,
  FileText,
  BarChart3,
  Activity,
  Clock,
  Mail,
  Globe
} from "lucide-react";
import { toast } from "sonner";

interface TemplateAnalytics {
  template: {
    id: string;
    name: string;
    category: string;
    use_count: number;
    created_at: string;
  };
  performance: {
    campaigns_count: number;
    total_recipients: number;
    total_page_views: number;
    total_qr_scans: number;
    total_conversions: number;
    appointment_conversions: number;
    conversion_rate: number;
    page_view_rate: number;
  };
  category_comparison: {
    total_templates: number;
    avg_use_count: number;
    rank: 'above_average' | 'below_average';
  };
  platform_context: {
    total_campaigns: number;
    total_recipients: number;
    total_page_views: number;
    total_qr_scans: number;
    total_conversions: number;
  };
  usage_history: Array<{
    id: string;
    name: string;
    created_at: string;
    recipients_count: number;
    conversions_count: number;
    conversion_rate: number;
  }>;
}

interface TemplateData {
  id: string;
  name: string;
  description?: string;
  category: string;
  template_data: string;
  is_system_template: number;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export default function TemplateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [analytics, setAnalytics] = useState<TemplateAnalytics | null>(null);
  const [dmTemplate, setDmTemplate] = useState<any | null>(null);
  const [sampleLandingPageUrl, setSampleLandingPageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadTemplateData();
  }, [templateId]);

  async function loadTemplateData() {
    try {
      setLoading(true);

      // Fetch template details
      const templateRes = await fetch(`/api/campaigns/templates/${templateId}`);
      if (!templateRes.ok) {
        throw new Error('Failed to load template');
      }
      const templateResponse = await templateRes.json();

      // API returns { success, data } structure
      const templateData = templateResponse.success ? templateResponse.data : templateResponse;
      setTemplate(templateData);

      // Fetch analytics
      let analyticsData: any = null;
      const analyticsRes = await fetch(`/api/campaigns/templates/${templateId}/analytics`);
      if (analyticsRes.ok) {
        const analyticsResponse = await analyticsRes.json();
        // API returns { success, data } structure
        analyticsData = analyticsResponse.success ? analyticsResponse.data : null;
        if (analyticsData) {
          setAnalytics(analyticsData);
        }
      }

      // Fetch DM template design (includes previewImage with actual DM rendered)
      try {
        const dmTemplateRes = await fetch(`/api/dm-template?campaignTemplateId=${templateId}`);
        console.log('🎨 DM Template Response Status:', dmTemplateRes.status);
        if (dmTemplateRes.ok) {
          const dmTemplateData = await dmTemplateRes.json();
          console.log('🎨 DM Template Data:', {
            success: dmTemplateData.success,
            hasData: !!dmTemplateData.data,
            hasPreviewImage: !!dmTemplateData.data?.previewImage,
            previewImageLength: dmTemplateData.data?.previewImage?.length
          });
          if (dmTemplateData.success && dmTemplateData.data) {
            setDmTemplate(dmTemplateData.data);
          }
        }
      } catch (error) {
        console.error('❌ Error loading DM template:', error);
        // Non-critical, continue without DM preview
      }

      // Try to get a sample landing page URL from the first campaign that used this template
      try {
        if (analyticsData && analyticsData.usage_history && analyticsData.usage_history.length > 0) {
          const firstCampaign = analyticsData.usage_history[0];
          console.log('🌐 Checking landing page for campaign:', firstCampaign.id, firstCampaign.name);
          // Check if campaign has a landing page configured
          const lpRes = await fetch(`/api/campaigns/${firstCampaign.id}/landing-page`);
          console.log('🌐 Landing Page Response Status:', lpRes.status);
          if (lpRes.ok) {
            const lpData = await lpRes.json();
            console.log('🌐 Landing Page Data:', {
              success: lpData.success,
              hasData: !!lpData.data,
              hasPageConfig: !!lpData.data?.page_config,
              source: lpData.data?._source
            });
            // API returns { success, data: { ...landingPage, page_config: {...} } }
            if (lpData.success && lpData.data && lpData.data.page_config) {
              // Construct preview URL based on landing page source
              let previewUrl: string;

              if (lpData.data._source === 'recipient_landing_page' && lpData.data.tracking_id) {
                // Use recipient-specific landing page
                previewUrl = `/lp/${lpData.data.tracking_id}`;
                console.log('✅ Setting recipient landing page preview URL:', previewUrl);
              } else {
                // Use campaign-based landing page preview
                previewUrl = `/lp/campaign/${firstCampaign.id}/preview`;
                console.log('✅ Setting campaign landing page preview URL:', previewUrl);
              }

              setSampleLandingPageUrl(previewUrl);
            } else {
              console.log('⚠️ Landing page data incomplete:', lpData);
            }
          } else {
            console.log('⚠️ Landing page request failed:', lpRes.status);
          }
        } else {
          console.log('ℹ️ No usage history for this template');
        }
      } catch (error) {
        console.error('❌ Error finding sample landing page:', error);
        // Non-critical, continue without landing page preview
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('Failed to load template details');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!template) return;

    if (template.is_system_template) {
      toast.error('Cannot delete system templates');
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${template.name}"? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/campaigns/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete template');
      }

      toast.success('Template deleted successfully');
      router.push('/templates');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    } finally {
      setDeleting(false);
    }
  }

  function handleUseTemplate() {
    // Navigate to DM Creative page with template pre-selected
    toast.info('Navigate to DM Creative to use this template');
    router.push(`/dm-creative?templateId=${templateId}`);
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading template details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-900">Template not found</p>
            <Button
              variant="outline"
              onClick={() => router.push('/templates')}
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Templates
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categoryColors: Record<string, string> = {
    general: 'bg-blue-100 text-blue-800',
    retail: 'bg-purple-100 text-purple-800',
    seasonal: 'bg-orange-100 text-orange-800',
    promotional: 'bg-green-100 text-green-800',
  };

  // Format dates safely
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Date not available';
      }
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Date not available';
    }
  };

  const createdDate = formatDate(template.created_at);
  const updatedDate = formatDate(template.updated_at);

  // Parse template data
  let templateData: any = {};
  try {
    templateData = typeof template.template_data === 'string'
      ? JSON.parse(template.template_data)
      : template.template_data;
  } catch (error) {
    console.error('Error parsing template data:', error);
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/templates')}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Templates
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-900">{template.name}</h1>
              <Badge className={categoryColors[template.category] || categoryColors.general}>
                {template.category}
              </Badge>
              {template.is_system_template === 1 && (
                <Badge variant="outline" className="border-slate-400 text-slate-700">
                  System Template
                </Badge>
              )}
            </div>
            {template.description && (
              <p className="text-slate-600">{template.description}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleUseTemplate} size="lg" className="gap-2">
              <FileText className="h-4 w-4" />
              Use Template
            </Button>
            {template.is_system_template === 0 && (
              <Button
                variant="destructive"
                size="lg"
                onClick={handleDelete}
                disabled={deleting}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Previews & Usage History with Tabs */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Template Preview & Usage</CardTitle>
              <CardDescription>Visual previews and campaign history</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="dm-preview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="dm-preview" className="gap-2">
                    <Mail className="h-4 w-4" />
                    DM Preview
                  </TabsTrigger>
                  <TabsTrigger value="landing-page" className="gap-2">
                    <Globe className="h-4 w-4" />
                    Landing Page
                  </TabsTrigger>
                  <TabsTrigger value="usage-history" className="gap-2">
                    <Clock className="h-4 w-4" />
                    Usage History
                  </TabsTrigger>
                </TabsList>

                {/* DM Preview Tab */}
                <TabsContent value="dm-preview" className="mt-6">
                  <div className="bg-slate-100 rounded-lg overflow-hidden min-h-[500px] flex items-center justify-center p-4">
                    {dmTemplate?.previewImage ? (
                      <div className="w-full flex items-center justify-center">
                        <img
                          src={dmTemplate.previewImage}
                          alt={`${template.name} DM preview`}
                          className="max-w-full h-auto rounded-lg shadow-2xl"
                          style={{
                            imageRendering: 'auto',
                            maxHeight: '800px',
                            width: 'auto'
                          }}
                        />
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <Mail className="h-24 w-24 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-700 font-medium text-lg mb-2">No DM Design Yet</p>
                        <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
                          This template contains the message and settings, but doesn't have a designed DM layout yet.
                          The DM design will be created when you use this template in the DM Creative editor.
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto text-left">
                          <p className="text-sm text-blue-900 font-medium mb-2">Template Content:</p>
                          <div className="text-sm text-blue-800 space-y-1">
                            <p><strong>Message:</strong> {templateData.message?.substring(0, 100)}...</p>
                            {templateData.targetAudience && <p><strong>Audience:</strong> {templateData.targetAudience}</p>}
                            {templateData.tone && <p><strong>Tone:</strong> {templateData.tone}</p>}
                          </div>
                        </div>
                        <Button
                          onClick={handleUseTemplate}
                          className="mt-6"
                        >
                          Create DM Design
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Landing Page Preview Tab */}
                <TabsContent value="landing-page" className="mt-6">
                  {sampleLandingPageUrl ? (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-900">Actual Landing Page Preview</p>
                            <p className="text-xs text-blue-700 mt-1">
                              This is a real landing page from a campaign that used this template
                            </p>
                          </div>
                          <a
                            href={sampleLandingPageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Button variant="outline" size="sm" className="gap-2">
                              <Globe className="h-4 w-4" />
                              Open in New Tab
                            </Button>
                          </a>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden" style={{ height: '600px' }}>
                        <iframe
                          src={sampleLandingPageUrl}
                          className="w-full h-full border-0"
                          title="Landing Page Preview"
                          sandbox="allow-same-origin allow-scripts allow-forms"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <Globe className="h-24 w-24 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-700 font-medium text-lg mb-2">No Landing Pages Available Yet</p>
                      <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
                        Landing pages are dynamically generated when recipients scan QR codes from direct mail pieces.
                        Once this template is used in a campaign and recipients start engaging, you'll be able to preview actual landing pages here.
                      </p>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-md mx-auto text-left">
                        <p className="text-sm font-medium text-amber-900 mb-2">⚠️ Database Status Check</p>
                        <p className="text-xs text-amber-800">
                          Landing pages are stored in the <code className="bg-amber-100 px-1 rounded">landing_pages</code> table
                          and linked to recipients via <code className="bg-amber-100 px-1 rounded">tracking_id</code>.
                          {analytics && analytics.usage_history && analytics.usage_history.length > 0 ? (
                            <span className="block mt-2">
                              This template has been used in {analytics.usage_history.length} campaign(s),
                              but no landing pages have been generated yet. This may indicate recipients haven't scanned QR codes,
                              or there's an issue with landing page creation during DM generation.
                            </span>
                          ) : (
                            <span className="block mt-2">
                              This template hasn't been used in any campaigns yet.
                            </span>
                          )}
                        </p>
                      </div>
                      <Button
                        onClick={handleUseTemplate}
                        className="mt-6"
                      >
                        Use Template to Create Campaign
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Usage History Tab */}
                <TabsContent value="usage-history" className="mt-6">
                  {analytics && analytics.usage_history && analytics.usage_history.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                              Campaign
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                              Date
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">
                              Recipients
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">
                              Conversions
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">
                              Rate
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {analytics.usage_history.map((campaign) => (
                            <tr key={campaign.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-900">{campaign.name}</div>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {formatDate(campaign.created_at)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                                {campaign.recipients_count.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                                {campaign.conversions_count.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-sm font-semibold text-green-600">
                                  {campaign.conversion_rate.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Clock className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-600 font-medium mb-2">No Usage History Yet</p>
                      <p className="text-sm text-slate-500">
                        This template hasn't been used in any campaigns yet.
                      </p>
                      <Button
                        variant="outline"
                        onClick={handleUseTemplate}
                        className="mt-4"
                      >
                        Use Template Now
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Template Content Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Template Content</CardTitle>
              <CardDescription>Message and configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Message</label>
                  <p className="mt-1 text-slate-900 bg-slate-50 p-3 rounded border">
                    {templateData.message || 'No message provided'}
                  </p>
                </div>
                {templateData.targetAudience && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">Target Audience</label>
                    <p className="mt-1 text-slate-600">{templateData.targetAudience}</p>
                  </div>
                )}
                {templateData.tone && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">Tone</label>
                    <p className="mt-1 text-slate-600">{templateData.tone}</p>
                  </div>
                )}
                {templateData.industry && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">Industry</label>
                    <p className="mt-1 text-slate-600">{templateData.industry}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Analytics & Stats */}
        <div className="space-y-6">
          {/* Usage Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Usage Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600">Total Uses</span>
                  <span className="text-2xl font-bold text-slate-900">{template.use_count}</span>
                </div>
                {analytics && analytics.category_comparison && (
                  <div className="text-xs text-slate-500">
                    {analytics.category_comparison.rank === 'above_average' ? '✓' : '↓'}
                    {' '}{analytics.category_comparison.rank === 'above_average' ? 'Above' : 'Below'} average
                    ({Math.round(analytics.category_comparison.avg_use_count)} avg in category)
                  </div>
                )}
              </div>

              <div className="pt-3 border-t">
                <div className="flex items-center gap-2 text-slate-700 mb-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">Created</span>
                </div>
                <p className="text-sm text-slate-600">{createdDate}</p>
              </div>

              <div className="pt-3 border-t">
                <div className="flex items-center gap-2 text-slate-700 mb-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">Last Updated</span>
                </div>
                <p className="text-sm text-slate-600">{updatedDate}</p>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          {analytics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
                <CardDescription>Real data from campaigns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-indigo-600" />
                    <span className="text-sm text-slate-600">Campaigns</span>
                  </div>
                  <span className="text-lg font-semibold text-slate-900">
                    {analytics.performance.campaigns_count.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-slate-600">Recipients</span>
                  </div>
                  <span className="text-lg font-semibold text-slate-900">
                    {analytics.performance.total_recipients.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-slate-600">Page Views</span>
                  </div>
                  <span className="text-lg font-semibold text-slate-900">
                    {analytics.performance.total_page_views.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-purple-600" />
                    <span className="text-sm text-slate-600">Conversions</span>
                  </div>
                  <span className="text-lg font-semibold text-slate-900">
                    {analytics.performance.total_conversions.toLocaleString()}
                  </span>
                </div>

                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-orange-600" />
                      <span className="text-sm text-slate-600">Conversion Rate</span>
                    </div>
                    <span className="text-lg font-semibold text-slate-900">
                      {analytics.performance.conversion_rate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Page View Rate</span>
                    <span className="text-sm font-medium text-slate-700">
                      {analytics.performance.page_view_rate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Category Comparison */}
          {analytics && analytics.category_comparison && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-blue-700 mb-2">Category Comparison</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {analytics.category_comparison.total_templates}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Total {template.category} templates
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
