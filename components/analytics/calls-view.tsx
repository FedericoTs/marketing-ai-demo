"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, CheckCircle2, XCircle, Clock, TrendingUp, Loader2, Users, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
// Import standardized KPI utilities for consistent calculations
import { calculateConversionRate, formatPercentage, formatDuration } from "@/lib/utils/kpi-calculator";

interface CallMetrics {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  unknown_calls: number;
  conversions: number;
  conversion_rate: number;
  average_duration: number;
  calls_today: number;
  calls_this_week: number;
  calls_this_month: number;
}

interface Call {
  id: string;
  conversation_id: string;
  agent_id?: string;
  caller_phone_number?: string;
  call_started_at: string;
  call_ended_at?: string;
  call_duration_seconds?: number;
  call_status: string;
  is_conversion: boolean;
  campaign_id?: string;
}

// Format phone number for display
const formatPhoneNumber = (phone?: string | null) => {
  if (!phone) return "Unknown";

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Format based on length
  if (cleaned.length === 10) {
    // US format: (123) 456-7890
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned[0] === '1') {
    // US with country code: +1 (123) 456-7890
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length > 10) {
    // International: show with country code
    return `+${cleaned}`;
  } else {
    // Just return as-is if doesn't match common patterns
    return phone;
  }
};

export function CallsView() {
  const [metrics, setMetrics] = useState<CallMetrics | null>(null);
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const callsPerPage = 10;

  const loadData = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const [metricsRes, callsRes] = await Promise.all([
        fetch("/api/analytics/calls/metrics"),
        fetch("/api/analytics/calls/recent"),
      ]);

      const [metricsData, callsData] = await Promise.all([
        metricsRes.json(),
        callsRes.json(),
      ]);

      if (metricsData.success) {
        // Debug logs - uncomment if needed for troubleshooting
        // console.log('[CallsView] ===== METRICS DEBUG =====');
        // console.log('[CallsView] Full metrics object:', metricsData.data);
        // console.log('[CallsView] Average duration RAW:', metricsData.data.average_duration);
        // console.log('[CallsView] Average duration TYPE:', typeof metricsData.data.average_duration);
        // console.log('[CallsView] Average duration Number():', Number(metricsData.data.average_duration));
        // console.log('[CallsView] Average duration Math.round():', Math.round(Number(metricsData.data.average_duration)));
        // const testFormatted = formatDuration(metricsData.data.average_duration);
        // console.log('[CallsView] formatDuration() result:', testFormatted);
        // console.log('[CallsView] ===== END DEBUG =====');

        setMetrics(metricsData.data);
      }

      if (callsData.success) {
        // Debug logs - uncomment if needed for troubleshooting
        // console.log('[CallsView] Recent calls data:', callsData.data);
        // console.log('[CallsView] First call sample:', callsData.data[0]);
        setRecentCalls(callsData.data);
      }
    } catch (error) {
      console.error("Failed to load calls data:", error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Initial load
    loadData();

    // Auto-refresh data from database every 30 seconds
    const refreshInterval = setInterval(() => {
      loadData(false);
    }, 30000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  const handleSyncCalls = async (isManual = true) => {
    setSyncing(true);

    try {
      const response = await fetch("/api/jobs/sync-elevenlabs-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const result = await response.json();

      if (result.success) {
        const newCallsCount = result.data?.newCalls || 0;

        // Only show toast for manual sync
        if (isManual) {
          toast.success(`Synced ${newCallsCount} new calls from ElevenLabs`);
        }

        // Update last sync time
        setLastSyncTime(new Date());

        // Reload data after sync
        await loadData(false);
      } else {
        if (isManual) {
          toast.error("Failed to sync calls: " + (result.error || "Unknown error"));
        }
      }
    } catch (error) {
      console.error("Error syncing calls:", error);
      if (isManual) {
        toast.error("Failed to sync calls");
      }
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400 mb-4" />
            <p className="text-slate-600">Loading call analytics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-slate-600">Failed to load call metrics</p>
        </CardContent>
      </Card>
    );
  }

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Sync Button */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Call Analytics</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-slate-600">
              Auto-refresh: every 30s
            </p>
            {lastSyncTime && (
              <>
                <span className="text-slate-400">•</span>
                <p className="text-sm text-blue-600 font-medium">
                  Last manual sync: {lastSyncTime.toLocaleTimeString()}
                </p>
              </>
            )}
          </div>
        </div>
        <Button
          onClick={() => handleSyncCalls(true)}
          disabled={syncing}
          className="gap-2"
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Now'}
        </Button>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Calls */}
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-900">Total Calls</p>
                <p className="text-3xl font-bold text-purple-900 mt-2">
                  {metrics.total_calls}
                </p>
                <p className="text-xs text-purple-700 mt-1">
                  {metrics.calls_today} today • {metrics.calls_this_week} this week
                </p>
              </div>
              <Phone className="h-10 w-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        {/* Successful Calls */}
        <Card className="border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Successful Calls</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {metrics.successful_calls}
                </p>
                <p className="text-xs text-green-600 mt-1 font-medium">
                  {formatPercentage(calculateConversionRate(metrics.successful_calls, metrics.total_calls), 1)} success rate
                </p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        {/* Appointments Booked */}
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-900">Appointments</p>
                <p className="text-3xl font-bold text-orange-900 mt-2">
                  {metrics.conversions}
                </p>
                <p className="text-xs text-orange-700 mt-1 font-semibold">
                  {metrics.conversion_rate}% conversion rate
                </p>
                <p className="text-[10px] text-orange-600 mt-0.5">
                  = Appointments ÷ Total Calls
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        {/* Average Duration */}
        <Card className="border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Avg Duration</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {formatDuration(metrics.average_duration)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Per call conversation
                </p>
              </div>
              <Clock className="h-10 w-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call Conversion Info */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-1">
                Call Conversion Tracking
              </h4>
              <p className="text-xs text-blue-700">
                Conversion rate shows the percentage of calls that resulted in an <strong>appointment booking</strong>.
                Calls are automatically linked to appointments via phone number matching.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Calls Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-purple-600" />
            Recent Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentCalls.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No calls recorded yet</p>
              <p className="text-sm text-slate-500 mt-1">
                Calls will appear here once the ElevenLabs call sync runs
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase">
                      Date & Time
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase">
                      Caller
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase">
                      Duration
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase">
                      Appointment
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentCalls
                    .slice((currentPage - 1) * callsPerPage, currentPage * callsPerPage)
                    .map((call) => (
                    <tr
                      key={call.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm text-slate-900">
                        {formatDateTime(call.call_started_at)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700 font-mono">
                        {formatPhoneNumber(call.caller_phone_number)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700">
                        {formatDuration(call.call_duration_seconds)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            call.call_status === "success"
                              ? "bg-green-100 text-green-700"
                              : call.call_status === "failure"
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {call.call_status === "success" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : call.call_status === "failure" ? (
                            <XCircle className="h-3 w-3" />
                          ) : null}
                          {call.call_status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {call.is_conversion ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Booked
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {recentCalls.length > callsPerPage && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
                  <div className="text-sm text-slate-600">
                    Showing {((currentPage - 1) * callsPerPage) + 1} to {Math.min(currentPage * callsPerPage, recentCalls.length)} of {recentCalls.length} calls
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="text-sm text-slate-600">
                      Page {currentPage} of {Math.ceil(recentCalls.length / callsPerPage)}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(recentCalls.length / callsPerPage), prev + 1))}
                      disabled={currentPage >= Math.ceil(recentCalls.length / callsPerPage)}
                      className="gap-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
