/**
 * Seed Planning Workspace with Sample Data
 * Creates test plans with AI recommendations for testing
 *
 * Usage: node scripts/seed-planning-data.js
 */

const Database = require('better-sqlite3');
const path = require('path');
const { nanoid } = require('nanoid');

// Database path
const DB_PATH = path.join(__dirname, '..', 'dm-tracking.db');

console.log('🌱 Seeding Planning Workspace with sample data...');

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

try {
  // Check if retail_stores table has data
  const storeCount = db.prepare('SELECT COUNT(*) as count FROM retail_stores').get();
  if (storeCount.count === 0) {
    console.log('⚠️  No retail stores found. Please seed retail stores first.');
    process.exit(1);
  }

  // Check if campaigns table has data
  const campaignCount = db.prepare('SELECT COUNT(*) as count FROM campaigns').get();
  if (campaignCount.count === 0) {
    console.log('⚠️  No campaigns found. Please create campaigns first.');
    process.exit(1);
  }

  // Get some sample stores
  const stores = db.prepare('SELECT * FROM retail_stores LIMIT 10').all();
  // Get some sample campaigns
  const campaigns = db.prepare('SELECT * FROM campaigns LIMIT 3').all();

  console.log(`✅ Found ${stores.length} stores and ${campaigns.length} campaigns`);

  // Create sample plans
  const plans = [
    {
      id: `plan_${nanoid(12)}`,
      name: 'March 2025 Spring Campaign',
      description: 'Spring season DM campaign targeting all regions',
      status: 'draft',
      notes: 'Focus on spring themes and seasonal offers',
    },
    {
      id: `plan_${nanoid(12)}`,
      name: 'Q2 2025 Regional Rollout',
      description: 'Regional expansion campaign with targeted messaging',
      status: 'approved',
      notes: 'Approved for execution, ready to create orders',
    },
  ];

  console.log('\n📋 Creating sample plans...');

  const insertPlan = db.prepare(`
    INSERT INTO campaign_plans (
      id, name, description, status, notes,
      created_at, updated_at,
      total_stores, total_quantity, estimated_cost, expected_conversions, avg_confidence
    ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'), 0, 0, 0, 0, 0)
  `);

  plans.forEach(plan => {
    insertPlan.run(plan.id, plan.name, plan.description, plan.status, plan.notes);
    console.log(`   ✓ Created plan: ${plan.name}`);
  });

  // Create sample plan items with AI reasoning data
  console.log('\n🏪 Creating sample plan items with AI recommendations...');

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

  let itemCount = 0;

  plans.forEach((plan, planIndex) => {
    // Add 5-8 stores to each plan
    const storeSubset = stores.slice(0, planIndex === 0 ? 8 : 5);

    storeSubset.forEach((store, storeIndex) => {
      const campaign = campaigns[storeIndex % campaigns.length];

      // Generate varied AI confidence and scores
      const baseConfidence = 55 + Math.random() * 40; // 55-95
      const confidenceLevel =
        baseConfidence >= 75 ? 'high' :
        baseConfidence >= 50 ? 'medium' : 'low';

      const scores = {
        store_performance: 40 + Math.random() * 55, // 40-95
        creative_performance: 50 + Math.random() * 45, // 50-95
        geographic_fit: 45 + Math.random() * 50, // 45-95
        timing_alignment: 50 + Math.random() * 45, // 50-95
      };

      // Generate reasoning based on scores
      const reasoning = [];
      if (scores.store_performance > 75) {
        reasoning.push(`Strong historical performance at this store (${(2 + Math.random() * 3).toFixed(1)}% conversion rate)`);
      }
      if (scores.creative_performance > 70) {
        reasoning.push(`Campaign performs well at similar stores (${Math.floor(70 + Math.random() * 25)}% success rate)`);
      }
      if (scores.geographic_fit > 70) {
        reasoning.push('High regional fit for this campaign theme');
      }
      if (scores.timing_alignment > 70) {
        reasoning.push('Seasonal timing aligns well with campaign message');
      }
      if (reasoning.length === 0) {
        reasoning.push('Campaign available for this store type');
      }

      // Generate risks for low-confidence items
      const risks = [];
      if (baseConfidence < 60) {
        if (scores.store_performance < 50) {
          risks.push('Limited historical data for this store');
        }
        if (scores.geographic_fit < 50) {
          risks.push('Demographic mismatch with campaign target');
        }
        if (scores.timing_alignment < 50) {
          risks.push('Suboptimal seasonal timing');
        }
      }

      const quantity = 50 + Math.floor(Math.random() * 150); // 50-200
      const unitCost = 0.05;
      const totalCost = quantity * unitCost;
      const expectedConversionRate = 1.5 + Math.random() * 3; // 1.5-4.5%
      const expectedConversions = (quantity * expectedConversionRate / 100);

      insertItem.run(
        `item_${nanoid(12)}`,
        plan.id,
        store.id,
        store.store_number,
        store.store_name,
        campaign.id,
        campaign.name,
        quantity,
        unitCost,
        totalCost,
        storeIndex < 3 ? 'W1' : storeIndex < 6 ? 'W2' : null, // Assign some to waves
        storeIndex < 3 ? 'Week 1' : storeIndex < 6 ? 'Week 2' : null,
        1, // is_included
        campaign.id, // ai_recommended (same as chosen for simplicity)
        campaign.name,
        quantity,
        baseConfidence,
        confidenceLevel,
        scores.store_performance,
        scores.creative_performance,
        scores.geographic_fit,
        scores.timing_alignment,
        JSON.stringify(reasoning),
        risks.length > 0 ? JSON.stringify(risks) : null,
        expectedConversionRate,
        expectedConversions,
        baseConfidence >= 75 ? 1 : 0 // auto_approved if high confidence
      );

      itemCount++;
    });

    console.log(`   ✓ Added ${storeSubset.length} items to "${plan.name}"`);
  });

  // Update plan aggregates
  console.log('\n🔄 Updating plan aggregates...');

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

    console.log(`   ✓ Updated aggregates for "${plan.name}"`);
  });

  console.log('\n✨ Sample data seeded successfully!');
  console.log(`📊 Created ${plans.length} plans with ${itemCount} total items`);
  console.log('\n🚀 You can now test the Planning Workspace at:');
  console.log('   http://localhost:3000/campaigns/planning');

} catch (error) {
  console.error('❌ Error seeding data:', error.message);
  console.error(error);
  process.exit(1);
} finally {
  db.close();
}
