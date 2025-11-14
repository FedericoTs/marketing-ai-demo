/**
 * Campaign Management - Supabase Queries
 *
 * Replaces SQLite tracking-queries.ts with Supabase multi-tenant operations
 * Uses service role pattern for RLS bypass after explicit auth verification
 *
 * Migration: 019_campaigns_schema.sql
 * Date: 2025-11-06
 */

import { createServiceClient } from '@/lib/supabase/server';

// ==================== TYPES ====================

export interface Campaign {
  id: string;
  organization_id: string;
  created_by: string;
  name: string;
  description: string | null;
  template_id: string | null;
  recipient_list_id: string | null;
  design_snapshot: any; // JSONB - Frozen Fabric.js canvas
  variable_mappings_snapshot: any; // JSONB - Variable field mappings
  total_recipients: number;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'completed' | 'failed';
  scheduled_at: string | null;
  sent_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Nested relations (from JOIN queries)
  template?: {
    id: string;
    name: string;
    thumbnail_url: string | null;
  } | null;
  recipient_list?: {
    id: string;
    name: string;
    total_recipients: number;
  } | null;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  recipient_id: string;
  personalized_canvas_json: any; // JSONB - Personalized Fabric.js canvas
  tracking_code: string;
  qr_code_url: string | null;
  personalized_pdf_url: string | null;
  landing_page_url: string | null;
  status: 'pending' | 'generated' | 'sent' | 'delivered' | 'failed';
  sent_at: string | null;
  delivered_at: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  campaign_id: string;
  tracking_code: string;
  event_type: 'qr_scan' | 'page_view' | 'button_click' | 'form_view' | 'form_submit' | 'email_open' | 'email_click';
  event_data: any | null; // JSONB
  ip_address: string | null;
  user_agent: string | null;
  referrer: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  created_at: string;
}

export interface Conversion {
  id: string;
  campaign_id: string;
  tracking_code: string;
  conversion_type: 'form_submit' | 'appointment' | 'purchase' | 'call' | 'custom';
  conversion_value: number | null;
  conversion_data: any | null; // JSONB
  event_id: string | null;
  session_id: string | null;
  created_at: string;
}

export interface LandingPage {
  id: string;
  campaign_id: string;
  tracking_code: string;
  template_type: 'default' | 'appointment' | 'questionnaire' | 'product' | 'contact' | 'custom';
  page_config: any; // JSONB
  recipient_data: any | null; // JSONB
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ==================== CAMPAIGNS ====================

/**
 * Create a new campaign in user's organization
 * Note: Must provide organizationId and userId explicitly (from authenticated context)
 */
export async function createCampaign(data: {
  organizationId: string;
  userId: string;
  name: string;
  description?: string;
  templateId?: string;
  recipientListId?: string;
  designSnapshot: any;
  variableMappingsSnapshot: any;
  totalRecipients?: number;
  status?: Campaign['status'];
}): Promise<Campaign> {
  const supabase = createServiceClient();

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .insert({
      organization_id: data.organizationId,
      created_by: data.userId,
      name: data.name,
      description: data.description || null,
      template_id: data.templateId || null,
      recipient_list_id: data.recipientListId || null,
      design_snapshot: data.designSnapshot,
      variable_mappings_snapshot: data.variableMappingsSnapshot,
      total_recipients: data.totalRecipients || 0,
      status: data.status || 'draft',
    })
    .select()
    .single();

  if (error) {
    console.error('❌ [createCampaign] Error:', error);
    throw new Error(`Failed to create campaign: ${error.message}`);
  }

  console.log('✅ [createCampaign] Campaign created:', campaign.id, campaign.name);
  return campaign;
}

/**
 * Get campaign by ID (within organization)
 */
export async function getCampaignById(
  campaignId: string,
  organizationId: string
): Promise<Campaign | null> {
  const supabase = createServiceClient();

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('❌ [getCampaignById] Error:', error);
    throw new Error(`Failed to fetch campaign: ${error.message}`);
  }

  return campaign;
}

/**
 * Get campaign by ID (public - for landing pages)
 * Does NOT verify organization_id for public access
 */
export async function getCampaignPublic(
  campaignId: string
): Promise<Campaign | null> {
  const supabase = createServiceClient();

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('❌ [getCampaignPublic] Error:', error);
    return null;
  }

  return campaign;
}

/**
 * Get recipient by ID (public - for landing pages)
 */
export async function getRecipientPublic(
  recipientId: string
): Promise<any | null> {
  const supabase = createServiceClient();

  const { data: recipient, error } = await supabase
    .from('recipients')
    .select('*')
    .eq('id', recipientId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('❌ [getRecipientPublic] Error:', error);
    return null;
  }

  return recipient;
}

/**
 * Get all campaigns for organization
 */
export async function getAllCampaigns(
  organizationId: string,
  filters?: {
    status?: Campaign['status'];
    templateId?: string;
    recipientListId?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ campaigns: Campaign[]; total: number }> {
  const supabase = createServiceClient();

  let query = supabase
    .from('campaigns')
    .select(`
      *,
      template:design_templates(id, name, thumbnail_url),
      recipient_list:recipient_lists(id, name, total_recipients)
    `, { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.templateId) {
    query = query.eq('template_id', filters.templateId);
  }

  if (filters?.recipientListId) {
    query = query.eq('recipient_list_id', filters.recipientListId);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data: campaigns, error, count } = await query;

  if (error) {
    console.error('❌ [getAllCampaigns] Error:', error);
    throw new Error(`Failed to fetch campaigns: ${error.message}`);
  }

  return {
    campaigns: campaigns || [],
    total: count || 0,
  };
}

/**
 * Update campaign
 */
export async function updateCampaign(
  campaignId: string,
  organizationId: string,
  updates: Partial<Omit<Campaign, 'id' | 'organization_id' | 'created_by' | 'created_at' | 'updated_at'>>
): Promise<Campaign | null> {
  const supabase = createServiceClient();

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .update(updates)
    .eq('id', campaignId)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('❌ [updateCampaign] Error:', error);
    throw new Error(`Failed to update campaign: ${error.message}`);
  }

  console.log('✅ [updateCampaign] Campaign updated:', campaign.id);
  return campaign;
}

/**
 * Update campaign status
 */
export async function updateCampaignStatus(
  campaignId: string,
  organizationId: string,
  status: Campaign['status']
): Promise<boolean> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('campaigns')
    .update({ status })
    .eq('id', campaignId)
    .eq('organization_id', organizationId);

  if (error) {
    console.error('❌ [updateCampaignStatus] Error:', error);
    return false;
  }

  console.log('✅ [updateCampaignStatus] Status updated:', campaignId, status);
  return true;
}

/**
 * Delete campaign (CASCADE deletes recipients, events, conversions)
 */
export async function deleteCampaign(
  campaignId: string,
  organizationId: string
): Promise<boolean> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', campaignId)
    .eq('organization_id', organizationId);

  if (error) {
    console.error('❌ [deleteCampaign] Error:', error);
    return false;
  }

  console.log('✅ [deleteCampaign] Campaign deleted:', campaignId);
  return true;
}

// ==================== CAMPAIGN RECIPIENTS ====================

/**
 * Create campaign recipient
 */
export async function createCampaignRecipient(data: {
  campaignId: string;
  recipientId: string;
  personalizedCanvasJson: any;
  trackingCode: string;
  qrCodeUrl?: string;
  personalizedPdfUrl?: string;
  landingPageUrl?: string;
}): Promise<CampaignRecipient> {
  const supabase = createServiceClient();

  const { data: recipient, error } = await supabase
    .from('campaign_recipients')
    .insert({
      campaign_id: data.campaignId,
      recipient_id: data.recipientId,
      personalized_canvas_json: data.personalizedCanvasJson,
      tracking_code: data.trackingCode,
      qr_code_url: data.qrCodeUrl || null,
      personalized_pdf_url: data.personalizedPdfUrl || null,
      landing_page_url: data.landingPageUrl || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('❌ [createCampaignRecipient] Error:', error);
    throw new Error(`Failed to create campaign recipient: ${error.message}`);
  }

  return recipient;
}

/**
 * Get campaign recipients
 */
export async function getCampaignRecipients(
  campaignId: string,
  filters?: {
    status?: CampaignRecipient['status'];
    limit?: number;
    offset?: number;
  }
): Promise<{ recipients: CampaignRecipient[]; total: number }> {
  const supabase = createServiceClient();

  let query = supabase
    .from('campaign_recipients')
    .select('*', { count: 'exact' })
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1);
  }

  const { data: recipients, error, count } = await query;

  if (error) {
    console.error('❌ [getCampaignRecipients] Error:', error);
    throw new Error(`Failed to fetch campaign recipients: ${error.message}`);
  }

  return {
    recipients: recipients || [],
    total: count || 0,
  };
}

/**
 * Get campaign recipient by tracking code (public access for landing pages)
 */
export async function getCampaignRecipientByTrackingCode(
  trackingCode: string
): Promise<CampaignRecipient | null> {
  const supabase = createServiceClient();

  const { data: recipient, error } = await supabase
    .from('campaign_recipients')
    .select('*')
    .eq('tracking_code', trackingCode)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('❌ [getCampaignRecipientByTrackingCode] Error:', error);
    return null;
  }

  return recipient;
}

/**
 * Update campaign recipient status
 */
export async function updateCampaignRecipientStatus(
  recipientId: string,
  status: CampaignRecipient['status'],
  errorMessage?: string
): Promise<boolean> {
  const supabase = createServiceClient();

  const updates: any = { status };

  if (status === 'failed' && errorMessage) {
    updates.error_message = errorMessage;
    updates.retry_count = supabase.rpc('increment_retry_count', { recipient_id: recipientId });
  }

  if (status === 'sent') {
    updates.sent_at = new Date().toISOString();
  }

  if (status === 'delivered') {
    updates.delivered_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('campaign_recipients')
    .update(updates)
    .eq('id', recipientId);

  if (error) {
    console.error('❌ [updateCampaignRecipientStatus] Error:', error);
    return false;
  }

  return true;
}

// ==================== EVENTS ====================

/**
 * Track event (public endpoint - no auth required)
 */
export async function trackEvent(data: {
  campaignId: string;
  trackingCode: string;
  eventType: Event['event_type'];
  eventData?: any;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  countryCode?: string;
  region?: string;
  city?: string;
}): Promise<Event> {
  const supabase = createServiceClient();

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      campaign_id: data.campaignId,
      tracking_code: data.trackingCode,
      event_type: data.eventType,
      event_data: data.eventData || null,
      ip_address: data.ipAddress || null,
      user_agent: data.userAgent || null,
      referrer: data.referrer || null,
      country_code: data.countryCode || null,
      region: data.region || null,
      city: data.city || null,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ [trackEvent] Error:', error);
    throw new Error(`Failed to track event: ${error.message}`);
  }

  console.log('✅ [trackEvent] Event tracked:', event.event_type, event.tracking_code);
  return event;
}

/**
 * Get campaign events
 */
export async function getCampaignEvents(
  campaignId: string,
  filters?: {
    eventType?: Event['event_type'];
    trackingCode?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ events: Event[]; total: number }> {
  const supabase = createServiceClient();

  let query = supabase
    .from('events')
    .select('*', { count: 'exact' })
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });

  if (filters?.eventType) {
    query = query.eq('event_type', filters.eventType);
  }

  if (filters?.trackingCode) {
    query = query.eq('tracking_code', filters.trackingCode);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1);
  }

  const { data: events, error, count } = await query;

  if (error) {
    console.error('❌ [getCampaignEvents] Error:', error);
    throw new Error(`Failed to fetch events: ${error.message}`);
  }

  return {
    events: events || [],
    total: count || 0,
  };
}

// ==================== CONVERSIONS ====================

/**
 * Track conversion (public endpoint - no auth required)
 */
export async function trackConversion(data: {
  campaignId: string;
  trackingCode: string;
  conversionType: Conversion['conversion_type'];
  conversionValue?: number;
  conversionData?: any;
  eventId?: string;
  sessionId?: string;
}): Promise<Conversion> {
  const supabase = createServiceClient();

  const { data: conversion, error } = await supabase
    .from('conversions')
    .insert({
      campaign_id: data.campaignId,
      tracking_code: data.trackingCode,
      conversion_type: data.conversionType,
      conversion_value: data.conversionValue || null,
      conversion_data: data.conversionData || null,
      event_id: data.eventId || null,
      session_id: data.sessionId || null,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ [trackConversion] Error:', error);
    throw new Error(`Failed to track conversion: ${error.message}`);
  }

  console.log('✅ [trackConversion] Conversion tracked:', conversion.conversion_type, conversion.tracking_code);
  return conversion;
}

/**
 * Get campaign conversions
 */
export async function getCampaignConversions(
  campaignId: string,
  filters?: {
    conversionType?: Conversion['conversion_type'];
    trackingCode?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ conversions: Conversion[]; total: number }> {
  const supabase = createServiceClient();

  let query = supabase
    .from('conversions')
    .select('*', { count: 'exact' })
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });

  if (filters?.conversionType) {
    query = query.eq('conversion_type', filters.conversionType);
  }

  if (filters?.trackingCode) {
    query = query.eq('tracking_code', filters.trackingCode);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1);
  }

  const { data: conversions, error, count } = await query;

  if (error) {
    console.error('❌ [getCampaignConversions] Error:', error);
    throw new Error(`Failed to fetch conversions: ${error.message}`);
  }

  return {
    conversions: conversions || [],
    total: count || 0,
  };
}

// ==================== LANDING PAGES ====================

/**
 * Create landing page
 */
export async function createLandingPage(data: {
  campaignId: string;
  trackingCode: string;
  templateType: LandingPage['template_type'];
  pageConfig: any;
  recipientData?: any;
}): Promise<LandingPage> {
  const supabase = createServiceClient();

  const { data: landingPage, error } = await supabase
    .from('landing_pages')
    .insert({
      campaign_id: data.campaignId,
      tracking_code: data.trackingCode,
      template_type: data.templateType,
      page_config: data.pageConfig,
      recipient_data: data.recipientData || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ [createLandingPage] Error:', error);
    throw new Error(`Failed to create landing page: ${error.message}`);
  }

  console.log('✅ [createLandingPage] Landing page created:', landingPage.tracking_code);
  return landingPage;
}

/**
 * Get landing page by tracking code (public access)
 */
export async function getLandingPageByTrackingCode(
  trackingCode: string
): Promise<LandingPage | null> {
  const supabase = createServiceClient();

  const { data: landingPage, error } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('tracking_code', trackingCode)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('❌ [getLandingPageByTrackingCode] Error:', error);
    return null;
  }

  return landingPage;
}

/**
 * Update landing page
 */
export async function updateLandingPage(
  landingPageId: string,
  updates: Partial<Omit<LandingPage, 'id' | 'campaign_id' | 'tracking_code' | 'created_at' | 'updated_at'>>
): Promise<LandingPage | null> {
  const supabase = createServiceClient();

  const { data: landingPage, error } = await supabase
    .from('landing_pages')
    .update(updates)
    .eq('id', landingPageId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('❌ [updateLandingPage] Error:', error);
    return null;
  }

  return landingPage;
}

// ==================== ANALYTICS ====================

/**
 * Get campaign analytics summary
 */
export async function getCampaignAnalytics(campaignId: string): Promise<{
  total_recipients: number;
  total_events: number;
  total_conversions: number;
  qr_scans: number;
  page_views: number;
  conversion_rate: number;
}> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .rpc('get_campaign_analytics', { campaign_uuid: campaignId })
    .single();

  if (error) {
    console.error('❌ [getCampaignAnalytics] Error:', error);
    throw new Error(`Failed to fetch campaign analytics: ${error.message}`);
  }

  return data;
}

/**
 * Get all campaigns analytics for organization
 */
export async function getOrganizationAnalytics(organizationId: string): Promise<{
  total_campaigns: number;
  total_recipients: number;
  total_events: number;
  total_conversions: number;
  average_conversion_rate: number;
}> {
  const supabase = createServiceClient();

  // Get campaigns count
  const { count: campaignsCount } = await supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  // Get total recipients
  const { count: recipientsCount } = await supabase
    .from('campaign_recipients')
    .select('*, campaigns!inner(*)', { count: 'exact', head: true })
    .eq('campaigns.organization_id', organizationId);

  // Get total events
  const { count: eventsCount } = await supabase
    .from('events')
    .select('*, campaigns!inner(*)', { count: 'exact', head: true })
    .eq('campaigns.organization_id', organizationId);

  // Get total conversions
  const { count: conversionsCount } = await supabase
    .from('conversions')
    .select('*, campaigns!inner(*)', { count: 'exact', head: true })
    .eq('campaigns.organization_id', organizationId);

  const totalRecipients = recipientsCount || 0;
  const totalConversions = conversionsCount || 0;
  const averageConversionRate = totalRecipients > 0
    ? (totalConversions / totalRecipients) * 100
    : 0;

  return {
    total_campaigns: campaignsCount || 0,
    total_recipients: totalRecipients,
    total_events: eventsCount || 0,
    total_conversions: totalConversions,
    average_conversion_rate: averageConversionRate,
  };
}

/**
 * Get investment/cost metrics across all campaigns or for specific organization
 * Phase 5.7 - Advanced DM Analytics: Investment Tracking
 */
export async function getInvestmentMetrics(organizationId?: string): Promise<{
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
}> {
  const supabase = createServiceClient();

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
  const totalInvestment = campaigns.reduce((sum, c) => sum + (Number(c.cost_total) || 0), 0);
  const totalBudget = campaigns.reduce((sum, c) => sum + (Number(c.budget) || 0), 0);
  const totalRecipients = campaigns.reduce((sum, c) => sum + (c.total_recipients || 0), 0);

  // Cost breakdown
  const costBreakdown = {
    design: campaigns.reduce((sum, c) => sum + (Number(c.cost_design) || 0), 0),
    print: campaigns.reduce((sum, c) => sum + (Number(c.cost_print) || 0), 0),
    postage: campaigns.reduce((sum, c) => sum + (Number(c.cost_postage) || 0), 0),
    data_axle: campaigns.reduce((sum, c) => sum + (Number(c.cost_data_axle) || 0), 0),
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
  const campaignsWithCosts = campaigns.filter(c => Number(c.cost_total) > 0).length;
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
}
