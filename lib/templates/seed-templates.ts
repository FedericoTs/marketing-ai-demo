import { getDatabase } from '../database/connection';
import { PREBUILT_TEMPLATES } from './prebuilt-templates';

/**
 * Seed database with pre-built templates
 *
 * Run this once to populate the database with system templates
 * Can be run multiple times safely (upserts)
 */
export function seedTemplates(): void {
  console.log('🌱 Seeding landing page templates...');

  const db = createServiceClient();
  const now = new Date().toISOString();

  let inserted = 0;
  let updated = 0;

  for (const template of PREBUILT_TEMPLATES) {
    try {
      // Check if exists
      const existing = db.prepare('SELECT id FROM landing_page_templates WHERE id = ?').get(template.id);

      if (existing) {
        // Update existing template
        db.prepare(`
          UPDATE landing_page_templates
          SET name = ?,
              description = ?,
              template_config = ?,
              updated_at = ?
          WHERE id = ?
        `).run(
          template.name,
          template.description,
          template.template_config,
          now,
          template.id
        );
        updated++;
        console.log(`  ✓ Updated: ${template.name}`);
      } else {
        // Insert new template
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
        inserted++;
        console.log(`  ✓ Inserted: ${template.name}`);
      }
    } catch (error) {
      console.error(`  ✗ Error seeding ${template.name}:`, error);
    }
  }

  console.log(`\n✅ Template seeding complete!`);
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Total: ${PREBUILT_TEMPLATES.length}\n`);
}

// Auto-seed if run directly
if (require.main === module) {
  seedTemplates();
}
