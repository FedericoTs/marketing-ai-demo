import { nanoid } from "nanoid";
import { getDatabase } from "./connection";
import { Campaign, getCampaignById } from "./tracking-queries";
import { copyAssets, getTemplateAssets, getCampaignAssets } from "./asset-management";

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

// ==================== CAMPAIGN TEMPLATES ====================

/**
 * Create a new campaign template
 */
export function createCampaignTemplate(data: {
  name: string;
  description?: string;
  category?: 'general' | 'retail' | 'seasonal' | 'promotional';
  templateData: TemplateData;
  isSystemTemplate?: boolean;
}): CampaignTemplate {
  const db = getDatabase();
  const id = nanoid(16);
  const created_at = new Date().toISOString();
  const updated_at = created_at;

  const stmt = db.prepare(`
    INSERT INTO campaign_templates (
      id, name, description, category, template_data,
      is_system_template, use_count, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
  `);

  stmt.run(
    id,
    data.name,
    data.description || null,
    data.category || 'general',
    JSON.stringify(data.templateData),
    data.isSystemTemplate ? 1 : 0,
    created_at,
    updated_at
  );

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
 */
export function getAllTemplates(category?: string): CampaignTemplate[] {
  const db = getDatabase();

  let query = 'SELECT * FROM campaign_templates ORDER BY use_count DESC, created_at DESC';
  let stmt;

  if (category) {
    query = 'SELECT * FROM campaign_templates WHERE category = ? ORDER BY use_count DESC, created_at DESC';
    stmt = db.prepare(query);
    return stmt.all(category) as CampaignTemplate[];
  }

  stmt = db.prepare(query);
  return stmt.all() as CampaignTemplate[];
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): CampaignTemplate | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM campaign_templates WHERE id = ?');
  return (stmt.get(id) as CampaignTemplate) || null;
}

/**
 * Increment template use count
 */
export function incrementTemplateUseCount(id: string): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE campaign_templates
    SET use_count = use_count + 1,
        updated_at = ?
    WHERE id = ?
  `);
  stmt.run(new Date().toISOString(), id);
}

/**
 * Delete template
 */
export function deleteTemplate(id: string): boolean {
  const db = getDatabase();

  // Don't allow deleting system templates
  const template = getTemplateById(id);
  if (!template || template.is_system_template) {
    return false;
  }

  const stmt = db.prepare('DELETE FROM campaign_templates WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Update template
 */
export function updateTemplate(id: string, data: {
  name?: string;
  description?: string;
  category?: string;
  templateData?: TemplateData;
}): boolean {
  const db = getDatabase();
  const template = getTemplateById(id);

  if (!template || template.is_system_template) {
    return false;
  }

  const updates: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.description !== undefined) {
    updates.push('description = ?');
    values.push(data.description);
  }
  if (data.category !== undefined) {
    updates.push('category = ?');
    values.push(data.category);
  }
  if (data.templateData !== undefined) {
    updates.push('template_data = ?');
    values.push(JSON.stringify(data.templateData));
  }

  if (updates.length === 0) return false;

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  const stmt = db.prepare(`
    UPDATE campaign_templates
    SET ${updates.join(', ')}
    WHERE id = ?
  `);

  const result = stmt.run(...values);
  return result.changes > 0;
}

// ==================== CAMPAIGN OPERATIONS ====================

/**
 * Duplicate a campaign (including all assets)
 */
export function duplicateCampaign(campaignId: string): Campaign | null {
  const original = getCampaignById(campaignId);
  if (!original) return null;

  const db = getDatabase();
  const id = nanoid(16);
  const created_at = new Date().toISOString();
  const name = `${original.name} (Copy)`;

  const stmt = db.prepare(`
    INSERT INTO campaigns (id, name, message, company_name, created_at, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `);

  stmt.run(id, name, original.message, original.company_name, created_at);

  // Copy all campaign assets (QR codes, backgrounds, etc.)
  try {
    copyAssets({
      sourceCampaignId: campaignId,
      targetCampaignId: id,
    });
  } catch (error) {
    console.error('Error copying campaign assets:', error);
    // Continue anyway - campaign is created, just without assets
  }

  return {
    id,
    name,
    message: original.message,
    company_name: original.company_name,
    created_at,
    status: 'active',
  };
}

/**
 * Update campaign status
 */
export function updateCampaignStatus(
  campaignId: string,
  status: 'active' | 'paused' | 'completed' | 'archived'
): boolean {
  const db = getDatabase();
  const stmt = db.prepare('UPDATE campaigns SET status = ? WHERE id = ?');
  const result = stmt.run(status, campaignId);
  return result.changes > 0;
}

/**
 * Bulk update campaign status
 */
export function bulkUpdateCampaignStatus(
  campaignIds: string[],
  status: 'active' | 'paused' | 'completed' | 'archived'
): number {
  if (campaignIds.length === 0) return 0;

  const db = getDatabase();
  const placeholders = campaignIds.map(() => '?').join(',');
  const stmt = db.prepare(`
    UPDATE campaigns
    SET status = ?
    WHERE id IN (${placeholders})
  `);

  const result = stmt.run(status, ...campaignIds);
  return result.changes;
}

/**
 * Bulk delete campaigns (actually archives them)
 */
export function bulkArchiveCampaigns(campaignIds: string[]): number {
  return bulkUpdateCampaignStatus(campaignIds, 'archived');
}

/**
 * Permanently delete a campaign and all its data
 * WARNING: This is irreversible!
 */
export function permanentlyDeleteCampaign(campaignId: string): boolean {
  const db = getDatabase();

  // Delete campaign (CASCADE will delete recipients, events, conversions)
  const stmt = db.prepare('DELETE FROM campaigns WHERE id = ?');
  const result = stmt.run(campaignId);

  return result.changes > 0;
}

/**
 * Bulk permanently delete campaigns
 * WARNING: This is irreversible!
 */
export function bulkPermanentlyDeleteCampaigns(campaignIds: string[]): number {
  if (campaignIds.length === 0) return 0;

  const db = getDatabase();
  const placeholders = campaignIds.map(() => '?').join(',');
  const stmt = db.prepare(`DELETE FROM campaigns WHERE id IN (${placeholders})`);

  const result = stmt.run(...campaignIds);
  return result.changes;
}

/**
 * Get campaign count by status
 */
export function getCampaignCountByStatus(): Record<string, number> {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM campaigns
    GROUP BY status
  `);

  const results = stmt.all() as Array<{ status: string; count: number }>;

  return results.reduce((acc, { status, count }) => {
    acc[status] = count;
    return acc;
  }, {} as Record<string, number>);
}

// ==================== SYSTEM TEMPLATES INITIALIZATION ====================

/**
 * Initialize default system templates
 * Called on first run to populate template library
 */
export function initializeSystemTemplates(): void {
  const db = getDatabase();

  // Check if system templates already exist
  const checkStmt = db.prepare('SELECT COUNT(*) as count FROM campaign_templates WHERE is_system_template = 1');
  const { count } = checkStmt.get() as { count: number };

  if (count > 0) return; // Already initialized

  const systemTemplates = [
    {
      name: 'Seasonal Promotion',
      description: 'Perfect for holiday and seasonal sales campaigns',
      category: 'seasonal' as const,
      templateData: {
        message: "Don't miss our exclusive {season} sale! {discount}% off select items. Visit us this week!",
        targetAudience: 'General consumers',
        tone: 'Exciting and urgent',
      },
    },
    {
      name: 'Product Launch',
      description: 'Introduce new products or services to your audience',
      category: 'promotional' as const,
      templateData: {
        message: "Introducing {product_name}! Be among the first to experience {key_benefit}. Limited-time offer for early adopters.",
        targetAudience: 'Early adopters and loyal customers',
        tone: 'Innovative and exclusive',
      },
    },
    {
      name: 'Customer Appreciation',
      description: 'Thank loyal customers and strengthen relationships',
      category: 'general' as const,
      templateData: {
        message: "Thank you for being a valued customer! As a token of our appreciation, enjoy {reward} on your next visit.",
        targetAudience: 'Existing customers',
        tone: 'Warm and grateful',
      },
    },
    {
      name: 'Store Grand Opening',
      description: 'Announce new store locations to local communities',
      category: 'retail' as const,
      templateData: {
        message: "We're excited to announce our new {location} location! Join us for our grand opening celebration. Special offers inside!",
        targetAudience: 'Local residents',
        tone: 'Welcoming and festive',
      },
    },
    {
      name: 'Limited Time Offer',
      description: 'Create urgency with time-sensitive promotions',
      category: 'promotional' as const,
      templateData: {
        message: "⏰ {hours} hours left! Get {discount}% off {product_category}. Don't let this opportunity pass!",
        targetAudience: 'Bargain hunters',
        tone: 'Urgent and compelling',
      },
    },
  ];

  systemTemplates.forEach((template) => {
    createCampaignTemplate({
      ...template,
      isSystemTemplate: true,
    });
  });
}
