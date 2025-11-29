/**
 * Tracking Database Queries
 * STUBBED: SQLite tables not yet in Supabase
 */

import { nanoid } from "nanoid";

// ==================== TYPES ====================

export interface Campaign {
  id: string;
  name: string;
  message: string;
  company_name: string;
  created_at: string;
  status: "active" | "paused" | "completed";
}

export interface Recipient {
  id: string;
  campaign_id: string;
  tracking_id: string;
  name: string;
  lastname: string;
  address?: string;
  city?: string;
  zip?: string;
  email?: string;
  phone?: string;
  created_at: string;
  // Analytics fields for CSV export
  sent_date: string;
  page_views: number;
  events: number;
  conversions: number;
  status: string;
}

export interface Event {
  id: string;
  tracking_id: string;
  event_type: "page_view" | "qr_scan" | "button_click" | "form_view" | "external_link";
  event_data?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface Conversion {
  id: string;
  tracking_id: string;
  conversion_type: "form_submission" | "appointment_booked" | "call_initiated" | "download";
  conversion_data?: string;
  created_at: string;
}

export interface CampaignExportData {
  campaign: Campaign;
  recipients: Recipient[];
  events: Event[];
  conversions: Conversion[];
  summary: {
    totalRecipients: number;
    totalEvents: number;
    totalConversions: number;
    conversionRate: number;
    eventTypes: Record<string, number>;
    conversionTypes: Record<string, number>;
  };
}

// ==================== CAMPAIGNS (STUBBED) ====================

export function createCampaign(data: {
  name: string;
  message: string;
  companyName: string;
}): Campaign {
  console.log('[tracking-queries] createCampaign stubbed');
  return {
    id: nanoid(16),
    name: data.name,
    message: data.message,
    company_name: data.companyName,
    created_at: new Date().toISOString(),
    status: "active",
  };
}

export function getCampaignById(id: string): Campaign | null {
  console.log('[tracking-queries] getCampaignById stubbed');
  return null;
}

export function getAllCampaigns(limit?: number, offset?: number): Campaign[] {
  console.log('[tracking-queries] getAllCampaigns stubbed');
  return [];
}

// ==================== RECIPIENTS (STUBBED) ====================

export function createRecipient(data: {
  campaignId: string;
  name: string;
  lastname: string;
  address?: string;
  city?: string;
  zip?: string;
  email?: string;
  phone?: string;
}): Recipient {
  console.log('[tracking-queries] createRecipient stubbed');
  const now = new Date().toISOString();
  return {
    id: nanoid(16),
    campaign_id: data.campaignId,
    tracking_id: nanoid(12),
    name: data.name,
    lastname: data.lastname,
    address: data.address,
    city: data.city,
    zip: data.zip,
    email: data.email,
    phone: data.phone,
    created_at: now,
    sent_date: now,
    page_views: 0,
    events: 0,
    conversions: 0,
    status: 'pending',
  };
}

export function getRecipientByTrackingId(trackingId: string): Recipient | null {
  console.log('[tracking-queries] getRecipientByTrackingId stubbed');
  return null;
}

export function getCampaignRecipients(campaignId: string): Recipient[] {
  console.log('[tracking-queries] getCampaignRecipients stubbed');
  return [];
}

// ==================== EVENTS (STUBBED) ====================

export function recordEvent(data: {
  trackingId: string;
  eventType: Event['event_type'];
  eventData?: string;
  ipAddress?: string;
  userAgent?: string;
}): Event {
  console.log('[tracking-queries] recordEvent stubbed');
  return {
    id: nanoid(16),
    tracking_id: data.trackingId,
    event_type: data.eventType,
    event_data: data.eventData,
    ip_address: data.ipAddress,
    user_agent: data.userAgent,
    created_at: new Date().toISOString(),
  };
}

export function getEvents(trackingId: string): Event[] {
  console.log('[tracking-queries] getEvents stubbed');
  return [];
}

// ==================== CONVERSIONS (STUBBED) ====================

export function recordConversion(data: {
  trackingId: string;
  conversionType: Conversion['conversion_type'];
  conversionData?: string;
}): Conversion {
  console.log('[tracking-queries] recordConversion stubbed');
  return {
    id: nanoid(16),
    tracking_id: data.trackingId,
    conversion_type: data.conversionType,
    conversion_data: data.conversionData,
    created_at: new Date().toISOString(),
  };
}

export function getConversions(trackingId: string): Conversion[] {
  console.log('[tracking-queries] getConversions stubbed');
  return [];
}

// ==================== ANALYTICS (STUBBED) ====================

export function getCampaignAnalytics(campaignId: string): {
  recipients: number;
  events: number;
  conversions: number;
  conversionRate: number;
  eventsByType: Record<string, number>;
  conversionsByType: Record<string, number>;
} {
  console.log('[tracking-queries] getCampaignAnalytics stubbed');
  return {
    recipients: 0,
    events: 0,
    conversions: 0,
    conversionRate: 0,
    eventsByType: {},
    conversionsByType: {},
  };
}

export function getCampaignExportData(campaignId: string): CampaignExportData | null {
  console.log('[tracking-queries] getCampaignExportData stubbed');
  return null;
}

// ==================== BRAND PROFILE (STUBBED) ====================

export interface BrandProfile {
  id: string;
  company_name?: string;
  industry?: string;
  brand_voice?: string;
  target_audience?: string;
  tone?: string;
  key_phrases?: string[];
  brand_values?: string[];
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  background_color?: string;
  text_color?: string;
  heading_font?: string;
  body_font?: string;
  landing_page_template?: string;
  created_at?: string;
  updated_at?: string;
}

export function getBrandProfile(organizationId?: string): BrandProfile | null {
  console.log('[tracking-queries] getBrandProfile stubbed');
  return null;
}

export function saveBrandProfile(profile: Partial<BrandProfile>): BrandProfile {
  console.log('[tracking-queries] saveBrandProfile stubbed');
  return {
    id: nanoid(16),
    ...profile,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function updateBrandKit(updates: Partial<BrandProfile>): BrandProfile {
  console.log('[tracking-queries] updateBrandKit stubbed');
  return {
    id: nanoid(16),
    ...updates,
    updated_at: new Date().toISOString(),
  };
}

// ==================== LANDING PAGES (STUBBED) ====================

export interface LandingPage {
  id: string;
  tracking_id: string;
  campaign_id?: string;
  template_type?: string;
  page_config?: any;
  recipient_data?: any;
  created_at?: string;
  updated_at?: string;
}

export function getLandingPageByTrackingId(trackingId: string): LandingPage | null {
  console.log('[tracking-queries] getLandingPageByTrackingId stubbed');
  return null;
}

export function updateLandingPage(trackingId: string, updates: Partial<LandingPage>): LandingPage | null {
  console.log('[tracking-queries] updateLandingPage stubbed');
  return null;
}

export function createLandingPage(data: Partial<LandingPage>): LandingPage {
  console.log('[tracking-queries] createLandingPage stubbed');
  return {
    id: nanoid(16),
    tracking_id: data.tracking_id || nanoid(12),
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function saveLandingPage(data: Partial<LandingPage>): LandingPage {
  console.log('[tracking-queries] saveLandingPage stubbed');
  return createLandingPage(data);
}

// ==================== RECIPIENT JOURNEY (STUBBED) ====================

export interface RecipientJourney {
  recipient: Recipient;
  events: Event[];
  conversions: Conversion[];
  pageViews: number;
  hasConverted: boolean;
}

export function getRecipientJourney(trackingId: string): RecipientJourney | null {
  console.log('[tracking-queries] getRecipientJourney stubbed');
  return null;
}
