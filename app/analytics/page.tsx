"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Target, TrendingUp, Phone, Loader2 } from "lucide-react";
import { DashboardOverview } from "@/components/analytics/dashboard-overview";
import { CampaignList } from "@/components/analytics/campaign-list";
import { ChartsView } from "@/components/analytics/charts-view";
import { CallsAnalytics } from "@/components/analytics/calls-analytics";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";

function AnalyticsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // TEMPORARILY DISABLED - ElevenLabs sync (SQLite dependency)
  // TODO: Migrate ElevenLabs call tracking to Supabase
  // useEffect(() => {
  //   const syncFromElevenLabs = async () => {
  //     try {
  //       const response = await fetch("/api/jobs/sync-elevenlabs-calls", {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({}),
  //       });

  //       if (!response.ok) {
  //         console.error('[Analytics] GLOBAL sync failed: HTTP', response.status);
  //         return;
  //       }

  //       const result = await response.json();

  //       if (!result.success) {
  //         console.error('[Analytics] GLOBAL sync failed:', result.error || 'Unknown error');
  //       }
  //     } catch (error) {
  //       console.error('[Analytics] GLOBAL sync error:', error instanceof Error ? error.message : 'Unknown error');
  //     }
  //   };

  //   // Initial sync on mount
  //   syncFromElevenLabs();

  //   // Auto-sync every 2 minutes
  //   const syncInterval = setInterval(() => {
  //     syncFromElevenLabs();
  //   }, 120000); // 2 minutes

  //   return () => clearInterval(syncInterval);
  // }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/analytics?tab=${value}`, { scroll: false });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Breadcrumbs />

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
        <p className="text-slate-600">
          Track campaign performance, engagement, and conversions in real-time
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full max-w-3xl grid-cols-4 h-auto p-1">
          <TabsTrigger value="overview" className="gap-2 py-3">
            <BarChart3 className="h-4 w-4" />
            <span className="font-medium">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-2 py-3">
            <Target className="h-4 w-4" />
            <span className="font-medium">Campaigns</span>
          </TabsTrigger>
          <TabsTrigger value="calls" className="gap-2 py-3">
            <Phone className="h-4 w-4" />
            <span className="font-medium">Calls</span>
          </TabsTrigger>
          <TabsTrigger value="charts" className="gap-2 py-3">
            <TrendingUp className="h-4 w-4" />
            <span className="font-medium">Charts</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <DashboardOverview />
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <CampaignList />
        </TabsContent>

        <TabsContent value="calls" className="space-y-6">
          <CallsAnalytics />
        </TabsContent>

        <TabsContent value="charts" className="space-y-6">
          <ChartsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm text-slate-600">Loading analytics...</p>
        </div>
      </div>
    }>
      <AnalyticsContent />
    </Suspense>
  );
}
