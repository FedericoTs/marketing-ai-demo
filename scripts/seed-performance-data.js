/**
 * Seed Performance Data - Plain Node.js (no TypeScript)
 * Adds realistic campaign performance data to enable percentile rankings
 */

const Database = require('better-sqlite3');
const path = require('path');
const { randomBytes } = require('crypto');

// Generate nanoid-like IDs
function generateId(size = 16) {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
  const bytes = randomBytes(size);
  let id = '';
  for (let i = 0; i < size; i++) {
    id += alphabet[bytes[i] % alphabet.length];
  }
  return id;
}

const dbPath = path.join(process.cwd(), 'dm-tracking.db');
const db = new Database(dbPath);

console.log('🌱 Seeding performance data to dm-tracking.db\n');

try {
  // Get existing stores
  const stores = db.prepare('SELECT id, name, size_category FROM retail_stores WHERE name IN (?, ?, ?)').all(
    'Portland Central',
    'Phoenix North',
    'Downtown Miami Store'
  );

  console.log(`Found ${stores.length} existing stores to populate\n`);

  if (stores.length === 0) {
    console.error('❌ No stores found! Make sure Portland Central, Phoenix North, and Downtown Miami Store exist.');
    process.exit(1);
  }

  // Get a campaign ID to use
  const campaign = db.prepare('SELECT id FROM campaigns LIMIT 1').get();
  if (!campaign) {
    console.error('❌ No campaigns found! Please create at least one campaign first.');
    process.exit(1);
  }

  const campaignId = campaign.id;

  // Define performance tiers
  const performanceTiers = {
    'Portland Central': { baseRate: 5.0, campaigns: 6, quantities: [300, 500, 800, 1200, 2000, 3500] },
    'Phoenix North': { baseRate: 3.0, campaigns: 6, quantities: [300, 500, 800, 1200, 2000, 3500] },
    'Downtown Miami Store': { baseRate: 2.5, campaigns: 6, quantities: [300, 500, 800, 1200, 2000, 3500] }
  };

  const insertDeployment = db.prepare(`
    INSERT INTO retail_campaign_deployments (id, campaign_id, store_id, status, created_at, updated_at)
    VALUES (?, ?, ?, 'completed', datetime('now', ?), datetime('now'))
  `);

  const insertRecipient = db.prepare(`
    INSERT INTO recipients (id, tracking_id, name, email, created_at)
    VALUES (?, ?, ?, ?, datetime('now', ?))
  `);

  const insertDeploymentRecipient = db.prepare(`
    INSERT INTO retail_deployment_recipients (id, deployment_id, recipient_id)
    VALUES (?, ?, ?)
  `);

  const insertConversion = db.prepare(`
    INSERT INTO conversions (id, tracking_id, conversion_type, created_at)
    VALUES (?, ?, 'form_submission', datetime('now', ?))
  `);

  let totalDeployments = 0;
  let totalRecipients = 0;
  let totalConversions = 0;

  // Process each store
  for (const store of stores) {
    const storeName = store.name;
    const tier = performanceTiers[storeName];

    if (!tier) continue;

    console.log(`📊 Processing ${storeName} (${tier.baseRate}% base conversion rate)...`);

    // Create campaigns at different quantities
    for (let i = 0; i < tier.campaigns; i++) {
      const deploymentId = generateId();
      const quantity = tier.quantities[i];
      const daysAgo = `-${10 + i * 15} days`;

      // Create deployment
      insertDeployment.run(deploymentId, campaignId, store.id, daysAgo);
      totalDeployments++;

      // Calculate expected conversion rate with diminishing returns
      // Use Hill saturation: rate = baseRate * quantity^0.9 / (halfSat^0.9 + quantity^0.9)
      const halfSat = 2000;
      const saturationFactor = Math.pow(quantity, 0.9) / (Math.pow(halfSat, 0.9) + Math.pow(quantity, 0.9));
      const effectiveRate = tier.baseRate * (0.5 + 0.5 * saturationFactor); // Scale between 50-100% of base rate

      // Add some randomness (±20%)
      const noise = (Math.random() - 0.5) * 0.4;
      const actualRate = Math.max(0.5, effectiveRate * (1 + noise));

      // Create recipients
      const recipientIds = [];
      for (let j = 0; j < quantity; j++) {
        const recipientId = generateId();
        const trackingId = generateId();

        insertRecipient.run(
          recipientId,
          trackingId,
          `Customer ${j + 1}`,
          `customer${j}@example.com`,
          daysAgo
        );

        insertDeploymentRecipient.run(generateId(), deploymentId, recipientId);
        recipientIds.push(trackingId);
        totalRecipients++;
      }

      // Create conversions based on calculated rate
      const conversionCount = Math.round((quantity * actualRate) / 100);

      // Shuffle and take first N recipients for conversions
      const shuffled = recipientIds.sort(() => Math.random() - 0.5);
      const converters = shuffled.slice(0, conversionCount);

      for (const trackingId of converters) {
        insertConversion.run(
          generateId(),
          trackingId,
          daysAgo
        );
        totalConversions++;
      }

      console.log(`  ✓ Campaign ${i + 1}: ${quantity} pieces → ${conversionCount} conversions (${actualRate.toFixed(2)}%)`);
    }

    console.log();
  }

  console.log('━'.repeat(80));
  console.log('✅ Seeding complete!\n');
  console.log(`📈 Created:`);
  console.log(`   - ${totalDeployments} campaigns`);
  console.log(`   - ${totalRecipients} recipients`);
  console.log(`   - ${totalConversions} conversions\n`);

  // Verify results
  const stats = db.prepare(`
    SELECT
      s.name,
      COUNT(DISTINCT d.id) as campaigns,
      COUNT(DISTINCT rdr.recipient_id) as recipients,
      COUNT(DISTINCT c.id) as conversions,
      ROUND(CAST(COUNT(DISTINCT c.id) AS FLOAT) / COUNT(DISTINCT rdr.recipient_id) * 100, 2) as conversion_rate
    FROM retail_stores s
    LEFT JOIN retail_campaign_deployments d ON s.id = d.store_id
    LEFT JOIN retail_deployment_recipients rdr ON d.id = rdr.deployment_id
    LEFT JOIN recipients r ON rdr.recipient_id = r.id
    LEFT JOIN conversions c ON r.tracking_id = c.tracking_id
    WHERE s.name IN ('Portland Central', 'Phoenix North', 'Downtown Miami Store')
    GROUP BY s.id
    ORDER BY conversion_rate DESC
  `).all();

  console.log('📊 Final Performance Rankings:\n');
  console.log('Store                     | Campaigns | Recipients | Conversions | Rate');
  console.log('─'.repeat(80));
  stats.forEach(s => {
    console.log(
      `${s.name.padEnd(25)} | ${String(s.campaigns).padStart(9)} | ${String(s.recipients).padStart(10)} | ${String(s.conversions).padStart(11)} | ${s.conversion_rate}%`
    );
  });

  console.log('\n🎯 Percentile rankings should now work properly!');
  console.log('💡 Test in the Planning Workspace by overriding quantities.\n');

  db.close();

} catch (error) {
  console.error('❌ Error seeding data:', error);
  db.close();
  process.exit(1);
}
