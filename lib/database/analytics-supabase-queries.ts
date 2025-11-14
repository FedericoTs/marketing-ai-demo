/**
 * Analytics Supabase Query Layer
 * Phase 5.7 - Advanced DM Analytics
 *
 * Provides comprehensive analytics data from Supabase PostgreSQL
 * Uses service client to bypass RLS for analytics aggregation
 */

import { createServiceClient } from '@/lib/supabase/server';

// ==================== TYPES ====================

export interface DashboardStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalRecipients: number;
  totalPageViews: number;
  totalConversions: number;
  overallConversionRate: number;
  qrScans: number;
  formSubmissions: number;
}

export interface InvestmentMetrics {
  total_investment: number;
  total_budget: number;
  budget_utilization_percent: number;
  average_cost_per_piece: number;
  average_cost_per_scan: number;
  average_cost_per_conversion: number;
  campaigns_with_costs: number;
  cost_breakdown: {
    design: number;
    print: number;
    postage: number;
    data_axle: number;
  };
}

export interface EngagementMetric {
  value: number;
  unit: string;
  formatted: string;
}

export interface EngagementMetrics {
  avg_time_to_first_view_seconds: number | null;
  avg_time_to_conversion_seconds: number | null;
  avg_total_time_seconds: number | null;
  avg_time_to_appointment_seconds: number | null;
}

// ==================== DASHBOARD STATS ====================

/**
 * Get comprehensive dashboard statistics
 * Supports optional date range filtering
 */
export async function getDashboardStats(
  startDate?: string,
  endDate?: string,
  organizationId?: string
): Promise<DashboardStats> {
  const supabase = createServiceClient();

  try {
    // Build organization filter
    const orgFilter = organizationId ? { organization_id: organizationId } : {};

    // Total campaigns (no date filter - all campaigns)
    const { count: totalCampaigns } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .match(orgFilter);

    // Active campaigns
    const { count: activeCampaigns } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .match({ ...orgFilter, status: 'active' });

    // Total recipients (with optional date filter)
    let recipientsQuery = supabase
      .from('campaign_recipients')
      .select('*, campaigns!inner(*)', { count: 'exact', head: true });

    if (organizationId) {
      recipientsQuery = recipientsQuery.eq('campaigns.organization_id', organizationId);
    }

    if (startDate && endDate) {
      recipientsQuery = recipientsQuery
        .gte('created_at', startDate)
        .lte('created_at', endDate);
    }

    const { count: totalRecipients } = await recipientsQuery;

    // Total page views (with optional date filter)
    let pageViewsQuery = supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'page_view');

    if (organizationId) {
      pageViewsQuery = pageViewsQuery
        .select('*, campaigns!inner(*)', { count: 'exact', head: true })
        .eq('campaigns.organization_id', organizationId)
        .eq('event_type', 'page_view');
    }

    if (startDate && endDate) {
      pageViewsQuery = pageViewsQuery
        .gte('created_at', startDate)
        .lte('created_at', endDate);
    }

    const { count: totalPageViews } = await pageViewsQuery;

    // QR scans (with optional date filter)
    let qrScansQuery = supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'qr_scan');

    if (organizationId) {
      qrScansQuery = qrScansQuery
        .select('*, campaigns!inner(*)', { count: 'exact', head: true })
        .eq('campaigns.organization_id', organizationId)
        .eq('event_type', 'qr_scan');
    }

    if (startDate && endDate) {
      qrScansQuery = qrScansQuery
        .gte('created_at', startDate)
        .lte('created_at', endDate);
    }

    const { count: qrScans } = await qrScansQuery;

    // Total conversions (with optional date filter)
    let conversionsQuery = supabase
      .from('conversions')
      .select('*', { count: 'exact', head: true });

    if (organizationId) {
      conversionsQuery = conversionsQuery
        .select('*, campaigns!inner(*)', { count: 'exact', head: true })
        .eq('campaigns.organization_id', organizationId);
    }

    if (startDate && endDate) {
      conversionsQuery = conversionsQuery
        .gte('created_at', startDate)
        .lte('created_at', endDate);
    }

    const { count: totalConversions } = await conversionsQuery;

    // Form submissions (with optional date filter)
    let formSubmissionsQuery = supabase
      .from('conversions')
      .select('*', { count: 'exact', head: true })
      .eq('conversion_type', 'form_submission');

    if (organizationId) {
      formSubmissionsQuery = formSubmissionsQuery
        .select('*, campaigns!inner(*)', { count: 'exact', head: true })
        .eq('campaigns.organization_id', organizationId)
        .eq('conversion_type', 'form_submission');
    }

    if (startDate && endDate) {
      formSubmissionsQuery = formSubmissionsQuery
        .gte('created_at', startDate)
        .lte('created_at', endDate);
    }

    const { count: formSubmissions } = await formSubmissionsQuery;

    // Calculate conversion rate
    const overallConversionRate =
      (totalRecipients || 0) > 0
        ? ((totalConversions || 0) / (totalRecipients || 0)) * 100
        : 0;

    return {
      totalCampaigns: totalCampaigns || 0,
      activeCampaigns: activeCampaigns || 0,
      totalRecipients: totalRecipients || 0,
      totalPageViews: totalPageViews || 0,
      totalConversions: totalConversions || 0,
      overallConversionRate,
      qrScans: qrScans || 0,
      formSubmissions: formSubmissions || 0,
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
}

// ==================== INVESTMENT METRICS ====================

/**
 * Get investment/cost metrics across all campaigns
 * Phase 5.7 - Investment Tracking
 */
export async function getInvestmentMetrics(organizationId?: string): Promise<InvestmentMetrics> {
  const supabase = createServiceClient();

  try {
    // Build query with optional organization filter
    let campaignsQuery = supabase
      .from('campaigns')
      .select('cost_design, cost_print, cost_postage, cost_data_axle, cost_total, budget, total_recipients');

    if (organizationId) {
      campaignsQuery = campaignsQuery.eq('organization_id', organizationId);
    }

    const { data: campaigns, error: campaignsError } = await campaignsQuery;

    if (campaignsError) {
      console.error('Error fetching investment metrics:', campaignsError);
      throw campaignsError;
    }

    // Calculate aggregated metrics
    const totalInvestment = (campaigns || []).reduce((sum, c) => sum + (Number(c.cost_total) || 0), 0);
    const totalBudget = (campaigns || []).reduce((sum, c) => sum + (Number(c.budget) || 0), 0);
    const totalRecipients = (campaigns || []).reduce((sum, c) => sum + (c.total_recipients || 0), 0);

    // Cost breakdown
    const costBreakdown = {
      design: (campaigns || []).reduce((sum, c) => sum + (Number(c.cost_design) || 0), 0),
      print: (campaigns || []).reduce((sum, c) => sum + (Number(c.cost_print) || 0), 0),
      postage: (campaigns || []).reduce((sum, c) => sum + (Number(c.cost_postage) || 0), 0),
      data_axle: (campaigns || []).reduce((sum, c) => sum + (Number(c.cost_data_axle) || 0), 0),
    };

    // Get QR scan count
    let scansQuery = supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'qr_scan');

    if (organizationId) {
      scansQuery = scansQuery
        .select('*, campaigns!inner(*)', { count: 'exact', head: true })
        .eq('campaigns.organization_id', organizationId)
        .eq('event_type', 'qr_scan');
    }

    const { count: totalScans } = await scansQuery;

    // Get conversions count
    let conversionsQuery = supabase
      .from('conversions')
      .select('*', { count: 'exact', head: true });

    if (organizationId) {
      conversionsQuery = conversionsQuery
        .select('*, campaigns!inner(*)', { count: 'exact', head: true })
        .eq('campaigns.organization_id', organizationId);
    }

    const { count: totalConversions } = await conversionsQuery;

    // Calculate averages
    const campaignsWithCosts = (campaigns || []).filter(c => Number(c.cost_total) > 0).length;
    const avgCostPerPiece = totalRecipients > 0 ? totalInvestment / totalRecipients : 0;
    const avgCostPerScan = (totalScans || 0) > 0 ? totalInvestment / (totalScans || 0) : 0;
    const avgCostPerConversion = (totalConversions || 0) > 0 ? totalInvestment / (totalConversions || 0) : 0;
    const budgetUtilization = totalBudget > 0 ? (totalInvestment / totalBudget) * 100 : 0;

    return {
      total_investment: totalInvestment,
      total_budget: totalBudget,
      budget_utilization_percent: budgetUtilization,
      average_cost_per_piece: avgCostPerPiece,
      average_cost_per_scan: avgCostPerScan,
      average_cost_per_conversion: avgCostPerConversion,
      campaigns_with_costs: campaignsWithCosts,
      cost_breakdown: costBreakdown,
    };
  } catch (error) {
    console.error('Error fetching investment metrics:', error);
    throw error;
  }
}

// ==================== ENGAGEMENT METRICS ====================

/**
 * Get overall engagement time metrics
 */
export async function getOverallEngagementMetrics(
  startDate?: string,
  endDate?: string,
  organizationId?: string
): Promise<EngagementMetrics> {
  const supabase = createServiceClient();

  try {
    // For now, return null values as engagement time tracking
    // requires more complex queries across events and conversions tables
    // This can be enhanced in future iterations
    return {
      avg_time_to_first_view_seconds: null,
      avg_time_to_conversion_seconds: null,
      avg_total_time_seconds: null,
      avg_time_to_appointment_seconds: null,
    };
  } catch (error) {
    console.error('Error fetching engagement metrics:', error);
    throw error;
  }
}

// ==================== CAMPAIGN PERFORMANCE ====================

/**
 * Get detailed performance metrics for all campaigns
 * Used for campaign comparison tables and charts
 */
export async function getCampaignPerformanceMetrics(organizationId?: string): Promise<Array<{
  campaign_id: string;
  campaign_name: string;
  total_recipients: number;
  page_views: number;
  qr_scans: number;
  conversions: number;
  conversion_rate: number;
  cost_total: number;
  cost_per_conversion: number;
  created_at: string;
}>> {
  const supabase = createServiceClient();

  try {
    // Get all campaigns with cost data
    let campaignsQuery = supabase
      .from('campaigns')
      .select('id, name, total_recipients, cost_total, created_at');

    if (organizationId) {
      campaignsQuery = campaignsQuery.eq('organization_id', organizationId);
    }

    const { data: campaigns, error: campaignsError } = await campaignsQuery;

    if (campaignsError) {
      throw campaignsError;
    }

    // For each campaign, get events and conversions
    const performanceData = await Promise.all(
      (campaigns || []).map(async (campaign) => {
        // Get page views
        const { count: pageViews } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)
          .eq('event_type', 'page_view');

        // Get QR scans
        const { count: qrScans } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)
          .eq('event_type', 'qr_scan');

        // Get conversions
        const { count: conversions } = await supabase
          .from('conversions')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id);

        const conversionRate =
          campaign.total_recipients > 0
            ? ((conversions || 0) / campaign.total_recipients) * 100
            : 0;

        const costPerConversion =
          (conversions || 0) > 0
            ? (Number(campaign.cost_total) || 0) / (conversions || 0)
            : 0;

        return {
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          total_recipients: campaign.total_recipients || 0,
          page_views: pageViews || 0,
          qr_scans: qrScans || 0,
          conversions: conversions || 0,
          conversion_rate: conversionRate,
          cost_total: Number(campaign.cost_total) || 0,
          cost_per_conversion: costPerConversion,
          created_at: campaign.created_at,
        };
      })
    );

    return performanceData;
  } catch (error) {
    console.error('Error fetching campaign performance metrics:', error);
    throw error;
  }
}

// ==================== GEOGRAPHIC ANALYTICS ====================

/**
 * Get performance metrics grouped by geographic region (state)
 */
export async function getGeographicPerformance(organizationId?: string): Promise<Array<{
  state: string;
  total_recipients: number;
  conversions: number;
  conversion_rate: number;
}>> {
  const supabase = createServiceClient();

  try {
    // Get all recipients with state information
    let recipientsQuery = supabase
      .from('campaign_recipients')
      .select('id, campaign_id, recipient_id, campaigns!inner(organization_id), recipients!inner(state)');

    if (organizationId) {
      recipientsQuery = recipientsQuery.eq('campaigns.organization_id', organizationId);
    }

    const { data: recipients, error: recipientsError } = await recipientsQuery;

    if (recipientsError) {
      throw recipientsError;
    }

    // Group by state
    const stateMap = new Map<string, { total: number; conversions: number }>();

    for (const recipient of recipients || []) {
      const state = (recipient.recipients as any)?.state || 'Unknown';
      if (!stateMap.has(state)) {
        stateMap.set(state, { total: 0, conversions: 0 });
      }
      const stateData = stateMap.get(state)!;
      stateData.total += 1;
    }

    // Get conversions by tracking_id
    const trackingIds = (recipients || []).map(r => r.id);
    if (trackingIds.length > 0) {
      const { data: conversions } = await supabase
        .from('conversions')
        .select('tracking_id')
        .in('tracking_id', trackingIds);

      for (const conversion of conversions || []) {
        const recipient = recipients?.find(r => r.id === conversion.tracking_id);
        if (recipient) {
          const state = (recipient.recipients as any)?.state || 'Unknown';
          const stateData = stateMap.get(state);
          if (stateData) {
            stateData.conversions += 1;
          }
        }
      }
    }

    // Convert to array and calculate rates
    return Array.from(stateMap.entries()).map(([state, data]) => ({
      state,
      total_recipients: data.total,
      conversions: data.conversions,
      conversion_rate: data.total > 0 ? (data.conversions / data.total) * 100 : 0,
    }));
  } catch (error) {
    console.error('Error fetching geographic performance:', error);
    return [];
  }
}
