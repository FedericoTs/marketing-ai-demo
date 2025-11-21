/**
 * Demo System Database Queries
 *
 * Handles all database operations for the interactive demo system.
 * Uses Supabase SERVICE ROLE client to bypass RLS (public demo system, no auth required).
 *
 * Phase 9.2.15 - Interactive Demo System
 */

import { createServiceClient } from '@/lib/supabase/service';
import { nanoid } from 'nanoid';

// ============================================================================
// TYPES
// ============================================================================

export interface DemoSubmission {
  id: string;
  email: string;
  name: string;
  demo_code: string;
  postcard_image_url: string | null;
  created_at: string;
  email_sent_at: string | null;
  email_opened: boolean;
  qr_scanned: boolean;
  user_agent: string | null;
  ip_address: string | null;
}

export interface DemoEvent {
  id: string;
  demo_code: string;
  event_type: 'qr_scan' | 'page_view' | 'cta_click' | 'form_submit' | 'email_open';
  created_at: string;
  user_agent: string | null;
  ip_address: string | null;
  referrer: string | null;
  event_data: Record<string, any>;
}

export interface DemoAnalytics {
  total_submissions: number;
  total_emails_sent: number;
  total_qr_scans: number;
  total_page_views: number;
  total_cta_clicks: number;
  total_form_submits: number;
  qr_scan_rate: number;
  page_view_rate: number;
  engagement_rate: number;
}

// ============================================================================
// DEMO SUBMISSION CRUD
// ============================================================================

/**
 * Create a new demo submission
 */
export async function createDemoSubmission(data: {
  email: string;
  name: string;
  user_agent?: string;
  ip_address?: string;
}): Promise<DemoSubmission | null> {
  try {
    const supabase = createServiceClient();
    const demo_code = nanoid(10); // Generate unique 10-character code

    const { data: submission, error } = await supabase
      .from('demo_submissions')
      .insert({
        email: data.email,
        name: data.name,
        demo_code,
        user_agent: data.user_agent || null,
        ip_address: data.ip_address || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[createDemoSubmission] Error:', error);
      return null;
    }

    return submission;
  } catch (error) {
    console.error('[createDemoSubmission] Exception:', error);
    return null;
  }
}

/**
 * Get demo submission by code
 */
export async function getDemoSubmissionByCode(code: string): Promise<DemoSubmission | null> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('demo_submissions')
      .select('*')
      .eq('demo_code', code)
      .single();

    if (error) {
      console.error('[getDemoSubmissionByCode] Error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[getDemoSubmissionByCode] Exception:', error);
    return null;
  }
}

/**
 * Update demo submission (email sent, QR scanned, etc.)
 */
export async function updateDemoSubmission(
  code: string,
  updates: Partial<Pick<DemoSubmission, 'email_sent_at' | 'email_opened' | 'qr_scanned' | 'postcard_image_url'>>
): Promise<boolean> {
  try {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('demo_submissions')
      .update(updates)
      .eq('demo_code', code);

    if (error) {
      console.error('[updateDemoSubmission] Error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[updateDemoSubmission] Exception:', error);
    return false;
  }
}

// ============================================================================
// DEMO EVENTS
// ============================================================================

/**
 * Track a demo event
 */
export async function trackDemoEvent(data: {
  demo_code: string;
  event_type: DemoEvent['event_type'];
  user_agent?: string;
  ip_address?: string;
  referrer?: string;
  event_data?: Record<string, any>;
}): Promise<boolean> {
  try {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('demo_events')
      .insert({
        demo_code: data.demo_code,
        event_type: data.event_type,
        user_agent: data.user_agent || null,
        ip_address: data.ip_address || null,
        referrer: data.referrer || null,
        event_data: data.event_data || {},
      });

    if (error) {
      console.error('[trackDemoEvent] Error:', error);
      return false;
    }

    // Update submission flags based on event type
    if (data.event_type === 'qr_scan' || data.event_type === 'page_view') {
      await updateDemoSubmission(data.demo_code, { qr_scanned: true });
    }

    return true;
  } catch (error) {
    console.error('[trackDemoEvent] Exception:', error);
    return false;
  }
}

/**
 * Get all events for a demo submission
 */
export async function getDemoEvents(code: string): Promise<DemoEvent[]> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('demo_events')
      .select('*')
      .eq('demo_code', code)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getDemoEvents] Error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[getDemoEvents] Exception:', error);
    return [];
  }
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Get aggregate analytics across all demo submissions
 */
export async function getDemoAnalytics(): Promise<DemoAnalytics> {
  try {
    const supabase = createServiceClient();

    // Get total submissions
    const { count: total_submissions } = await supabase
      .from('demo_submissions')
      .select('*', { count: 'exact', head: true });

    // Get emails sent count
    const { count: total_emails_sent } = await supabase
      .from('demo_submissions')
      .select('*', { count: 'exact', head: true })
      .not('email_sent_at', 'is', null);

    // Get QR scans count
    const { count: total_qr_scans } = await supabase
      .from('demo_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('qr_scanned', true);

    // Get event counts by type
    const { data: events } = await supabase
      .from('demo_events')
      .select('event_type');

    const total_page_views = events?.filter(e => e.event_type === 'page_view').length || 0;
    const total_cta_clicks = events?.filter(e => e.event_type === 'cta_click').length || 0;
    const total_form_submits = events?.filter(e => e.event_type === 'form_submit').length || 0;

    // Calculate rates
    const qr_scan_rate = total_emails_sent ? (total_qr_scans! / total_emails_sent) * 100 : 0;
    const page_view_rate = total_qr_scans ? (total_page_views / total_qr_scans!) * 100 : 0;
    const engagement_rate = total_page_views ? ((total_cta_clicks + total_form_submits) / total_page_views) * 100 : 0;

    return {
      total_submissions: total_submissions || 0,
      total_emails_sent: total_emails_sent || 0,
      total_qr_scans: total_qr_scans || 0,
      total_page_views,
      total_cta_clicks,
      total_form_submits,
      qr_scan_rate,
      page_view_rate,
      engagement_rate,
    };
  } catch (error) {
    console.error('[getDemoAnalytics] Exception:', error);
    return {
      total_submissions: 0,
      total_emails_sent: 0,
      total_qr_scans: 0,
      total_page_views: 0,
      total_cta_clicks: 0,
      total_form_submits: 0,
      qr_scan_rate: 0,
      page_view_rate: 0,
      engagement_rate: 0,
    };
  }
}
