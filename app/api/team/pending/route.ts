/**
 * API Route: /api/team/pending
 * GET - Get pending users for current user's organization
 * Requires owner/admin role (enforced by RLS)
 */

import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getPendingUsers } from '@/lib/database/supabase-queries';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function GET() {
  try {
    // Get current user session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        errorResponse('Unauthorized - Please sign in', 'UNAUTHORIZED'),
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        errorResponse('User profile not found', 'PROFILE_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Check if user is owner or admin
    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return NextResponse.json(
        errorResponse('Only owners and admins can view pending users', 'FORBIDDEN'),
        { status: 403 }
      );
    }

    // Get pending users for organization
    const pendingUsers = await getPendingUsers(profile.organization_id);

    // Get email addresses for pending users (need service client for auth.admin)
    const serviceClient = createServiceClient();
    const pendingUsersWithEmail = await Promise.all(
      pendingUsers.map(async (pendingUser) => {
        const { data: { user: authUser } } = await serviceClient.auth.admin.getUserById(pendingUser.id);
        return {
          ...pendingUser,
          email: authUser?.email || 'Unknown'
        };
      })
    );

    return NextResponse.json(
      successResponse(pendingUsersWithEmail, 'Pending users retrieved successfully')
    );
  } catch (error) {
    console.error('Error fetching pending users:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      errorResponse(
        `Failed to fetch pending users: ${errorMessage}`,
        'FETCH_ERROR'
      ),
      { status: 500 }
    );
  }
}
