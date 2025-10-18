import Database from "better-sqlite3";
import { nanoid } from "nanoid";
import path from "path";

const dbPath = path.join(process.cwd(), "marketing.db");

export interface DMTemplate {
  id: string;
  campaignId: string;
  canvasSessionId?: string;
  campaignTemplateId?: string; // Link to campaign_templates table
  name: string;
  canvasJSON: string;
  backgroundImage: string;
  canvasWidth: number;
  canvasHeight: number;
  previewImage?: string;
  variableMappings?: string;
  createdAt?: string;
}

export interface VariableMapping {
  [key: string]: {
    type: "text" | "image" | "backgroundImage";
    objectId?: string;
    dataField: string;
    variable: boolean;
    reusable?: boolean;
    regenerate?: boolean;
  };
}

/**
 * Save a canvas as a reusable DM template
 */
export function createDMTemplate(data: Omit<DMTemplate, "id" | "createdAt">): string {
  const db = new Database(dbPath);
  const templateId = nanoid();

  const stmt = db.prepare(`
    INSERT INTO dm_templates (
      id, campaign_id, canvas_session_id, campaign_template_id, name, canvas_json,
      background_image, canvas_width, canvas_height,
      preview_image, variable_mappings
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
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

  db.close();
  return templateId;
}

/**
 * Get a DM template by ID
 */
export function getDMTemplate(templateId: string): DMTemplate | null {
  const db = new Database(dbPath);

  const stmt = db.prepare(`
    SELECT * FROM dm_templates WHERE id = ?
  `);

  const row = stmt.get(templateId) as any;
  db.close();

  if (!row) return null;

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
}

/**
 * Get all templates for a campaign
 */
export function getTemplatesByCampaign(campaignId: string): DMTemplate[] {
  const db = new Database(dbPath);

  const stmt = db.prepare(`
    SELECT * FROM dm_templates
    WHERE campaign_id = ?
    ORDER BY created_at DESC
  `);

  const rows = stmt.all(campaignId) as any[];
  db.close();

  return rows.map((row) => ({
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
  }));
}

/**
 * Get DM template by campaign template ID
 */
export function getDMTemplateByCampaignTemplate(campaignTemplateId: string): DMTemplate | null {
  const db = new Database(dbPath);

  const stmt = db.prepare(`
    SELECT * FROM dm_templates WHERE campaign_template_id = ?
  `);

  const row = stmt.get(campaignTemplateId) as any;
  db.close();

  if (!row) return null;

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
}

/**
 * Update template preview image
 */
export function updateTemplatePreview(templateId: string, previewImage: string): void {
  const db = new Database(dbPath);

  const stmt = db.prepare(`
    UPDATE dm_templates
    SET preview_image = ?
    WHERE id = ?
  `);

  stmt.run(previewImage, templateId);
  db.close();
}

/**
 * Delete a template
 */
export function deleteDMTemplate(templateId: string): void {
  const db = new Database(dbPath);

  const stmt = db.prepare(`
    DELETE FROM dm_templates WHERE id = ?
  `);

  stmt.run(templateId);
  db.close();
}
