"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Target, Activity } from "lucide-react";
import { DashboardOverview } from "@/components/analytics/dashboard-overview";
import { CampaignList } from "@/components/analytics/campaign-list";
import { RecentActivityFeed } from "@/components/analytics/recent-activity-feed";

export default function AnalyticsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
        <p className="text-slate-600">
          Track campaign performance, engagement, and conversions in real-time
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3 h-auto p-1">
          <TabsTrigger value="overview" className="gap-2 py-3">
            <BarChart3 className="h-4 w-4" />
            <span className="font-medium">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-2 py-3">
            <Target className="h-4 w-4" />
            <span className="font-medium">Campaigns</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2 py-3">
            <Activity className="h-4 w-4" />
            <span className="font-medium">Activity</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <DashboardOverview />
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <CampaignList />
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <RecentActivityFeed />
        </TabsContent>
      </Tabs>
    </div>
  );
}
