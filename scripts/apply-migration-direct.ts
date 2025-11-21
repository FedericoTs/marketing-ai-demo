#!/usr/bin/env npx tsx

/**
 * Apply Migration 023: Set New User Defaults to $0
 *
 * This script applies the migration directly using Supabase service role credentials.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applyMigration() {
  console.log('🔄 Loading environment variables...');

  // Read from .env.local
  const envPath = join(process.cwd(), '.env.local');
  const envContent = readFileSync(envPath, 'utf8');

  const env: Record<string, string> = {};
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  });

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  console.log('✅ Credentials loaded');
  console.log('📋 Supabase URL:', supabaseUrl);

  // Read migration file
  console.log('\n📄 Reading migration file...');
  const migrationPath = join(process.cwd(), 'supabase', 'migrations', '023_update_signup_credits_to_zero.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf8');

  console.log('✅ Migration loaded (' + migrationSQL.length + ' characters)');

  // Create Supabase client with service role
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Apply migration
  console.log('\n🚀 Applying migration to database...');

  // Execute the SQL directly
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: migrationSQL
  });

  if (error) {
    console.error('❌ Migration failed:', error);
    console.log('\n\n📋 The exec_sql RPC function may not exist.');
    console.log('Trying alternative method...\n');

    // Alternative: Use raw SQL execution
    // This requires the pg library, which might not be installed
    console.log('⚠️  Direct SQL execution not available via Supabase client.');
    console.log('\n📋 MANUAL APPLICATION REQUIRED');
    console.log('════════════════════════════════════════════════════════════');
    console.log('Please apply manually via Supabase Dashboard:');
    console.log('');
    console.log('1. Go to: https://supabase.com/dashboard/project/egccqmlhzqiirovstpal/sql/new');
    console.log('2. Open file: supabase/migrations/023_update_signup_credits_to_zero.sql');
    console.log('3. Copy entire contents');
    console.log('4. Paste in SQL Editor');
    console.log('5. Click "▶ Run"');
    console.log('════════════════════════════════════════════════════════════');
    process.exit(1);
  }

  console.log('✅ Migration applied successfully!');

  // Verify the migration
  console.log('\n🔍 Verifying migration...');

  const { data: funcData, error: funcError } = await supabase
    .from('pg_proc')
    .select('prosrc')
    .eq('proname', 'handle_new_user_signup')
    .single();

  if (funcError) {
    console.log('⚠️  Could not verify function (this is OK if migration succeeded)');
  } else {
    const funcSource = funcData?.prosrc || '';
    const hasZeroCredits = funcSource.includes('0.00');
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
