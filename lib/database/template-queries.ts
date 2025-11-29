/**
 * Landing Page Template Database Queries
 * STUBBED: SQLite tables not yet in Supabase
 */

import type { LandingPageTemplate, TemplateConfig, TrackingSnippet } from '@/types/landing-page-template';

// ==================== TEMPLATE QUERIES (STUBBED) ====================

export function getAllTemplates(): LandingPageTemplate[] {
  console.log('[template-queries] getAllTemplates stubbed');
  return [];
}

export function getTemplateById(id: string): LandingPageTemplate | null {
  console.log('[template-queries] getTemplateById stubbed');
  return null;
}

export function getTemplateConfig(id: string): TemplateConfig | null {
  console.log('[template-queries] getTemplateConfig stubbed');
  return null;
}

export function getSystemTemplates(): LandingPageTemplate[] {
  console.log('[template-queries] getSystemTemplates stubbed');
  return [];
}

export function upsertTemplate(template: Omit<LandingPageTemplate, 'created_at' | 'updated_at'>): LandingPageTemplate {
  console.log('[template-queries] upsertTemplate stubbed');
  const now = new Date().toISOString();
  return {
    ...template,
    created_at: now,
    updated_at: now,
  };
}

export function incrementTemplateUseCount(id: string): void {
  console.log('[template-queries] incrementTemplateUseCount stubbed');
}

// ==================== TRACKING SNIPPET QUERIES (STUBBED) ====================

export function getActiveTrackingSnippets(): TrackingSnippet[] {
  console.log('[template-queries] getActiveTrackingSnippets stubbed');
  return [];
}

export function getAllTrackingSnippets(): TrackingSnippet[] {
  console.log('[template-queries] getAllTrackingSnippets stubbed');
  return [];
}

export function createTrackingSnippet(
  name: string,
  type: string,
  code: string,
  position: 'head' | 'body'
): TrackingSnippet {
  console.log('[template-queries] createTrackingSnippet stubbed');
  const now = new Date().toISOString();
  return {
    id: `snippet_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    name,
    snippet_type: type as 'custom' | 'facebook' | 'google_analytics' | 'adobe',
    code,
    position,
    is_active: 1,
    created_at: now,
    updated_at: now,
  };
}

export function updateTrackingSnippet(
  id: string,
  updates: {
    name?: string;
    snippet_type?: string;
    code?: string;
    position?: 'head' | 'body';
  }
): TrackingSnippet {
  console.log('[template-queries] updateTrackingSnippet stubbed');
  const now = new Date().toISOString();
  return {
    id,
    name: updates.name || 'Stub',
    snippet_type: (updates.snippet_type || 'custom') as 'custom' | 'facebook' | 'google_analytics' | 'adobe',
    code: updates.code || '',
    position: updates.position || 'head',
    is_active: 1,
    created_at: now,
    updated_at: now,
  };
}

export function toggleSnippetActive(id: string): TrackingSnippet {
  console.log('[template-queries] toggleSnippetActive stubbed');
  const now = new Date().toISOString();
  return {
    id,
    name: 'Stub',
    snippet_type: 'custom',
    code: '',
    position: 'head',
    is_active: 0,
    created_at: now,
    updated_at: now,
  };
}

export function deleteTrackingSnippet(id: string): void {
  console.log('[template-queries] deleteTrackingSnippet stubbed');
}

// ==================== DM TEMPLATE QUERIES (STUBBED) ====================

export interface DMTemplate {
  id: string;
  campaignId: string;
  canvasSessionId?: string;
  campaignTemplateId?: string;
  name: string;
  canvasJSON: string;
  backgroundImage: string;
  canvasWidth: number;
  canvasHeight: number;
  previewImage?: string;
  variableMappings?: string;
  createdAt?: string;
}

export function getDMTemplate(templateId: string): DMTemplate | null {
  console.log('[template-queries] getDMTemplate stubbed');
  return null;
}

export function getDMTemplateByCampaignTemplate(campaignTemplateId: string): DMTemplate | null {
  console.log('[template-queries] getDMTemplateByCampaignTemplate stubbed');
  return null;
}

export function createDMTemplate(data: Omit<DMTemplate, 'id' | 'createdAt'>): string {
  console.log('[template-queries] createDMTemplate stubbed');
  return `dm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function updateDMTemplate(
  templateId: string,
  updates: Partial<Omit<DMTemplate, 'id' | 'campaignId' | 'createdAt'>>
): void {
  console.log('[template-queries] updateDMTemplate stubbed');
}
