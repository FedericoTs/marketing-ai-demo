import { getDatabase } from './connection';
import type { LandingPageTemplate, TemplateConfig, TrackingSnippet } from '@/types/landing-page-template';

/**
 * Landing Page Template Database Queries
 */

// ============================================================================
// TEMPLATE QUERIES
// ============================================================================

/**
 * Get all landing page templates
 */
export function getAllTemplates(): LandingPageTemplate[] {
  const db = createServiceClient();

  try {
    const templates = db.prepare(`
      SELECT * FROM landing_page_templates
      ORDER BY is_system_template DESC, name ASC
    `).all() as LandingPageTemplate[];

    return templates;
  } catch (error) {
    console.error('Error fetching templates:', error);
    return [];
  }
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): LandingPageTemplate | null {
  const db = createServiceClient();

  try {
    const template = db.prepare(`
      SELECT * FROM landing_page_templates
      WHERE id = ?
    `).get(id) as LandingPageTemplate | undefined;

    return template || null;
  } catch (error) {
    console.error('Error fetching template:', error);
    return null;
  }
}

/**
 * Get parsed template config
 */
export function getTemplateConfig(id: string): TemplateConfig | null {
  const template = getTemplateById(id);

  if (!template) {
    return null;
  }

  try {
    return JSON.parse(template.template_config) as TemplateConfig;
  } catch (error) {
    console.error('Error parsing template config:', error);
    return null;
  }
}

/**
 * Get pre-built system templates
 */
export function getSystemTemplates(): LandingPageTemplate[] {
  const db = createServiceClient();

  try {
    const templates = db.prepare(`
      SELECT * FROM landing_page_templates
      WHERE is_system_template = 1
      ORDER BY use_count DESC, name ASC
    `).all() as LandingPageTemplate[];

    return templates;
  } catch (error) {
    console.error('Error fetching system templates:', error);
    return [];
  }
}

/**
 * Create or update template
 */
export function upsertTemplate(template: Omit<LandingPageTemplate, 'created_at' | 'updated_at'>): LandingPageTemplate {
  const db = createServiceClient();
  const now = new Date().toISOString();

  try {
    // Check if exists
    const existing = getTemplateById(template.id);

    if (existing) {
      // Update
      db.prepare(`
        UPDATE landing_page_templates
        SET name = ?,
            description = ?,
            category = ?,
            template_type = ?,
            template_config = ?,
            preview_image = ?,
            updated_at = ?
        WHERE id = ?
      `).run(
        template.name,
        template.description,
        template.category,
        template.template_type,
        template.template_config,
        template.preview_image,
        now,
        template.id
      );
    } else {
      // Insert
      db.prepare(`
        INSERT INTO landing_page_templates (
          id, name, description, category, template_type, is_system_template,
          template_config, preview_image, use_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        template.id,
        template.name,
        template.description,
        template.category,
        template.template_type,
        template.is_system_template,
        template.template_config,
        template.preview_image,
        template.use_count,
        now,
        now
      );
    }

    return getTemplateById(template.id)!;
  } catch (error) {
    console.error('Error upserting template:', error);
    throw new Error('Failed to save template');
  }
}

/**
 * Increment template use count
 */
export function incrementTemplateUseCount(id: string): void {
  const db = createServiceClient();

  try {
    db.prepare(`
      UPDATE landing_page_templates
      SET use_count = use_count + 1,
          updated_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), id);
  } catch (error) {
    console.error('Error incrementing template use count:', error);
  }
}

// ============================================================================
// TRACKING SNIPPET QUERIES
// ============================================================================

/**
 * Get all active tracking snippets
 */
export function getActiveTrackingSnippets(): TrackingSnippet[] {
  const db = createServiceClient();

  try {
    const snippets = db.prepare(`
      SELECT * FROM landing_page_tracking_snippets
      WHERE is_active = 1
      ORDER BY created_at ASC
    `).all() as TrackingSnippet[];

    return snippets;
  } catch (error) {
    console.error('Error fetching tracking snippets:', error);
    return [];
  }
}

/**
 * Get all tracking snippets (active and inactive)
 */
export function getAllTrackingSnippets(): TrackingSnippet[] {
  const db = createServiceClient();

  try {
    const snippets = db.prepare(`
      SELECT * FROM landing_page_tracking_snippets
      ORDER BY created_at DESC
    `).all() as TrackingSnippet[];

    return snippets;
  } catch (error) {
    console.error('Error fetching all tracking snippets:', error);
    return [];
  }
}

/**
 * Create tracking snippet
 */
export function createTrackingSnippet(
  name: string,
  type: string,
  code: string,
  position: 'head' | 'body'
): TrackingSnippet {
  const db = createServiceClient();
  const id = `snippet_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO landing_page_tracking_snippets (
        id, name, snippet_type, code, position, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, name, type, code, position, now, now);

    const snippet = db.prepare('SELECT * FROM landing_page_tracking_snippets WHERE id = ?').get(id) as TrackingSnippet;
    return snippet;
  } catch (error) {
    console.error('Error creating tracking snippet:', error);
    throw new Error('Failed to create tracking snippet');
  }
}

/**
 * Update tracking snippet
 */
export function updateTrackingSnippet(
  id: string,
  updates: {
    name?: string;
    snippet_type?: string;
    code?: string;
    position?: 'head' | 'body';
  }
): TrackingSnippet {
  const db = createServiceClient();
  const now = new Date().toISOString();

  try {
    // Get current snippet
    const current = db.prepare('SELECT * FROM landing_page_tracking_snippets WHERE id = ?').get(id) as TrackingSnippet;

    if (!current) {
      throw new Error('Tracking snippet not found');
    }

    // Update with new values or keep existing
    db.prepare(`
      UPDATE landing_page_tracking_snippets
      SET name = ?,
          snippet_type = ?,
          code = ?,
          position = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      updates.name ?? current.name,
      updates.snippet_type ?? current.snippet_type,
      updates.code ?? current.code,
      updates.position ?? current.position,
      now,
      id
    );

    const updated = db.prepare('SELECT * FROM landing_page_tracking_snippets WHERE id = ?').get(id) as TrackingSnippet;
    return updated;
  } catch (error) {
    console.error('Error updating tracking snippet:', error);
    throw new Error('Failed to update tracking snippet');
  }
}

/**
 * Toggle snippet active status
 */
export function toggleSnippetActive(id: string): TrackingSnippet {
  const db = createServiceClient();
  const now = new Date().toISOString();

  try {
    db.prepare(`
      UPDATE landing_page_tracking_snippets
      SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END,
          updated_at = ?
      WHERE id = ?
    `).run(now, id);

    const snippet = db.prepare('SELECT * FROM landing_page_tracking_snippets WHERE id = ?').get(id) as TrackingSnippet;
    return snippet;
  } catch (error) {
    console.error('Error toggling snippet status:', error);
    throw new Error('Failed to toggle snippet status');
  }
}

/**
 * Delete tracking snippet
 */
export function deleteTrackingSnippet(id: string): void {
  const db = createServiceClient();

  try {
    db.prepare('DELETE FROM landing_page_tracking_snippets WHERE id = ?').run(id);
  } catch (error) {
    console.error('Error deleting tracking snippet:', error);
    throw new Error('Failed to delete tracking snippet');
  }
}

// ============================================================================
// DM TEMPLATE QUERIES (Fabric.js Canvas Templates)
// ============================================================================

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

/**
 * Get DM template by ID
 * Transforms snake_case database fields to camelCase for frontend
 */
export function getDMTemplate(templateId: string): DMTemplate | null {
  const db = createServiceClient();

  try {
    const row = db.prepare('SELECT * FROM dm_templates WHERE id = ?').get(templateId) as any;

    if (!row) return null;

    // Transform snake_case to camelCase
    return {
      id: row.id,
      campaignId: row.campaign_id,
      canvasSessionId: row.canvas_session_id,
      campaignTemplateId: row.campaign_template_id,
      name: row.name,
      canvasJSON: row.canvas_json,
      backgroundImage: row.background_image,
      canvasWidth: row.canvas_width,
      canvasHeight: row.canvas_height,
      previewImage: row.preview_image,
      variableMappings: row.variable_mappings,
      createdAt: row.created_at,
    };
  } catch (error) {
    console.error('Error fetching DM template:', error);
    return null;
  }
}

/**
 * Get DM template by campaign template ID
 * Transforms snake_case database fields to camelCase for frontend
 */
export function getDMTemplateByCampaignTemplate(campaignTemplateId: string): DMTemplate | null {
  const db = createServiceClient();

  try {
    const row = db.prepare('SELECT * FROM dm_templates WHERE campaign_template_id = ?').get(campaignTemplateId) as any;

    if (!row) return null;

    // Transform snake_case to camelCase
    return {
      id: row.id,
      campaignId: row.campaign_id,
      canvasSessionId: row.canvas_session_id,
      campaignTemplateId: row.campaign_template_id,
      name: row.name,
      canvasJSON: row.canvas_json,
      backgroundImage: row.background_image,
      canvasWidth: row.canvas_width,
      canvasHeight: row.canvas_height,
      previewImage: row.preview_image,
      variableMappings: row.variable_mappings,
      createdAt: row.created_at,
    };
  } catch (error) {
    console.error('Error fetching DM template by campaign template ID:', error);
    return null;
  }
}

/**
 * Create DM template
 * Accepts camelCase data from frontend, transforms to snake_case for database
 */
export function createDMTemplate(data: Omit<DMTemplate, 'id' | 'createdAt'>): string {
  const db = createServiceClient();
  const templateId = `dm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  try {
    db.prepare(`
      INSERT INTO dm_templates (
        id, campaign_id, canvas_session_id, campaign_template_id, name,
        canvas_json, background_image, canvas_width, canvas_height,
        preview_image, variable_mappings
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      templateId,
      data.campaignId,
      data.canvasSessionId || null,
      data.campaignTemplateId || null,
      data.name,
      data.canvasJSON,
      data.backgroundImage,
      data.canvasWidth,
      data.canvasHeight,
      data.previewImage || null,
      data.variableMappings || null
    );

    return templateId;
  } catch (error) {
    console.error('Error creating DM template:', error);
    throw new Error('Failed to create DM template');
  }
}

/**
 * Update DM template
 * Accepts camelCase data from frontend, transforms to snake_case for database
 */
export function updateDMTemplate(
  templateId: string,
  updates: Partial<Omit<DMTemplate, 'id' | 'campaignId' | 'createdAt'>>
): void {
  const db = createServiceClient();

  try {
    const current = getDMTemplate(templateId);
    if (!current) {
      throw new Error('DM template not found');
    }

    db.prepare(`
      UPDATE dm_templates
      SET name = ?,
          canvas_json = ?,
          background_image = ?,
          canvas_width = ?,
          canvas_height = ?,
          preview_image = ?,
          variable_mappings = ?
      WHERE id = ?
    `).run(
      updates.name ?? current.name,
      updates.canvasJSON ?? current.canvasJSON,
      updates.backgroundImage ?? current.backgroundImage,
      updates.canvasWidth ?? current.canvasWidth,
      updates.canvasHeight ?? current.canvasHeight,
      updates.previewImage ?? current.previewImage,
      updates.variableMappings ?? current.variableMappings,
      templateId
    );
  } catch (error) {
    console.error('Error updating DM template:', error);
    throw new Error('Failed to update DM template');
  }
}
