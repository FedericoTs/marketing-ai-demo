/**
 * Migration: Create campaigns from DM templates
 *
 * Problem: dm_templates reference campaign_ids that don't exist in campaigns table
 * Solution: Extract unique campaign_ids from dm_templates and create campaign records
 *
 * Date: 2025-10-25
 */

import { getDatabase } from '../connection';

export function migrateTemplatesToCampaigns() {
  const db = getDatabase();

  console.log('[Migration] Creating campaigns from dm_templates...');

  try {
    // Create campaigns from unique template campaign_ids
    const result = db.prepare(`
      INSERT INTO campaigns (id, name, message, company_name, status)
      SELECT DISTINCT
        campaign_id as id,
        name as name,
        'Experience the difference with our innovative solutions tailored to your needs.' as message,
        'Miracle-Ear' as company_name,
        'active' as status
      FROM dm_templates
      WHERE campaign_id NOT IN (SELECT id FROM campaigns)
    `).run();

    console.log(`[Migration] Created ${result.changes} campaigns`);

    // Verify campaigns exist
    const count = db.prepare('SELECT COUNT(*) as count FROM campaigns').get() as { count: number };
    console.log(`[Migration] Total campaigns in database: ${count.count}`);

    return { success: true, campaignsCreated: result.changes, totalCampaigns: count.count };
  } catch (error) {
    console.error('[Migration] Error:', error);
    throw error;
  }
}

/**
 * Run this migration manually if needed:
 *
 * ```bash
 * sqlite3 marketing.db "
 * INSERT INTO campaigns (id, name, message, company_name, status)
 * SELECT DISTINCT
 *   campaign_id as id,
 *   name as name,
 *   'Experience the difference with our innovative solutions tailored to your needs.' as message,
 *   'Miracle-Ear' as company_name,
 *   'active' as status
 * FROM dm_templates
 * WHERE campaign_id NOT IN (SELECT id FROM campaigns);
 * "
 * ```
 */
