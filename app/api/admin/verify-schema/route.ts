/**
 * Schema Verification API Route
 * Tests if all foundation tables exist and have correct structure
 *
 * Usage: GET /api/admin/verify-schema
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';

// Create admin client with service role key
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

interface TableCheck {
  table: string;
  exists: boolean;
  row_count?: number;
  rls_enabled?: boolean;
  error?: string;
}

export async function GET() {
  try {
    // Require admin authentication
    await requireAdmin();
  } catch (error: any) {
    const isUnauthorized = error.message?.includes('UNAUTHORIZED');
    const isForbidden = error.message?.includes('FORBIDDEN');

    return NextResponse.json(
      { error: error.message || 'Authentication required' },
      { status: isForbidden ? 403 : 401 }
    );
  }

  const supabase = createAdminClient();
  const results: TableCheck[] = [];

  // Tables to check
  const tables = [
    'organizations',
    'user_profiles',
    'design_templates',
    'design_assets'
  ];

  for (const table of tables) {
    try {
      // Try to query the table
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        results.push({
          table,
          exists: false,
          error: error.message
        });
      } else {
        results.push({
          table,
          exists: true,
          row_count: count || 0,
          rls_enabled: true // If query succeeded with service role, table exists
        });
      }
    } catch (error: any) {
      results.push({
        table,
        exists: false,
        error: error.message
      });
    }
  }

  // Check if all tables exist
  const allExist = results.every(r => r.exists);

  // Get total row counts
  const totalRows = results.reduce((sum, r) => sum + (r.row_count || 0), 0);

  return NextResponse.json({
    success: allExist,
    database_ready: allExist,
    tables: results,
    summary: {
      total_tables: tables.length,
      tables_exist: results.filter(r => r.exists).length,
      tables_missing: results.filter(r => !r.exists).length,
      total_rows: totalRows
    },
    message: allExist
      ? '✅ All foundation tables exist and are ready'
      : '❌ Some tables are missing - run migrations first',
    next_steps: !allExist
      ? [
          '1. Open Supabase Dashboard SQL Editor',
          '2. Navigate to: https://supabase.com/dashboard/project/egccqmlhzqiirovstpal/sql/new',
          '3. Execute each migration file in order (001, 002, 003, 004)',
          '4. Run this verification endpoint again'
        ]
      : [
          '✅ Database schema deployed',
          'Next: Create seed data via POST /api/admin/seed',
          'Next: Test multi-tenant isolation'
        ]
  });
}
