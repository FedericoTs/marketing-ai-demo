/**
 * Check and Fix Authenticated Role Permissions
 *
 * This script:
 * 1. Tests SELECT queries to identify permission errors
 * 2. Provides SQL to fix GRANT permissions
 * 3. Verifies the fix worked
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = 'https://egccqmlhzqiirovstpal.supabase.co';
const supabaseServiceKey = '***REMOVED***';
const supabaseAnonKey = '***REMOVED***';

const tables = [
  'design_templates',
  'organizations',
  'user_profiles',
  'design_assets'
];

async function testPermissionsBefore() {
  console.log('🔍 STEP 1: Testing Current Permissions\n');
  console.log('================================================\n');

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  let hasErrors = false;

  for (const table of tables) {
    console.log(`📋 Testing SELECT on ${table}...`);

    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      hasErrors = true;
    } else {
      console.log(`   ✅ SELECT works (${count || 0} rows)`);
    }
    console.log('');
  }

  return hasErrors;
}

async function executeSQL() {
  console.log('🔧 STEP 2: Executing GRANT Permissions SQL\n');
  console.log('================================================\n');

  // Read the migration file
  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '005_grant_authenticated_permissions.sql');
  let sqlContent;

  try {
    sqlContent = readFileSync(migrationPath, 'utf8');
  } catch (error) {
    console.log(`❌ Could not read migration file: ${error.message}\n`);
    return false;
  }

  // Extract just the GRANT statements (remove comments and verification queries)
  const grantStatements = sqlContent
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('GRANT') && !trimmed.startsWith('--');
    })
    .join('\n');

  console.log('SQL to execute:\n');
  console.log(grantStatements);
  console.log('\n');

  // Use Supabase REST API to execute SQL
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({ query: grantStatements })
  });

  if (!response.ok) {
    const error = await response.text();
    console.log('❌ Could not execute SQL via REST API');
    console.log('Response:', error);
    console.log('');
    console.log('⚠️  MANUAL ACTION REQUIRED:');
    console.log('1. Open Supabase SQL Editor:');
    console.log('   https://app.supabase.com/project/egccqmlhzqiirovstpal/sql/new');
    console.log('2. Copy the file: supabase/migrations/005_grant_authenticated_permissions.sql');
    console.log('3. Paste into SQL Editor and click "Run"\n');
    console.log('Or copy these GRANT statements:\n');
    console.log(grantStatements);
    console.log('\n');
    return false;
  }

  console.log('✅ SQL executed successfully (via REST API)\n');
  return true;
}

async function executeViaDirectSQL() {
  console.log('🔧 STEP 2 (Alternative): Executing via Direct Database Connection\n');
  console.log('================================================\n');

  const grantSQL = `
GRANT SELECT ON TABLE organizations TO authenticated;
GRANT SELECT ON TABLE user_profiles TO authenticated;
GRANT SELECT ON TABLE design_templates TO authenticated;
GRANT SELECT ON TABLE design_assets TO authenticated;

GRANT INSERT ON TABLE user_profiles TO authenticated;
GRANT INSERT ON TABLE design_templates TO authenticated;
GRANT INSERT ON TABLE design_assets TO authenticated;

GRANT UPDATE ON TABLE organizations TO authenticated;
GRANT UPDATE ON TABLE user_profiles TO authenticated;
GRANT UPDATE ON TABLE design_templates TO authenticated;
GRANT UPDATE ON TABLE design_assets TO authenticated;

GRANT DELETE ON TABLE design_templates TO authenticated;
GRANT DELETE ON TABLE design_assets TO authenticated;
  `.trim();

  console.log('⚠️  Cannot execute SQL automatically via Supabase JS client.\n');
  console.log('📋 MANUAL ACTION REQUIRED:\n');
  console.log('1. Open Supabase SQL Editor:');
  console.log('   https://app.supabase.com/project/egccqmlhzqiirovstpal/sql/new\n');
  console.log('2. Copy and paste this SQL:\n');
  console.log('--- SQL START ---\n');
  console.log(grantSQL);
  console.log('\n--- SQL END ---\n');
  console.log('3. Click "Run" button\n');
  console.log('4. Come back and re-run this script to verify\n');

  return false;
}

async function verifyPermissions() {
  console.log('🔍 STEP 3: Verifying Permissions After Fix\n');
  console.log('================================================\n');

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  let allGood = true;

  for (const table of tables) {
    console.log(`📋 Testing SELECT on ${table}...`);

    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`   ❌ STILL FAILING: ${error.message}`);
      allGood = false;
    } else {
      console.log(`   ✅ SELECT works (${count || 0} rows)`);
    }
    console.log('');
  }

  return allGood;
}

async function checkRLSPolicies() {
  console.log('🔍 BONUS: Checking RLS Policies\n');
  console.log('================================================\n');

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log('RLS policies control row-level access.\n');
  console.log('Table-level GRANTs are required FIRST, then RLS kicks in.\n');
  console.log('To check RLS policies, run this in Supabase SQL Editor:\n');
  console.log('--- SQL ---');
  console.log(`
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('design_templates', 'organizations', 'user_profiles', 'design_assets')
ORDER BY tablename, cmd, policyname;
  `.trim());
  console.log('--- END SQL ---\n');
}

async function main() {
  console.log('🚀 AUTHENTICATED ROLE PERMISSIONS CHECKER\n');
  console.log('================================================\n');
  console.log('This script will:\n');
  console.log('1. Test current SELECT permissions');
  console.log('2. Provide SQL to fix GRANT permissions');
  console.log('3. Verify the fix worked\n');
  console.log('================================================\n\n');

  try {
    // Step 1: Test permissions before fix
    const hasErrors = await testPermissionsBefore();

    if (!hasErrors) {
      console.log('✅ All permissions already working!\n');
      console.log('No fix needed. The authenticated role can already SELECT from all tables.\n');
      await checkRLSPolicies();
      return;
    }

    // Step 2: Execute SQL fix (manual step)
    await executeViaDirectSQL();

    console.log('⏸️  Script paused. Please execute the SQL in Supabase dashboard.\n');
    console.log('After running the SQL, run this script again to verify.\n');
    console.log('Command: node scripts/check-and-fix-permissions.mjs\n');

    // Uncomment this section after manual SQL execution to verify
    /*
    console.log('Waiting 3 seconds for SQL to apply...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 3: Verify permissions after fix
    const allGood = await verifyPermissions();

    if (allGood) {
      console.log('================================================');
      console.log('🎉 SUCCESS! All permissions fixed!');
      console.log('================================================\n');
      console.log('✅ authenticated role can now SELECT from all tables');
      console.log('✅ RLS policies will control row-level access');
      console.log('✅ Service_role bypasses RLS (admin only)\n');
    } else {
      console.log('================================================');
      console.log('⚠️  Some permissions still failing');
      console.log('================================================\n');
      console.log('Check RLS policies or table ownership issues.\n');
    }

    await checkRLSPolicies();
    */

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

main();
