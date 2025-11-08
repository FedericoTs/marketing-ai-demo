import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/apply-campaigns-migration
 * Checks if campaigns table exists and provides migration instructions
 */
export async function GET() {
  try {
    const supabase = await createServerClient();

    // Check if campaigns table exists
    const { data: tableCheck, error: checkError } = await supabase
      .from('campaigns')
      .select('id')
      .limit(1);

    if (!checkError) {
      return NextResponse.json({
        tableExists: true,
        message: 'Campaigns table exists ✅',
        rowCount: tableCheck?.length || 0
      });
    }

    // Table doesn't exist or RLS is blocking
    return NextResponse.json({
      tableExists: false,
      message: 'Campaigns table does NOT exist',
      error: checkError.message,
      instructions: {
        step1: 'Go to Supabase Dashboard → SQL Editor',
        step2: 'Copy content from: supabase/migrations/019_campaigns_schema.sql',
        step3: 'Paste and run the migration',
        step4: 'Refresh this page',
        migrationFile: 'supabase/migrations/019_campaigns_schema.sql'
      }
    });

  } catch (error) {
    console.error('Error checking campaigns table:', error);
    return NextResponse.json(
      {
        tableExists: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
