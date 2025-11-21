/**
 * API Route: /api/admin/feature-flags
 * PUT - Update feature flags for an organization (admin only)
 * GET - Get feature flags for an organization (admin only)
 */

import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    const supabase = await createServerClient();
    const serviceSupabase = createServiceClient();

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
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Get feature flags (use service client to bypass RLS for admin access)
    const { data: org, error: orgError } = await serviceSupabase
      .from('organizations')
      .select('id, name, feature_flags')
      .eq('id', organizationId || userProfile.organization_id)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      organization: org,
    });
  } catch (error: any) {
    console.error('[Feature Flags GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { organizationId, flagName, enabled, reason } = body;

    if (!organizationId || !flagName || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request: organizationId, flagName, and enabled are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const serviceSupabase = createServiceClient();

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
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Validate flag name
    const validFlags = [
      'csv_export_enabled',
      'contact_details_enabled',
      'recipient_list_reuse_enabled',
      'audience_analytics_enabled',
      'batch_export_enabled',
    ];

    if (!validFlags.includes(flagName)) {
      return NextResponse.json(
        { error: `Invalid flag name. Valid flags: ${validFlags.join(', ')}` },
        { status: 400 }
      );
    }

    // Update the feature flag using the database function
    const { data: result, error: updateError } = await serviceSupabase.rpc(
      'update_feature_flag',
      {
        org_id: organizationId,
        flag_name: flagName,
        new_value: enabled,
        changed_by_user_id: user.id,
        change_reason: reason || `Feature flag ${enabled ? 'enabled' : 'disabled'} by ${userProfile.full_name}`,
      }
    );

    if (updateError) {
      console.error('[Feature Flags PUT] Error updating flag:', updateError);
      return NextResponse.json(
        { error: 'Failed to update feature flag', details: updateError.message },
        { status: 500 }
      );
    }

    // Get updated organization (use service client to bypass RLS for admin access)
    const { data: org } = await serviceSupabase
      .from('organizations')
      .select('id, name, feature_flags')
      .eq('id', organizationId)
      .single();

    return NextResponse.json({
      success: true,
      message: `Feature flag '${flagName}' ${enabled ? 'enabled' : 'disabled'} successfully`,
      organization: org,
    });
  } catch (error: any) {
    console.error('[Feature Flags PUT] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
