/**
 * Diagnostic Script - Check Sankey Data
 * Verifies what data exists in the database for analytics
 */

import { createServiceClient } from '../lib/supabase/server';

async function diagnoseSankeyData() {
  const supabase = createServiceClient();

  console.log('🔍 Starting Sankey Data Diagnostic...\n');

  // Get all organizations
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name')
    .limit(5);

  if (!orgs || orgs.length === 0) {
    console.error('❌ No organizations found!');
    return;
  }

  console.log(`Found ${orgs.length} organization(s):`);
  orgs.forEach(org => console.log(`  - ${org.name} (${org.id})`));
  console.log('');

  // Check each organization
  for (const org of orgs) {
    console.log(`\n📊 Checking organization: ${org.name}`);
    console.log(`${'='.repeat(60)}\n`);

    // Get campaigns
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id, name, total_recipients')
      .eq('organization_id', org.id);

    console.log(`Campaigns: ${campaigns?.length || 0}`);
    if (campaigns && campaigns.length > 0) {
      const campaignIds = campaigns.map(c => c.id);
      const totalRecipients = campaigns.reduce((sum, c) => sum + (c.total_recipients || 0), 0);

      console.log(`  Total Recipients: ${totalRecipients}`);
      console.log(`  Campaign IDs: ${campaignIds.join(', ')}\n`);

      // Count events
      const { count: qrScans } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .in('campaign_id', campaignIds)
        .eq('event_type', 'qr_scan');

      const { count: pageViews } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .in('campaign_id', campaignIds)
        .eq('event_type', 'page_view');

      console.log(`Events:`);
      console.log(`  QR Scans: ${qrScans || 0}`);
      console.log(`  Page Views: ${pageViews || 0}`);

      // Count conversions
      const { count: conversions } = await supabase
        .from('conversions')
        .select('*', { count: 'exact', head: true })
        .in('campaign_id', campaignIds);

      console.log(`\nConversions: ${conversions || 0}`);

      // If conversions exist, show breakdown
      if (conversions && conversions > 0) {
        const { data: conversionTypes } = await supabase
          .from('conversions')
          .select('conversion_type')
          .in('campaign_id', campaignIds);

        const typeCounts: Record<string, number> = {};
        conversionTypes?.forEach(c => {
          typeCounts[c.conversion_type] = (typeCounts[c.conversion_type] || 0) + 1;
        });

        console.log(`  Breakdown:`);
        Object.entries(typeCounts).forEach(([type, count]) => {
          console.log(`    ${type}: ${count}`);
        });
      }

      // Count calls
      const { count: calls } = await supabase
        .from('elevenlabs_calls')
        .select('*', { count: 'exact', head: true })
        .in('campaign_id', campaignIds);

      console.log(`\nCalls: ${calls || 0}`);

      // If calls exist, show breakdown
      if (calls && calls > 0) {
        const { count: appointments } = await supabase
          .from('elevenlabs_calls')
          .select('*', { count: 'exact', head: true })
          .in('campaign_id', campaignIds)
          .eq('appointment_booked', true);

        console.log(`  Call Appointments: ${appointments || 0}`);
      }

      // Test what the Sankey query would return
      console.log(`\n🧪 Testing DISTINCT counts (what Sankey uses):`);

      const campaignIdsList = campaignIds.map(id => `'${id}'`).join(',');

      const qrScansSql = `SELECT COUNT(DISTINCT recipient_id) as count FROM events WHERE campaign_id IN (${campaignIdsList}) AND event_type = 'qr_scan'`;
      const { data: qrScansData } = await supabase.rpc('exec_sql', { sql: qrScansSql });
      console.log(`  Unique QR Scanners: ${qrScansData?.[0]?.count || 0}`);

      const pageViewsSql = `SELECT COUNT(DISTINCT recipient_id) as count FROM events WHERE campaign_id IN (${campaignIdsList}) AND event_type = 'page_view'`;
      const { data: pageViewsData } = await supabase.rpc('exec_sql', { sql: pageViewsSql });
      console.log(`  Unique Page Visitors: ${pageViewsData?.[0]?.count || 0}`);

      const webConversionsSql = `SELECT COUNT(DISTINCT recipient_id) as count FROM conversions WHERE campaign_id IN (${campaignIdsList}) AND conversion_type IN ('form_submit', 'appointment')`;
      const { data: webConversionsData } = await supabase.rpc('exec_sql', { sql: webConversionsSql });
      console.log(`  Unique Web Converters: ${webConversionsData?.[0]?.count || 0}`);

      const callsSql = `SELECT COUNT(DISTINCT recipient_id) as count FROM elevenlabs_calls WHERE campaign_id IN (${campaignIdsList})`;
      const { data: callsData } = await supabase.rpc('exec_sql', { sql: callsSql });
      console.log(`  Unique Callers: ${callsData?.[0]?.count || 0}`);

      const callApptsSql = `SELECT COUNT(DISTINCT recipient_id) as count FROM elevenlabs_calls WHERE campaign_id IN (${campaignIdsList}) AND appointment_booked = true`;
      const { data: callApptsData } = await supabase.rpc('exec_sql', { sql: callApptsSql });
      console.log(`  Unique Call Appointments: ${callApptsData?.[0]?.count || 0}`);
    } else {
      console.log('  ⚠️  No campaigns found for this organization');
    }
  }

  console.log('\n✅ Diagnostic complete!\n');
}

diagnoseSankeyData()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
