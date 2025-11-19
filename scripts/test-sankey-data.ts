/**
 * Test script to verify Sankey chart data includes call tracking
 */

import { createServiceClient } from '../lib/supabase/server';
import { getSankeyChartData } from '../lib/database/analytics-supabase-queries';

async function testSankeyData() {
  const supabase = createServiceClient();

  console.log('🧪 Testing Sankey Chart Data Structure...\n');

  // Use organization with actual campaign data
  const orgId = '47660215-d828-4bbe-9664-57bca613b661';

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', orgId)
    .single();

  if (orgError || !org) {
    console.error('❌ Error fetching organization:', orgError);
    return;
  }

  console.log(`📊 Testing with organization: ${org.name} (${org.id})\n`);

  // Get Sankey data
  const data = await getSankeyChartData(org.id);

  console.log('✅ Sankey Data Structure:');
  console.log(`   Nodes: ${data.nodes.length}`);
  console.log(`   Links: ${data.links.length}\n`);

  console.log('📋 Nodes:');
  data.nodes.forEach((node, idx) => {
    console.log(`   ${idx}. ${node.name}`);
  });

  console.log('\n📊 Metrics:');
  console.log(JSON.stringify(data.metrics, null, 2));

  console.log('\n🔗 Links:');
  data.links.forEach((link) => {
    const sourceName = data.nodes[link.source].name;
    const targetName = data.nodes[link.target].name;
    console.log(`   ${sourceName} → ${targetName}: ${link.value}`);
  });

  // Verify expected structure
  console.log('\n✨ Validation:');

  const expectedMetrics = [
    'totalRecipients',
    'qrScans',
    'landingPageVisits',
    'totalCalls',
    'webAppointments',
    'callAppointments',
    'totalConverted'
  ];

  let allMetricsPresent = true;
  for (const metric of expectedMetrics) {
    if (!(metric in data.metrics)) {
      console.log(`   ❌ Missing metric: ${metric}`);
      allMetricsPresent = false;
    }
  }

  if (allMetricsPresent) {
    console.log('   ✅ All expected metrics present!');
  }

  if (data.nodes.length === 7) {
    console.log('   ✅ Correct node count (7 nodes for multi-channel funnel)');
  } else {
    console.log(`   ❌ Incorrect node count: ${data.nodes.length} (expected 7)`);
  }

  if (data.metrics.totalCalls !== undefined) {
    console.log(`   ✅ Call tracking data present: ${data.metrics.totalCalls} calls`);
  } else {
    console.log('   ❌ Call tracking data missing');
  }

  console.log('\n✅ Test complete!\n');
}

testSankeyData()
  .then(() => {
    console.log('✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
