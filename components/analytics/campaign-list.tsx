"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Eye, TrendingUp, Calendar, Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Campaign {
  id: string;
  name: string;
  message: string;
  company_name: string;
  created_at: string;
  status: "active" | "paused" | "completed";
  totalRecipients: number;
  uniqueVisitors: number;
  totalConversions: number;
  conversionRate: number;
}

export function CampaignList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const response = await fetch("/api/analytics/campaigns");
      const result = await response.json();

      if (result.success) {
        setCampaigns(result.data);
      }
    } catch (error) {
      console.error("Failed to load campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400 mb-4" />
            <p className="text-slate-600">Loading campaigns...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Campaigns Yet</h3>
            <p className="text-slate-600 mb-6">
              Create your first direct mail campaign to start tracking analytics.
            </p>
            <Link href="/dm-creative">
              <Button>Create Campaign</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "paused":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "completed":
        return "bg-slate-100 text-slate-800 border-slate-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <div className="space-y-4">
      {campaigns.map((campaign) => (
        <Card key={campaign.id} className="border-slate-200 hover:border-slate-300 transition-colors">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle className="text-xl">{campaign.name}</CardTitle>
                  <span
                    className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                      campaign.status
                    )}`}
                  >
                    {campaign.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </span>
                  <span>•</span>
                  <span className="font-medium">{campaign.company_name}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {/* Recipients */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{campaign.totalRecipients}</p>
                  <p className="text-xs text-slate-600">Recipients</p>
                </div>
              </div>

              {/* Visitors */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Eye className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{campaign.uniqueVisitors}</p>
                  <p className="text-xs text-slate-600">Visitors</p>
                </div>
              </div>

              {/* Conversions */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{campaign.totalConversions}</p>
                  <p className="text-xs text-slate-600">Conversions</p>
                </div>
              </div>

              {/* Conversion Rate */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-2xl font-bold text-green-600">{campaign.conversionRate}%</p>
                  <p className="text-xs text-slate-600">Conversion Rate</p>
                  <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${Math.min(campaign.conversionRate, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Campaign Message Preview */}
            <div className="pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-600 line-clamp-2">{campaign.message}</p>
            </div>

            {/* View Details Button */}
            <div className="pt-4">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  // TODO: Navigate to campaign detail page
                  alert(`Campaign detail view coming soon for: ${campaign.name}`);
                }}
              >
                View Details
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
