/**
 * Retail Store Database Queries
 * STUBBED: SQLite tables not yet in Supabase
 */

import { nanoid } from "nanoid";

// ==================== TYPES ====================

export interface RetailStore {
  id: string;
  store_number: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  region?: string;
  district?: string;
  size_category?: string;
  demographic_profile?: string;
  lat?: number;
  lng?: number;
  timezone?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface StoreWithStats extends RetailStore {
  total_campaigns?: number;
  total_recipients?: number;
  total_conversions?: number;
  conversion_rate?: number;
}

export interface PaginatedStores {
  stores: StoreWithStats[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface StoreQueryOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  region?: string;
  state?: string;
  isActive?: boolean;
  sortBy?: 'store_number' | 'name' | 'city' | 'created_at';
  sortOrder?: 'ASC' | 'DESC';
}

// ==================== STORE CRUD (STUBBED) ====================

export function createRetailStore(data: {
  storeNumber: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  region?: string;
  district?: string;
  sizeCategory?: string;
  demographicProfile?: object;
  lat?: number;
  lng?: number;
  timezone?: string;
}): RetailStore {
  console.log('[retail-queries] createRetailStore stubbed');
  const now = new Date().toISOString();
  return {
    id: nanoid(16),
    store_number: data.storeNumber,
    name: data.name,
    address: data.address,
    city: data.city,
    state: data.state,
    zip: data.zip,
    region: data.region,
    district: data.district,
    size_category: data.sizeCategory,
    demographic_profile: data.demographicProfile ? JSON.stringify(data.demographicProfile) : undefined,
    lat: data.lat,
    lng: data.lng,
    timezone: data.timezone || 'America/New_York',
    is_active: 1,
    created_at: now,
    updated_at: now,
  };
}

export function getRetailStoreById(id: string): RetailStore | null {
  console.log('[retail-queries] getRetailStoreById stubbed');
  return null;
}

export function getRetailStoreByNumber(storeNumber: string): RetailStore | null {
  console.log('[retail-queries] getRetailStoreByNumber stubbed');
  return null;
}

export function getRetailStores(options: StoreQueryOptions = {}): PaginatedStores {
  console.log('[retail-queries] getRetailStores stubbed');
  return {
    stores: [],
    total: 0,
    page: options.page || 1,
    pageSize: options.pageSize || 50,
    totalPages: 0,
  };
}

export function updateRetailStore(
  id: string,
  data: Partial<Omit<RetailStore, 'id' | 'created_at' | 'updated_at'>>
): boolean {
  console.log('[retail-queries] updateRetailStore stubbed');
  return false;
}

export function deleteRetailStore(id: string): boolean {
  console.log('[retail-queries] deleteRetailStore stubbed');
  return false;
}

export function bulkCreateRetailStores(
  stores: Array<{
    storeNumber: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    region?: string;
    district?: string;
    sizeCategory?: string;
    demographicProfile?: object;
    lat?: number;
    lng?: number;
    timezone?: string;
  }>
): { created: number; errors: Array<{ row: number; error: string }> } {
  console.log('[retail-queries] bulkCreateRetailStores stubbed');
  return { created: 0, errors: [] };
}

export function getRetailRegions(): string[] {
  console.log('[retail-queries] getRetailRegions stubbed');
  return [];
}

export function getRetailStates(): string[] {
  console.log('[retail-queries] getRetailStates stubbed');
  return [];
}

export function getRetailStoreCount(): number {
  console.log('[retail-queries] getRetailStoreCount stubbed');
  return 0;
}

// ==================== CAMPAIGN DEPLOYMENTS (STUBBED) ====================

export function createCampaignDeployment(data: {
  campaignId: string;
  storeId: string;
  ageGroupId?: string;
  creativeVariantId?: string;
}): { id: string } {
  console.log('[retail-queries] createCampaignDeployment stubbed');
  return { id: nanoid(16) };
}

export function linkRecipientToDeployment(deploymentId: string, recipientId: string): void {
  console.log('[retail-queries] linkRecipientToDeployment stubbed');
}

export function updateDeploymentRecipientCount(deploymentId: string, count: number): void {
  console.log('[retail-queries] updateDeploymentRecipientCount stubbed');
}

export function getCampaignDeployments(campaignId: string): any[] {
  console.log('[retail-queries] getCampaignDeployments stubbed');
  return [];
}

export function getDeploymentStats(campaignId: string): any[] {
  console.log('[retail-queries] getDeploymentStats stubbed');
  return [];
}

// ==================== PERFORMANCE AGGREGATION (STUBBED) ====================

export function aggregateStorePerformance(storeId: string, timePeriod: string = 'all_time'): void {
  console.log('[retail-queries] aggregateStorePerformance stubbed');
}

export function aggregateAllStoresPerformance(timePeriod: string = 'all_time'): void {
  console.log('[retail-queries] aggregateAllStoresPerformance stubbed');
}

export function getStorePerformanceAggregate(storeId: string, timePeriod: string = 'all_time'): any {
  console.log('[retail-queries] getStorePerformanceAggregate stubbed');
  return null;
}

export function getTopPerformingStores(
  limit: number = 10,
  sortBy: 'conversion_rate' | 'conversions_count' | 'recipients_count' = 'conversion_rate'
): any[] {
  console.log('[retail-queries] getTopPerformingStores stubbed');
  return [];
}

export function getRegionalPerformance(): any[] {
  console.log('[retail-queries] getRegionalPerformance stubbed');
  return [];
}

export function getOverallRetailStats(): {
  totalStores: number;
  storesWithDeployments: number;
  totalDeployments: number;
  totalRecipients: number;
  totalVisitors: number;
  totalConversions: number;
  avgConversionRate: number;
} {
  console.log('[retail-queries] getOverallRetailStats stubbed');
  return {
    totalStores: 0,
    storesWithDeployments: 0,
    totalDeployments: 0,
    totalRecipients: 0,
    totalVisitors: 0,
    totalConversions: 0,
    avgConversionRate: 0,
  };
}

export function getStoreEngagementMetrics(storeId: string): {
  avgTimeToFirstView: number | null;
  recipientsWithViews: number;
  avgTimeToConversion: number | null;
  conversionsCount: number;
  avgTotalTimeToConversion: number | null;
} {
  console.log('[retail-queries] getStoreEngagementMetrics stubbed');
  return {
    avgTimeToFirstView: null,
    recipientsWithViews: 0,
    avgTimeToConversion: null,
    conversionsCount: 0,
    avgTotalTimeToConversion: null,
  };
}

export function getAllStoresEngagementMetrics(): any[] {
  console.log('[retail-queries] getAllStoresEngagementMetrics stubbed');
  return [];
}
