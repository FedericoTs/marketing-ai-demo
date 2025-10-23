import { getDatabase } from "./connection";

// ============================================================================
// PERFORMANCE MATRIX DATABASE QUERIES
// ============================================================================
// Provides data for AI-powered campaign recommendations across stores

export interface StorePerformanceMetrics {
  store_id: string;
  store_number: string;
  store_name: string;
  city: string;
  state: string;
  region: string;

  // Performance metrics
  total_campaigns: number;
  total_recipients: number;
  total_conversions: number;
  avg_conversion_rate: number;
  avg_time_to_conversion_hours: number;
  total_revenue: number;
  total_cost: number;
  roi: number;

  // Recent performance (last 30 days)
  recent_campaigns: number;
  recent_conversion_rate: number;
  recent_roi: number;
}

export interface CampaignCreativePerformance {
  campaign_id: string;
  campaign_name: string;

  // Overall metrics
  total_stores: number;
  total_recipients: number;
  total_conversions: number;
  overall_conversion_rate: number;
  avg_time_to_conversion_hours: number;

  // Regional performance
  top_performing_regions: { region: string; conversion_rate: number }[];
  top_performing_states: { state: string; conversion_rate: number }[];

  // Cost metrics
  total_cost: number;
  avg_cost_per_conversion: number;
}

export interface GeographicPattern {
  region: string;
  state?: string;
  city?: string;

  // Performance stats
  total_campaigns: number;
  avg_conversion_rate: number;
  avg_time_to_conversion_hours: number;
  best_campaign_type?: string;
  best_season?: string;
}

/**
 * Get comprehensive performance metrics for all stores
 */
export function getAllStorePerformanceMetrics(
  daysBack: number = 90
): StorePerformanceMetrics[] {
  const db = getDatabase();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

  const query = `
    SELECT
      s.id as store_id,
      s.store_number,
      s.name as store_name,
      s.city,
      s.state,
      s.region,

      -- Overall performance
      COUNT(DISTINCT CASE WHEN dep.created_at >= ? THEN dep.campaign_id END) as total_campaigns,
      COUNT(DISTINCT CASE WHEN r.created_at >= ? THEN r.id END) as total_recipients,
      COUNT(DISTINCT CASE WHEN conv.created_at >= ? THEN conv.id END) as total_conversions,

      CAST(COUNT(DISTINCT CASE WHEN conv.created_at >= ? THEN conv.id END) AS FLOAT) /
        NULLIF(COUNT(DISTINCT CASE WHEN r.created_at >= ? THEN r.id END), 0) as avg_conversion_rate,

      AVG(CASE
        WHEN conv.created_at IS NOT NULL AND r.created_at IS NOT NULL
        THEN (julianday(conv.created_at) - julianday(r.created_at)) * 24
      END) as avg_time_to_conversion_hours,

      0 as total_revenue,  -- Placeholder for future revenue tracking
      0 as total_cost,     -- Placeholder for future cost tracking
      0 as roi,            -- Placeholder for future ROI calculation

      -- Recent performance (last 30 days)
      COUNT(DISTINCT CASE
        WHEN dep.created_at >= date('now', '-30 days') THEN dep.campaign_id
      END) as recent_campaigns,

      CAST(COUNT(DISTINCT CASE
        WHEN conv.created_at >= date('now', '-30 days') THEN conv.id
      END) AS FLOAT) /
        NULLIF(COUNT(DISTINCT CASE
          WHEN r.created_at >= date('now', '-30 days') THEN r.id
        END), 0) as recent_conversion_rate,

      0 as recent_roi

    FROM retail_stores s
    LEFT JOIN retail_campaign_deployments dep ON dep.store_id = s.id AND dep.created_at >= ?
    LEFT JOIN retail_deployment_recipients dr ON dr.deployment_id = dep.id
    LEFT JOIN recipients r ON r.id = dr.recipient_id AND r.created_at >= ?
    LEFT JOIN conversions conv ON conv.tracking_id = r.tracking_id AND conv.created_at >= ?

    GROUP BY s.id, s.store_number, s.name, s.city, s.state, s.region
    ORDER BY s.store_number
  `;

  const stmt = db.prepare(query);
  const params = Array(8).fill(cutoffDateStr);
  const results = stmt.all(...params) as StorePerformanceMetrics[];

  return results.map(r => ({
    ...r,
    avg_conversion_rate: r.avg_conversion_rate || 0,
    recent_conversion_rate: r.recent_conversion_rate || 0,
    avg_time_to_conversion_hours: r.avg_time_to_conversion_hours || 0,
  }));
}

/**
 * Get performance metrics for all active campaigns
 */
export function getAllCampaignCreativePerformance(
  daysBack: number = 90
): CampaignCreativePerformance[] {
  const db = getDatabase();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

  const query = `
    SELECT
      c.id as campaign_id,
      c.name as campaign_name,

      -- Overall metrics
      COUNT(DISTINCT dep.store_id) as total_stores,
      COUNT(DISTINCT r.id) as total_recipients,
      COUNT(DISTINCT conv.id) as total_conversions,

      CAST(COUNT(DISTINCT conv.id) AS FLOAT) / NULLIF(COUNT(DISTINCT r.id), 0) as overall_conversion_rate,

      AVG(CASE
        WHEN conv.created_at IS NOT NULL AND r.created_at IS NOT NULL
        THEN (julianday(conv.created_at) - julianday(r.created_at)) * 24
      END) as avg_time_to_conversion_hours,

      0 as total_cost,
      0 as avg_cost_per_conversion

    FROM campaigns c
    LEFT JOIN retail_campaign_deployments dep ON dep.campaign_id = c.id
    LEFT JOIN retail_deployment_recipients dr ON dr.deployment_id = dep.id
    LEFT JOIN recipients r ON r.id = dr.recipient_id
    LEFT JOIN conversions conv ON conv.tracking_id = r.tracking_id

    WHERE c.created_at >= ?

    GROUP BY c.id, c.name
    HAVING COUNT(DISTINCT r.id) > 0  -- Only campaigns with recipients
    ORDER BY overall_conversion_rate DESC
  `;

  const stmt = db.prepare(query);
  const campaigns = stmt.all(cutoffDateStr) as CampaignCreativePerformance[];

  // Get regional performance for each campaign
  return campaigns.map(campaign => {
    const regionalPerf = getRegionalPerformance(campaign.campaign_id);
    const statePerf = getStatePerformance(campaign.campaign_id);

    return {
      ...campaign,
      overall_conversion_rate: campaign.overall_conversion_rate || 0,
      avg_time_to_conversion_hours: campaign.avg_time_to_conversion_hours || 0,
      top_performing_regions: regionalPerf,
      top_performing_states: statePerf,
    };
  });
}

/**
 * Get regional performance for a specific campaign
 */
function getRegionalPerformance(
  campaignId: string
): { region: string; conversion_rate: number }[] {
  const db = getDatabase();

  const query = `
    SELECT
      s.region,
      CAST(COUNT(DISTINCT conv.id) AS FLOAT) / NULLIF(COUNT(DISTINCT r.id), 0) as conversion_rate
    FROM retail_campaign_deployments dep
    JOIN retail_stores s ON dep.store_id = s.id
    LEFT JOIN retail_deployment_recipients dr ON dr.deployment_id = dep.id
    LEFT JOIN recipients r ON r.id = dr.recipient_id
    LEFT JOIN conversions conv ON conv.tracking_id = r.tracking_id
    WHERE dep.campaign_id = ?
    GROUP BY s.region
    HAVING COUNT(DISTINCT r.id) >= 10  -- Minimum sample size
    ORDER BY conversion_rate DESC
    LIMIT 5
  `;

  const stmt = db.prepare(query);
  const results = stmt.all(campaignId) as { region: string; conversion_rate: number }[];

  return results.map(r => ({
    region: r.region,
    conversion_rate: r.conversion_rate || 0,
  }));
}

/**
 * Get state performance for a specific campaign
 */
function getStatePerformance(
  campaignId: string
): { state: string; conversion_rate: number }[] {
  const db = getDatabase();

  const query = `
    SELECT
      s.state,
      CAST(COUNT(DISTINCT conv.id) AS FLOAT) / NULLIF(COUNT(DISTINCT r.id), 0) as conversion_rate
    FROM retail_campaign_deployments dep
    JOIN retail_stores s ON dep.store_id = s.id
    LEFT JOIN retail_deployment_recipients dr ON dr.deployment_id = dep.id
    LEFT JOIN recipients r ON r.id = dr.recipient_id
    LEFT JOIN conversions conv ON conv.tracking_id = r.tracking_id
    WHERE dep.campaign_id = ?
    GROUP BY s.state
    HAVING COUNT(DISTINCT r.id) >= 10
    ORDER BY conversion_rate DESC
    LIMIT 10
  `;

  const stmt = db.prepare(query);
  const results = stmt.all(campaignId) as { state: string; conversion_rate: number }[];

  return results.map(r => ({
    state: r.state,
    conversion_rate: r.conversion_rate || 0,
  }));
}

/**
 * Get geographic performance patterns
 */
export function getGeographicPatterns(daysBack: number = 90): GeographicPattern[] {
  const db = getDatabase();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

  const query = `
    SELECT
      s.region,
      s.state,
      COUNT(DISTINCT dep.campaign_id) as total_campaigns,
      CAST(COUNT(DISTINCT conv.id) AS FLOAT) / NULLIF(COUNT(DISTINCT r.id), 0) as avg_conversion_rate,
      AVG(CASE
        WHEN conv.created_at IS NOT NULL AND r.created_at IS NOT NULL
        THEN (julianday(conv.created_at) - julianday(r.created_at)) * 24
      END) as avg_time_to_conversion_hours

    FROM retail_stores s
    LEFT JOIN retail_campaign_deployments dep ON dep.store_id = s.id AND dep.created_at >= ?
    LEFT JOIN retail_deployment_recipients dr ON dr.deployment_id = dep.id
    LEFT JOIN recipients r ON r.id = dr.recipient_id
    LEFT JOIN conversions conv ON conv.tracking_id = r.tracking_id

    GROUP BY s.region, s.state
    HAVING COUNT(DISTINCT dep.campaign_id) > 0
    ORDER BY avg_conversion_rate DESC
  `;

  const stmt = db.prepare(query);
  const results = stmt.all(cutoffDateStr) as GeographicPattern[];

  return results.map(r => ({
    ...r,
    avg_conversion_rate: r.avg_conversion_rate || 0,
    avg_time_to_conversion_hours: r.avg_time_to_conversion_hours || 0,
  }));
}

/**
 * Get stores that are similar to a given store based on performance and geography
 */
export function findSimilarStores(
  storeId: string,
  limit: number = 10
): StorePerformanceMetrics[] {
  const db = getDatabase();

  // First get the target store's characteristics
  const targetQuery = `
    SELECT
      region,
      state,
      CAST(COUNT(DISTINCT conv.id) AS FLOAT) / NULLIF(COUNT(DISTINCT r.id), 0) as conversion_rate
    FROM retail_stores s
    LEFT JOIN retail_campaign_deployments dep ON dep.store_id = s.id
    LEFT JOIN retail_deployment_recipients dr ON dr.deployment_id = dep.id
    LEFT JOIN recipients r ON r.id = dr.recipient_id
    LEFT JOIN conversions conv ON conv.tracking_id = r.tracking_id
    WHERE s.id = ?
    GROUP BY s.region, s.state
  `;

  const targetStmt = db.prepare(targetQuery);
  const target = targetStmt.get(storeId) as { region: string; state: string; conversion_rate: number } | undefined;

  if (!target) {
    return [];
  }

  // Find similar stores (same region, similar conversion rate)
  const allStores = getAllStorePerformanceMetrics(90);

  return allStores
    .filter(s => s.store_id !== storeId)
    .filter(s => s.region === target.region || s.state === target.state)
    .sort((a, b) => {
      // Calculate similarity score
      const regionMatch = (a.region === target.region ? 2 : 0) + (a.state === target.state ? 1 : 0);
      const conversionDiff = Math.abs(a.avg_conversion_rate - (target.conversion_rate || 0));
      const score = regionMatch - conversionDiff;

      const regionMatchB = (b.region === target.region ? 2 : 0) + (b.state === target.state ? 1 : 0);
      const conversionDiffB = Math.abs(b.avg_conversion_rate - (target.conversion_rate || 0));
      const scoreB = regionMatchB - conversionDiffB;

      return scoreB - score;
    })
    .slice(0, limit);
}
