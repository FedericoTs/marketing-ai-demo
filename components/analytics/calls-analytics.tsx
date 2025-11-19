"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Phone, TrendingUp, Clock, Target, ThumbsUp, MessageSquare, Calendar, BarChart3, Loader2, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from "recharts";

interface CallAnalytics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  appointmentsBooked: number;
  successRate: number;
  appointmentRate: number;
  avgDuration: number;
  totalDuration: number;
  hourlyPerformance: Array<{
    hour: number;
    label: string;
    calls: number;
    successful: number;
    appointments: number;
    successRate: number;
    appointmentRate: number;
  }>;
  sentimentAnalysis: Array<{
    sentiment: string;
    count: number;
    successful: number;
    appointments: number;
    successRate: number;
    appointmentRate: number;
  }>;
  intentPatterns: Array<{
    intent: string;
    count: number;
    successful: number;
    appointments: number;
    successRate: number;
    appointmentRate: number;
  }>;
  statusBreakdown: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  durationPerformance: Array<{
    label: string;
    calls: number;
    successful: number;
    appointments: number;
    successRate: number;
    appointmentRate: number;
  }>;
  dailyVelocity: Array<{
    date: string;
    calls: number;
    successful: number;
    appointments: number;
    successRate: number;
    appointmentRate: number;
  }>;
  campaignAttribution: Array<{
    campaignId: string;
    campaignName: string;
    calls: number;
    successful: number;
    appointments: number;
    successRate: number;
    appointmentRate: number;
    avgDuration: number;
  }>;
}

interface RecentCall {
  id: string;
  phone_number: string;
  call_status: string;
  call_duration_seconds: number;
  start_time: string;
  call_successful: boolean;
  appointment_booked: boolean;
  sentiment: string;
  intent_detected: string;
  summary: string;
  transcript: string;
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#10b981',
  neutral: '#6b7280',
  negative: '#ef4444',
  unknown: '#9ca3af',
};

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
};

export function CallsAnalytics() {
  const [analytics, setAnalytics] = useState<CallAnalytics | null>(null);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCall, setExpandedCall] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, recentRes] = await Promise.all([
        fetch('/api/analytics/calls/analytics'),
        fetch('/api/analytics/calls/recent'),
      ]);

      const analyticsResult = await analyticsRes.json();
      const recentResult = await recentRes.json();

      if (analyticsResult.success) {
        setAnalytics(analyticsResult.data);
      } else {
        console.error('Analytics API error:', analyticsResult.error);
      }

      if (recentResult.success) {
        setRecentCalls(recentResult.data);
      } else {
        console.error('Recent calls API error:', recentResult.error);
      }
    } catch (error) {
      console.error('Failed to load call analytics:', error);
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
            <p className="text-slate-600">Loading call analytics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <AlertCircle className="h-12 w-12 text-slate-400 mb-4" />
            <p className="text-slate-600 font-medium">No call data available</p>
            <p className="text-sm text-slate-500 mt-1">Start receiving calls to see analytics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Core Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Calls */}
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-900">Total Calls</p>
                <p className="text-4xl font-bold text-purple-900 mt-2">{analytics.totalCalls}</p>
                <p className="text-xs text-purple-700 mt-1">
                  {analytics.totalDuration > 0 && `${formatDuration(analytics.totalDuration)} total`}
                </p>
              </div>
              <Phone className="h-12 w-12 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        {/* Successful Calls */}
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Successful Calls</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{analytics.successfulCalls}</p>
                <p className="text-xs text-green-600 mt-1 font-medium">
                  {analytics.successRate}% success rate
                </p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        {/* Appointments Booked */}
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-900">Appointments</p>
                <p className="text-3xl font-bold text-orange-900 mt-2">{analytics.appointmentsBooked}</p>
                <p className="text-xs text-orange-700 mt-1 font-semibold">
                  {analytics.appointmentRate}% conversion
                </p>
              </div>
              <Calendar className="h-10 w-10 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        {/* Avg Duration */}
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Avg Duration</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{formatDuration(analytics.avgDuration)}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Per call average
                </p>
              </div>
              <Clock className="h-10 w-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Hourly Performance & Sentiment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Peak Performance Hours
            </CardTitle>
            <CardDescription>
              Best times for successful calls and appointments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.hourlyPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.hourlyPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="calls" fill="#8b5cf6" name="Total Calls" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="successful" fill="#10b981" name="Successful" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="appointments" fill="#f59e0b" name="Appointments" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-400">
                No hourly data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sentiment Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ThumbsUp className="h-5 w-5 text-green-600" />
              Sentiment Analysis
            </CardTitle>
            <CardDescription>
              Customer sentiment and appointment correlation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.sentimentAnalysis.length > 0 ? (
              <div className="space-y-4">
                {analytics.sentimentAnalysis.map((item) => (
                  <div key={item.sentiment} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-28">
                        <p className="text-sm font-medium text-slate-900 capitalize">{item.sentiment}</p>
                        <p className="text-xs text-slate-500">{item.count} calls</p>
                      </div>
                      <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                        <div
                          className="h-full flex items-center justify-end px-2 text-xs font-semibold text-white transition-all"
                          style={{
                            width: `${Math.max(item.appointmentRate, 5)}%`,
                            backgroundColor: SENTIMENT_COLORS[item.sentiment] || '#9ca3af',
                          }}
                        >
                          {item.appointmentRate > 0 && `${item.appointmentRate}%`}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-sm font-bold text-slate-900">{item.appointments}</p>
                      <p className="text-xs text-slate-500">appts</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">
                No sentiment data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Duration Performance & Intent Patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Duration Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Call Duration Performance
            </CardTitle>
            <CardDescription>
              Success rate by call length
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.durationPerformance.some(d => d.calls > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.durationPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="calls" fill="#64748b" name="Total Calls" radius={[0, 8, 8, 0]} />
                  <Bar dataKey="successful" fill="#10b981" name="Successful" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-400">
                No duration data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Intent Patterns */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-purple-600" />
              Top Customer Intents
            </CardTitle>
            <CardDescription>
              Most common call purposes and success rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.intentPatterns.length > 0 ? (
              <div className="space-y-3">
                {analytics.intentPatterns.slice(0, 5).map((item, index) => (
                  <div key={item.intent} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-purple-300 transition-colors">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-purple-600">#{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate capitalize">{item.intent}</p>
                      <p className="text-xs text-slate-500">{item.count} calls • {item.successful} successful</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-purple-600">{item.appointmentRate}%</p>
                      <p className="text-xs text-slate-600">{item.appointments} appts</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">
                No intent data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Velocity Trend */}
      {analytics.dailyVelocity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Call Velocity Trend (Last 30 Days)
            </CardTitle>
            <CardDescription>
              Daily call volume and success rate over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.dailyVelocity}>
                <defs>
                  <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSuccessful" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="calls" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorCalls)" name="Total Calls" />
                <Area type="monotone" dataKey="successful" stroke="#10b981" fillOpacity={1} fill="url(#colorSuccessful)" name="Successful" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Campaign Attribution */}
      {analytics.campaignAttribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-600" />
              Campaign Performance
            </CardTitle>
            <CardDescription>
              Call performance by campaign
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left text-xs font-semibold text-slate-600 py-3 px-2">Campaign</th>
                    <th className="text-right text-xs font-semibold text-slate-600 py-3 px-2">Calls</th>
                    <th className="text-right text-xs font-semibold text-slate-600 py-3 px-2">Successful</th>
                    <th className="text-right text-xs font-semibold text-slate-600 py-3 px-2">Appointments</th>
                    <th className="text-right text-xs font-semibold text-slate-600 py-3 px-2">Appt. Rate</th>
                    <th className="text-right text-xs font-semibold text-slate-600 py-3 px-2">Avg Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.campaignAttribution.map((campaign) => (
                    <tr key={campaign.campaignId} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-2">
                        <p className="text-sm font-medium text-slate-900">{campaign.campaignName}</p>
                      </td>
                      <td className="text-right py-3 px-2">
                        <span className="text-sm text-slate-900">{campaign.calls}</span>
                      </td>
                      <td className="text-right py-3 px-2">
                        <span className="text-sm font-medium text-green-600">{campaign.successful}</span>
                      </td>
                      <td className="text-right py-3 px-2">
                        <span className="text-sm font-bold text-orange-600">{campaign.appointments}</span>
                      </td>
                      <td className="text-right py-3 px-2">
                        <span className="text-sm font-semibold text-blue-600">{campaign.appointmentRate}%</span>
                      </td>
                      <td className="text-right py-3 px-2">
                        <span className="text-sm text-slate-600">{formatDuration(campaign.avgDuration)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Calls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-purple-600" />
            Recent Calls
          </CardTitle>
          <CardDescription>
            Latest call activity with details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentCalls.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No calls yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCalls.map((call) => (
                <div key={call.id} className="border border-slate-200 rounded-lg overflow-hidden hover:border-purple-300 transition-colors">
                  <div
                    className="p-4 cursor-pointer bg-white hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedCall(expandedCall === call.id ? null : call.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          call.appointment_booked ? 'bg-orange-100' :
                          call.call_successful ? 'bg-green-100' : 'bg-slate-100'
                        }`}>
                          <Phone className={`h-5 w-5 ${
                            call.appointment_booked ? 'text-orange-600' :
                            call.call_successful ? 'text-green-600' : 'text-slate-400'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">{call.phone_number || 'Unknown'}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(call.start_time).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })} • {formatDuration(call.call_duration_seconds || 0)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {call.sentiment && (
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              call.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                              call.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {call.sentiment}
                            </span>
                          )}
                          {call.appointment_booked && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">
                              Booked
                            </span>
                          )}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            call.call_successful ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {call.call_status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {expandedCall === call.id && (
                    <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
                      {call.intent_detected && (
                        <div>
                          <p className="text-xs font-semibold text-slate-600 mb-1">Intent Detected</p>
                          <p className="text-sm text-slate-900 capitalize">{call.intent_detected}</p>
                        </div>
                      )}
                      {call.summary && (
                        <div>
                          <p className="text-xs font-semibold text-slate-600 mb-1">Summary</p>
                          <p className="text-sm text-slate-700">{call.summary}</p>
                        </div>
                      )}
                      {call.transcript && (
                        <div>
                          <p className="text-xs font-semibold text-slate-600 mb-1">Transcript</p>
                          <div className="text-sm text-slate-700 bg-white p-3 rounded border border-slate-200 max-h-60 overflow-y-auto">
                            {call.transcript}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
