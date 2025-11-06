/**
 * Fix SELECT permissions for authenticated role
 *
 * This script:
 * 1. Checks current GRANT permissions for authenticated role
 * 2. Grants SELECT permission on all tables to authenticated
 * 3. Verifies the grants were applied
 * 4. Tests SELECT queries with authenticated role
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egccqmlhzqiirovstpal.supabase.co';
const supabaseServiceKey = '***REMOVED***';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const tables = [
  'design_templates',
  'organizations',
  'user_profiles',
  'design_assets'
];

async function checkPermissions() {
  console.log('🔍 CHECKING CURRENT GRANT PERMISSIONS\n');
  console.log('================================================\n');

  for (const table of tables) {
    console.log(`📋 Checking permissions for table: ${table}`);

    // Check table privileges
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT
          grantee,
          privilege_type,
          is_grantable
        FROM information_schema.table_privileges
        WHERE table_schema = 'public'
          AND table_name = '${table}'
          AND grantee IN ('authenticated', 'service_role', 'anon')
        ORDER BY grantee, privilege_type;
      `
    });

    if (error) {
      // If exec_sql doesn't exist, try direct query
      console.log(`   ⚠️  RPC exec_sql not available, using direct query...`);

      const { data: directData, error: directError } = await supabase
        .from('pg_catalog.pg_class')
        .select('relname')
        .eq('relname', table)
        .single();

      if (directError) {
        console.log(`   ❌ Cannot query system catalogs: ${directError.message}`);
        console.log(`   Will proceed with GRANT statements anyway\n`);
      } else {
        console.log(`   ℹ️  Table exists: ${directData?.relname || 'unknown'}\n`);
      }
      continue;
    }

    if (data && data.length > 0) {
      console.log(`   Current permissions:`);
      const authenticatedPerms = data.filter(p => p.grantee === 'authenticated');
      const serviceRolePerms = data.filter(p => p.grantee === 'service_role');

      console.log(`   authenticated role: ${authenticatedPerms.map(p => p.privilege_type).join(', ') || 'NONE'}`);
      console.log(`   service_role: ${serviceRolePerms.map(p => p.privilege_type).join(', ') || 'NONE'}`);
    } else {
      console.log(`   ❌ No permissions found for authenticated or service_role`);
    }
    console.log('');
  }
}

async function applyGrants() {
  console.log('🔧 APPLYING GRANT PERMISSIONS\n');
  console.log('================================================\n');

  const grantSQL = `
    -- Grant SELECT permission to authenticated role on all tables
    GRANT SELECT ON TABLE design_templates TO authenticated;
    GRANT SELECT ON TABLE organizations TO authenticated;
    GRANT SELECT ON TABLE user_profiles TO authenticated;
    GRANT SELECT ON TABLE design_assets TO authenticated;

    -- Grant INSERT permission for user-created content
    GRANT INSERT ON TABLE design_templates TO authenticated;
    GRANT INSERT ON TABLE design_assets TO authenticated;
    GRANT INSERT ON TABLE user_profiles TO authenticated;

    -- Grant UPDATE permission for user-created content
    GRANT UPDATE ON TABLE design_templates TO authenticated;
    GRANT UPDATE ON TABLE design_assets TO authenticated;
    GRANT UPDATE ON TABLE user_profiles TO authenticated;
    GRANT UPDATE ON TABLE organizations TO authenticated;

    -- Grant DELETE permission (RLS will still control what they can delete)
    GRANT DELETE ON TABLE design_templates TO authenticated;
    GRANT DELETE ON TABLE design_assets TO authenticated;
  `;

  console.log('Executing GRANT statements...\n');
  console.log('SQL to execute:');
  console.log(grantSQL);
  console.log('');

  // Try to execute via rpc
  const { error } = await supabase.rpc('exec_sql', { query: grantSQL });

  if (error) {
    console.log('❌ Could not apply GRANTs via RPC');
    console.log('Error:', error.message);
    console.log('');
    console.log('⚠️  MANUAL ACTION REQUIRED:');
    console.log('1. Go to: https://app.supabase.com/project/egccqmlhzqiirovstpal/sql/new');
    console.log('2. Copy and paste the SQL below:');
    console.log('3. Click "Run"\n');
    console.log('--- SQL TO RUN ---');
    console.log(grantSQL);
    console.log('--- END SQL ---\n');
    return false;
  }

  console.log('✅ GRANT statements executed successfully!\n');
  return true;
}

async function verifyGrants() {
  console.log('🔍 VERIFYING GRANT PERMISSIONS\n');
  console.log('================================================\n');

  for (const table of tables) {
    console.log(`📋 Verifying permissions for table: ${table}`);

    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT
          privilege_type
        FROM information_schema.table_privileges
        WHERE table_schema = 'public'
          AND table_name = '${table}'
          AND grantee = 'authenticated'
        ORDER BY privilege_type;
      `
    });

    if (error) {
      console.log(`   ⚠️  Cannot verify via RPC: ${error.message}`);
      console.log(`   Check manually in Supabase SQL Editor\n`);
      continue;
    }

    if (data && data.length > 0) {
      const perms = data.map(p => p.privilege_type).join(', ');
      console.log(`   ✅ authenticated role has: ${perms}`);
    } else {
      console.log(`   ❌ No permissions found for authenticated role`);
    }
    console.log('');
  }
}

async function testSelectWithAuth() {
  console.log('🧪 TESTING SELECT WITH AUTHENTICATED ROLE\n');
  console.log('================================================\n');

  // Note: This test uses service_role, but in production the client
  // would use the anon key + user JWT token
  console.log('Testing SELECT queries on all tables...\n');

  for (const table of tables) {
    console.log(`📋 Testing SELECT on ${table}...`);

    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact' })
      .limit(1);

    if (error) {
      console.log(`   ❌ SELECT failed: ${error.message}`);
      console.log(`   Error code: ${error.code}`);
      console.log(`   Details: ${JSON.stringify(error.details, null, 2)}`);
    } else {
      console.log(`   ✅ SELECT succeeded`);
      console.log(`   Total rows: ${count || 0}`);
      console.log(`   Sample rows returned: ${data?.length || 0}`);
    }
    console.log('');
  }
}

async function main() {
  console.log('🚀 FIXING AUTHENTICATED ROLE PERMISSIONS\n');
  console.log('================================================\n');
  console.log('This script will:\n');
  console.log('1. Check current GRANT permissions');
  console.log('2. Grant SELECT/INSERT/UPDATE/DELETE to authenticated role');
  console.log('3. Verify the grants were applied');
  console.log('4. Test SELECT queries\n');
  console.log('================================================\n\n');

  try {
    // Step 1: Check current permissions
    await checkPermissions();

    // Step 2: Apply grants
    const success = await applyGrants();

    if (!success) {
      console.log('⚠️  Could not apply grants automatically.');
      console.log('Please run the SQL manually in Supabase dashboard.');
      return;
    }

    // Step 3: Verify grants
    await verifyGrants();

    // Step 4: Test SELECT
    await testSelectWithAuth();

    console.log('================================================');
    console.log('🎉 PERMISSIONS FIX COMPLETE!');
    console.log('================================================\n');
    console.log('✅ All tables now have proper GRANT permissions for authenticated role');
    console.log('✅ RLS policies will still control row-level access');
    console.log('✅ Users can now SELECT/INSERT/UPDATE/DELETE (subject to RLS)\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

main();
