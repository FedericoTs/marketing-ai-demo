/**
 * Analytics Supabase Queries
 * Phase 5.7 - Advanced DM Analytics & Investment Tracking
 *
 * Comprehensive analytics queries for:
 * - Investment tracking & financial metrics
 * - Geographic performance analysis
 * - Temporal patterns
 * - Comparative analytics
 */

import { createServiceClient } from '@/lib/supabase/server';

// ============================================================================
// INVESTMENT TRACKING & FINANCIAL METRICS
// ============================================================================

export interface FinancialOverview {
  totalInvestment: number;
  totalCampaigns: number;
  averageCostPerCampaign: number;
  totalRecipients: number;
  averageCostPerPiece: number;
  totalScans: number;
  averageCostPerScan: number;
  totalConversions: number;
  averageCostPerConversion: number;
  campaignsWithBudget: number;
  totalBudgetAllocated: number;
  budgetUtilization: number;
}

export async function getFinancialOverview(
  organizationId: string
): Promise<FinancialOverview> {
  const supabase = createServiceClient();

  // Get campaign financial data
  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('id, cost_total, budget, total_recipients')
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error fetching financial data:', error);
    return getEmptyFinancialOverview();
  }

  const totalInvestment = campaigns.reduce((sum, c) => sum + (c.cost_total || 0), 0);
  const totalRecipients = campaigns.reduce((sum, c) => sum + (c.total_recipients || 0), 0);
  const campaignsWithBudget = campaigns.filter(c => c.budget && c.budget > 0).length;
  const totalBudgetAllocated = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);

  // Get total scans across all campaigns
  const { count: totalScans } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .in('campaign_id', campaigns.map(c => c.id))
    .eq('event_type', 'qr_scan');

  // Get total conversions
  const { count: totalConversions } = await supabase
    .from('conversions')
    .select('*', { count: 'exact', head: true })
    .in('campaign_id', campaigns.map(c => c.id));

  return {
    totalInvestment,
    totalCampaigns: campaigns.length,
    averageCostPerCampaign: campaigns.length > 0 ? totalInvestment / campaigns.length : 0,
    totalRecipients,
    averageCostPerPiece: totalRecipients > 0 ? totalInvestment / totalRecipients : 0,
    totalScans: totalScans || 0,
    averageCostPerScan: (totalScans || 0) > 0 ? totalInvestment / (totalScans || 1) : 0,
    totalConversions: totalConversions || 0,
    averageCostPerConversion: (totalConversions || 0) > 0 ? totalInvestment / (totalConversions || 1) : 0,
    campaignsWithBudget,
    totalBudgetAllocated,
    budgetUtilization: totalBudgetAllocated > 0 ? (totalInvestment / totalBudgetAllocated) * 100 : 0,
  };
}

function getEmptyFinancialOverview(): FinancialOverview {
  return {
    totalInvestment: 0,
    totalCampaigns: 0,
    averageCostPerCampaign: 0,
    totalRecipients: 0,
    averageCostPerPiece: 0,
    totalScans: 0,
    averageCostPerScan: 0,
    totalConversions: 0,
    averageCostPerConversion: 0,
    campaignsWithBudget: 0,
    totalBudgetAllocated: 0,
    budgetUtilization: 0,
  };
}

export interface CampaignCostMetrics {
  campaignId: string;
  campaignName: string;
  costTotal: number;
  costDesign: number;
  costPrint: number;
  costPostage: number;
  costDataAxle: number;
  budget: number | null;
  budgetRemaining: number | null;
  budgetUtilization: number | null;
  totalRecipients: number;
  costPerPiece: number;
  scans: number;
  costPerScan: number | null;
  conversions: number;
  costPerConversion: number | null;
}

export async function getCampaignCostMetrics(
  campaignId: string
): Promise<CampaignCostMetrics | null> {
  const supabase = createServiceClient();

  // Get campaign financial data
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('id, name, cost_design, cost_print, cost_postage, cost_data_axle, cost_total, budget, total_recipients')
    .eq('id', campaignId)
    .single();

  if (error || !campaign) {
    console.error('Error fetching campaign cost metrics:', error);
    return null;
  }

  // Get scan count
  const { count: scans } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('event_type', 'qr_scan');

  // Get conversion count
  const { count: conversions } = await supabase
    .from('conversions')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId);

  const costTotal = campaign.cost_total || 0;
  const totalRecipients = campaign.total_recipients || 0;
  const scanCount = scans || 0;
  const conversionCount = conversions || 0;
  const budget = campaign.budget;

  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    costTotal,
    costDesign: campaign.cost_design || 0,
    costPrint: campaign.cost_print || 0,
    costPostage: campaign.cost_postage || 0,
    costDataAxle: campaign.cost_data_axle || 0,
    budget,
    budgetRemaining: budget ? budget - costTotal : null,
    budgetUtilization: budget && budget > 0 ? (costTotal / budget) * 100 : null,
    totalRecipients,
    costPerPiece: totalRecipients > 0 ? costTotal / totalRecipients : 0,
    scans: scanCount,
    costPerScan: scanCount > 0 ? costTotal / scanCount : null,
    conversions: conversionCount,
    costPerConversion: conversionCount > 0 ? costTotal / conversionCount : null,
  };
}

// ============================================================================
// GEOGRAPHIC ANALYTICS
// ============================================================================

export interface GeographicPerformance {
  state: string;
  recipientCount: number;
  scans: number;
  conversions: number;
  scanRate: number;
  conversionRate: number;
}

export async function getGeographicPerformance(
  organizationId: string
): Promise<GeographicPerformance[]> {
  const supabase = createServiceClient();

  // Get all campaigns for this organization
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id')
    .eq('organization_id', organizationId);

  if (!campaigns || campaigns.length === 0) {
    return [];
  }

  const campaignIds = campaigns.map(c => c.id);

  // Get recipients by state with performance data
  const { data: recipientData, error } = await supabase
    .from('campaign_recipients')
    .select(`
      id,
      campaign_id,
      recipient_id,
      recipients!inner(state)
    `)
    .in('campaign_id', campaignIds);

  if (error || !recipientData) {
    console.error('Error fetching geographic data:', error);
    return [];
  }

  // Group by state
  const stateMap = new Map<string, { recipientIds: string[], recipientCount: number }>();

  recipientData.forEach((item: any) => {
    const state = item.recipients?.state;
    if (state) {
      if (!stateMap.has(state)) {
        stateMap.set(state, { recipientIds: [], recipientCount: 0 });
      }
      const stateData = stateMap.get(state)!;
      stateData.recipientIds.push(item.id);
      stateData.recipientCount++;
    }
  });

  // Get scans and conversions for each state
  const results: GeographicPerformance[] = [];

  for (const [state, data] of stateMap.entries()) {
    // Get scan count for these recipients
    const { count: scans } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', campaignIds)
      .eq('event_type', 'qr_scan');

    // Get conversion count
    const { count: conversions } = await supabase
      .from('conversions')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', campaignIds);

    results.push({
      state,
      recipientCount: data.recipientCount,
      scans: scans || 0,
      conversions: conversions || 0,
      scanRate: data.recipientCount > 0 ? ((scans || 0) / data.recipientCount) * 100 : 0,
      conversionRate: data.recipientCount > 0 ? ((conversions || 0) / data.recipientCount) * 100 : 0,
    });
  }

  return results.sort((a, b) => b.scanRate - a.scanRate);
}

// ============================================================================
// TEMPORAL ANALYTICS
// ============================================================================

export interface TemporalPattern {
  date: string;
  scans: number;
  conversions: number;
  pageViews: number;
}

export async function getTemporalPatterns(
  organizationId: string,
  days: number = 30
): Promise<TemporalPattern[]> {
  const supabase = createServiceClient();

  // Get all campaigns for this organization
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id')
    .eq('organization_id', organizationId);

  if (!campaigns || campaigns.length === 0) {
    return [];
  }

  const campaignIds = campaigns.map(c => c.id);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get events grouped by date
  const { data: events, error } = await supabase
    .from('events')
    .select('created_at, event_type')
    .in('campaign_id', campaignIds)
    .gte('created_at', startDate.toISOString());

  if (error || !events) {
    console.error('Error fetching temporal data:', error);
    return [];
  }

  // Get conversions grouped by date
  const { data: conversions } = await supabase
    .from('conversions')
    .select('created_at')
    .in('campaign_id', campaignIds)
    .gte('created_at', startDate.toISOString());

  // Group by date
  const dateMap = new Map<string, { scans: number; pageViews: number; conversions: number }>();

  events.forEach(event => {
    const date = new Date(event.created_at).toISOString().split('T')[0];
    if (!dateMap.has(date)) {
      dateMap.set(date, { scans: 0, pageViews: 0, conversions: 0 });
    }
    const dayData = dateMap.get(date)!;
    if (event.event_type === 'qr_scan') {
      dayData.scans++;
    } else if (event.event_type === 'page_view') {
      dayData.pageViews++;
    }
  });

  conversions?.forEach(conversion => {
    const date = new Date(conversion.created_at).toISOString().split('T')[0];
    if (!dateMap.has(date)) {
      dateMap.set(date, { scans: 0, pageViews: 0, conversions: 0 });
    }
    dateMap.get(date)!.conversions++;
  });

  const results: TemporalPattern[] = Array.from(dateMap.entries()).map(([date, data]) => ({
    date,
    scans: data.scans,
    conversions: data.conversions,
    pageViews: data.pageViews,
  }));

  return results.sort((a, b) => a.date.localeCompare(b.date));
}

// ============================================================================
// CAMPAIGN COMPARISON
// ============================================================================

export interface CampaignComparison {
  campaignId: string;
  campaignName: string;
  status: string;
  totalRecipients: number;
  scans: number;
  conversions: number;
  scanRate: number;
  conversionRate: number;
  costTotal: number;
  costPerConversion: number | null;
  createdAt: string;
}

export async function getCampaignComparisons(
  organizationId: string
): Promise<CampaignComparison[]> {
  const supabase = createServiceClient();

  // Get all campaigns
  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('id, name, status, total_recipients, cost_total, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error || !campaigns) {
    console.error('Error fetching campaigns:', error);
    return [];
  }

  const results: CampaignComparison[] = [];

  for (const campaign of campaigns) {
    // Get scans
    const { count: scans } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaign.id)
      .eq('event_type', 'qr_scan');

    // Get conversions
    const { count: conversions } = await supabase
      .from('conversions')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaign.id);

    const totalRecipients = campaign.total_recipients || 0;
    const scanCount = scans || 0;
    const conversionCount = conversions || 0;
    const costTotal = campaign.cost_total || 0;

    results.push({
      campaignId: campaign.id,
      campaignName: campaign.name,
      status: campaign.status || 'draft',
      totalRecipients,
      scans: scanCount,
      conversions: conversionCount,
      scanRate: totalRecipients > 0 ? (scanCount / totalRecipients) * 100 : 0,
      conversionRate: totalRecipients > 0 ? (conversionCount / totalRecipients) * 100 : 0,
      costTotal,
      costPerConversion: conversionCount > 0 ? costTotal / conversionCount : null,
      createdAt: campaign.created_at,
    });
  }

  return results;
}

// ============================================================================
// SANKEY CHART DATA (Customer Journey Visualization)
// ============================================================================

export interface SankeyNode {
  name: string;
}

export interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
  metrics: {
    totalRecipients: number;
    qrScans: number;
    landingPageVisits: number;
    totalCalls: number;
    webAppointments: number;
    callAppointments: number;
    totalConverted: number; // All web conversions + call appointments
  };
}

export async function getSankeyChartData(
  organizationId: string,
  startDate?: string,
  endDate?: string
): Promise<SankeyData> {
  const supabase = createServiceClient();

  // Verify service role is being used
  console.log('[Sankey] Using service client, URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30));
  console.log('[Sankey] Service role key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Get all campaigns for this organization
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id')
      .eq('organization_id', organizationId);

    if (!campaigns || campaigns.length === 0) {
      return {
        nodes: [],
        links: [],
        metrics: {
          totalRecipients: 0,
          qrScans: 0,
          landingPageVisits: 0,
          totalCalls: 0,
          webAppointments: 0,
          callAppointments: 0,
          totalConverted: 0,
        },
      };
    }

    const campaignIds = campaigns.map(c => c.id);

    // Count total recipients
    const { count: totalRecipients } = await supabase
      .from('campaign_recipients')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', campaignIds);

    // Get all events for these campaigns
    let eventsQuery = supabase
      .from('events')
      .select('recipient_id, event_type')
      .in('campaign_id', campaignIds);

    if (startDate) {
      eventsQuery = eventsQuery.gte('created_at', startDate);
    }
    if (endDate) {
      eventsQuery = eventsQuery.lte('created_at', endDate);
    }

    const { data: events } = await eventsQuery;

    // Count UNIQUE QR scans and page views
    const uniqueQrScanners = new Set<string>();
    const uniquePageViewers = new Set<string>();

    events?.forEach(event => {
      if (event.recipient_id) {
        if (event.event_type === 'qr_scan') {
          uniqueQrScanners.add(event.recipient_id);
        } else if (event.event_type === 'page_view') {
          uniquePageViewers.add(event.recipient_id);
        }
      }
    });

    const qrScans = uniqueQrScanners.size;
    const landingPageVisits = uniquePageViewers.size;

    console.log('[Sankey] Events processed:', {
      totalEvents: events?.length || 0,
      uniqueQrScanners: qrScans,
      uniquePageViewers: landingPageVisits
    });

    // Get all conversions for these campaigns
    let conversionsQuery = supabase
      .from('conversions')
      .select('recipient_id, conversion_type')
      .in('campaign_id', campaignIds)
      .in('conversion_type', ['form_submit', 'appointment']);

    if (startDate) {
      conversionsQuery = conversionsQuery.gte('created_at', startDate);
    }
    if (endDate) {
      conversionsQuery = conversionsQuery.lte('created_at', endDate);
    }

    const { data: conversions } = await conversionsQuery;

    // Count UNIQUE web conversions
    const uniqueWebConverters = new Set<string>();
    conversions?.forEach(conversion => {
      if (conversion.recipient_id) {
        uniqueWebConverters.add(conversion.recipient_id);
      }
    });

    const webAppointments = uniqueWebConverters.size;

    console.log('[Sankey] Conversions processed:', {
      totalConversions: conversions?.length || 0,
      uniqueConverters: webAppointments
    });

    // Get all ElevenLabs calls for this organization
    // IMPORTANT: Include both attributed (campaign_id set) and unattributed (campaign_id null) calls
    // This ensures real ElevenLabs data appears in organization-level analytics
    let callsQuery = supabase
      .from('elevenlabs_calls')
      .select('id, elevenlabs_call_id, recipient_id, appointment_booked, campaign_id')
      .eq('organization_id', organizationId);

    if (startDate) {
      callsQuery = callsQuery.gte('start_time', startDate);
    }
    if (endDate) {
      callsQuery = callsQuery.lte('start_time', endDate);
    }

    const { data: calls, error: callsError } = await callsQuery;

    if (callsError) {
      console.error('[Sankey] Error fetching calls:', callsError);
    }

    // Count UNIQUE calls and appointments
    // Use elevenlabs_call_id as unique identifier (handles both attributed and unattributed)
    const uniqueCallers = new Set<string>();
    const uniqueCallAppointments = new Set<string>();

    calls?.forEach(call => {
      // Use elevenlabs_call_id or database id as unique identifier
      const callId = call.elevenlabs_call_id || call.id?.toString() || '';
      if (callId) {
        uniqueCallers.add(callId);
        if (call.appointment_booked) {
          uniqueCallAppointments.add(callId);
        }
      }
    });

    const totalCalls = uniqueCallers.size;
    const callAppointments = uniqueCallAppointments.size;

    console.log('[Sankey] Calls processed:', {
      totalCalls: calls?.length || 0,
      uniqueCallers: totalCalls,
      uniqueCallAppointments: callAppointments,
      attributedCalls: calls?.filter(c => c.campaign_id).length || 0,
      unattributedCalls: calls?.filter(c => !c.campaign_id).length || 0
    });

    // Total conversions = web + call appointments
    const totalConverted = (webAppointments || 0) + (callAppointments || 0);

    // Calculate no-engagement recipients
    const noEngagement = (totalRecipients || 0) - (qrScans || 0) - (totalCalls || 0);

    // Define nodes for multi-channel funnel
    const nodes: SankeyNode[] = [
      { name: 'Recipients' },           // 0
      { name: 'No Engagement' },        // 1
      { name: 'QR Scans' },             // 2
      { name: 'Landing Page Visits' },  // 3
      { name: 'Calls Received' },       // 4
      { name: 'Web Conversions' },      // 5
      { name: 'Call Appointments' },    // 6
    ];

    // Define links (multi-channel customer journey)
    const links: SankeyLink[] = [];

    // Recipients → No Engagement
    if (noEngagement > 0) {
      links.push({
        source: 0,
        target: 1,
        value: noEngagement,
      });
    }

    // Recipients → QR Scans (digital path)
    if (qrScans > 0) {
      links.push({
        source: 0,
        target: 2,
        value: qrScans,
      });
    }

    // Recipients → Calls (phone path)
    if ((totalCalls || 0) > 0) {
      links.push({
        source: 0,
        target: 4,
        value: totalCalls || 0,
      });
    }

    // QR Scans → Landing Page Visits
    if (qrScans > 0 && landingPageVisits > 0) {
      links.push({
        source: 2,
        target: 3,
        value: Math.min(qrScans, landingPageVisits),
      });
    }

    // Landing Page Visits → Web Conversions
    if (landingPageVisits > 0 && (webAppointments || 0) > 0) {
      links.push({
        source: 3,
        target: 5,
        value: webAppointments || 0,
      });
    }

    // Calls → Call Appointments
    if ((totalCalls || 0) > 0 && (callAppointments || 0) > 0) {
      links.push({
        source: 4,
        target: 6,
        value: callAppointments || 0,
      });
    }

    return {
      nodes,
      links,
      metrics: {
        totalRecipients: totalRecipients || 0,
        qrScans: qrScans || 0,
        landingPageVisits,
        totalCalls: totalCalls || 0,
        webAppointments: webAppointments || 0,
        callAppointments: callAppointments || 0,
        totalConverted,
      },
    };
  } catch (error) {
    console.error('Error generating Sankey chart data:', error);
    return {
      nodes: [],
      links: [],
      metrics: {
        totalRecipients: 0,
        qrScans: 0,
        landingPageVisits: 0,
        totalCalls: 0,
        webAppointments: 0,
        callAppointments: 0,
        totalConverted: 0,
      },
    };
  }
}

// ============================================================================
// DASHBOARD OVERVIEW STATS
// ============================================================================

export interface DashboardStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalRecipients: number;
  totalPageViews: number;
  qrScans: number;
  totalConversions: number;
  formConversions: number;
  responseRate: number;
  conversionRate: number;
}

export async function getDashboardStats(
  organizationId: string,
  startDate?: string,
  endDate?: string
): Promise<DashboardStats> {
  const supabase = createServiceClient();

  try {
    // Get all campaigns for this organization
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id, status')
      .eq('organization_id', organizationId);

    if (!campaigns || campaigns.length === 0) {
      return {
        totalCampaigns: 0,
        activeCampaigns: 0,
        totalRecipients: 0,
        totalPageViews: 0,
        qrScans: 0,
        totalConversions: 0,
        formConversions: 0,
        responseRate: 0,
        conversionRate: 0,
      };
    }

    const campaignIds = campaigns.map(c => c.id);
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

    // Count total recipients (with optional date filter)
    let recipientQuery = supabase
      .from('campaign_recipients')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', campaignIds);

    if (startDate && endDate) {
      recipientQuery = recipientQuery
        .gte('created_at', startDate)
        .lte('created_at', endDate);
    }

    const { count: totalRecipients } = await recipientQuery;

    // Count page views
    let pageViewQuery = supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', campaignIds)
      .eq('event_type', 'page_view');

    if (startDate && endDate) {
      pageViewQuery = pageViewQuery
        .gte('created_at', startDate)
        .lte('created_at', endDate);
    }

    const { count: totalPageViews } = await pageViewQuery;

    // Count QR scans
    let qrScanQuery = supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', campaignIds)
      .eq('event_type', 'qr_scan');

    if (startDate && endDate) {
      qrScanQuery = qrScanQuery
        .gte('created_at', startDate)
        .lte('created_at', endDate);
    }

    const { count: qrScans } = await qrScanQuery;

    // Count total conversions
    let conversionQuery = supabase
      .from('conversions')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', campaignIds);

    if (startDate && endDate) {
      conversionQuery = conversionQuery
        .gte('created_at', startDate)
        .lte('created_at', endDate);
    }

    const { count: totalConversions } = await conversionQuery;

    // Count form submissions
    let formQuery = supabase
      .from('conversions')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', campaignIds)
      .eq('conversion_type', 'form_submission');

    if (startDate && endDate) {
      formQuery = formQuery
        .gte('created_at', startDate)
        .lte('created_at', endDate);
    }

    const { count: formConversions } = await formQuery;

    // Calculate rates
    const responseRate = (totalRecipients || 0) > 0
      ? ((totalPageViews || 0) / (totalRecipients || 1)) * 100
      : 0;

    const conversionRate = (totalRecipients || 0) > 0
      ? ((totalConversions || 0) / (totalRecipients || 1)) * 100
      : 0;

    return {
      totalCampaigns,
      activeCampaigns,
      totalRecipients: totalRecipients || 0,
      totalPageViews: totalPageViews || 0,
      qrScans: qrScans || 0,
      totalConversions: totalConversions || 0,
      formConversions: formConversions || 0,
      responseRate,
      conversionRate,
    };
  } catch (error) {
    console.error('[getDashboardStats] Error:', error);
    return {
      totalCampaigns: 0,
      activeCampaigns: 0,
      totalRecipients: 0,
      totalPageViews: 0,
      qrScans: 0,
      totalConversions: 0,
      formConversions: 0,
      responseRate: 0,
      conversionRate: 0,
    };
  }
}

// ============================================================================
// ENGAGEMENT METRICS (Timing Analysis)
// ============================================================================

export interface EngagementMetrics {
  avg_time_to_first_view_seconds: number | null;
  avg_time_to_conversion_seconds: number | null;
  avg_total_time_seconds: number | null;
  avg_time_to_appointment_seconds: number | null;
  recipients_with_views?: number;
  recipients_with_conversions?: number;
  conversions_count?: number;
}

export async function getOverallEngagementMetrics(
  organizationId: string,
  startDate?: string,
  endDate?: string
): Promise<EngagementMetrics> {
  const supabase = createServiceClient();

  try {
    // Get all campaigns for this organization
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id')
      .eq('organization_id', organizationId);

    if (!campaigns || campaigns.length === 0) {
      return {
        avg_time_to_first_view_seconds: null,
        avg_time_to_conversion_seconds: null,
        avg_total_time_seconds: null,
        avg_time_to_appointment_seconds: null,
      };
    }

    const campaignIds = campaigns.map(c => c.id);

    // Get recipients with their sent timestamps (campaign_recipients.created_at = when mail was sent)
    let recipientQuery = supabase
      .from('campaign_recipients')
      .select('id, created_at, campaign_id')
      .in('campaign_id', campaignIds);

    if (startDate && endDate) {
      recipientQuery = recipientQuery
        .gte('created_at', startDate)
        .lte('created_at', endDate);
    }

    const { data: recipients } = await recipientQuery;

    if (!recipients || recipients.length === 0) {
      return {
        avg_time_to_first_view_seconds: null,
        avg_time_to_conversion_seconds: null,
        avg_total_time_seconds: null,
        avg_time_to_appointment_seconds: null,
      };
    }

    // Get first view times for each recipient
    const { data: firstViews } = await supabase
      .from('events')
      .select('recipient_id, created_at')
      .in('recipient_id', recipients.map(r => r.id))
      .eq('event_type', 'page_view')
      .order('created_at', { ascending: true });

    // Get first conversion times for each recipient
    const { data: firstConversions } = await supabase
      .from('conversions')
      .select('recipient_id, created_at')
      .in('recipient_id', recipients.map(r => r.id))
      .order('created_at', { ascending: true });

    // Calculate timing metrics
    let timeToFirstViewSum = 0;
    let timeToFirstViewCount = 0;
    let timeToConversionSum = 0;
    let timeToConversionCount = 0;
    let totalTimeSum = 0;
    let totalTimeCount = 0;

    for (const recipient of recipients) {
      const recipientCreatedAt = new Date(recipient.created_at).getTime();

      // Find first view for this recipient
      const firstView = firstViews?.find(v => v.recipient_id === recipient.id);
      if (firstView) {
        const viewTime = new Date(firstView.created_at).getTime();
        const timeDiff = (viewTime - recipientCreatedAt) / 1000; // seconds
        timeToFirstViewSum += timeDiff;
        timeToFirstViewCount++;
      }

      // Find first conversion for this recipient
      const firstConversion = firstConversions?.find(c => c.recipient_id === recipient.id);
      if (firstConversion) {
        const conversionTime = new Date(firstConversion.created_at).getTime();

        // Time from first view to conversion
        if (firstView) {
          const viewTime = new Date(firstView.created_at).getTime();
          const timeDiff = (conversionTime - viewTime) / 1000; // seconds
          timeToConversionSum += timeDiff;
          timeToConversionCount++;
        }

        // Total time from recipient created to conversion
        const totalTime = (conversionTime - recipientCreatedAt) / 1000; // seconds
        totalTimeSum += totalTime;
        totalTimeCount++;
      }
    }

    return {
      avg_time_to_first_view_seconds: timeToFirstViewCount > 0
        ? timeToFirstViewSum / timeToFirstViewCount
        : null,
      avg_time_to_conversion_seconds: timeToConversionCount > 0
        ? timeToConversionSum / timeToConversionCount
        : null,
      avg_total_time_seconds: totalTimeCount > 0
        ? totalTimeSum / totalTimeCount
        : null,
      avg_time_to_appointment_seconds: null, // Not implemented in Supabase yet
    };
  } catch (error) {
    console.error('[getOverallEngagementMetrics] Error:', error);
    return {
      avg_time_to_first_view_seconds: null,
      avg_time_to_conversion_seconds: null,
      avg_total_time_seconds: null,
      avg_time_to_appointment_seconds: null,
    };
  }
}
