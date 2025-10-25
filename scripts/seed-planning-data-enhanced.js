/**
 * Enhanced Seed Script for Planning Workspace
 * Creates compelling, realistic sample data showcasing AI reasoning
 *
 * Usage: node scripts/seed-planning-data-enhanced.js
 */

const Database = require('better-sqlite3');
const path = require('path');
const { nanoid } = require('nanoid');

const DB_PATH = path.join(__dirname, '..', 'dm-tracking.db');

console.log('🌱 Seeding Planning Workspace with COMPELLING sample data...\n');

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

try {
  // ============================================
  // STEP 1: Ensure we have enough retail stores
  // ============================================

  const storeCount = db.prepare('SELECT COUNT(*) as count FROM retail_stores').get();
  console.log(`📊 Current retail stores: ${storeCount.count}`);

  const compellingStores = [
    { number: 'SF-001', name: 'San Francisco Downtown', city: 'San Francisco', state: 'CA',
      segment: 'Urban Premium', perf_tier: 'high' },
    { number: 'LA-045', name: 'Los Angeles Westside', city: 'Los Angeles', state: 'CA',
      segment: 'Urban Premium', perf_tier: 'high' },
    { number: 'NY-112', name: 'Manhattan Midtown', city: 'New York', state: 'NY',
      segment: 'Urban Premium', perf_tier: 'high' },
    { number: 'CHI-023', name: 'Chicago Loop', city: 'Chicago', state: 'IL',
      segment: 'Urban Core', perf_tier: 'medium' },
    { number: 'SEA-067', name: 'Seattle Capitol Hill', city: 'Seattle', state: 'WA',
      segment: 'Urban Core', perf_tier: 'medium' },
    { number: 'AUS-089', name: 'Austin Downtown', city: 'Austin', state: 'TX',
      segment: 'Urban Core', perf_tier: 'medium' },
    { number: 'DEN-034', name: 'Denver Cherry Creek', city: 'Denver', state: 'CO',
      segment: 'Suburban', perf_tier: 'medium' },
    { number: 'BOS-098', name: 'Boston Back Bay', city: 'Boston', state: 'MA',
      segment: 'Urban Premium', perf_tier: 'high' },
    { number: 'MIA-056', name: 'Miami Beach', city: 'Miami', state: 'FL',
      segment: 'Tourist District', perf_tier: 'low' },
    { number: 'PHX-145', name: 'Phoenix Suburban', city: 'Phoenix', state: 'AZ',
      segment: 'Suburban', perf_tier: 'low' },
  ];

  if (storeCount.count < 8) {
    console.log('🏪 Adding compelling retail stores for demo...\n');

    const insertStore = db.prepare(`
      INSERT OR IGNORE INTO retail_stores (
        id, store_number, name, address, city, state, zip,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    compellingStores.forEach((store, idx) => {
      insertStore.run(
        `store_${nanoid(12)}`,
        store.number,
        store.name,
        `${100 + idx * 5} Main Street`,
        store.city,
        store.state,
        '90001'
      );
      console.log(`   ✓ Added: ${store.number} - ${store.name}`);
    });
  }

  // Get all stores
  const stores = db.prepare('SELECT * FROM retail_stores LIMIT 10').all();
  const campaigns = db.prepare('SELECT * FROM campaigns LIMIT 5').all();

  if (campaigns.length === 0) {
    console.log('\n⚠️  No campaigns found. Please create campaigns first.');
    process.exit(1);
  }

  console.log(`\n✅ Working with ${stores.length} stores and ${campaigns.length} campaigns\n`);

  // ============================================
  // STEP 2: Create compelling campaign plans
  // ============================================

  const plans = [
    {
      id: `plan_${nanoid(12)}`,
      name: 'Q2 2025 Spring Promotion Rollout',
      description: 'Major spring campaign targeting high-performing urban stores with proven creative',
      status: 'draft',
      notes: 'AI recommends focusing on top 3 metro markets based on historical 4.2% conversion rate',
    },
    {
      id: `plan_${nanoid(12)}`,
      name: 'Regional Expansion Test - Southwest',
      description: 'Pilot campaign for new Southwest markets with adjusted messaging',
      status: 'draft',
      notes: 'Lower confidence due to limited historical data, but strong demographic fit',
    },
  ];

  console.log('📋 Creating compelling campaign plans...\n');

  const insertPlan = db.prepare(`
    INSERT INTO campaign_plans (
      id, name, description, status, notes,
      created_at, updated_at,
      total_stores, total_quantity, estimated_cost, expected_conversions, avg_confidence
    ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'), 0, 0, 0, 0, 0)
  `);

  plans.forEach(plan => {
    insertPlan.run(plan.id, plan.name, plan.description, plan.status, plan.notes);
    console.log(`   ✓ Created: ${plan.name}`);
  });

  // ============================================
  // STEP 3: Create COMPELLING AI-driven plan items
  // ============================================

  console.log('\n🎯 Creating AI recommendations with compelling scenarios...\n');

  const insertItem = db.prepare(`
    INSERT INTO plan_items (
      id, plan_id, store_id, store_number, store_name,
      campaign_id, campaign_name, quantity, unit_cost, total_cost,
      wave, wave_name, is_included,
      ai_recommended_campaign_id, ai_recommended_campaign_name, ai_recommended_quantity,
      ai_confidence, ai_confidence_level,
      ai_score_store_performance, ai_score_creative_performance,
      ai_score_geographic_fit, ai_score_timing_alignment,
      ai_reasoning, ai_risk_factors,
      ai_expected_conversion_rate, ai_expected_conversions,
      ai_auto_approved,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?,
      ?, ?,
      ?, ?,
      ?, ?,
      ?, ?,
      ?,
      datetime('now'), datetime('now')
    )
  `);

  // Define COMPELLING SCENARIOS for Plan 1 (Spring Promotion)
  const plan1Scenarios = [
    // HIGH CONFIDENCE - Urban Premium Store (SF Downtown)
    {
      storeIdx: 0,
      confidence: 92,
      level: 'high',
      scores: { store: 95, creative: 88, geo: 94, timing: 91 },
      reasoning: [
        'Exceptional historical performance with 4.8% conversion rate (highest in region)',
        'This creative achieved 89% success rate at similar urban premium locations',
        'Strong demographic alignment with affluent 35-54 age group',
        'Spring timing perfectly matches historical peak season for this market',
      ],
      risks: [],
      quantity: 250,
      convRate: 4.5,
      wave: 'W1',
      waveName: 'Wave 1 - High Confidence',
    },
    // HIGH CONFIDENCE - Manhattan Midtown
    {
      storeIdx: 2,
      confidence: 89,
      level: 'high',
      scores: { store: 91, creative: 85, geo: 92, timing: 88 },
      reasoning: [
        'Consistent top-tier performance with 4.2% average conversion rate',
        'Campaign tested successfully in NYC market with 85% positive response',
        'Perfect match with Manhattan demographic profile and purchasing behavior',
        'Seasonal timing aligns with Q2 urban shopping patterns',
      ],
      risks: [],
      quantity: 220,
      convRate: 4.0,
      wave: 'W1',
      waveName: 'Wave 1 - High Confidence',
    },
    // MEDIUM-HIGH CONFIDENCE - Chicago Loop
    {
      storeIdx: 3,
      confidence: 76,
      level: 'high',
      scores: { store: 82, creative: 78, geo: 75, timing: 70 },
      reasoning: [
        'Solid historical performance at 3.1% conversion rate',
        'Creative performs well in Midwest urban markets (78% success rate)',
        'Good demographic fit though slightly older target audience',
        'Spring is moderate season for this market (not peak)',
      ],
      risks: [
        'Seasonal timing not optimal - summer campaigns perform 15% better here',
      ],
      quantity: 180,
      convRate: 2.9,
      wave: 'W2',
      waveName: 'Wave 2 - Medium Confidence',
    },
    // MEDIUM CONFIDENCE - Seattle Capitol Hill
    {
      storeIdx: 4,
      confidence: 68,
      level: 'medium',
      scores: { store: 72, creative: 65, geo: 70, timing: 65 },
      reasoning: [
        'Moderate historical performance at 2.5% conversion rate',
        'Creative has mixed results in Pacific Northwest (65% success rate)',
        'Demographic fit is good but messaging may need localization',
        'Spring timing is acceptable but rainy season may impact response',
      ],
      risks: [
        'Creative messaging may need Pacific NW cultural adaptation',
        'Weather patterns suggest delayed spring campaign may perform better',
      ],
      quantity: 150,
      convRate: 2.3,
      wave: 'W2',
      waveName: 'Wave 2 - Medium Confidence',
    },
    // MEDIUM-LOW CONFIDENCE - Miami Beach (Tourist District)
    {
      storeIdx: 8,
      confidence: 58,
      level: 'medium',
      scores: { store: 48, creative: 70, geo: 55, timing: 60 },
      reasoning: [
        'Limited historical data - store opened 8 months ago',
        'Creative performs well in tourist markets nationally (70% success)',
        'Tourist demographic differs from typical target audience',
        'Spring is transition season - not peak tourist period',
      ],
      risks: [
        'Very limited historical performance data (only 2 prior campaigns)',
        'Tourist vs. local resident targeting mismatch',
        'Seasonal tourism patterns unpredictable for this market',
      ],
      quantity: 100,
      convRate: 1.8,
      wave: null,
      waveName: null,
    },
  ];

  // Define scenarios for Plan 2 (Southwest Expansion)
  const plan2Scenarios = [
    // MEDIUM CONFIDENCE - Phoenix Suburban
    {
      storeIdx: 9,
      confidence: 62,
      level: 'medium',
      scores: { store: 55, creative: 68, geo: 65, timing: 60 },
      reasoning: [
        'New store with limited performance history (6 months operation)',
        'Creative tested positively in suburban Phoenix focus groups (68% approval)',
        'Strong demographic fit with family-oriented suburban market',
        'Spring timing acceptable though summer performs better in Arizona',
      ],
      risks: [
        'Limited historical conversion data (only 1 prior campaign)',
        'Suburban Phoenix market shows different patterns than urban cores',
        'Heat season timing may reduce foot traffic',
      ],
      quantity: 120,
      convRate: 2.0,
      wave: 'W1',
      waveName: 'Wave 1 - Test Market',
    },
    // HIGH CONFIDENCE - Denver Cherry Creek
    {
      storeIdx: 6,
      confidence: 84,
      level: 'high',
      scores: { store: 88, creative: 82, geo: 85, timing: 81 },
      reasoning: [
        'Strong historical performance with 3.8% conversion rate',
        'Campaign creative resonates well with Denver affluent demographic',
        'Excellent geographic and psychographic fit for this market',
        'Spring is peak season for Cherry Creek shopping district',
      ],
      risks: [],
      quantity: 200,
      convRate: 3.6,
      wave: 'W1',
      waveName: 'Wave 1 - Test Market',
    },
  ];

  // Insert Plan 1 items
  let itemsAdded = 0;
  plan1Scenarios.forEach((scenario) => {
    const store = stores[scenario.storeIdx];
    const campaign = campaigns[0]; // Use first campaign
    const unitCost = 0.05;
    const totalCost = scenario.quantity * unitCost;
    const expectedConversions = (scenario.quantity * scenario.convRate) / 100;

    insertItem.run(
      `item_${nanoid(12)}`,
      plans[0].id,
      store.id,
      store.store_number,
      store.name,
      campaign.id,
      campaign.name,
      scenario.quantity,
      unitCost,
      totalCost,
      scenario.wave,
      scenario.waveName,
      1, // is_included
      campaign.id,
      campaign.name,
      scenario.quantity,
      scenario.confidence,
      scenario.level,
      scenario.scores.store,
      scenario.scores.creative,
      scenario.scores.geo,
      scenario.scores.timing,
      JSON.stringify(scenario.reasoning),
      scenario.risks.length > 0 ? JSON.stringify(scenario.risks) : null,
      scenario.convRate,
      expectedConversions,
      scenario.confidence >= 75 ? 1 : 0
    );

    itemsAdded++;
    console.log(`   ✓ Plan 1: ${store.store_number} - ${scenario.level.toUpperCase()} confidence (${scenario.confidence}%)`);
  });

  // Insert Plan 2 items
  plan2Scenarios.forEach((scenario) => {
    const store = stores[scenario.storeIdx];
    const campaign = campaigns[1] || campaigns[0]; // Use second campaign or fallback
    const unitCost = 0.05;
    const totalCost = scenario.quantity * unitCost;
    const expectedConversions = (scenario.quantity * scenario.convRate) / 100;

    insertItem.run(
      `item_${nanoid(12)}`,
      plans[1].id,
      store.id,
      store.store_number,
      store.name,
      campaign.id,
      campaign.name,
      scenario.quantity,
      unitCost,
      totalCost,
      scenario.wave,
      scenario.waveName,
      1,
      campaign.id,
      campaign.name,
      scenario.quantity,
      scenario.confidence,
      scenario.level,
      scenario.scores.store,
      scenario.scores.creative,
      scenario.scores.geo,
      scenario.scores.timing,
      JSON.stringify(scenario.reasoning),
      scenario.risks.length > 0 ? JSON.stringify(scenario.risks) : null,
      scenario.convRate,
      expectedConversions,
      scenario.confidence >= 75 ? 1 : 0
    );

    itemsAdded++;
    console.log(`   ✓ Plan 2: ${store.store_number} - ${scenario.level.toUpperCase()} confidence (${scenario.confidence}%)`);
  });

  // ============================================
  // STEP 4: Update plan aggregates
  // ============================================

  console.log('\n🔄 Updating plan aggregates...\n');

  plans.forEach(plan => {
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_stores,
        SUM(quantity) as total_quantity,
        SUM(total_cost) as estimated_cost,
        SUM(ai_expected_conversions) as expected_conversions,
        AVG(ai_confidence) as avg_confidence
      FROM plan_items
      WHERE plan_id = ? AND is_included = 1
    `).get(plan.id);

    db.prepare(`
      UPDATE campaign_plans
      SET
        total_stores = ?,
        total_quantity = ?,
        estimated_cost = ?,
        expected_conversions = ?,
        avg_confidence = ?
      WHERE id = ?
    `).run(
      stats.total_stores || 0,
      stats.total_quantity || 0,
      stats.estimated_cost || 0,
      stats.expected_conversions || 0,
      stats.avg_confidence || 0,
      plan.id
    );

    console.log(`   ✓ ${plan.name}`);
    console.log(`     └─ ${stats.total_stores} stores, $${(stats.estimated_cost || 0).toFixed(2)} cost, ${(stats.avg_confidence || 0).toFixed(0)}% avg confidence`);
  });

  console.log('\n✨ COMPELLING sample data seeded successfully!\n');
  console.log('📊 Summary:');
  console.log(`   • ${plans.length} campaign plans created`);
  console.log(`   • ${itemsAdded} AI-driven recommendations`);
  console.log(`   • Mix of high/medium/low confidence scenarios`);
  console.log(`   • Realistic reasoning and risk factors`);
  console.log('\n🚀 Ready to test at: http://localhost:3000/campaigns/planning\n');

} catch (error) {
  console.error('❌ Error seeding data:', error.message);
  console.error(error);
  process.exit(1);
} finally {
  db.close();
}
