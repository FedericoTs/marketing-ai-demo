/**
 * Campaign Management Functions
 *
 * STUBBED: Campaign template tables not yet migrated to Supabase
 * All functions return mock/empty values to allow build to pass
 */

import { nanoid } from "nanoid";

// ==================== TYPES ====================

export interface CampaignTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'general' | 'retail' | 'seasonal' | 'promotional';
  template_data: string; // JSON string
  is_system_template: number; // 0 or 1
  use_count: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateData {
  message: string;
  targetAudience?: string;
  industry?: string;
  tone?: string;
}

// Campaign type (compatible with tracking-queries)
export interface Campaign {
  id: string;
  name: string;
  message: string;
  company_name: string;
  created_at: string;
  status: string;
}

// ==================== CAMPAIGN TEMPLATES (STUBBED) ====================

/**
 * Create a new campaign template
 * STUBBED: Returns mock template
 */
export function createCampaignTemplate(data: {
  name: string;
  description?: string;
  category?: 'general' | 'retail' | 'seasonal' | 'promotional';
  templateData: TemplateData;
  isSystemTemplate?: boolean;
}): CampaignTemplate {
  console.log('[campaign-management] createCampaignTemplate stubbed - template tables not yet in Supabase');
  const id = nanoid(16);
  const created_at = new Date().toISOString();
  const updated_at = created_at;

  return {
    id,
    name: data.name,
    description: data.description,
    category: data.category || 'general',
    template_data: JSON.stringify(data.templateData),
    is_system_template: data.isSystemTemplate ? 1 : 0,
    use_count: 0,
    created_at,
    updated_at,
  };
}

/**
 * Get all campaign templates
 * STUBBED: Returns empty array
 */
export function getAllTemplates(category?: string): CampaignTemplate[] {
  console.log('[campaign-management] getAllTemplates stubbed - template tables not yet in Supabase');
  return [];
}

/**
 * Get template by ID
 * STUBBED: Returns null
 */
export function getTemplateById(id: string): CampaignTemplate | null {
  console.log('[campaign-management] getTemplateById stubbed - template tables not yet in Supabase');
  return null;
}

/**
 * Increment template use count
 * STUBBED: No-op
 */
export function incrementTemplateUseCount(id: string): void {
  console.log('[campaign-management] incrementTemplateUseCount stubbed - template tables not yet in Supabase');
}

/**
 * Delete template
 * STUBBED: Returns false
 */
export function deleteTemplate(id: string): boolean {
  console.log('[campaign-management] deleteTemplate stubbed - template tables not yet in Supabase');
  return false;
}

/**
 * Update template
 * STUBBED: Returns false
 */
export function updateTemplate(id: string, data: {
  name?: string;
  description?: string;
  category?: string;
  templateData?: TemplateData;
}): boolean {
  console.log('[campaign-management] updateTemplate stubbed - template tables not yet in Supabase');
  return false;
}

// ==================== CAMPAIGN OPERATIONS (STUBBED) ====================

/**
 * Duplicate a campaign (including all assets)
 * STUBBED: Returns null
 */
export function duplicateCampaign(campaignId: string): Campaign | null {
  console.log('[campaign-management] duplicateCampaign stubbed - template tables not yet in Supabase');
  return null;
}

/**
 * Update campaign status
 * STUBBED: Returns false
 */
export function updateCampaignStatus(
  campaignId: string,
  status: 'active' | 'paused' | 'completed' | 'archived'
): boolean {
  console.log('[campaign-management] updateCampaignStatus stubbed - template tables not yet in Supabase');
  return false;
}

/**
 * Bulk update campaign status
 * STUBBED: Returns 0
 */
export function bulkUpdateCampaignStatus(
  campaignIds: string[],
  status: 'active' | 'paused' | 'completed' | 'archived'
): number {
  console.log('[campaign-management] bulkUpdateCampaignStatus stubbed - template tables not yet in Supabase');
  return 0;
}

/**
 * Bulk delete campaigns (actually archives them)
 * STUBBED: Returns 0
 */
export function bulkArchiveCampaigns(campaignIds: string[]): number {
  console.log('[campaign-management] bulkArchiveCampaigns stubbed - template tables not yet in Supabase');
  return 0;
}

/**
 * Permanently delete a campaign and all its data
 * STUBBED: Returns false
 */
export function permanentlyDeleteCampaign(campaignId: string): boolean {
  console.log('[campaign-management] permanentlyDeleteCampaign stubbed - template tables not yet in Supabase');
  return false;
}

/**
 * Bulk permanently delete campaigns
 * STUBBED: Returns 0
 */
export function bulkPermanentlyDeleteCampaigns(campaignIds: string[]): number {
  console.log('[campaign-management] bulkPermanentlyDeleteCampaigns stubbed - template tables not yet in Supabase');
  return 0;
}

/**
 * Get campaign count by status
 * STUBBED: Returns empty object
 */
export function getCampaignCountByStatus(): Record<string, number> {
  console.log('[campaign-management] getCampaignCountByStatus stubbed - template tables not yet in Supabase');
  return {};
}

// ==================== SYSTEM TEMPLATES INITIALIZATION (STUBBED) ====================

/**
 * Initialize default system templates
 * STUBBED: No-op
 */
export function initializeSystemTemplates(): void {
  console.log('[campaign-management] initializeSystemTemplates stubbed - template tables not yet in Supabase');
}
