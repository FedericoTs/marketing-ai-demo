import { NextResponse, NextRequest } from "next/server";
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from "@/lib/utils/api-response";

/**
 * GET /api/analytics/calls/analytics
 *
 * Real-time call analytics using ONLY Supabase elevenlabs_calls data
 *
 * Available fields:
 * - call_status, call_successful, appointment_booked
 * - call_duration_seconds, start_time, end_time
 * - sentiment, intent_detected, transcript, summary
 * - phone_number, campaign_id, recipient_id
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    // Get organization ID from authenticated user
    const supabaseAuth = await createClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        errorResponse('Unauthorized', 'AUTH_ERROR'),
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabaseAuth
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return NextResponse.json(
        errorResponse('Organization not found', 'ORG_ERROR'),
        { status: 404 }
      );
    }

    console.log('[Call Analytics] Fetching calls for org:', profile.organization_id);

    // Use service role client to bypass RLS (we manually filter by org_id for security)
    const supabase = createServiceClient();
    console.log('[Call Analytics] Using service role client with key:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...');

    // Build query for calls
    let callsQuery = supabase
      .from('elevenlabs_calls')
      .select('*')
      .eq('organization_id', profile.organization_id);

    if (startDate) {
      callsQuery = callsQuery.gte('start_time', startDate);
    }
    if (endDate) {
      callsQuery = callsQuery.lte('start_time', endDate);
    }

    const { data: calls, error: callsError } = await callsQuery;

    if (callsError) {
      console.error('[Call Analytics API] Error:', callsError);
      return NextResponse.json(
        errorResponse('Failed to fetch call analytics', 'FETCH_ERROR'),
        { status: 500 }
      );
    }

    console.log('[Call Analytics] Retrieved calls:', calls?.length || 0);

    // Calculate core metrics
    const totalCalls = calls?.length || 0;
    const successfulCalls = calls?.filter(c => c.call_successful)?.length || 0;
    const failedCalls = totalCalls - successfulCalls;
    const appointmentsBooked = calls?.filter(c => c.appointment_booked)?.length || 0;
    const totalDuration = calls?.reduce((sum, c) => sum + (c.call_duration_seconds || 0), 0) || 0;
    const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

    // Time-of-Day Performance (hourly breakdown)
    const hourlyPerformance: Record<number, { calls: number; successful: number; appointments: number }> = {};
    calls?.forEach(call => {
      if (!call.start_time) return;
      const hour = new Date(call.start_time).getHours();
      if (!hourlyPerformance[hour]) {
        hourlyPerformance[hour] = { calls: 0, successful: 0, appointments: 0 };
      }
      hourlyPerformance[hour].calls += 1;
      if (call.call_successful) {
        hourlyPerformance[hour].successful += 1;
      }
      if (call.appointment_booked) {
        hourlyPerformance[hour].appointments += 1;
      }
    });

    const hourlyData = Object.entries(hourlyPerformance).map(([hour, data]) => ({
      hour: parseInt(hour),
      label: `${hour.padStart(2, '0')}:00`,
      calls: data.calls,
      successful: data.successful,
      appointments: data.appointments,
      successRate: data.calls > 0 ? Number(((data.successful / data.calls) * 100).toFixed(1)) : 0,
      appointmentRate: data.calls > 0 ? Number(((data.appointments / data.calls) * 100).toFixed(1)) : 0,
    })).sort((a, b) => a.hour - b.hour);

    // Sentiment Analysis
    const sentimentBreakdown: Record<string, { count: number; successful: number; appointments: number }> = {};
    calls?.forEach(call => {
      const sentiment = call.sentiment || 'unknown';
      if (!sentimentBreakdown[sentiment]) {
        sentimentBreakdown[sentiment] = { count: 0, successful: 0, appointments: 0 };
      }
      sentimentBreakdown[sentiment].count += 1;
      if (call.call_successful) {
        sentimentBreakdown[sentiment].successful += 1;
      }
      if (call.appointment_booked) {
        sentimentBreakdown[sentiment].appointments += 1;
      }
    });

    const sentimentData = Object.entries(sentimentBreakdown).map(([sentiment, data]) => ({
      sentiment,
      count: data.count,
      successful: data.successful,
      appointments: data.appointments,
      successRate: data.count > 0 ? Number(((data.successful / data.count) * 100).toFixed(1)) : 0,
      appointmentRate: data.count > 0 ? Number(((data.appointments / data.count) * 100).toFixed(1)) : 0,
    }));

    // Intent Detection Patterns
    const intentBreakdown: Record<string, { count: number; successful: number; appointments: number }> = {};
    calls?.forEach(call => {
      const intent = call.intent_detected || 'unknown';
      if (!intentBreakdown[intent]) {
        intentBreakdown[intent] = { count: 0, successful: 0, appointments: 0 };
      }
      intentBreakdown[intent].count += 1;
      if (call.call_successful) {
        intentBreakdown[intent].successful += 1;
      }
      if (call.appointment_booked) {
        intentBreakdown[intent].appointments += 1;
      }
    });

    const intentData = Object.entries(intentBreakdown).map(([intent, data]) => ({
      intent,
      count: data.count,
      successful: data.successful,
      appointments: data.appointments,
      successRate: data.count > 0 ? Number(((data.successful / data.count) * 100).toFixed(1)) : 0,
      appointmentRate: data.count > 0 ? Number(((data.appointments / data.count) * 100).toFixed(1)) : 0,
    })).sort((a, b) => b.appointmentRate - a.appointmentRate);

    // Call Status Breakdown
    const statusBreakdown: Record<string, number> = {};
    calls?.forEach(call => {
      const status = call.call_status || 'unknown';
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    });

    const statusData = Object.entries(statusBreakdown).map(([status, count]) => ({
      status,
      count,
      percentage: totalCalls > 0 ? Number(((count / totalCalls) * 100).toFixed(1)) : 0,
    }));

    // Duration Performance (bucketed)
    const durationBuckets = [
      { label: '0-1 min', min: 0, max: 60 },
      { label: '1-3 min', min: 60, max: 180 },
      { label: '3-5 min', min: 180, max: 300 },
      { label: '5-10 min', min: 300, max: 600 },
      { label: '10+ min', min: 600, max: Infinity },
    ];

    const durationPerformance = durationBuckets.map(bucket => {
      const callsInBucket = calls?.filter(c => {
        const duration = c.call_duration_seconds || 0;
        return duration >= bucket.min && duration < bucket.max;
      }) || [];

      const successful = callsInBucket.filter(c => c.call_successful).length;
      const appointments = callsInBucket.filter(c => c.appointment_booked).length;

      return {
        label: bucket.label,
        calls: callsInBucket.length,
        successful,
        appointments,
        successRate: callsInBucket.length > 0 ? Number(((successful / callsInBucket.length) * 100).toFixed(1)) : 0,
        appointmentRate: callsInBucket.length > 0 ? Number(((appointments / callsInBucket.length) * 100).toFixed(1)) : 0,
      };
    });

    // Daily Call Velocity (last 30 days)
    const dailyVelocity: Record<string, { calls: number; successful: number; appointments: number }> = {};
    calls?.forEach(call => {
      if (!call.start_time) return;
      const date = new Date(call.start_time).toISOString().split('T')[0];
      if (!dailyVelocity[date]) {
        dailyVelocity[date] = { calls: 0, successful: 0, appointments: 0 };
      }
      dailyVelocity[date].calls += 1;
      if (call.call_successful) {
        dailyVelocity[date].successful += 1;
      }
      if (call.appointment_booked) {
        dailyVelocity[date].appointments += 1;
      }
    });

    const velocityData = Object.entries(dailyVelocity)
      .map(([date, data]) => ({
        date,
        calls: data.calls,
        successful: data.successful,
        appointments: data.appointments,
        successRate: data.calls > 0 ? Number(((data.successful / data.calls) * 100).toFixed(1)) : 0,
        appointmentRate: data.calls > 0 ? Number(((data.appointments / data.calls) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 days

    // Campaign Attribution
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id, name')
      .eq('organization_id', profile.organization_id);

    const campaignPerformance = campaigns?.map(campaign => {
      const campaignCalls = calls?.filter(c => c.campaign_id === campaign.id) || [];
      const successful = campaignCalls.filter(c => c.call_successful).length;
      const appointments = campaignCalls.filter(c => c.appointment_booked).length;
      const avgDuration = campaignCalls.length > 0
        ? Math.round(campaignCalls.reduce((sum, c) => sum + (c.call_duration_seconds || 0), 0) / campaignCalls.length)
        : 0;

      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        calls: campaignCalls.length,
        successful,
        appointments,
        successRate: campaignCalls.length > 0 ? Number(((successful / campaignCalls.length) * 100).toFixed(1)) : 0,
        appointmentRate: campaignCalls.length > 0 ? Number(((appointments / campaignCalls.length) * 100).toFixed(1)) : 0,
        avgDuration,
      };
    }).filter(c => c.calls > 0).sort((a, b) => b.appointments - a.appointments) || [];

    const analytics = {
      // Core Metrics
      totalCalls,
      successfulCalls,
      failedCalls,
      appointmentsBooked,
      successRate: totalCalls > 0 ? Number(((successfulCalls / totalCalls) * 100).toFixed(1)) : 0,
      appointmentRate: totalCalls > 0 ? Number(((appointmentsBooked / totalCalls) * 100).toFixed(1)) : 0,
      avgDuration,
      totalDuration,

      // Performance Breakdowns
      hourlyPerformance: hourlyData,
      sentimentAnalysis: sentimentData,
      intentPatterns: intentData,
      statusBreakdown: statusData,
      durationPerformance,
      dailyVelocity: velocityData,
      campaignAttribution: campaignPerformance.slice(0, 10), // Top 10 campaigns
    };

    console.log('[Call Analytics] Analytics calculated:', {
      totalCalls: analytics.totalCalls,
      successRate: analytics.successRate,
      appointmentRate: analytics.appointmentRate,
    });

    return NextResponse.json(
      successResponse(analytics, "Call analytics retrieved successfully")
    );
  } catch (error) {
    console.error("[Call Analytics API] Error:", error);
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to fetch call analytics",
        "FETCH_ERROR"
      ),
      { status: 500 }
    );
  }
}
