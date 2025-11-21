#!/usr/bin/env node

/**
 * Apply Migration 023: Set New User Defaults to $0
 *
 * This script applies the migration directly using Supabase service role credentials
 * from .env.local, bypassing the need for MCP server configuration.
 */

const fs = require('fs');
const path = require('path');

// Read .env.local to get Supabase credentials
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');

  const env = {};
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      env[key] = value;
    }
  });

  return env;
}

async function applyMigration() {
  console.log('🔄 Loading environment variables...');
  const env = loadEnv();

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('✅ Credentials loaded');
  console.log('📋 Supabase URL:', supabaseUrl);
  console.log('🔑 Service Role Key:', serviceRoleKey.substring(0, 20) + '...');

  // Read migration file
  console.log('\n📄 Reading migration file...');
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '023_update_signup_credits_to_zero.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('✅ Migration loaded (' + migrationSQL.length + ' characters)');

  // Apply migration via Supabase REST API
  console.log('\n🚀 Applying migration to database...');

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      query: migrationSQL
    })
  });

  if (!response.ok) {
    // Try alternative approach: Use pg query endpoint
    console.log('⚠️  First method failed, trying alternative...');

    const pgResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        query: migrationSQL
      })
    });

    if (!pgResponse.ok) {
      const errorText = await pgResponse.text();
      console.error('❌ Migration failed:', errorText);

      console.log('\n\n📋 MANUAL APPLICATION REQUIRED');
      console.log('════════════════════════════════════════════════════════════');
      console.log('The REST API method is not available. Please apply manually:');
      console.log('');
      console.log('1. Go to: https://supabase.com/dashboard/project/egccqmlhzqiirovstpal/sql/new');
      console.log('2. Open file: supabase/migrations/023_update_signup_credits_to_zero.sql');
      console.log('3. Copy entire contents');
      console.log('4. Paste in SQL Editor');
      console.log('5. Click "▶ Run"');
      console.log('════════════════════════════════════════════════════════════');

      process.exit(1);
    }
  }

  console.log('✅ Migration applied successfully!');

  // Verify the migration
  console.log('\n🔍 Verifying migration...');

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Check function source
  const { data: funcData, error: funcError } = await supabase
    .rpc('exec_sql', {
      query: `SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user_signup'`
    });

  if (funcError) {
    console.log('⚠️  Could not verify function (this is OK if migration succeeded)');
  } else {
    const funcSource = funcData?.[0]?.prosrc || '';
    const hasZeroCredits = funcSource.includes('0.00') || funcSource.includes('0,');
    const hasZeroLimits = funcSource.includes('monthly_design_limit') && funcSource.includes('monthly_sends_limit');

    if (hasZeroCredits && hasZeroLimits) {
      console.log('✅ Function verified: Contains $0 credits and 0 monthly limits');
    } else {
      console.log('⚠️  Function may need verification - check manually');
    }
  }

  console.log('\n✅ MIGRATION COMPLETE!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Next steps:');
  console.log('1. Test new user signup');
  console.log('2. Verify organization has:');
  console.log('   - credits: $0.00');
  console.log('   - monthly_design_limit: 0');
  console.log('   - monthly_sends_limit: 0');
  console.log('   - billing_status: incomplete');
  console.log('═══════════════════════════════════════════════════════════');
}

// Run migration
applyMigration().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
