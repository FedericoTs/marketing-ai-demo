/**
 * Cleanup Analytics Data Script
 *
 * Removes all analytics data (events, conversions, calls) for an organization
 * to allow re-seeding with fresh data.
 */

import { createServiceClient } from '../lib/supabase/server';

async function cleanupAnalyticsData() {
  const supabase = createServiceClient();

  console.log('🧹 Starting analytics data cleanup...\n');

  // Use the test organization ID
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

  console.log(`📊 Cleaning analytics for: ${org.name} (${org.id})\n`);

  // Delete events
  const deleteSql = `
    DELETE FROM events
    WHERE campaign_id IN (
      SELECT id FROM campaigns WHERE organization_id = '${orgId}'
    );

    DELETE FROM conversions
    WHERE campaign_id IN (
      SELECT id FROM campaigns WHERE organization_id = '${orgId}'
    );

    DELETE FROM elevenlabs_calls
    WHERE organization_id = '${orgId}';

    SELECT
      (SELECT COUNT(*) FROM events WHERE campaign_id IN (SELECT id FROM campaigns WHERE organization_id = '${orgId}')) as events_count,
      (SELECT COUNT(*) FROM conversions WHERE campaign_id IN (SELECT id FROM campaigns WHERE organization_id = '${orgId}')) as conversions_count,
      (SELECT COUNT(*) FROM elevenlabs_calls WHERE organization_id = '${orgId}') as calls_count;
  `;

  const { data: result, error: deleteError } = await supabase.rpc('exec_sql', {
    sql: deleteSql
  });

  if (deleteError) {
    console.error('❌ Error deleting analytics data:', deleteError);
    return;
  }

  console.log('✅ Cleanup complete!\n');
  console.log('📈 Remaining counts:');
  console.log(`   - Events: ${result?.[0]?.events_count || 0}`);
  console.log(`   - Conversions: ${result?.[0]?.conversions_count || 0}`);
  console.log(`   - Calls: ${result?.[0]?.calls_count || 0}\n`);
  console.log('💡 You can now run seed-analytics-data.ts to create fresh data');
}

// Run the cleanup script
cleanupAnalyticsData()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
