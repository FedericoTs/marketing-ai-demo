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
    totalPageViews: number;
    totalConversions: number;
    conversionRate: number;
  };
}

export async function getSankeyChartData(
  organizationId: string,
  startDate?: string,
  endDate?: string
): Promise<SankeyData> {
  const supabase = createServiceClient();

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
          totalPageViews: 0,
          totalConversions: 0,
          conversionRate: 0,
        },
      };
    }

    const campaignIds = campaigns.map(c => c.id);

    // Count total recipients
    const { count: totalRecipients } = await supabase
      .from('campaign_recipients')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', campaignIds);

    // Build query for events with optional date filtering
    let eventsQuery = supabase
      .from('events')
      .select('event_type')
      .in('campaign_id', campaignIds);

    if (startDate) {
      eventsQuery = eventsQuery.gte('created_at', startDate);
    }
    if (endDate) {
      eventsQuery = eventsQuery.lte('created_at', endDate);
    }

    const { data: events } = await eventsQuery;

    // Count page views and QR scans
    const pageViews = events?.filter(e => e.event_type === 'page_view').length || 0;
    const qrScans = events?.filter(e => e.event_type === 'qr_scan').length || 0;

    // Count conversions with optional date filtering
    let conversionsQuery = supabase
      .from('conversions')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', campaignIds);

    if (startDate) {
      conversionsQuery = conversionsQuery.gte('created_at', startDate);
    }
    if (endDate) {
      conversionsQuery = conversionsQuery.lte('created_at', endDate);
    }

    const { count: totalConversions } = await conversionsQuery;

    // Define nodes
    const nodes: SankeyNode[] = [
      { name: 'Recipients' },      // 0
      { name: 'QR Scans' },        // 1
      { name: 'Page Views' },      // 2
      { name: 'Conversions' },     // 3
    ];

    // Define links (customer journey flow)
    const links: SankeyLink[] = [];

    // Recipients → QR Scans
    if (qrScans > 0) {
      links.push({
        source: 0,
        target: 1,
        value: qrScans,
      });
    }

    // QR Scans → Page Views (assuming most page views come from QR scans)
    if (qrScans > 0 && pageViews > 0) {
      links.push({
        source: 1,
        target: 2,
        value: Math.min(qrScans, pageViews),
      });
    }

    // Page Views → Conversions
    if (pageViews > 0 && totalConversions && totalConversions > 0) {
      links.push({
        source: 2,
        target: 3,
        value: totalConversions,
      });
    }

    const conversionRate =
      (totalRecipients || 0) > 0
        ? ((totalConversions || 0) / (totalRecipients || 1)) * 100
        : 0;

    return {
      nodes,
      links,
      metrics: {
        totalRecipients: totalRecipients || 0,
        totalPageViews: pageViews,
        totalConversions: totalConversions || 0,
        conversionRate,
      },
    };
  } catch (error) {
    console.error('Error generating Sankey chart data:', error);
    return {
      nodes: [],
      links: [],
      metrics: {
        totalRecipients: 0,
        totalPageViews: 0,
        totalConversions: 0,
        conversionRate: 0,
      },
    };
  }
}
