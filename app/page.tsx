"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Settings,
  FileText,
  Mail,
  BarChart3,
  Phone,
  Sparkles,
  CheckCircle2,
  Users,
  Eye,
  TrendingUp,
  Activity as ActivityIcon,
  Target,
  X,
  Store as StoreIcon,
  Award
} from "lucide-react";
import { useSettings } from "@/lib/contexts/settings-context";
import { Badge } from "@/components/ui/badge";

interface DashboardStats {
  totalCampaigns: number;
  totalRecipients: number;
  totalPageViews: number;
  totalConversions: number;
  overallConversionRate: number;
}

interface CampaignWithStats {
  id: string;
  name: string;
  created_at: string;
  status: string;
  totalRecipients: number;
  uniqueVisitors: number;
  conversionRate: number;
}

interface RecentActivity {
  id: string;
  type: string;
  recipientName: string;
  eventType?: string;
  conversionType?: string;
  campaignName: string;
  createdAt: string;
}

interface RetailStats {
  totalStores: number;
  storesWithDeployments: number;
  totalDeployments: number;
  totalConversions: number;
  avgConversionRate: number;
}

interface TopStore {
  id: string;
  store_number: string;
  store_name: string;
  city: string;
  state: string;
  conversion_rate: number;
  conversions_count: number;
}

interface RecentCampaignWithStores {
  id: string;
  name: string;
  status: string;
  created_at: string;
  storeCount?: number;
  recipientCount?: number;
}

export default function HomePage() {
  const { settings, isLoaded } = useSettings();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCampaigns, setRecentCampaigns] = useState<CampaignWithStats[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [retailStats, setRetailStats] = useState<RetailStats | null>(null);
  const [topStores, setTopStores] = useState<TopStore[]>([]);
  const [recentRetailCampaigns, setRecentRetailCampaigns] = useState<RecentCampaignWithStores[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isGuideDismissed, setIsGuideDismissed] = useState(false);

  const isSetupComplete = isLoaded && settings.companyName && settings.openaiApiKey;

  // Load guide dismiss state from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem("getStartedGuideDismissed");
    setIsGuideDismissed(dismissed === "true");
  }, []);

  // Handle dismiss guide
  const handleDismissGuide = () => {
    setIsGuideDismissed(true);
    localStorage.setItem("getStartedGuideDismissed", "true");
  };

  // Load dashboard data
  useEffect(() => {
    if (isSetupComplete) {
      loadDashboardData();
    } else {
      setLoadingData(false);
    }
  }, [isSetupComplete]);

  const loadDashboardData = async () => {
    try {
      // Load stats
      const statsRes = await fetch("/api/analytics/overview");
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats(statsData.data);
        }
      }

      // Load recent campaigns (top 3)
      const campaignsRes = await fetch("/api/analytics/campaigns");
      if (campaignsRes.ok) {
        const campaignsData = await campaignsRes.json();
        if (campaignsData.success) {
          setRecentCampaigns(campaignsData.data.slice(0, 3));
        }
      }

      // Load recent activity (top 5)
      const activityRes = await fetch("/api/analytics/recent-activity?limit=5");
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        if (activityData.success) {
          setRecentActivity(activityData.data);
        }
      }

      // Try to load retail stats (optional module)
      try {
        const retailStatsRes = await fetch("/api/retail/performance/stats");
        if (retailStatsRes.ok) {
          const retailStatsData = await retailStatsRes.json();
          if (retailStatsData.success && retailStatsData.data.totalStores > 0) {
            setRetailStats(retailStatsData.data);

            // Load top 3 stores
            const topStoresRes = await fetch("/api/retail/performance/top-stores?limit=3");
            if (topStoresRes.ok) {
              const topStoresData = await topStoresRes.json();
              if (topStoresData.success) {
                setTopStores(topStoresData.data);
              }
            }

            // Load recent campaigns with deployments
            const deploymentsRes = await fetch("/api/retail/deployments");
            if (deploymentsRes.ok) {
              const deploymentsData = await deploymentsRes.json();
              if (deploymentsData.success && deploymentsData.data.length > 0) {
                // Group by campaign and get unique campaigns
                const campaignMap = new Map<string, RecentCampaignWithStores>();
                deploymentsData.data.forEach((deployment: any) => {
                  if (!campaignMap.has(deployment.campaign_id)) {
                    campaignMap.set(deployment.campaign_id, {
                      id: deployment.campaign_id,
                      name: deployment.campaign_name,
                      status: deployment.campaign_status,
                      created_at: deployment.campaign_created_at,
                      storeCount: 1,
                      recipientCount: deployment.recipients_count,
                    });
                  } else {
                    const existing = campaignMap.get(deployment.campaign_id)!;
                    existing.storeCount! += 1;
                    existing.recipientCount! += deployment.recipients_count;
                  }
                });

                // Get most recent 3 campaigns
                const recentCampaigns = Array.from(campaignMap.values())
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .slice(0, 3);

                setRecentRetailCampaigns(recentCampaigns);
              }
            }
          }
        }
      } catch (error) {
        // Retail module not available or not enabled - silently ignore
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const workflow = [
    {
      step: 1,
      title: "Setup",
      description: "Configure brand & API keys",
      icon: Settings,
      href: "/settings",
      completed: isSetupComplete,
      color: "blue",
    },
    {
      step: 2,
      title: "Copy",
      description: "Generate AI content",
      icon: FileText,
      href: "/copywriting",
      completed: false,
      color: "purple",
    },
    {
      step: 3,
      title: "Campaign",
      description: "Create direct mail",
      icon: Mail,
      href: "/dm-creative",
      completed: false,
      color: "orange",
    },
    {
      step: 4,
      title: "Track",
      description: "Monitor performance",
      icon: BarChart3,
      href: "/analytics",
      completed: false,
      color: "green",
    },
  ];

  const getActivityLabel = (activity: RecentActivity) => {
    if (activity.type === "event") {
      switch (activity.eventType) {
        case "page_view": return "Viewed landing page";
        case "qr_scan": return "Scanned QR code";
        case "button_click": return "Clicked button";
        case "form_view": return "Viewed form";
        default: return "Activity";
      }
    } else {
      switch (activity.conversionType) {
        case "form_submission": return "Submitted form";
        case "appointment_booked": return "Booked appointment";
        default: return "Converted";
      }
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900">
            {isSetupComplete && settings.companyName
              ? `Welcome back, ${settings.companyName}!`
              : "AI Marketing Platform"}
          </h1>
        </div>
        <p className="text-xl text-slate-600">
          {isSetupComplete
            ? "Your AI-powered marketing automation platform"
            : "Automate your marketing with AI-powered copywriting, direct mail campaigns, and intelligent tracking"}
        </p>
      </div>

      {/* Setup Status Alert */}
      {!isSetupComplete && isLoaded && (
        <Card className="mb-8 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Settings className="h-6 w-6 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">
                  Complete Your Setup
                </h3>
                <p className="text-sm text-blue-700 mb-3">
                  Configure your company information and API keys to unlock all features
                </p>
                <Button asChild variant="default" size="sm">
                  <Link href="/settings">
                    Go to Settings
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compact Get Started Guide (Dismissible) */}
      {!isGuideDismissed && (
        <Card className="mb-8 border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">Get Started in 4 Steps</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismissGuide}
                    className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {workflow.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.step} href={item.href}>
                        <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-md cursor-pointer ${
                          item.completed ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}>
                          <div className={`p-1.5 rounded-md flex-shrink-0 ${
                            item.color === 'blue' ? 'bg-blue-100' :
                            item.color === 'purple' ? 'bg-purple-100' :
                            item.color === 'orange' ? 'bg-orange-100' :
                            'bg-green-100'
                          }`}>
                            <Icon className={`h-4 w-4 ${
                              item.color === 'blue' ? 'text-blue-600' :
                              item.color === 'purple' ? 'text-purple-600' :
                              item.color === 'orange' ? 'text-orange-600' :
                              'text-green-600'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-slate-900">{item.step}. {item.title}</span>
                              {item.completed && (
                                <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-slate-600 truncate">{item.description}</p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Platform Overview Stats */}
      {isSetupComplete && stats && stats.totalCampaigns > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Platform Overview</h2>
            <div className="flex gap-2">
              <Link href="/dm-creative">
                <Button variant="default" size="sm" className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Mail className="h-4 w-4" />
                  Create Campaign
                </Button>
              </Link>
              <Link href="/analytics">
                <Button variant="outline" size="sm" className="gap-2">
                  View Full Analytics
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Campaigns</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalCampaigns}</p>
                  </div>
                  <Target className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Recipients</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalRecipients}</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Page Views</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalPageViews}</p>
                  </div>
                  <Eye className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-900">Conversions</p>
                    <p className="text-2xl font-bold text-orange-900 mt-1">{stats.totalConversions}</p>
                    <p className="text-xs text-orange-700 mt-0.5 font-semibold">
                      {stats.overallConversionRate}% rate
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Retail Module Widget */}
      {isSetupComplete && retailStats && retailStats.totalStores > 0 && (
        <Card className="mb-8 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <StoreIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Retail Module
                    <Badge className="bg-blue-600 text-white px-2 py-0.5 text-xs">Active</Badge>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {retailStats.totalStores} stores • {retailStats.totalDeployments} deployments
                  </CardDescription>
                </div>
              </div>
              <Link href="/retail">
                <Button variant="outline" size="sm" className="gap-2">
                  View Retail Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {/* Recent Campaigns with Deployments */}
            {recentRetailCampaigns.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-slate-900">Recent Campaigns</h4>
                </div>
                <div className="space-y-2">
                  {recentRetailCampaigns.map((campaign) => (
                    <Link href={`/campaigns/${campaign.id}`} key={campaign.id}>
                      <div className="p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-slate-900 text-sm">{campaign.name}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-slate-600">
                                <StoreIcon className="h-3 w-3 inline mr-1" />
                                {campaign.storeCount} stores
                              </span>
                              <span className="text-xs text-slate-400">•</span>
                              <span className="text-xs text-slate-600">
                                {campaign.recipientCount} recipients
                              </span>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {campaign.status}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Top Performing Stores */}
            {topStores.length > 0 ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Award className="h-5 w-5 text-yellow-600" />
                  <h4 className="font-semibold text-slate-900">Top Performing Stores</h4>
                </div>
                <div className="space-y-3">
                  {topStores.map((store, index) => (
                    <div
                      key={store.id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-xl font-bold text-slate-400">
                          {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            Store #{store.store_number}
                          </p>
                          <p className="text-sm text-slate-600">
                            {store.store_name} • {store.city}, {store.state}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          {store.conversion_rate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-500">{store.conversions_count} conversions</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-3">
                  <Link href="/retail/performance" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <TrendingUp className="h-4 w-4" />
                      View Performance
                    </Button>
                  </Link>
                  <Link href="/retail/stores" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <StoreIcon className="h-4 w-4" />
                      Manage Stores
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-slate-600 mb-3">
                  No performance data yet. Deploy campaigns to your stores to see insights!
                </p>
                <Link href="/dm-creative">
                  <Button size="sm" className="gap-2">
                    <Mail className="h-4 w-4" />
                    Create Campaign
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Campaigns & Activity */}
      {isSetupComplete && (recentCampaigns.length > 0 || recentActivity.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Campaigns */}
          {recentCampaigns.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Recent Campaigns</CardTitle>
                  <Link href="/analytics?tab=campaigns">
                    <Button variant="ghost" size="sm">
                      View All
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentCampaigns.map((campaign) => (
                    <div key={campaign.id} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{campaign.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-600">
                            {campaign.totalRecipients} recipients
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-600">
                            {campaign.uniqueVisitors} visitors
                          </span>
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        <p className="text-sm font-bold text-green-600">{campaign.conversionRate}%</p>
                        <p className="text-xs text-slate-500">conversion</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          {recentActivity.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ActivityIcon className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                  <Link href="/analytics?tab=activity">
                    <Button variant="ghost" size="sm">
                      View All
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{activity.recipientName}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{getActivityLabel(activity)}</p>
                        <p className="text-xs text-slate-500 mt-1">{activity.campaignName}</p>
                      </div>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {formatTimeAgo(activity.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Platform Ready Status */}
      {isSetupComplete && stats && stats.totalCampaigns === 0 && !loadingData && (
        <div className="mt-8 p-8 bg-gradient-to-br from-blue-50 via-purple-50 to-slate-50 rounded-xl border-2 border-blue-200">
          <div className="text-center max-w-2xl mx-auto">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                <Mail className="h-8 w-8 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              Platform Ready!
            </h3>
            <p className="text-base text-slate-600 mb-6">
              Your AI marketing platform is configured and ready. Create your first campaign to start engaging customers with personalized direct mail.
            </p>
            <div className="flex justify-center gap-3">
              <Button asChild size="lg" className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Link href="/dm-creative">
                  <Mail className="h-4 w-4" />
                  Create Your First Campaign
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/copywriting">
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Copy First
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Legacy Start Creating Button */}
      {isSetupComplete && stats && stats.totalCampaigns === 0 && !loadingData && false && (
        <div className="mt-8 p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border" style={{display: 'none'}}>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Platform Ready
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              All systems configured. Start creating your first campaign!
            </p>
            <div className="flex justify-center gap-3">
              <Button asChild>
                <Link href="/copywriting">
                  Start Creating
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/settings">
                  Manage Settings
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
