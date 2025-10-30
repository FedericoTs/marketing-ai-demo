#!/usr/bin/env node

/**
 * Verify Database Status and Apply Migrations if Needed
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifyDatabase() {
  console.log('🔍 Checking database status...\n');

  try {
    // Check if tables exist using information_schema
    const { data: tables, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('organizations', 'user_profiles', 'design_templates', 'design_assets')
        ORDER BY table_name;
      `
    });

    if (error) {
      console.log('⚠️  RPC method not available, trying direct query...\n');

      // Try direct query to check if we can access the tables
      const checks = await Promise.all([
        supabase.from('organizations').select('count', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('count', { count: 'exact', head: true }),
        supabase.from('design_templates').select('count', { count: 'exact', head: true }),
        supabase.from('design_assets').select('count', { count: 'exact', head: true })
      ]);

      console.log('📊 Table Status:');
      console.log('─────────────────────────────────────────────────');

      const tableNames = ['organizations', 'user_profiles', 'design_templates', 'design_assets'];
      let allTablesExist = true;

      checks.forEach((result, idx) => {
        if (result.error) {
          console.log(`❌ ${tableNames[idx]}: NOT FOUND`);
          console.log(`   Error: ${result.error.message}`);
          allTablesExist = false;
        } else {
          console.log(`✅ ${tableNames[idx]}: EXISTS (${result.count || 0} rows)`);
        }
      });

      console.log('─────────────────────────────────────────────────\n');

      if (!allTablesExist) {
        console.log('❌ Some tables are missing!\n');
        console.log('🔧 MIGRATION REQUIRED\n');
        console.log('Please run the combined migration SQL:');
        console.log('1. Open: https://supabase.com/dashboard/project/egccqmlhzqiirovstpal/sql/new');
        console.log('2. Copy content from: supabase/all_migrations_combined.sql');
        console.log('3. Paste and click "RUN"\n');
        return false;
      }

      console.log('✅ All tables exist!\n');

      // Now check if PostgREST can see them
      console.log('🔍 Checking PostgREST schema cache...\n');

      const orgTest = await supabase
        .from('organizations')
        .insert({
          name: 'Test Organization',
          slug: 'test-org-' + Date.now(),
          plan_tier: 'free',
          billing_status: 'active',
          credits: 0
        })
        .select()
        .single();

      if (orgTest.error) {
        if (orgTest.error.message.includes('schema cache')) {
          console.log('⚠️  PostgREST schema cache needs reload!\n');
          console.log('🔧 SCHEMA RELOAD REQUIRED\n');
          console.log('Please reload the schema:');
          console.log('1. Open: https://supabase.com/dashboard/project/egccqmlhzqiirovstpal/settings/api');
          console.log('2. Scroll to "Schema" section');
          console.log('3. Click "Reload schema" button\n');
          return false;
        } else {
          console.log(`❌ Insert test failed: ${orgTest.error.message}\n`);
          return false;
        }
      }

      // Clean up test org
      await supabase
        .from('organizations')
        .delete()
        .eq('id', orgTest.data.id);

      console.log('✅ PostgREST schema cache is working!\n');
      console.log('✅ Database is ready for seed data!\n');
      return true;

    } else {
      console.log('✅ Found tables:', tables);
      return true;
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

async function main() {
  const isReady = await verifyDatabase();

  if (isReady) {
    console.log('🎯 Next steps:');
    console.log('   Run: node scripts/create-seed-data.js\n');
    process.exit(0);
  } else {
    console.log('⏸️  Database not ready. Follow the instructions above.\n');
    process.exit(1);
  }
}

main();
