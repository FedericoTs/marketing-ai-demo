/**
 * Apply Security Migration Script
 *
 * Applies the search_path security migration to Supabase
 * Run with: npx tsx scripts/apply-security-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function applyMigration() {
  console.log('🔐 Applying security migration...');

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Read migration file
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/034_fix_search_path_security.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  // Split into individual ALTER FUNCTION statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
    .map(s => s + ';');

  console.log(`📝 Found ${statements.length} SQL statements to execute`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // Skip comments
    if (statement.startsWith('--') || statement.includes('COMMENT ON SCHEMA')) {
      continue;
    }

    try {
      // Execute via RPC function
      const { error } = await supabase.rpc('exec_sql', { sql_string: statement });

      if (error) {
        console.error(`❌ Statement ${i + 1} failed:`, error.message);
        console.error('   Statement:', statement.substring(0, 100) + '...');
        errorCount++;
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Statement ${i + 1} threw error:`, err);
      errorCount++;
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);

  if (errorCount === 0) {
    console.log('\n🎉 Migration applied successfully!');
    console.log('   Go to Supabase Dashboard → Database → Advisors to verify');
    return true;
  } else {
    console.log('\n⚠️  Migration completed with errors');
    return false;
  }
}

applyMigration()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('💥 Migration failed:', err);
    process.exit(1);
  });
