/**
 * Check Current User Script
 * Shows which user/organization would be queried by the analytics dashboard
 */

import { createServiceClient } from '../lib/supabase/server';

async function checkCurrentUser() {
  const supabase = createServiceClient();

  console.log('👤 Checking current authentication state...\n');

  // Try to get all users (service client has admin access)
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('❌ Error listing users:', authError.message);
    return;
  }

  console.log(`Found ${authUsers.users.length} users in auth.users table:\n`);

  for (const authUser of authUsers.users) {
    console.log(`📧 ${authUser.email}`);
    console.log(`   ID: ${authUser.id}`);
    console.log(`   Created: ${new Date(authUser.created_at).toLocaleDateString()}`);

    // Get their profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id, full_name, role')
      .eq('id', authUser.id)
      .single();

    if (profile) {
      console.log(`   Name: ${profile.full_name || 'N/A'}`);
      console.log(`   Role: ${profile.role || 'N/A'}`);
      console.log(`   Organization ID: ${profile.organization_id || 'N/A'}`);

      // Get organization name
      if (profile.organization_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', profile.organization_id)
          .single();

        if (org) {
          console.log(`   Organization: ${org.name}`);

          // Get campaign count for this org
          const { count: campaignCount } = await supabase
            .from('campaigns')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', profile.organization_id);

          console.log(`   Campaigns: ${campaignCount || 0}`);

          if (campaignCount && campaignCount > 0) {
            // Get total events
            const { data: campaigns } = await supabase
              .from('campaigns')
              .select('id')
              .eq('organization_id', profile.organization_id);

            if (campaigns && campaigns.length > 0) {
              const campaignIds = campaigns.map(c => c.id);

              const { count: eventCount } = await supabase
                .from('events')
                .select('*', { count: 'exact', head: true })
                .in('campaign_id', campaignIds);

              const { count: conversionCount } = await supabase
                .from('conversions')
                .select('*', { count: 'exact', head: true })
                .in('campaign_id', campaignIds);

              console.log(`   Events: ${eventCount || 0}`);
              console.log(`   Conversions: ${conversionCount || 0}`);
            }
          }
        }
      }
    } else {
      console.log(`   ⚠️  No profile found in user_profiles table`);
    }

    console.log('');
  }

  console.log('\n💡 RECOMMENDATION:');
  console.log('To see analytics data, log in as a user from "Test Organization"');
  console.log('That organization has 12 campaigns with events and conversions.\n');
}

checkCurrentUser()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
