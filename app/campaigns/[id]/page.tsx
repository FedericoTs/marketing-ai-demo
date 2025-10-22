"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Users,
  Eye,
  TrendingUp,
  Calendar,
  Loader2,
  CheckCircle2,
  XCircle,
  Target,
  Mail,
  Clock,
  Download,
  FileText,
  Phone,
  Globe
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Recipient {
  id: string;
  name: string;
  lastname: string;
  email?: string;
  phone?: string;
  tracking_id: string;
  created_at: string;
  pageViews: number;
  hasConverted: boolean;
  eventsCount: number;
  conversionsCount: number;
}

interface Call {
  id: string;
  conversation_id: string;
  agent_id?: string;
  caller_phone_number?: string;
  call_started_at: string;
  call_ended_at?: string;
  call_duration_seconds?: number;
  call_status: 'success' | 'failure' | 'unknown';
  is_conversion: boolean;
  created_at: string;
}

interface CampaignDetail {
  campaign: {
    id: string;
    name: string;
    message: string;
    company_name: string;
    created_at: string;
    status: "active" | "paused" | "completed";
  };
  totalRecipients: number;
  totalPageViews: number;
  uniqueVisitors: number;
  totalConversions: number;
  conversionRate: number;
  recipients: Recipient[];
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [data, setData] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [callsLoading, setCallsLoading] = useState(false);

  useEffect(() => {
    loadCampaignDetail();
    loadCalls();
  }, [campaignId]);

  const loadCampaignDetail = async () => {
    try {
      const response = await fetch(`/api/analytics/campaigns/${campaignId}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || "Failed to load campaign");
      }
    } catch (err) {
      console.error("Error loading campaign:", err);
      setError("Failed to load campaign details");
    } finally {
      setLoading(false);
    }
  };

  const loadCalls = async () => {
    setCallsLoading(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/calls`);
      const result = await response.json();

      if (result.success) {
        setCalls(result.data.calls || []);
      }
    } catch (err) {
      console.error("Error loading calls:", err);
      // Silently fail - calls are optional
    } finally {
      setCallsLoading(false);
    }
  };

  const handleExport = async (format: "csv" | "pdf") => {
    setExporting(format);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/export?format=${format}`);

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `campaign_export.${format}`;

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Campaign exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Error exporting campaign:", error);
      toast.error("Failed to export campaign");
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400 mb-4" />
          <p className="text-slate-600">Loading campaign details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                {error || "Campaign Not Found"}
              </h3>
              <Link href="/analytics?tab=campaigns">
                <Button variant="outline" className="mt-4">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Campaigns
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { campaign } = data;

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const responseRate = data.totalRecipients > 0
    ? ((data.uniqueVisitors / data.totalRecipients) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header with Back Button */}
      <div className="mb-6">
        <Link href="/analytics?tab=campaigns">
          <Button variant="ghost" size="sm" className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Campaigns
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-900">{campaign.name}</h1>
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(
                  campaign.status
                )}`}
              >
                {campaign.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Created {formatDate(campaign.created_at)}
              </span>
              <span>•</span>
              <span className="font-medium">{campaign.company_name}</span>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("csv")}
              disabled={exporting !== null}
              className="gap-2"
            >
              {exporting === "csv" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("pdf")}
              disabled={exporting !== null}
              className="gap-2"
            >
              {exporting === "pdf" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Recipients</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{data.totalRecipients}</p>
              </div>
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Visitors</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{data.uniqueVisitors}</p>
              </div>
              <Eye className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Page Views</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{data.totalPageViews}</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Conversions</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{data.totalConversions}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div>
              <p className="text-sm font-medium text-green-900">Conversion Rate</p>
              <p className="text-3xl font-bold text-green-900 mt-1">{data.conversionRate}%</p>
              <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${Math.min(data.conversionRate, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Message */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Campaign Message</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700 leading-relaxed">{campaign.message}</p>
        </CardContent>
      </Card>

      {/* Landing Page Preview */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Landing Page Preview
            </CardTitle>
            <Link href={`/lp/campaign/${campaignId}/preview`} target="_blank">
              <Button variant="outline" size="sm" className="gap-2">
                Open Full Page
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden bg-slate-50">
            <iframe
              src={`/lp/campaign/${campaignId}/preview`}
              className="w-full h-[600px]"
              title="Landing Page Preview"
            />
          </div>
          <p className="text-sm text-slate-600 mt-3">
            This is the landing page that recipients see when they scan the QR code from your direct mail pieces.
          </p>
        </CardContent>
      </Card>

      {/* Calls Received */}
      {calls.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-purple-600" />
              Calls Received ({calls.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {callsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">Loading calls...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Date & Time</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Phone Number</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-900">Duration</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-900">Status</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-900">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calls.map((call) => {
                      const callDate = new Date(call.call_started_at);
                      const duration = call.call_duration_seconds || 0;
                      const minutes = Math.floor(duration / 60);
                      const seconds = duration % 60;

                      return (
                        <tr key={call.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-slate-900">
                                {callDate.toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </p>
                              <p className="text-xs text-slate-500">
                                {callDate.toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-700 font-mono text-sm">
                                {call.caller_phone_number || 'Unknown'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Clock className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-700 font-medium">
                                {minutes}:{seconds.toString().padStart(2, '0')}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {call.call_status === 'success' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                <CheckCircle2 className="h-3 w-3" />
                                Success
                              </span>
                            ) : call.call_status === 'failure' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                <XCircle className="h-3 w-3" />
                                Failed
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                                Unknown
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {call.is_conversion ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                <TrendingUp className="h-3 w-3" />
                                Conversion
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recipients Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recipients ({data.recipients.length})
            </CardTitle>
            <div className="text-sm text-slate-600">
              Response Rate: <span className="font-semibold text-slate-900">{responseRate}%</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.recipients.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No recipients yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Contact</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-900">Page Views</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-900">Events</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-900">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recipients.map((recipient) => (
                    <tr key={recipient.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-slate-900">
                            {recipient.name} {recipient.lastname}
                          </p>
                          <p className="text-xs text-slate-500">{recipient.tracking_id}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-slate-600">
                          {recipient.email && <p>{recipient.email}</p>}
                          {recipient.phone && <p>{recipient.phone}</p>}
                          {!recipient.email && !recipient.phone && (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-900">
                          <Eye className="h-3.5 w-3.5 text-slate-500" />
                          {recipient.pageViews}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-sm text-slate-600">{recipient.eventsCount}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {recipient.hasConverted ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                            <CheckCircle2 className="h-3 w-3" />
                            Converted
                          </span>
                        ) : recipient.pageViews > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            <Eye className="h-3 w-3" />
                            Engaged
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-slate-600">
                          {new Date(recipient.created_at).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
