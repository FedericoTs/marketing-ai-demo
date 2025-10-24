const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'dm-tracking.db');
const db = new Database(dbPath);

const templates = ['2cH6aCVbqcimmS6-', 'TDEibYk71tR7lwKj', 'WPiJZYn26A-0OJEH'];

console.log('\n🔍 TEMPLATE DATA DIAGNOSIS\n');
console.log('='  .repeat(80));

templates.forEach(templateId => {
  console.log(`\n📋 Template: ${templateId}`);
  console.log('-'.repeat(80));

  // 1. Campaign template
  const campaignTemplate = db.prepare('SELECT id, name, category, is_system_template FROM campaign_templates WHERE id = ?').get(templateId);
  console.log('1. Campaign Template:', campaignTemplate ? `✅ ${campaignTemplate.name}` : '❌ NOT FOUND');

  // 2. DM Template
  const dmTemplate = db.prepare(`
    SELECT id, campaign_template_id, name,
           CASE WHEN preview_image IS NULL THEN 0 ELSE 1 END as has_preview,
           LENGTH(preview_image) as preview_bytes
    FROM dm_templates
    WHERE campaign_template_id = ?
  `).get(templateId);

  console.log('2. DM Template:', dmTemplate ?
    `✅ ${dmTemplate.name} | Preview: ${dmTemplate.has_preview ? `YES (${(dmTemplate.preview_bytes/1024).toFixed(0)}KB)` : 'NO'}` :
    '❌ NOT FOUND');

  // 3. Campaigns using this template
  const campaigns = db.prepare(`
    SELECT c.id, c.name
    FROM campaigns c
    JOIN dm_templates dt ON dt.campaign_id = c.id
    WHERE dt.campaign_template_id = ?
  `).all(templateId);

  console.log('3. Campaigns using template:', campaigns.length || '❌ NONE');
  if (campaigns.length > 0) {
    campaigns.forEach((c, idx) => {
      console.log(`   ${idx + 1}. ${c.name} (${c.id})`);
    });
  }

  // 4. Landing pages for those campaigns
  if (campaigns.length > 0) {
    const campaignIds = campaigns.map(c => c.id);
    const landingPages = db.prepare(`
      SELECT clp.id, clp.campaign_id, c.name as campaign_name
      FROM campaign_landing_pages clp
      JOIN campaigns c ON c.id = clp.campaign_id
      WHERE clp.campaign_id IN (${campaignIds.map(() => '?').join(',')})
    `).all(...campaignIds);

    console.log('4. Landing Pages:', landingPages.length || '❌ NONE');
    if (landingPages.length > 0) {
      landingPages.forEach((lp, idx) => {
        console.log(`   ${idx + 1}. For campaign: ${lp.campaign_name}`);
      });
    }
  }

  // Summary
  const hasEverything = campaignTemplate && dmTemplate && dmTemplate.has_preview && campaigns.length > 0;
  console.log('\n📊 SUMMARY:');
  console.log('  ✅ Campaign Template:', !!campaignTemplate);
  console.log('  ✅ DM Template:', !!dmTemplate);
  console.log('  ✅ DM Preview Image:', !!(dmTemplate && dmTemplate.has_preview));
  console.log('  ✅ Campaigns:', campaigns.length > 0);

  if (campaigns.length > 0) {
    const campaignIds = campaigns.map(c => c.id);
    const landingPagesCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM campaign_landing_pages
      WHERE campaign_id IN (${campaignIds.map(() => '?').join(',')})
    `).get(...campaignIds);
    console.log('  ✅ Landing Pages:', landingPagesCount.count > 0);
  } else {
    console.log('  ⚠️  Landing Pages: N/A (no campaigns)');
  }

  console.log('\n');
});

db.close();
console.log('='  .repeat(80));
console.log('✅ Diagnosis complete\n');
