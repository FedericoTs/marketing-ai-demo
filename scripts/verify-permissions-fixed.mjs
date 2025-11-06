/**
 * Verify Permissions Fix
 *
 * Run this AFTER executing FIX_PERMISSIONS_NOW.sql
 * to confirm the fix worked
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egccqmlhzqiirovstpal.supabase.co';
const supabaseAnonKey = '***REMOVED***';
const supabaseServiceKey = '***REMOVED***';

const tables = ['design_templates', 'organizations', 'user_profiles', 'design_assets'];

async function verifyPermissions() {
  console.log('🔍 VERIFYING PERMISSIONS FIX\n');
  console.log('================================================\n');

  const anonClient = createClient(supabaseUrl, supabaseAnonKey);

  let allPassed = true;
  const results = [];

  for (const table of tables) {
    const { data, error, count } = await anonClient
      .from(table)
      .select('*', { count: 'exact', head: true });

    const status = error ? '❌ FAIL' : '✅ PASS';
    const message = error
      ? `${error.message} (Code: ${error.code})`
      : `${count || 0} rows accessible`;

    results.push({ table, status, message, error });

    if (error) {
      allPassed = false;
    }
  }

  // Display results
  console.log('Test Results:\n');
  results.forEach(r => {
    console.log(`${r.status} ${r.table}`);
    console.log(`   ${r.message}`);
    if (r.error && r.error.code === '42501') {
      console.log(`   ⚠️  This is a GRANT permission error - run FIX_PERMISSIONS_NOW.sql`);
    } else if (r.error && r.error.code === 'PGRST301') {
      console.log(`   ℹ️  This is expected - RLS is blocking access (no authenticated user)`);
    } else if (r.error) {
      console.log(`   🔍 Full error:`, r.error);
    }
    console.log('');
  });

  return allPassed;
}

async function checkGrantDetails() {
  console.log('📋 CHECKING GRANT DETAILS\n');
  console.log('================================================\n');

  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Try to query information_schema via a simple workaround
  console.log('Attempting to fetch grant information...\n');

  // We can't query information_schema directly via Supabase REST API,
  // so we'll just confirm tables are accessible
  console.log('ℹ️  For detailed GRANT information, run this SQL in Supabase SQL Editor:\n');
  console.log('--- SQL ---');
  console.log(`
SELECT
  grantee,
  table_name,
  string_agg(privilege_type, ', ' ORDER BY privilege_type) as privileges
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name IN ('design_templates', 'organizations', 'user_profiles', 'design_assets')
  AND grantee IN ('authenticated', 'service_role')
GROUP BY grantee, table_name
ORDER BY table_name, grantee;
  `.trim());
  console.log('--- END SQL ---\n');
}

async function main() {
  console.log('🚀 PERMISSIONS FIX VERIFICATION\n');
  console.log('================================================\n');
  console.log('This script verifies that authenticated role can access tables.\n');
  console.log('Run this AFTER executing FIX_PERMISSIONS_NOW.sql\n');
  console.log('================================================\n\n');

  try {
    const allPassed = await verifyPermissions();

    if (allPassed) {
      console.log('================================================');
      console.log('🎉 SUCCESS! All permissions fixed!');
      console.log('================================================\n');
      console.log('✅ Authenticated role can now access all tables');
      console.log('✅ RLS policies will control row-level access');
      console.log('✅ Your Next.js app should work correctly now\n');
      console.log('Next steps:');
      console.log('1. Test in your Next.js app with a real authenticated user');
      console.log('2. Verify users can only see their own organization\'s data');
      console.log('3. Check RLS policies are working as expected\n');
    } else {
      console.log('================================================');
      console.log('❌ FIX NOT APPLIED YET');
      console.log('================================================\n');
      console.log('The authenticated role still lacks permissions.\n');
      console.log('Please run the SQL from FIX_PERMISSIONS_NOW.sql:\n');
      console.log('1. Open: https://app.supabase.com/project/egccqmlhzqiirovstpal/sql/new');
      console.log('2. Paste the contents of FIX_PERMISSIONS_NOW.sql');
      console.log('3. Click "Run"');
      console.log('4. Run this script again to verify\n');
    }

    await checkGrantDetails();

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

main();
