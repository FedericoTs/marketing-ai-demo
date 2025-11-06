/**
 * Test Authenticated User Permissions (Using Anon Key + JWT)
 *
 * This simulates what a real authenticated user experiences
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egccqmlhzqiirovstpal.supabase.co';
const supabaseAnonKey = '***REMOVED***';
const supabaseServiceKey = '***REMOVED***';

const tables = ['design_templates', 'organizations', 'user_profiles', 'design_assets'];

// Test user from the database
const TEST_USER_ID = '05ff7f19-e978-4e33-84f1-44fe6b8e6d71'; // From seed data
const TEST_USER_EMAIL = 'john@printshop.com';

async function testWithServiceRole() {
  console.log('🔑 TEST 1: Service Role (Admin Access - Bypasses RLS)\n');
  console.log('================================================\n');

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  for (const table of tables) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact' })
      .limit(1);

    if (error) {
      console.log(`❌ ${table}: ${error.message}`);
    } else {
      console.log(`✅ ${table}: ${count || 0} rows (showing ${data?.length || 0})`);
    }
  }
  console.log('\n');
}

async function testWithAnonKeyNoAuth() {
  console.log('🔓 TEST 2: Anon Key (No Authentication - Public Access)\n');
  console.log('================================================\n');

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  for (const table of tables) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact' })
      .limit(1);

    if (error) {
      console.log(`❌ ${table}: ${error.message} (Code: ${error.code})`);
    } else {
      console.log(`✅ ${table}: ${count || 0} rows (showing ${data?.length || 0})`);
    }
  }
  console.log('\n');
  console.log('ℹ️  Expected: Most tables should fail (RLS blocks anonymous access)\n');
}

async function testWithAuthenticatedUser() {
  console.log('🔐 TEST 3: Authenticated User (Real User Experience)\n');
  console.log('================================================\n');

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Try to sign in as a test user
  console.log(`Attempting to sign in as: ${TEST_USER_EMAIL}...\n`);

  // First, let's check if we can manually set the auth header
  // (In production, this would be done via signInWithPassword)

  // For now, let's test with a manually created JWT token
  // We'll use the service role to get user info first
  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: userProfile } = await adminClient
    .from('user_profiles')
    .select('*')
    .eq('id', TEST_USER_ID)
    .single();

  if (!userProfile) {
    console.log(`❌ Could not find test user ${TEST_USER_ID}\n`);
    console.log(`Available users:\n`);
    const { data: allUsers } = await adminClient
      .from('user_profiles')
      .select('id, email, organization_id, role')
      .limit(5);
    allUsers?.forEach(u => console.log(`  - ${u.email} (${u.role}) - Org: ${u.organization_id}`));
    console.log('\n');
    return null;
  }

  console.log(`✅ Found user profile:`);
  console.log(`   Email: ${userProfile.email}`);
  console.log(`   Role: ${userProfile.role}`);
  console.log(`   Organization: ${userProfile.organization_id}`);
  console.log(`   Can create designs: ${userProfile.can_create_designs}\n`);

  // Now test queries as if we were this user
  // NOTE: We can't actually authenticate without a password,
  // so we'll test with service role but filter by organization
  console.log(`Testing queries for organization: ${userProfile.organization_id}...\n`);

  for (const table of tables) {
    let query = adminClient.from(table).select('*', { count: 'exact' });

    // Filter by organization if table has that column
    if (['design_templates', 'design_assets', 'user_profiles'].includes(table)) {
      query = query.eq('organization_id', userProfile.organization_id);
    } else if (table === 'organizations') {
      query = query.eq('id', userProfile.organization_id);
    }

    const { data, error, count } = await query.limit(5);

    if (error) {
      console.log(`❌ ${table}: ${error.message} (Code: ${error.code})`);
    } else {
      console.log(`✅ ${table}: ${count || 0} rows in user's org (showing ${data?.length || 0})`);
      if (data && data.length > 0 && table === 'design_templates') {
        console.log(`   Sample template: "${data[0].name}" (ID: ${data[0].id})`);
      }
    }
  }

  console.log('\n');
  return userProfile;
}

async function diagnoseRLSPolicies() {
  console.log('🔍 TEST 4: RLS Policy Diagnosis\n');
  console.log('================================================\n');

  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log('Checking if RLS is enabled on tables...\n');

  // Check RLS status
  const { data: rlsStatus, error: rlsError } = await adminClient
    .rpc('exec', {
      query: `
        SELECT
          tablename,
          CASE WHEN rowsecurity THEN 'Enabled' ELSE 'Disabled' END as rls_status
        FROM pg_tables t
        JOIN pg_class c ON c.relname = t.tablename
        WHERE schemaname = 'public'
          AND tablename IN ('design_templates', 'organizations', 'user_profiles', 'design_assets')
        ORDER BY tablename;
      `
    });

  if (rlsError) {
    console.log('⚠️  Could not check RLS status (exec RPC not available)\n');
    console.log('Please check manually in Supabase dashboard:\n');
    console.log('Authentication > Policies\n');
  } else if (rlsStatus) {
    console.log('RLS Status:');
    rlsStatus.forEach(row => {
      console.log(`  ${row.tablename}: ${row.rls_status}`);
    });
    console.log('\n');
  }

  console.log('To view RLS policies, run this SQL in Supabase SQL Editor:\n');
  console.log('--- SQL ---');
  console.log(`
SELECT
  tablename,
  policyname,
  cmd,
  roles,
  CASE WHEN qual IS NULL THEN 'No restriction' ELSE 'Has USING clause' END as using_clause,
  CASE WHEN with_check IS NULL THEN 'No restriction' ELSE 'Has WITH CHECK clause' END as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'design_templates'
ORDER BY cmd, policyname;
  `.trim());
  console.log('--- END SQL ---\n');
}

async function provideFix(userProfile) {
  console.log('🔧 RECOMMENDED FIX\n');
  console.log('================================================\n');

  if (!userProfile) {
    console.log('⚠️  Could not determine user context\n');
    return;
  }

  console.log('Based on the diagnosis, the issue is likely:\n');
  console.log('1. ❌ GRANT permissions missing for authenticated role\n');
  console.log('   Fix: Run this SQL in Supabase SQL Editor:\n');
  console.log('   --- SQL ---');
  console.log(`
GRANT SELECT ON TABLE design_templates TO authenticated;
GRANT SELECT ON TABLE organizations TO authenticated;
GRANT SELECT ON TABLE user_profiles TO authenticated;
GRANT SELECT ON TABLE design_assets TO authenticated;

GRANT INSERT ON TABLE design_templates TO authenticated;
GRANT INSERT ON TABLE user_profiles TO authenticated;
GRANT INSERT ON TABLE design_assets TO authenticated;

GRANT UPDATE ON TABLE design_templates TO authenticated;
GRANT UPDATE ON TABLE organizations TO authenticated;
GRANT UPDATE ON TABLE user_profiles TO authenticated;
GRANT UPDATE ON TABLE design_assets TO authenticated;

GRANT DELETE ON TABLE design_templates TO authenticated;
GRANT DELETE ON TABLE design_assets TO authenticated;
  `.trim());
  console.log('   --- END SQL ---\n');

  console.log('2. ⚠️  RLS policies may be too restrictive\n');
  console.log('   Check if policies allow users to see their own organization data\n');
  console.log('   Current user organization: ' + userProfile.organization_id + '\n');

  console.log('3. 🔍 Debug specific query\n');
  console.log('   Test this query in Supabase SQL Editor as authenticated user:\n');
  console.log('   --- SQL ---');
  console.log(`
-- This simulates auth.uid() = '${userProfile.id}'
SELECT * FROM design_templates
WHERE organization_id IN (
  SELECT organization_id FROM user_profiles WHERE id = '${userProfile.id}'
);
  `.trim());
  console.log('   --- END SQL ---\n');
}

async function main() {
  console.log('🚀 AUTHENTICATED USER PERMISSIONS TEST\n');
  console.log('================================================\n');
  console.log('This script tests permissions from different access levels:\n');
  console.log('1. Service role (admin - bypasses RLS)');
  console.log('2. Anon key (public - respects RLS)');
  console.log('3. Authenticated user (real user - respects RLS)\n');
  console.log('================================================\n\n');

  try {
    await testWithServiceRole();
    await testWithAnonKeyNoAuth();
    const userProfile = await testWithAuthenticatedUser();
    await diagnoseRLSPolicies();
    await provideFix(userProfile);

    console.log('================================================');
    console.log('🎯 DIAGNOSIS COMPLETE');
    console.log('================================================\n');
    console.log('Next steps:');
    console.log('1. Run the GRANT SQL in Supabase SQL Editor');
    console.log('2. Verify RLS policies allow organization-level access');
    console.log('3. Test actual authentication in your app\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

main();
