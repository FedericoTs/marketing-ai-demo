import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = 'https://egccqmlhzqiirovstpal.supabase.co';
const supabaseServiceKey = '***REMOVED***';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigrations() {
  console.log('🚀 Starting Supabase migration process (Direct SQL approach)...');
  console.log('📍 Database URL:', supabaseUrl);
  console.log('');

  try {
    // Read the combined migrations file
    const migrationsPath = join(__dirname, '..', 'supabase', 'all_migrations_combined.sql');
    console.log('📄 Reading migrations from:', migrationsPath);

    const migrationSQL = readFileSync(migrationsPath, 'utf-8');
    console.log(`✅ Loaded ${migrationSQL.length} characters of SQL`);
    console.log('');

    // First, create the exec_sql helper function
    console.log('📝 Creating exec_sql helper function...');

    const helperFunction = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS void AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { error: helperError } = await supabase.rpc('exec', {
      sql: helperFunction
    });

    if (helperError) {
      console.error('❌ Failed to create helper function:', helperError.message);
      console.log('');
      console.log('⚠️  Alternative approach required:');
      console.log('Please manually run the migrations in Supabase Dashboard SQL Editor:');
      console.log('1. Go to https://app.supabase.com/project/egccqmlhzqiirovstpal/sql/new');
      console.log('2. Copy the contents of: supabase/all_migrations_combined.sql');
      console.log('3. Paste into the SQL Editor');
      console.log('4. Click "Run"');
      console.log('');
      console.log('📄 Migration SQL file location:');
      console.log('   ' + migrationsPath);
      return;
    }

    console.log('✅ Helper function created');
    console.log('');

    // Now execute migrations using the helper function
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute`);
    console.log('');

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      const statementType = statement.trim().split(/\s+/)[0].toUpperCase();

      try {
        console.log(`[${i + 1}/${statements.length}] Executing ${statementType}...`);

        const { error } = await supabase.rpc('exec_sql', { sql: statement });

        if (error) {
          if (error.message.includes('already exists')) {
            console.log(`   ⚠️  Skipped (already exists)`);
            skipCount++;
          } else {
            console.error(`   ❌ Error:`, error.message);
            errorCount++;
          }
        } else {
          console.log(`   ✅ Success`);
          successCount++;
        }
      } catch (err) {
        console.error(`   ❌ Exception:`, err.message);
        errorCount++;
      }
    }

    console.log('');
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⚠️  Skipped: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('');

    if (errorCount > 0) {
      console.log('⚠️  Some migrations failed. Check the errors above.');
      console.log('💡 Tip: Some errors like "already exists" are normal if tables were created previously.');
    } else {
      console.log('🎉 All migrations applied successfully!');
    }

  } catch (error) {
    console.error('❌ Migration process failed:', error);
    process.exit(1);
  }
}

applyMigrations();
