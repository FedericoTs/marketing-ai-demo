/**
 * API Route: /api/admin/organizations
 * GET - Get all organizations with feature flags (admin only)
 */

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/admin';

export async function GET(request: Request) {
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
    const serviceSupabase = createServiceClient();

    // Get all organizations with feature flags (use service client to bypass RLS)
    const { data: organizations, error: orgsError } = await serviceSupabase
      .from('organizations')
      .select('id, name, feature_flags, created_at')
      .order('created_at', { ascending: false });

    if (orgsError) {
      console.error('[Organizations GET] Error:', orgsError);
      return NextResponse.json(
        { error: 'Failed to fetch organizations', details: orgsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      organizations: organizations || [],
    });
  } catch (error: any) {
    console.error('[Organizations GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
