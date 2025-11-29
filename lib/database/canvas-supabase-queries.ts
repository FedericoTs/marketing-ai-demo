import { nanoid } from 'nanoid';
import { createServiceClient } from '@/lib/supabase/server';

export interface CanvasSessionData {
  id: string;
  campaignId: string;
  organizationId: string;
  backgroundImage: string;
  qrCodeDataUrl: string;
  trackingId: string;
  landingPageUrl: string;
  recipientName: string;
  recipientLastname: string;
  recipientAddress: string;
  recipientCity: string;
  recipientZip: string;
  message: string;
  companyName: string;
  campaignName?: string;
  logoUrl?: string;
  primaryColor?: string;
  textColor?: string;
  canvasWidth: number;
  canvasHeight: number;
  phoneNumber: string;
  dmTemplateId?: string;
  createdAt?: string;
}

/**
 * Create a new canvas session in Supabase
 * Returns the session ID to use in the URL
 */
export async function createCanvasSession(
  data: Omit<CanvasSessionData, 'id' | 'createdAt' | 'organizationId'>,
  organizationId: string
): Promise<string> {
  const supabase = createServiceClient();
  const sessionId = nanoid();

  const { error } = await supabase
    .from('canvas_sessions')
    .insert({
      id: sessionId,
      campaign_id: data.campaignId,
      organization_id: organizationId,
      background_image: data.backgroundImage,
      qr_code_data_url: data.qrCodeDataUrl,
      tracking_id: data.trackingId,
      landing_page_url: data.landingPageUrl,
      recipient_name: data.recipientName,
      recipient_lastname: data.recipientLastname,
      recipient_address: data.recipientAddress || '',
      recipient_city: data.recipientCity || '',
      recipient_zip: data.recipientZip || '',
      message: data.message,
      company_name: data.companyName,
      campaign_name: data.campaignName || null,
      logo_url: data.logoUrl || null,
      primary_color: data.primaryColor || null,
      text_color: data.textColor || null,
      canvas_width: data.canvasWidth,
      canvas_height: data.canvasHeight,
      phone_number: data.phoneNumber,
      dm_template_id: data.dmTemplateId || null,
    });

  if (error) {
    throw new Error(`Failed to create canvas session: ${error.message}`);
  }

  return sessionId;
}

/**
 * Get canvas session data by ID
 */
export async function getCanvasSession(sessionId: string): Promise<CanvasSessionData | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('canvas_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    campaignId: data.campaign_id,
    organizationId: data.organization_id,
    backgroundImage: data.background_image,
    qrCodeDataUrl: data.qr_code_data_url,
    trackingId: data.tracking_id,
    landingPageUrl: data.landing_page_url,
    recipientName: data.recipient_name,
    recipientLastname: data.recipient_lastname,
    recipientAddress: data.recipient_address,
    recipientCity: data.recipient_city,
    recipientZip: data.recipient_zip,
    message: data.message,
    companyName: data.company_name,
    campaignName: data.campaign_name,
    logoUrl: data.logo_url,
    primaryColor: data.primary_color,
    textColor: data.text_color,
    canvasWidth: data.canvas_width,
    canvasHeight: data.canvas_height,
    phoneNumber: data.phone_number,
    dmTemplateId: data.dm_template_id,
    createdAt: data.created_at,
  };
}

/**
 * Delete old canvas sessions (cleanup)
 */
export async function cleanupOldSessions(olderThanDays: number = 7): Promise<number> {
  const supabase = createServiceClient();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const { data, error } = await supabase
    .from('canvas_sessions')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .select('id');

  if (error) {
    throw new Error(`Failed to cleanup sessions: ${error.message}`);
  }

  return data?.length || 0;
}
