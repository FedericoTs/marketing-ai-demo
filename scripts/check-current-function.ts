#!/usr/bin/env npx tsx

/**
 * Check current signup function in database
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

async function checkCurrentFunction() {
  console.log('🔍 Checking current signup function in database...\n');

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

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Query to get function definition
  const { data, error } = await supabase
    .from('pg_proc')
    .select('prosrc, proname')
    .eq('proname', 'handle_new_user_signup')
    .single();

  if (error) {
    console.error('❌ Error querying function:', error);
    console.log('\nTrying alternative query method...\n');

    // Try using raw query if available
    const { data: rawData, error: rawError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT
          proname as name,
          pg_get_functiondef(oid) as definition
        FROM pg_proc
        WHERE proname = 'handle_new_user_signup';
      `
    });

    if (rawError) {
      console.error('❌ Alternative query also failed:', rawError);
      return;
    }

    console.log('Function definition:\n');
    console.log(rawData);
    return;
  }

  const funcSource = data?.prosrc || '';

  console.log('📄 Current function source code:\n');
  console.log('=' .repeat(80));

  // Extract key parts
  const lines = funcSource.split('\n');
  let inInsertBlock = false;
  let insertLines: string[] = [];

  for (const line of lines) {
    if (line.includes('INSERT INTO organizations')) {
      inInsertBlock = true;
    }
    if (inInsertBlock) {
      insertLines.push(line);
      if (line.includes('RETURNING id INTO')) {
        break;
      }
    }
  }

  console.log('INSERT INTO organizations block:');
  console.log(insertLines.join('\n'));
  console.log('=' .repeat(80));

  // Check specific values
  const hasOldCredits = funcSource.includes('10000.00') || funcSource.includes('10000');
  const hasNewCredits = funcSource.includes('0.00') && !funcSource.includes('10000');
  const hasTrialingStatus = funcSource.includes("'trialing'");
  const hasIncompleteStatus = funcSource.includes("'incomplete'");

  console.log('\n📊 Analysis:');
  console.log('  Contains old credits ($10000):', hasOldCredits ? '✅ YES (needs update)' : '❌ NO');
  console.log('  Contains new credits ($0.00):', hasNewCredits ? '✅ YES (correct)' : '❌ NO (needs update)');
  console.log('  Contains "trialing" status:', hasTrialingStatus ? '✅ YES (needs update)' : '❌ NO');
  console.log('  Contains "incomplete" status:', hasIncompleteStatus ? '✅ YES (correct)' : '❌ NO (needs update)');

  if (hasOldCredits || hasTrialingStatus) {
    console.log('\n⚠️  FUNCTION STILL HAS OLD DEFAULTS - Migration 023 NOT applied\n');
  } else if (hasNewCredits && hasIncompleteStatus) {
    console.log('\n✅ FUNCTION HAS NEW DEFAULTS - Migration 023 IS applied\n');
  } else {
    console.log('\n❓ UNCLEAR STATE - Manual inspection recommended\n');
  }
}

checkCurrentFunction().catch(error => {
  console.error('💥 Error:', error);
  process.exit(1);
});
