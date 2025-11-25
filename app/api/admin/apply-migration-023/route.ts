import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { requireAdmin } from '@/lib/auth/admin';

/**
 * Admin endpoint to apply migration 023
 * This executes the SQL directly using service role permissions
 */
export async function POST() {
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
    console.log('🔄 Starting migration 023 application...');

    // Get service role credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    // Create admin client with service role
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('✅ Admin client created');

    // Read migration file
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '023_update_signup_credits_to_zero.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log(`📄 Migration loaded (${migrationSQL.length} characters)`);

    // Execute the SQL by creating the function directly
    // We'll break it into the function creation part only (skip the notices)
    const functionSQL = migrationSQL.substring(
      migrationSQL.indexOf('CREATE OR REPLACE FUNCTION'),
      migrationSQL.indexOf('-- Verify function was updated')
    ).trim();

    console.log('🚀 Executing CREATE OR REPLACE FUNCTION...');

    // Use raw SQL execution via fetch to Supabase's PostgREST endpoint
    // This is a workaround since supabase-js doesn't expose raw SQL execution
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ query: functionSQL })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Migration execution failed:', errorText);

      // If exec_sql RPC doesn't exist, return clear instructions
      if (errorText.includes('function') && errorText.includes('does not exist')) {
        return NextResponse.json({
          error: 'exec_sql RPC function not available',
          message: 'The Supabase database does not have the exec_sql RPC function.',
          solution: 'Manual application required via Supabase Dashboard SQL Editor',
          dashboardUrl: `https://supabase.com/dashboard/project/${supabaseUrl.split('//')[1].split('.')[0]}/sql/new`,
          migrationFile: 'supabase/migrations/023_update_signup_credits_to_zero.sql',
          status: 'manual_required'
        }, { status: 400 });
      }

      return NextResponse.json(
        { error: 'Migration failed', details: errorText },
        { status: 500 }
      );
    }

    const result = await response.json();
    console.log('✅ Migration executed successfully!', result);

    // Verify the function was updated
    const { data: verifyData, error: verifyError } = await supabase
      .rpc('exec_sql', {
        query: "SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user_signup';"
      });

    if (verifyError) {
      console.warn('⚠️ Could not verify function update:', verifyError);
    }

    return NextResponse.json({
      success: true,
      message: 'Migration 023 applied successfully',
      functionUpdated: true,
      nextSteps: [
        'Test new user signup',
        'Verify credits = $0.00',
        'Verify monthly_design_limit = 0',
        'Verify monthly_sends_limit = 0',
        'Verify billing_status = incomplete'
      ]
    });

  } catch (error: any) {
    console.error('💥 Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unexpected error', details: error.message },
      { status: 500 }
    );
  }
}

// Also support GET for simple testing
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

  return NextResponse.json({
    endpoint: '/api/admin/apply-migration-023',
    method: 'POST',
    description: 'Applies migration 023 to set new user defaults to $0',
    usage: 'POST to this endpoint to execute the migration',
    status: 'ready'
  });
}
