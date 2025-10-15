"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Bell, Settings, Eye, Mail } from "lucide-react";
import { NotificationSettingsComponent } from "@/components/settings/notification-settings";
import { NotificationSettings, defaultNotificationSettings } from "@/types/notifications";
import { ConversionAlertEmail } from "@/components/email-templates/conversion-alert-email";
import { PerformanceDigestEmail } from "@/components/email-templates/performance-digest-email";
import { ThresholdAlertEmail } from "@/components/email-templates/threshold-alert-email";
import { toast } from "sonner";
import { renderToStaticMarkup } from "react-dom/server";

export default function NotificationsPage() {
  const [settings, setSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [previewType, setPreviewType] = useState<"conversion" | "digest" | "threshold">("conversion");

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem("notificationSettings");
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (error) {
        console.error("Failed to load notification settings:", error);
      }
    }
  }, []);

  const handleSaveSettings = async (newSettings: NotificationSettings) => {
    localStorage.setItem("notificationSettings", JSON.stringify(newSettings));
    setSettings(newSettings);
  };

  const handleTestEmail = () => {
    toast.success("Test email sent!", {
      description: `A sample ${previewType} notification has been sent to ${settings.email}`,
    });
  };

  // Sample data for email previews
  const sampleConversionData = {
    recipientName: "John Smith",
    campaignName: "Spring Hearing Aid Promotion",
    conversionType: "Appointment Booked",
    timestamp: new Date().toISOString(),
    campaignId: "sample-123",
  };

  const sampleDigestData = {
    period: "Daily Digest - Today",
    totalCampaigns: 3,
    totalRecipients: 150,
    totalConversions: 12,
    topCampaigns: [
      { name: "Spring Promotion", recipients: 75, visitors: 45, conversions: 8, conversionRate: 10.7 },
      { name: "Summer Sale", recipients: 50, visitors: 30, conversions: 3, conversionRate: 6.0 },
      { name: "New Product Launch", recipients: 25, visitors: 15, conversions: 1, conversionRate: 4.0 },
    ],
    insights: [
      "Your Spring Promotion is performing 78% above average - great work!",
      "Morning emails (9-11 AM) show 2x better engagement than afternoon sends",
      "Recipients who view the landing page multiple times are 4x more likely to convert",
    ],
  };

  const sampleThresholdData = {
    campaignName: "Summer Sale Campaign",
    campaignId: "sample-456",
    alertType: "low_conversion" as const,
    currentValue: 0.8,
    threshold: settings.lowConversionThreshold,
    recommendations: [
      "Review and update your campaign message to create more urgency",
      "Consider adding a time-limited offer or special discount",
      "Test a different call-to-action button text",
      "Check if the landing page loads quickly on mobile devices",
    ],
  };

  const getPreviewEmail = () => {
    switch (previewType) {
      case "conversion":
        return <ConversionAlertEmail {...sampleConversionData} />;
      case "digest":
        return <PerformanceDigestEmail {...sampleDigestData} />;
      case "threshold":
        return <ThresholdAlertEmail {...sampleThresholdData} />;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Notifications</h1>
        <p className="text-slate-600">
          Configure email notifications and preview what you'll receive
        </p>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-auto p-1">
          <TabsTrigger value="settings" className="gap-2 py-3">
            <Settings className="h-4 w-4" />
            <span className="font-medium">Settings</span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-2 py-3">
            <Eye className="h-4 w-4" />
            <span className="font-medium">Email Previews</span>
          </TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <NotificationSettingsComponent
            settings={settings}
            onSave={handleSaveSettings}
            onPreview={() => {
              const previewTab = document.querySelector('[value="preview"]') as HTMLElement;
              previewTab?.click();
            }}
          />
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Template Previews
              </CardTitle>
              <CardDescription>
                See what your notification emails will look like
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preview Type Selector */}
              <div className="flex gap-2">
                <Button
                  variant={previewType === "conversion" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreviewType("conversion")}
                  className="gap-2"
                  disabled={!settings.conversionAlerts}
                >
                  🎉 Conversion Alert
                </Button>
                <Button
                  variant={previewType === "digest" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreviewType("digest")}
                  className="gap-2"
                  disabled={!settings.performanceDigests}
                >
                  📊 Performance Digest
                </Button>
                <Button
                  variant={previewType === "threshold" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreviewType("threshold")}
                  className="gap-2"
                  disabled={!settings.thresholdAlerts}
                >
                  📉 Threshold Alert
                </Button>
              </div>

              {/* Test Email Button */}
              <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Bell className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    Test this notification
                  </p>
                  <p className="text-xs text-blue-700">
                    Send a sample email to {settings.email || "your email"}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleTestEmail}
                  disabled={!settings.email}
                  className="gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Send Test
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Email Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                This is how your {previewType === "conversion" ? "conversion alert" : previewType === "digest" ? "performance digest" : "threshold alert"} email will appear
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-slate-200 rounded-lg overflow-hidden">
                <div
                  className="bg-white"
                  style={{
                    maxHeight: "600px",
                    overflowY: "auto",
                  }}
                >
                  {getPreviewEmail()}
                </div>
              </div>

              {/* Preview Info */}
              <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-sm text-slate-700">
                  <strong>Note:</strong> This is a live preview with sample data. Actual emails
                  will contain real campaign information and be sent to{" "}
                  <span className="font-medium">{settings.email || "your configured email"}</span>.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
