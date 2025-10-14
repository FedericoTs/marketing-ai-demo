"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Eye,
  QrCode,
  MousePointerClick,
  FileText,
  ExternalLink,
  CheckCircle,
  Phone,
  Download,
  Calendar,
  Loader2,
  Activity as ActivityIcon
} from "lucide-react";

interface RecentActivity {
  id: string;
  type: "event" | "conversion";
  trackingId: string;
  recipientName: string;
  eventType?: string;
  conversionType?: string;
  campaignName: string;
  createdAt: string;
}

export function RecentActivityFeed() {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();

    // Refresh every 30 seconds
    const interval = setInterval(loadActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadActivities = async () => {
    try {
      const response = await fetch("/api/analytics/recent-activity?limit=50");
      const result = await response.json();

      if (result.success) {
        setActivities(result.data);
      }
    } catch (error) {
      console.error("Failed to load recent activity:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (activity: RecentActivity) => {
    if (activity.type === "event") {
      switch (activity.eventType) {
        case "page_view":
          return <Eye className="h-5 w-5 text-purple-600" />;
        case "qr_scan":
          return <QrCode className="h-5 w-5 text-blue-600" />;
        case "button_click":
          return <MousePointerClick className="h-5 w-5 text-green-600" />;
        case "form_view":
          return <FileText className="h-5 w-5 text-indigo-600" />;
        case "external_link":
          return <ExternalLink className="h-5 w-5 text-slate-600" />;
        default:
          return <ActivityIcon className="h-5 w-5 text-slate-600" />;
      }
    } else {
      // Conversion
      switch (activity.conversionType) {
        case "form_submission":
          return <CheckCircle className="h-5 w-5 text-green-600" />;
        case "appointment_booked":
          return <Calendar className="h-5 w-5 text-orange-600" />;
        case "call_initiated":
          return <Phone className="h-5 w-5 text-blue-600" />;
        case "download":
          return <Download className="h-5 w-5 text-purple-600" />;
        default:
          return <CheckCircle className="h-5 w-5 text-green-600" />;
      }
    }
  };

  const getActivityColor = (activity: RecentActivity) => {
    if (activity.type === "conversion") {
      return "bg-orange-50 border-orange-200";
    }
    return "bg-slate-50 border-slate-200";
  };

  const getActivityLabel = (activity: RecentActivity) => {
    if (activity.type === "event") {
      switch (activity.eventType) {
        case "page_view":
          return "Viewed landing page";
        case "qr_scan":
          return "Scanned QR code";
        case "button_click":
          return "Clicked button";
        case "form_view":
          return "Viewed form";
        case "external_link":
          return "Clicked external link";
        default:
          return "Activity";
      }
    } else {
      switch (activity.conversionType) {
        case "form_submission":
          return "Submitted form";
        case "appointment_booked":
          return "Booked appointment";
        case "call_initiated":
          return "Initiated call";
        case "download":
          return "Downloaded content";
        default:
          return "Converted";
      }
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400 mb-4" />
            <p className="text-slate-600">Loading activity...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ActivityIcon className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <ActivityIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No activity yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Activity will appear here as recipients interact with your campaigns
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ActivityIcon className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <span className="text-xs text-slate-500">Updates every 30 seconds</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className={`flex items-start gap-4 p-4 rounded-lg border ${getActivityColor(activity)}`}
            >
              <div className="p-2 bg-white rounded-lg">
                {getActivityIcon(activity)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">
                  {activity.recipientName}
                </p>
                <p className="text-sm text-slate-600 mt-0.5">
                  {getActivityLabel(activity)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">{activity.campaignName}</span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500">{formatTimeAgo(activity.createdAt)}</span>
                </div>
              </div>
              {activity.type === "conversion" && (
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                    Conversion
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
