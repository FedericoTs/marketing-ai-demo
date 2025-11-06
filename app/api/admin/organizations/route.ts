/**
 * API Route: /api/admin/organizations
 * GET - Get all organizations with feature flags (admin only)
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin/owner
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Get all organizations with feature flags
    const { data: organizations, error: orgsError } = await supabase
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
