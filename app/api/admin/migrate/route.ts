/**
 * Migration Runner API Route
 * Executes SQL migrations programmatically using service role key
 *
 * SECURITY: This route should be protected in production!
 * Currently no auth check - add authentication before deploying to production
 *
 * Usage: POST /api/admin/migrate
 * Body: { "migrations": ["001", "002", "003", "004"] } or { "all": true }
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireAdmin } from '@/lib/auth/admin';

// Create admin client with service role key (bypasses RLS)
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

interface MigrationResult {
  migration: string;
  success: boolean;
  error?: string;
  duration_ms?: number;
}

export async function POST(req: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin();
  } catch (error: any) {
    const isForbidden = error.message?.includes('FORBIDDEN');
    return NextResponse.json(
      { error: error.message || 'Authentication required' },
      { status: isForbidden ? 403 : 401 }
    );
  }

  try {
    const body = await req.json();
    const { migrations, all, dryRun } = body;

    // Determine which migrations to run
    let migrationsToRun: string[] = [];

    if (all) {
      migrationsToRun = ['001', '002', '003', '004'];
    } else if (migrations && Array.isArray(migrations)) {
      migrationsToRun = migrations;
    } else {
      return NextResponse.json(
        { error: 'Please specify migrations array or set all: true' },
        { status: 400 }
      );
    }

    // Create admin client
    const supabase = createAdminClient();

    // Test connection first
    const { data: testData, error: testError } = await supabase
      .from('_migrations_test')
      .select('*')
      .limit(1);

    // Ignore error if table doesn't exist (expected)
    console.log('Supabase connection test:', testError ? 'Table not found (expected)' : 'Connected');

    // Results array
    const results: MigrationResult[] = [];

    // Execute each migration
    for (const migrationNum of migrationsToRun) {
      const migrationFile = `${migrationNum}_${getMigrationName(migrationNum)}.sql`;
      const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', migrationFile);

      console.log(`Attempting to run migration: ${migrationFile}`);
      console.log(`Path: ${migrationPath}`);

      // Check if file exists
      if (!fs.existsSync(migrationPath)) {
        results.push({
          migration: migrationFile,
          success: false,
          error: `Migration file not found: ${migrationPath}`
        });
        continue;
      }

      // Read SQL file
      const sql = fs.readFileSync(migrationPath, 'utf-8');

      if (dryRun) {
        results.push({
          migration: migrationFile,
          success: true,
          error: 'DRY RUN - SQL not executed',
          duration_ms: 0
        });
        console.log(`DRY RUN - Would execute migration: ${migrationFile}`);
        continue;
      }

      // Execute migration
      const startTime = Date.now();

      try {
        // Execute raw SQL using rpc or direct query
        // Note: Supabase doesn't have a direct .raw() method, we need to use rpc with a custom function
        // OR execute via SQL statements one by one

        // Split SQL into individual statements (simple approach)
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
          // Skip comments and empty statements
          if (statement.startsWith('--') || statement.length === 0) continue;

          // Execute statement using rpc with exec function
          const { error: execError } = await supabase.rpc('exec_sql', {
            sql: statement + ';'
          });

          if (execError) {
            // If exec_sql function doesn't exist, we need to create it first
            // OR use alternative approach: create migration tracking table
            throw new Error(`Statement execution failed: ${execError.message}`);
          }
        }

        const duration = Date.now() - startTime;

        results.push({
          migration: migrationFile,
          success: true,
          duration_ms: duration
        });

        console.log(`✅ Migration ${migrationFile} completed in ${duration}ms`);
      } catch (error: any) {
        const duration = Date.now() - startTime;

        results.push({
          migration: migrationFile,
          success: false,
          error: error.message,
          duration_ms: duration
        });

        console.error(`❌ Migration ${migrationFile} failed:`, error.message);

        // Stop on first error
        break;
      }
    }

    // Return results
    const allSuccessful = results.every(r => r.success);

    return NextResponse.json({
      success: allSuccessful,
      results,
      message: allSuccessful
        ? `✅ All ${results.length} migrations completed successfully`
        : `❌ Migration failed - check results for details`,
      instructions: !allSuccessful && !dryRun
        ? 'Since programmatic execution failed, please run migrations manually via Supabase Dashboard SQL Editor'
        : undefined
    });

  } catch (error: any) {
    console.error('Migration runner error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}

// Helper function to get migration name
function getMigrationName(num: string): string {
  const names: Record<string, string> = {
    '001': 'organizations',
    '002': 'user_profiles',
    '003': 'design_templates',
    '004': 'design_assets'
  };
  return names[num] || 'unknown';
}

// GET endpoint to list available migrations
export async function GET() {
  try {
    // Require admin authentication
    await requireAdmin();
  } catch (error: any) {
    const isForbidden = error.message?.includes('FORBIDDEN');
    return NextResponse.json(
      { error: error.message || 'Authentication required' },
      { status: isForbidden ? 403 : 401 }
    );
  }

  try {
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');

    // Check if directory exists
    if (!fs.existsSync(migrationsDir)) {
      return NextResponse.json({
        error: 'Migrations directory not found',
        path: migrationsDir
      });
    }

    const files = fs.readdirSync(migrationsDir);
    const migrations = files
      .filter(f => f.endsWith('.sql'))
      .map(f => ({
        filename: f,
        number: f.split('_')[0],
        name: f.replace(/^\d+_/, '').replace('.sql', ''),
        path: path.join(migrationsDir, f),
        size: fs.statSync(path.join(migrationsDir, f)).size
      }));

    return NextResponse.json({
      migrations,
      count: migrations.length,
      usage: {
        runAll: 'POST /api/admin/migrate with { "all": true }',
        runSpecific: 'POST /api/admin/migrate with { "migrations": ["001", "002"] }',
        dryRun: 'POST /api/admin/migrate with { "all": true, "dryRun": true }'
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
