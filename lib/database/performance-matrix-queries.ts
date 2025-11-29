/**
 * Performance Matrix Database Queries
 * STUBBED: SQLite tables not yet in Supabase
 */

export interface StorePerformanceMetrics {
  store_id: string;
  store_number: string;
  store_name: string;
  city: string;
  state: string;
  region: string;
  total_campaigns: number;
  total_recipients: number;
  total_conversions: number;
  avg_conversion_rate: number;
  avg_time_to_conversion_hours: number;
  total_revenue: number;
  total_cost: number;
  roi: number;
  recent_campaigns: number;
  recent_conversion_rate: number;
  recent_roi: number;
}

export interface CampaignCreativePerformance {
  campaign_id: string;
  campaign_name: string;
  total_stores: number;
  total_recipients: number;
  total_conversions: number;
  overall_conversion_rate: number;
  avg_time_to_conversion_hours: number;
  top_performing_regions: { region: string; conversion_rate: number }[];
  top_performing_states: { state: string; conversion_rate: number }[];
  total_cost: number;
  avg_cost_per_conversion: number;
}

export interface GeographicPattern {
  region: string;
  state?: string;
  city?: string;
  conversion_rate: number;
  avg_conversion_rate: number;
  total_conversions: number;
  total_recipients: number;
  performance_trend: 'improving' | 'stable' | 'declining';
}

export function getAllStorePerformanceMetrics(daysBack?: number): StorePerformanceMetrics[] {
  console.log('[performance-matrix-queries] getAllStorePerformanceMetrics stubbed');
  return [];
}

export function getCampaignCreativePerformance(campaignId: string): CampaignCreativePerformance | null {
  console.log('[performance-matrix-queries] getCampaignCreativePerformance stubbed');
  return null;
}

export function getAllCampaignCreativePerformance(daysBack?: number): CampaignCreativePerformance[] {
  console.log('[performance-matrix-queries] getAllCampaignCreativePerformance stubbed');
  return [];
}

export function getRecommendedStoresForCampaign(campaignId: string, limit?: number): StorePerformanceMetrics[] {
  console.log('[performance-matrix-queries] getRecommendedStoresForCampaign stubbed');
  return [];
}

export function getCrossCampaignPerformanceMatrix(): any[] {
  console.log('[performance-matrix-queries] getCrossCampaignPerformanceMatrix stubbed');
  return [];
}

export function getGeographicPatterns(daysBack?: number): any[] {
  console.log('[performance-matrix-queries] getGeographicPatterns stubbed');
  return [];
}

export function findSimilarStores(storeId: string, limit?: number): StorePerformanceMetrics[] {
  console.log('[performance-matrix-queries] findSimilarStores stubbed');
  return [];
}
