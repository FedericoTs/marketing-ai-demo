#!/usr/bin/env npx tsx

/**
 * Verify Migration 023: Check New User Defaults
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

async function verifyMigration() {
  console.log('🔍 Verifying Migration 023...\n');

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

  // Create Supabase client with service role
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Test 1: Check function source for new defaults
  console.log('Test 1: Checking function source code...');

  const { data: funcData, error: funcError } = await supabase
    .rpc('exec_sql', {
      sql: "SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user_signup';"
    });

  if (funcError) {
    console.log('⚠️  Could not read function source:', funcError.message);
  } else {
    const funcSource = funcData?.[0]?.prosrc || JSON.stringify(funcData);
    const hasZeroCredits = funcSource.includes('0.00') && !funcSource.includes('10000.00');
    const hasZeroDesignLimit = funcSource.includes('monthly_design_limit') && funcSource.includes(', 0,');
    const hasZeroSendsLimit = funcSource.includes('monthly_sends_limit') && funcSource.includes(', 0,');
    const hasIncompleteStatus = funcSource.includes("'incomplete'");

    console.log('  Credits set to $0.00:', hasZeroCredits ? '✅' : '❌');
    console.log('  Design limit set to 0:', hasZeroDesignLimit ? '✅' : '❌');
    console.log('  Sends limit set to 0:', hasZeroSendsLimit ? '✅' : '❌');
    console.log('  Billing status = incomplete:', hasIncompleteStatus ? '✅' : '❌');

    if (hasZeroCredits && hasZeroDesignLimit && hasZeroSendsLimit && hasIncompleteStatus) {
      console.log('\n✅ Function source verification PASSED!\n');
    } else {
      console.log('\n❌ Function source verification FAILED!\n');
      console.log('Function may not have been updated correctly.\n');
    }
  }

  // Test 2: Check most recent organization (if any exist)
  console.log('Test 2: Checking existing organizations...');

  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, credits, monthly_design_limit, monthly_sends_limit, billing_status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (orgError) {
    console.log('❌ Error reading organizations:', orgError.message);
  } else if (!orgs || orgs.length === 0) {
    console.log('ℹ️  No organizations exist yet. Create a test user to verify.');
  } else {
    console.log(`\nFound ${orgs.length} most recent organizations:\n`);
    orgs.forEach((org, idx) => {
      console.log(`${idx + 1}. ${org.name}`);
      console.log(`   Credits: $${org.credits}`);
      console.log(`   Design Limit: ${org.monthly_design_limit}`);
      console.log(`   Sends Limit: ${org.monthly_sends_limit}`);
      console.log(`   Billing Status: ${org.billing_status}`);
      console.log(`   Created: ${new Date(org.created_at).toLocaleString()}`);

      // Check if this org matches new defaults
      const isZeroCredits = parseFloat(org.credits) === 0;
      const isZeroDesign = org.monthly_design_limit === 0;
      const isZeroSends = org.monthly_sends_limit === 0;
      const isIncomplete = org.billing_status === 'incomplete';

      if (isZeroCredits && isZeroDesign && isZeroSends && isIncomplete) {
        console.log(`   ✅ This org has NEW defaults ($0, 0 limits)\n`);
      } else {
        console.log(`   ⚠️  This org has OLD defaults (likely created before migration)\n`);
      }
    });
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('Next step: Create a NEW test user and verify they get:');
  console.log('  - credits: $0.00');
  console.log('  - monthly_design_limit: 0');
  console.log('  - monthly_sends_limit: 0');
  console.log('  - billing_status: incomplete');
  console.log('═══════════════════════════════════════════════════════════');
}

verifyMigration().catch(error => {
  console.error('💥 Error:', error);
  process.exit(1);
});
