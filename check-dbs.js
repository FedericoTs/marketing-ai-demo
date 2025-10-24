const Database = require('better-sqlite3');
const path = require('path');

console.log('\n🔍 DATABASE COMPARISON\n');

// Check dm-tracking.db
try {
  const dmTrackingPath = path.join(__dirname, 'dm-tracking.db');
  const dmTrackingDb = new Database(dmTrackingPath);

  const dmTrackingTemplates = dmTrackingDb.prepare('SELECT COUNT(*) as count FROM campaign_templates').get();
  const dmTrackingDMs = dmTrackingDb.prepare('SELECT COUNT(*) as count FROM dm_templates').get();
  const dmTrackingDMsWithPreview = dmTrackingDb.prepare('SELECT COUNT(*) as count FROM dm_templates WHERE preview_image IS NOT NULL').get();

  console.log('📊 dm-tracking.db:');
  console.log('  - Campaign Templates:', dmTrackingTemplates.count);
  console.log('  - DM Templates:', dmTrackingDMs.count);
  console.log('  - DM Templates with Preview:', dmTrackingDMsWithPreview.count);

  // Get sample template IDs
  const dmTrackingSample = dmTrackingDb.prepare('SELECT id, name, is_system_template FROM campaign_templates LIMIT 10').all();
  console.log('  - Sample template IDs:', dmTrackingSample.map(t => `${t.id} (${t.name}, system=${t.is_system_template})`).join('\n    '));

  dmTrackingDb.close();
} catch (error) {
  console.log('❌ dm-tracking.db error:', error.message);
}

console.log('\n');

// Check marketing.db
try {
  const marketingPath = path.join(__dirname, 'marketing.db');
  const marketingDb = new Database(marketingPath);

  const marketingTemplates = marketingDb.prepare('SELECT COUNT(*) as count FROM campaign_templates').get();
  const marketingDMs = marketingDb.prepare('SELECT COUNT(*) as count FROM dm_templates').get();
  const marketingDMsWithPreview = marketingDb.prepare('SELECT COUNT(*) as count FROM dm_templates WHERE preview_image IS NOT NULL').get();

  console.log('📊 marketing.db:');
  console.log('  - Campaign Templates:', marketingTemplates.count);
  console.log('  - DM Templates:', marketingDMs.count);
  console.log('  - DM Templates with Preview:', marketingDMsWithPreview.count);

  // Get sample template IDs
  const marketingSample = marketingDb.prepare('SELECT id, name, is_system_template FROM campaign_templates LIMIT 10').all();
  console.log('  - Sample template IDs:', marketingSample.map(t => `${t.id} (${t.name}, system=${t.is_system_template})`).join('\n    '));

  marketingDb.close();
} catch (error) {
  console.log('❌ marketing.db error:', error.message);
}

console.log('\n✅ Comparison complete\n');
