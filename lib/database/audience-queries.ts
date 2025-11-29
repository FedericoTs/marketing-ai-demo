/**
 * Audience Targeting - Supabase Query Functions
 * Type-safe operations for audience_filters and contact_purchases tables
 * Uses Row-Level Security (RLS) for multi-tenant data isolation
 */

import { createAdminClient, createUserClient } from './supabase-queries';
import type { AudienceFilters, SavedAudience, ContactPurchaseRecord } from '@/lib/audience';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CreateAudienceInput {
  organizationId: string;
  createdBy: string;
  name: string;
  description?: string;
  tags?: string[];
  filters: AudienceFilters;
  lastCount?: number;
  lastEstimatedCost?: number;
  lastUserCharge?: number;
}

export interface UpdateAudienceInput {
  name?: string;
  description?: string;
  tags?: string[];
  filters?: AudienceFilters;
  lastCount?: number;
  lastEstimatedCost?: number;
  lastUserCharge?: number;
}

export interface CreateContactPurchaseInput {
  organizationId: string;
  purchasedBy: string;
  audienceFilterId?: string | null;
  filters: AudienceFilters;
  contactCount: number;
  costPerContact: number;
  totalCost: number;
  userChargePerContact: number;
  totalUserCharge: number;
  provider?: string;
  providerTransactionId?: string;
  campaignId?: string | null;
  contactData?: any; // JSONB array of contact records
  status?: 'pending' | 'processing' | 'completed' | 'failed';
}

// ============================================================================
// AUDIENCE_FILTERS QUERIES
// ============================================================================

/**
 * Get all audience filters for an organization
 * Uses RLS - automatically filters by user's organization
 */
export async function getOrganizationAudiences(
  organizationId: string
): Promise<SavedAudience[]> {
  const supabase = createUserClient();

  const { data, error } = await supabase
    .from('audience_filters' as any)
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching audiences:', error);
    throw new Error(`Failed to fetch audiences: ${error.message}`);
  }

  return (data as any[]).map(mapToSavedAudience);
}

/**
 * Get a single audience by ID
 * Uses RLS - only returns if user has access
 */
export async function getAudienceById(
  audienceId: string
): Promise<SavedAudience | null> {
  const supabase = createUserClient();

  const { data, error } = await supabase
    .from('audience_filters' as any)
    .select('*')
    .eq('id', audienceId)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching audience:', error);
    throw new Error(`Failed to fetch audience: ${error.message}`);
  }

  return data ? mapToSavedAudience(data) : null;
}

/**
 * Create a new audience filter
 * RLS automatically ensures user belongs to organization
 */
export async function createAudience(
  input: CreateAudienceInput
): Promise<SavedAudience> {
  const supabase = createUserClient();

  const { data, error } = await (supabase
    .from('audience_filters' as any)
    .insert({
      organization_id: input.organizationId,
      created_by: input.createdBy,
      name: input.name,
      description: input.description,
      tags: input.tags || [],
      filters: input.filters as any,
      last_count: input.lastCount,
      last_count_updated_at: input.lastCount ? new Date().toISOString() : null,
      last_estimated_cost: input.lastEstimatedCost,
      last_user_charge: input.lastUserCharge,
    } as any)
    .select()
    .single() as any);

  if (error) {
    console.error('Error creating audience:', error);
    throw new Error(`Failed to create audience: ${error.message}`);
  }

  return mapToSavedAudience(data);
}

/**
 * Update an existing audience filter
 * RLS automatically ensures user has permission
 */
export async function updateAudience(
  audienceId: string,
  updates: UpdateAudienceInput
): Promise<SavedAudience> {
  const supabase = createUserClient();

  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.tags !== undefined) updateData.tags = updates.tags;
  if (updates.filters !== undefined) updateData.filters = updates.filters;
  if (updates.lastCount !== undefined) {
    updateData.last_count = updates.lastCount;
    updateData.last_count_updated_at = new Date().toISOString();
  }
  if (updates.lastEstimatedCost !== undefined) {
    updateData.last_estimated_cost = updates.lastEstimatedCost;
  }
  if (updates.lastUserCharge !== undefined) {
    updateData.last_user_charge = updates.lastUserCharge;
  }

  const { data, error } = await ((supabase
    .from('audience_filters' as any) as any)
    .update(updateData)
    .eq('id', audienceId)
    .is('deleted_at', null)
    .select()
    .single());

  if (error) {
    console.error('Error updating audience:', error);
    throw new Error(`Failed to update audience: ${error.message}`);
  }

  return mapToSavedAudience(data);
}

/**
 * Soft delete an audience filter
 * RLS automatically ensures user has permission
 */
export async function deleteAudience(audienceId: string): Promise<void> {
  const supabase = createUserClient();

  const { error } = await ((supabase
    .from('audience_filters' as any) as any)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', audienceId)
    .is('deleted_at', null));

  if (error) {
    console.error('Error deleting audience:', error);
    throw new Error(`Failed to delete audience: ${error.message}`);
  }
}

/**
 * Update last used timestamp when audience is used in a campaign
 */
export async function markAudienceUsed(audienceId: string): Promise<void> {
  const supabase = createUserClient();

  const { error } = await ((supabase
    .from('audience_filters' as any) as any)
    .update({
      last_used_at: new Date().toISOString(),
    })
    .eq('id', audienceId));

  if (error) {
    console.error('Error marking audience as used:', error);
    // Don't throw - this is a non-critical update
  }
}

/**
 * Increment usage counter and update performance metrics
 */
export async function updateAudiencePerformance(
  audienceId: string,
  metrics: {
    campaignCount?: number;
    contactsPurchased?: number;
    responseRate?: number;
    conversionRate?: number;
  }
): Promise<void> {
  const supabase = createAdminClient(); // Use admin for atomic updates

  // Fetch current values
  const { data: current } = await ((supabase
    .from('audience_filters' as any) as any)
    .select('total_campaigns_using, total_contacts_purchased, avg_response_rate, avg_conversion_rate')
    .eq('id', audienceId)
    .single());

  if (!current) return;

  const updates: any = {};

  if (metrics.campaignCount !== undefined) {
    updates.total_campaigns_using = (current.total_campaigns_using || 0) + metrics.campaignCount;
  }

  if (metrics.contactsPurchased !== undefined) {
    updates.total_contacts_purchased = (current.total_contacts_purchased || 0) + metrics.contactsPurchased;
  }

  // Calculate running averages for response/conversion rates
  if (metrics.responseRate !== undefined) {
    const currentAvg = current.avg_response_rate || 0;
    const currentCount = current.total_campaigns_using || 0;
    updates.avg_response_rate = ((currentAvg * currentCount) + metrics.responseRate) / (currentCount + 1);
  }

  if (metrics.conversionRate !== undefined) {
    const currentAvg = current.avg_conversion_rate || 0;
    const currentCount = current.total_campaigns_using || 0;
    updates.avg_conversion_rate = ((currentAvg * currentCount) + metrics.conversionRate) / (currentCount + 1);
  }

  if (Object.keys(updates).length > 0) {
    await ((supabase
      .from('audience_filters' as any) as any)
      .update(updates)
      .eq('id', audienceId));
  }
}

/**
 * Search audiences by name/description/tags
 */
export async function searchAudiences(
  organizationId: string,
  query: string
): Promise<SavedAudience[]> {
  const supabase = createUserClient();

  const { data, error } = await ((supabase
    .from('audience_filters' as any) as any)
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
    .order('created_at', { ascending: false }));

  if (error) {
    console.error('Error searching audiences:', error);
    throw new Error(`Failed to search audiences: ${error.message}`);
  }

  return (data as any[]).map(mapToSavedAudience);
}

/**
 * Get top performing audiences by conversion rate
 */
export async function getTopPerformingAudiences(
  organizationId: string,
  limit: number = 10
): Promise<SavedAudience[]> {
  const supabase = createUserClient();

  const { data, error } = await supabase
    .from('audience_filters' as any)
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .not('avg_conversion_rate', 'is', null)
    .order('avg_conversion_rate', { ascending: false })
    .order('total_campaigns_using', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching top audiences:', error);
    throw new Error(`Failed to fetch top audiences: ${error.message}`);
  }

  return (data as any[]).map(mapToSavedAudience);
}

// ============================================================================
// CONTACT_PURCHASES QUERIES
// ============================================================================

/**
 * Create a contact purchase record
 * Used when purchasing contacts from Data Axle
 */
export async function createContactPurchase(
  input: CreateContactPurchaseInput
): Promise<ContactPurchaseRecord> {
  const supabase = createUserClient();

  const { data, error } = await ((supabase
    .from('contact_purchases' as any) as any)
    .insert({
      organization_id: input.organizationId,
      purchased_by: input.purchasedBy,
      audience_filter_id: input.audienceFilterId,
      filters: input.filters as any,
      contact_count: input.contactCount,
      cost_per_contact: input.costPerContact,
      total_cost: input.totalCost,
      user_charge_per_contact: input.userChargePerContact,
      total_user_charge: input.totalUserCharge,
      provider: input.provider || 'data_axle',
      provider_transaction_id: input.providerTransactionId,
      campaign_id: input.campaignId,
      contact_data: input.contactData,
      status: input.status || 'completed',
    })
    .select()
    .single());

  if (error) {
    console.error('Error creating contact purchase:', error);
    throw new Error(`Failed to create contact purchase: ${error.message}`);
  }

  return mapToContactPurchase(data);
}

/**
 * Get all contact purchases for an organization
 */
export async function getOrganizationPurchases(
  organizationId: string,
  limit?: number
): Promise<ContactPurchaseRecord[]> {
  const supabase = createUserClient();

  let query = (supabase
    .from('contact_purchases' as any) as any)
    .select('*')
    .eq('organization_id', organizationId)
    .order('purchased_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching purchases:', error);
    throw new Error(`Failed to fetch purchases: ${error.message}`);
  }

  return (data as any[]).map(mapToContactPurchase);
}

/**
 * Get purchase statistics for an organization
 */
export async function getPurchaseStats(organizationId: string): Promise<{
  totalPurchases: number;
  totalContacts: number;
  totalCost: number;
  totalRevenue: number;
  totalMargin: number;
}> {
  const supabase = createUserClient();

  const { data, error } = await ((supabase
    .from('contact_purchases' as any) as any)
    .select('contact_count, total_cost, total_user_charge')
    .eq('organization_id', organizationId)
    .eq('status', 'completed'));

  if (error) {
    console.error('Error fetching purchase stats:', error);
    throw new Error(`Failed to fetch purchase stats: ${error.message}`);
  }

  const stats = (data as any[]).reduce(
    (acc, purchase) => ({
      totalPurchases: acc.totalPurchases + 1,
      totalContacts: acc.totalContacts + (purchase.contact_count || 0),
      totalCost: acc.totalCost + (purchase.total_cost || 0),
      totalRevenue: acc.totalRevenue + (purchase.total_user_charge || 0),
      totalMargin: acc.totalMargin + ((purchase.total_user_charge || 0) - (purchase.total_cost || 0)),
    }),
    { totalPurchases: 0, totalContacts: 0, totalCost: 0, totalRevenue: 0, totalMargin: 0 }
  );

  return stats;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Map database record to SavedAudience type
 */
function mapToSavedAudience(row: any): SavedAudience {
  return {
    id: row.id,
    organization_id: row.organization_id,
    created_by: row.created_by,
    name: row.name,
    description: row.description,
    tags: row.tags || [],
    filters: row.filters,
    last_count: row.last_count,
    last_count_updated_at: row.last_count_updated_at,
    last_estimated_cost: row.last_estimated_cost ? Number(row.last_estimated_cost) : undefined,
    total_campaigns_using: row.total_campaigns_using || 0,
    avg_response_rate: row.avg_response_rate ? Number(row.avg_response_rate) : undefined,
    avg_conversion_rate: row.avg_conversion_rate ? Number(row.avg_conversion_rate) : undefined,
    is_public: row.is_public || false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Map database record to ContactPurchaseRecord type
 */
function mapToContactPurchase(row: any): ContactPurchaseRecord {
  return {
    id: row.id,
    organization_id: row.organization_id,
    purchased_by: row.purchased_by,
    filters: row.filters,
    contact_count: row.contact_count,
    cost_per_contact: Number(row.cost_per_contact),
    total_cost: Number(row.total_cost),
    user_charge_per_contact: Number(row.user_charge_per_contact),
    total_user_charge: Number(row.total_user_charge),
    margin: Number(row.margin),
    audience_filter_id: row.audience_filter_id,
    provider: row.provider,
    status: row.status,
    error_message: row.error_message,
    purchased_at: row.purchased_at,
  };
}
