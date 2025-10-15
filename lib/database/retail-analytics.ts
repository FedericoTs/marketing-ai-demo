import { getDatabase } from './connection';
import { RetailStore } from './retail-queries';

/**
 * Advanced Retail Analytics
 * Pure statistical analysis - no AI costs
 */

// ==================== PERFORMANCE CLUSTERING ====================

export interface StorePerformanceCluster {
  cluster: 'high' | 'medium' | 'low';
  stores: Array<{
    id: string;
    store_number: string;
    name: string;
    conversion_rate: number;
    conversions: number;
    recipients: number;
  }>;
  avgConversionRate: number;
  storeCount: number;
}

/**
 * Cluster stores into performance tiers based on conversion rates
 */
export function getStorePerformanceClusters(): StorePerformanceCluster[] {
  const db = getDatabase();

  // Get all stores with their performance metrics
  const storeStats = db
    .prepare(
      `
    SELECT
      s.id,
      s.store_number,
      s.name,
      COUNT(DISTINCT d.id) as deployment_count,
      COUNT(DISTINCT rdr.recipient_id) as total_recipients,
      COUNT(DISTINCT c.id) as total_conversions,
      CASE
        WHEN COUNT(DISTINCT rdr.recipient_id) > 0
        THEN CAST(COUNT(DISTINCT c.id) AS FLOAT) / COUNT(DISTINCT rdr.recipient_id) * 100
        ELSE 0
      END as conversion_rate
    FROM retail_stores s
    LEFT JOIN retail_campaign_deployments d ON s.id = d.store_id
    LEFT JOIN retail_deployment_recipients rdr ON d.id = rdr.deployment_id
    LEFT JOIN recipients r ON rdr.recipient_id = r.id
    LEFT JOIN conversions c ON r.tracking_id = c.tracking_id
    WHERE s.is_active = 1
    GROUP BY s.id
    HAVING deployment_count > 0
    ORDER BY conversion_rate DESC
  `
    )
    .all() as any[];

  if (storeStats.length === 0) {
    return [
      { cluster: 'high', stores: [], avgConversionRate: 0, storeCount: 0 },
      { cluster: 'medium', stores: [], avgConversionRate: 0, storeCount: 0 },
      { cluster: 'low', stores: [], avgConversionRate: 0, storeCount: 0 },
    ];
  }

  // Calculate percentiles for clustering
  const sortedRates = storeStats.map((s) => s.conversion_rate).sort((a, b) => b - a);
  const p33 = sortedRates[Math.floor(sortedRates.length * 0.33)] || 0;
  const p66 = sortedRates[Math.floor(sortedRates.length * 0.66)] || 0;

  // Cluster stores
  const high: any[] = [];
  const medium: any[] = [];
  const low: any[] = [];

  storeStats.forEach((store) => {
    const storeData = {
      id: store.id,
      store_number: store.store_number,
      name: store.name,
      conversion_rate: store.conversion_rate,
      conversions: store.total_conversions,
      recipients: store.total_recipients,
    };

    if (store.conversion_rate >= p33) {
      high.push(storeData);
    } else if (store.conversion_rate >= p66) {
      medium.push(storeData);
    } else {
      low.push(storeData);
    }
  });

  return [
    {
      cluster: 'high',
      stores: high,
      avgConversionRate:
        high.reduce((sum, s) => sum + s.conversion_rate, 0) / (high.length || 1),
      storeCount: high.length,
    },
    {
      cluster: 'medium',
      stores: medium,
      avgConversionRate:
        medium.reduce((sum, s) => sum + s.conversion_rate, 0) / (medium.length || 1),
      storeCount: medium.length,
    },
    {
      cluster: 'low',
      stores: low,
      avgConversionRate:
        low.reduce((sum, s) => sum + s.conversion_rate, 0) / (low.length || 1),
      storeCount: low.length,
    },
  ];
}

// ==================== PERFORMANCE BY ATTRIBUTES ====================

export interface AttributePerformance {
  attribute: string;
  value: string;
  storeCount: number;
  totalRecipients: number;
  totalConversions: number;
  avgConversionRate: number;
}

/**
 * Analyze performance by store attributes (size, region, district)
 */
export function getPerformanceByAttribute(
  attribute: 'size_category' | 'region' | 'district'
): AttributePerformance[] {
  const db = getDatabase();

  const results = db
    .prepare(
      `
    SELECT
      s.${attribute} as value,
      COUNT(DISTINCT s.id) as store_count,
      COUNT(DISTINCT r.id) as total_recipients,
      COUNT(DISTINCT c.id) as total_conversions,
      CASE
        WHEN COUNT(DISTINCT r.id) > 0
        THEN CAST(COUNT(DISTINCT c.id) AS FLOAT) / COUNT(DISTINCT r.id) * 100
        ELSE 0
      END as avg_conversion_rate
    FROM retail_stores s
    LEFT JOIN retail_campaign_deployments d ON s.id = d.store_id
    LEFT JOIN retail_deployment_recipients rdr ON d.id = rdr.deployment_id
    LEFT JOIN recipients r ON rdr.recipient_id = r.id
    LEFT JOIN conversions c ON r.tracking_id = c.tracking_id
    WHERE s.is_active = 1 AND s.${attribute} IS NOT NULL
    GROUP BY s.${attribute}
    ORDER BY avg_conversion_rate DESC
  `
    )
    .all() as any[];

  return results.map((row) => ({
    attribute,
    value: row.value || 'Unknown',
    storeCount: row.store_count,
    totalRecipients: row.total_recipients,
    totalConversions: row.total_conversions,
    avgConversionRate: row.avg_conversion_rate,
  }));
}

// ==================== TIME-BASED PATTERNS ====================

export interface TimePattern {
  period: string; // 'Monday', 'Week 1', 'January', etc.
  recipients: number;
  conversions: number;
  conversionRate: number;
  deploymentCount: number;
}

/**
 * Analyze performance patterns by time period
 */
export function getTimeBasedPatterns(
  groupBy: 'dayofweek' | 'week' | 'month'
): TimePattern[] {
  const db = getDatabase();

  let dateFormat: string;
  let periodName: string;

  switch (groupBy) {
    case 'dayofweek':
      // SQLite strftime '%w' returns 0-6 (Sunday=0)
      dateFormat = "strftime('%w', d.created_at)";
      periodName = 'day_num';
      break;
    case 'week':
      dateFormat = "strftime('%W', d.created_at)";
      periodName = 'week';
      break;
    case 'month':
      dateFormat = "strftime('%m', d.created_at)";
      periodName = 'month';
      break;
  }

  const results = db
    .prepare(
      `
    SELECT
      ${dateFormat} as period,
      COUNT(DISTINCT d.id) as deployment_count,
      COUNT(DISTINCT r.id) as recipients,
      COUNT(DISTINCT c.id) as conversions,
      CASE
        WHEN COUNT(DISTINCT r.id) > 0
        THEN CAST(COUNT(DISTINCT c.id) AS FLOAT) / COUNT(DISTINCT r.id) * 100
        ELSE 0
      END as conversion_rate
    FROM retail_campaign_deployments d
    LEFT JOIN retail_deployment_recipients rdr ON d.id = rdr.deployment_id
    LEFT JOIN recipients r ON rdr.recipient_id = r.id
    LEFT JOIN conversions c ON r.tracking_id = c.tracking_id
    GROUP BY period
    ORDER BY period
  `
    )
    .all() as any[];

  // Format period names
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return results.map((row) => {
    let periodLabel = row.period;

    if (groupBy === 'dayofweek') {
      periodLabel = dayNames[parseInt(row.period)] || row.period;
    } else if (groupBy === 'month') {
      periodLabel = monthNames[parseInt(row.period) - 1] || row.period;
    } else if (groupBy === 'week') {
      periodLabel = `Week ${row.period}`;
    }

    return {
      period: periodLabel,
      recipients: row.recipients,
      conversions: row.conversions,
      conversionRate: row.conversion_rate,
      deploymentCount: row.deployment_count,
    };
  });
}

// ==================== TOP/BOTTOM PERFORMERS ====================

export interface TopPerformer {
  id: string;
  store_number: string;
  name: string;
  city: string;
  state: string;
  region: string | null;
  district: string | null;
  conversion_rate: number;
  conversions: number;
  recipients: number;
  deployment_count: number;
}

/**
 * Get top performing stores
 */
export function getTopPerformers(limit: number = 10, metric: 'conversion_rate' | 'conversions' = 'conversion_rate'): TopPerformer[] {
  const db = getDatabase();

  const orderBy = metric === 'conversion_rate' ? 'conversion_rate DESC' : 'total_conversions DESC';

  const results = db
    .prepare(
      `
    SELECT
      s.id,
      s.store_number,
      s.name,
      s.city,
      s.state,
      s.region,
      s.district,
      COUNT(DISTINCT d.id) as deployment_count,
      COUNT(DISTINCT r.id) as recipients,
      COUNT(DISTINCT c.id) as total_conversions,
      CASE
        WHEN COUNT(DISTINCT r.id) > 0
        THEN CAST(COUNT(DISTINCT c.id) AS FLOAT) / COUNT(DISTINCT r.id) * 100
        ELSE 0
      END as conversion_rate
    FROM retail_stores s
    LEFT JOIN retail_campaign_deployments d ON s.id = d.store_id
    LEFT JOIN retail_deployment_recipients rdr ON d.id = rdr.deployment_id
    LEFT JOIN recipients r ON rdr.recipient_id = r.id
    LEFT JOIN conversions c ON r.tracking_id = c.tracking_id
    WHERE s.is_active = 1
    GROUP BY s.id
    HAVING deployment_count > 0
    ORDER BY ${orderBy}
    LIMIT ?
  `
    )
    .all(limit) as any[];

  return results.map((row) => ({
    id: row.id,
    store_number: row.store_number,
    name: row.name,
    city: row.city,
    state: row.state,
    region: row.region,
    district: row.district,
    conversion_rate: row.conversion_rate,
    conversions: row.total_conversions,
    recipients: row.recipients,
    deployment_count: row.deployment_count,
  }));
}

/**
 * Get underperforming stores (below threshold)
 */
export function getUnderperformers(
  threshold: number = 5.0
): TopPerformer[] {
  const db = getDatabase();

  const results = db
    .prepare(
      `
    SELECT
      s.id,
      s.store_number,
      s.name,
      s.city,
      s.state,
      s.region,
      s.district,
      COUNT(DISTINCT d.id) as deployment_count,
      COUNT(DISTINCT r.id) as recipients,
      COUNT(DISTINCT c.id) as total_conversions,
      CASE
        WHEN COUNT(DISTINCT r.id) > 0
        THEN CAST(COUNT(DISTINCT c.id) AS FLOAT) / COUNT(DISTINCT r.id) * 100
        ELSE 0
      END as conversion_rate
    FROM retail_stores s
    LEFT JOIN retail_campaign_deployments d ON s.id = d.store_id
    LEFT JOIN retail_deployment_recipients rdr ON d.id = rdr.deployment_id
    LEFT JOIN recipients r ON rdr.recipient_id = r.id
    LEFT JOIN conversions c ON r.tracking_id = c.tracking_id
    WHERE s.is_active = 1
    GROUP BY s.id
    HAVING deployment_count > 0 AND conversion_rate < ?
    ORDER BY conversion_rate ASC
  `
    )
    .all(threshold) as any[];

  return results.map((row) => ({
    id: row.id,
    store_number: row.store_number,
    name: row.name,
    city: row.city,
    state: row.state,
    region: row.region,
    district: row.district,
    conversion_rate: row.conversion_rate,
    conversions: row.total_conversions,
    recipients: row.recipients,
    deployment_count: row.deployment_count,
  }));
}

// ==================== REGIONAL PERFORMANCE ====================

export interface RegionalPerformance {
  region: string;
  storeCount: number;
  deploymentCount: number;
  recipients: number;
  conversions: number;
  conversionRate: number;
  avgConversionPerStore: number;
}

/**
 * Get performance aggregated by region
 */
export function getRegionalPerformance(): RegionalPerformance[] {
  const db = getDatabase();

  const results = db
    .prepare(
      `
    SELECT
      COALESCE(s.region, 'Unknown') as region,
      COUNT(DISTINCT s.id) as store_count,
      COUNT(DISTINCT d.id) as deployment_count,
      COUNT(DISTINCT r.id) as recipients,
      COUNT(DISTINCT c.id) as conversions,
      CASE
        WHEN COUNT(DISTINCT r.id) > 0
        THEN CAST(COUNT(DISTINCT c.id) AS FLOAT) / COUNT(DISTINCT r.id) * 100
        ELSE 0
      END as conversion_rate,
      CASE
        WHEN COUNT(DISTINCT s.id) > 0
        THEN CAST(COUNT(DISTINCT c.id) AS FLOAT) / COUNT(DISTINCT s.id)
        ELSE 0
      END as avg_conversion_per_store
    FROM retail_stores s
    LEFT JOIN retail_campaign_deployments d ON s.id = d.store_id
    LEFT JOIN retail_deployment_recipients rdr ON d.id = rdr.deployment_id
    LEFT JOIN recipients r ON rdr.recipient_id = r.id
    LEFT JOIN conversions c ON r.tracking_id = c.tracking_id
    WHERE s.is_active = 1
    GROUP BY region
    ORDER BY conversion_rate DESC
  `
    )
    .all() as any[];

  return results.map((row) => ({
    region: row.region,
    storeCount: row.store_count,
    deploymentCount: row.deployment_count,
    recipients: row.recipients,
    conversions: row.conversions,
    conversionRate: row.conversion_rate,
    avgConversionPerStore: row.avg_conversion_per_store,
  }));
}

// ==================== CORRELATION ANALYSIS ====================

export interface CorrelationInsight {
  factor: string;
  correlation: 'positive' | 'negative' | 'neutral';
  strength: 'strong' | 'moderate' | 'weak';
  description: string;
  data: AttributePerformance[];
}

/**
 * Analyze correlations between store attributes and performance
 */
export function getCorrelationAnalysis(): CorrelationInsight[] {
  const insights: CorrelationInsight[] = [];

  // Analyze size category correlation
  const sizePerformance = getPerformanceByAttribute('size_category');
  if (sizePerformance.length > 1) {
    const sorted = [...sizePerformance].sort(
      (a, b) => b.avgConversionRate - a.avgConversionRate
    );
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const diff = best.avgConversionRate - worst.avgConversionRate;

    insights.push({
      factor: 'Store Size',
      correlation: diff > 0 ? 'positive' : 'neutral',
      strength: diff > 10 ? 'strong' : diff > 5 ? 'moderate' : 'weak',
      description: `${best.value} stores show ${diff.toFixed(1)}% higher conversion rates than ${worst.value} stores`,
      data: sizePerformance,
    });
  }

  // Analyze region correlation
  const regionPerformance = getPerformanceByAttribute('region');
  if (regionPerformance.length > 1) {
    const sorted = [...regionPerformance].sort(
      (a, b) => b.avgConversionRate - a.avgConversionRate
    );
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const diff = best.avgConversionRate - worst.avgConversionRate;

    insights.push({
      factor: 'Geographic Region',
      correlation: diff > 0 ? 'positive' : 'neutral',
      strength: diff > 10 ? 'strong' : diff > 5 ? 'moderate' : 'weak',
      description: `${best.value} region outperforms ${worst.value} by ${diff.toFixed(1)}%`,
      data: regionPerformance,
    });
  }

  // Analyze district correlation
  const districtPerformance = getPerformanceByAttribute('district');
  if (districtPerformance.length > 1) {
    const sorted = [...districtPerformance].sort(
      (a, b) => b.avgConversionRate - a.avgConversionRate
    );
    const best = sorted[0];

    insights.push({
      factor: 'District',
      correlation: 'positive',
      strength: 'moderate',
      description: `District ${best.value} leads with ${best.avgConversionRate.toFixed(1)}% conversion rate`,
      data: districtPerformance.slice(0, 5), // Top 5 districts
    });
  }

  return insights;
}

// ==================== SUMMARY STATISTICS ====================

export interface RetailAnalyticsSummary {
  totalStores: number;
  activeStores: number;
  totalDeployments: number;
  totalRecipients: number;
  totalConversions: number;
  overallConversionRate: number;
  avgConversionsPerStore: number;
  avgDeploymentsPerStore: number;
  bestPerformingRegion: string | null;
  worstPerformingRegion: string | null;
}

/**
 * Get comprehensive analytics summary
 */
export function getRetailAnalyticsSummary(): RetailAnalyticsSummary {
  const db = getDatabase();

  const summary = db
    .prepare(
      `
    SELECT
      COUNT(DISTINCT s.id) as total_stores,
      COUNT(DISTINCT CASE WHEN s.is_active = 1 THEN s.id END) as active_stores,
      COUNT(DISTINCT d.id) as total_deployments,
      COUNT(DISTINCT r.id) as total_recipients,
      COUNT(DISTINCT c.id) as total_conversions,
      CASE
        WHEN COUNT(DISTINCT r.id) > 0
        THEN CAST(COUNT(DISTINCT c.id) AS FLOAT) / COUNT(DISTINCT r.id) * 100
        ELSE 0
      END as overall_conversion_rate
    FROM retail_stores s
    LEFT JOIN retail_campaign_deployments d ON s.id = d.store_id
    LEFT JOIN retail_deployment_recipients rdr ON d.id = rdr.deployment_id
    LEFT JOIN recipients r ON rdr.recipient_id = r.id
    LEFT JOIN conversions c ON r.tracking_id = c.tracking_id
  `
    )
    .get() as any;

  const regionalPerf = getRegionalPerformance();
  const bestRegion = regionalPerf.length > 0 ? regionalPerf[0].region : null;
  const worstRegion = regionalPerf.length > 0 ? regionalPerf[regionalPerf.length - 1].region : null;

  return {
    totalStores: summary.total_stores,
    activeStores: summary.active_stores,
    totalDeployments: summary.total_deployments,
    totalRecipients: summary.total_recipients,
    totalConversions: summary.total_conversions,
    overallConversionRate: summary.overall_conversion_rate,
    avgConversionsPerStore:
      summary.active_stores > 0 ? summary.total_conversions / summary.active_stores : 0,
    avgDeploymentsPerStore:
      summary.active_stores > 0 ? summary.total_deployments / summary.active_stores : 0,
    bestPerformingRegion: bestRegion,
    worstPerformingRegion: worstRegion,
  };
}
