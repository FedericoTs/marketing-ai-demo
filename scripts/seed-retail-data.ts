/**
 * Seed Retail Performance Data
 *
 * Creates realistic retail store data with historical campaign performance.
 * This enables the percentile ranking system to work properly.
 *
 * Run with: npx tsx scripts/seed-retail-data.ts
 */

import { getDatabase } from '../lib/database/connection';
import { nanoid } from 'nanoid';

function seedRetailData() {
  const db = getDatabase();

  console.log('🌱 Seeding retail performance data...\n');

  // ============================================================================
  // 1. CREATE RETAIL STORES (25 stores across different tiers)
  // ============================================================================

  const stores = [
    // HIGH PERFORMERS (5 stores) - 4-6% base conversion rate
    { tier: 'high', name: 'Premium Downtown', region: 'Northeast', baseRate: 5.5, volatility: 0.3 },
    { tier: 'high', name: 'Flagship Manhattan', region: 'Northeast', baseRate: 5.2, volatility: 0.4 },
    { tier: 'high', name: 'Beverly Hills Store', region: 'West', baseRate: 5.8, volatility: 0.2 },
    { tier: 'high', name: 'Chicago Gold Coast', region: 'Midwest', baseRate: 4.9, volatility: 0.3 },
    { tier: 'high', name: 'Miami Beach', region: 'South', baseRate: 5.3, volatility: 0.4 },

    // MEDIUM PERFORMERS (12 stores) - 2.5-4% base conversion rate
    { tier: 'medium', name: 'Suburban Mall A', region: 'Northeast', baseRate: 3.5, volatility: 0.5 },
    { tier: 'medium', name: 'Suburban Mall B', region: 'West', baseRate: 3.2, volatility: 0.4 },
    { tier: 'medium', name: 'Austin Central', region: 'South', baseRate: 3.8, volatility: 0.3 },
    { tier: 'medium', name: 'Denver Plaza', region: 'West', baseRate: 3.4, volatility: 0.4 },
    { tier: 'medium', name: 'Atlanta Midtown', region: 'South', baseRate: 3.6, volatility: 0.5 },
    { tier: 'medium', name: 'Seattle Downtown', region: 'West', baseRate: 3.3, volatility: 0.4 },
    { tier: 'medium', name: 'Boston Commons', region: 'Northeast', baseRate: 3.7, volatility: 0.3 },
    { tier: 'medium', name: 'Portland Strip', region: 'West', baseRate: 3.1, volatility: 0.5 },
    { tier: 'medium', name: 'Philadelphia Center', region: 'Northeast', baseRate: 3.4, volatility: 0.4 },
    { tier: 'medium', name: 'Minneapolis Lake', region: 'Midwest', baseRate: 3.2, volatility: 0.5 },
    { tier: 'medium', name: 'Phoenix Desert', region: 'West', baseRate: 3.0, volatility: 0.6 },
    { tier: 'medium', name: 'San Diego Coast', region: 'West', baseRate: 3.9, volatility: 0.3 },

    // LOW PERFORMERS (8 stores) - 1.5-2.5% base conversion rate
    { tier: 'low', name: 'Rural Location A', region: 'Midwest', baseRate: 2.2, volatility: 0.7 },
    { tier: 'low', name: 'Rural Location B', region: 'South', baseRate: 1.9, volatility: 0.8 },
    { tier: 'low', name: 'Struggling Mall C', region: 'Midwest', baseRate: 2.1, volatility: 0.7 },
    { tier: 'low', name: 'Outlet Store D', region: 'South', baseRate: 2.4, volatility: 0.6 },
    { tier: 'low', name: 'Small Town E', region: 'Midwest', baseRate: 1.8, volatility: 0.9 },
    { tier: 'low', name: 'Strip Mall F', region: 'South', baseRate: 2.0, volatility: 0.8 },
    { tier: 'low', name: 'Budget Plaza G', region: 'West', baseRate: 2.3, volatility: 0.7 },
    { tier: 'low', name: 'Economy Store H', region: 'Midwest', baseRate: 1.7, volatility: 0.9 },
  ];

  console.log(`📍 Creating ${stores.length} retail stores...`);

  const storeIds: Array<{ id: string; baseRate: number; volatility: number; tier: string }> = [];

  const insertStore = db.prepare(`
    INSERT INTO retail_stores (id, store_number, name, region, city, state, size_category, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
  `);

  stores.forEach((store, idx) => {
    const storeId = nanoid();
    const storeNumber = `STORE${String(idx + 1).padStart(3, '0')}`;

    insertStore.run(
      storeId,
      storeNumber,
      store.name,
      store.region,
      store.name.split(' ')[0], // Use first word as city
      'XX', // State placeholder
      store.tier // Use tier as size category
    );

    storeIds.push({ id: storeId, baseRate: store.baseRate, volatility: store.volatility, tier: store.tier });
  });

  console.log(`✅ Created ${storeIds.length} stores\n`);

  // ============================================================================
  // 2. CREATE HISTORICAL CAMPAIGNS (5-8 campaigns per store)
  // ============================================================================

  console.log('📊 Creating historical campaigns with varying quantities...');

  const insertDeployment = db.prepare(`
    INSERT INTO retail_campaign_deployments (id, store_id, status, created_at)
    VALUES (?, ?, 'completed', datetime('now', ?))
  `);

  const insertRecipient = db.prepare(`
    INSERT INTO retail_deployment_recipients (id, deployment_id, recipient_id)
    VALUES (?, ?, ?)
  `);

  const insertRecipientBase = db.prepare(`
    INSERT INTO recipients (id, tracking_id, name, email, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `);

  const insertConversion = db.prepare(`
    INSERT INTO conversions (id, tracking_id, conversion_type, created_at)
    VALUES (?, ?, 'form_submission', datetime('now'))
  `);

  let totalDeployments = 0;
  let totalRecipients = 0;
  let totalConversions = 0;

  // Quantity levels to test (creates variation)
  const quantityLevels = [300, 500, 800, 1000, 1500, 2000, 3000, 5000];

  storeIds.forEach((store) => {
    // Each store gets 5-8 campaigns at different quantity levels
    const campaignCount = 5 + Math.floor(Math.random() * 4);
    const selectedQuantities = quantityLevels.sort(() => Math.random() - 0.5).slice(0, campaignCount);

    selectedQuantities.forEach((quantity, campaignIdx) => {
      const deploymentId = nanoid();
      const daysAgo = `-${10 + campaignIdx * 15} days`; // Spread over time

      insertDeployment.run(deploymentId, store.id, daysAgo);
      totalDeployments++;

      // Create recipients
      const recipientIds: string[] = [];
      for (let i = 0; i < quantity; i++) {
        const recipientId = nanoid();
        const trackingId = nanoid();

        insertRecipientBase.run(
          recipientId,
          trackingId,
          `Recipient ${i + 1}`,
          `recipient${i}@example.com`
        );

        insertRecipient.run(nanoid(), deploymentId, recipientId);
        recipientIds.push(trackingId);
        totalRecipients++;
      }

      // Calculate conversions using response curve model
      // Base rate decreases with quantity (diminishing returns)
      const saturationFactor = Math.pow(quantity, 0.9) / (Math.pow(2000, 0.9) + Math.pow(quantity, 0.9));
      const marketSize = 10000;
      const maxConversions = marketSize * (store.baseRate / 100);
      const expectedConversions = maxConversions * saturationFactor;
      const effectiveRate = (expectedConversions / quantity) * 100;

      // Add randomness based on store volatility
      const noise = (Math.random() - 0.5) * 2 * store.volatility;
      const actualRate = Math.max(0.5, effectiveRate * (1 + noise));
      const actualConversions = Math.round((quantity * actualRate) / 100);

      // Create conversions
      const conversionCount = Math.min(actualConversions, recipientIds.length);
      const convertedRecipients = recipientIds.sort(() => Math.random() - 0.5).slice(0, conversionCount);

      convertedRecipients.forEach((trackingId) => {
        insertConversion.run(nanoid(), trackingId);
        totalConversions++;
      });
    });
  });

  console.log(`✅ Created ${totalDeployments} historical campaigns`);
  console.log(`✅ Created ${totalRecipients} recipients`);
  console.log(`✅ Created ${totalConversions} conversions\n`);

  // ============================================================================
  // 3. VERIFY DATA
  // ============================================================================

  console.log('🔍 Verifying seeded data...\n');

  const stats = db
    .prepare(
      `
    SELECT
      s.id,
      s.name,
      s.size_category as tier,
      COUNT(DISTINCT d.id) as campaigns,
      COUNT(DISTINCT rdr.recipient_id) as recipients,
      COUNT(DISTINCT c.id) as conversions,
      ROUND(CAST(COUNT(DISTINCT c.id) AS FLOAT) / COUNT(DISTINCT rdr.recipient_id) * 100, 2) as conversion_rate
    FROM retail_stores s
    LEFT JOIN retail_campaign_deployments d ON s.id = d.store_id
    LEFT JOIN retail_deployment_recipients rdr ON d.id = rdr.deployment_id
    LEFT JOIN recipients r ON rdr.recipient_id = r.id
    LEFT JOIN conversions c ON r.tracking_id = c.tracking_id
    GROUP BY s.id
    ORDER BY conversion_rate DESC
  `
    )
    .all() as any[];

  console.log('Top 10 Performers:');
  console.log('─'.repeat(80));
  stats.slice(0, 10).forEach((s, idx) => {
    console.log(
      `${idx + 1}. ${s.name.padEnd(25)} | ${s.tier.padEnd(8)} | ${s.campaigns} campaigns | ${s.conversion_rate}% rate`
    );
  });

  console.log('\nBottom 5 Performers:');
  console.log('─'.repeat(80));
  stats.slice(-5).forEach((s, idx) => {
    console.log(
      `${stats.length - 4 + idx}. ${s.name.padEnd(25)} | ${s.tier.padEnd(8)} | ${s.campaigns} campaigns | ${s.conversion_rate}% rate`
    );
  });

  console.log('\n✅ Retail data seeding complete!\n');
  console.log('🎯 You can now test percentile rankings with actual benchmark data.');
  console.log('📊 The system will compare stores against this performance distribution.\n');
}

// Run seeding
try {
  seedRetailData();
} catch (error) {
  console.error('❌ Error seeding data:', error);
  process.exit(1);
}
