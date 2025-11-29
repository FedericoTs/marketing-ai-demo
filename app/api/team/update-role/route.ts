/**
 * API Route: /api/team/update-role
 * POST - Update a user's role (simplified - Owner or Member only)
 * Requires owner role
 *
 * Body: { userId: string, newRole: 'owner' | 'member' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateUserRole, createAdminClient } from '@/lib/database/supabase-queries';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function POST(request: NextRequest) {
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

    // Get user's organization and role
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

    // Only owners can change roles
    if (profile.role !== 'owner') {
      return NextResponse.json(
        errorResponse('Only owners can change user roles', 'FORBIDDEN'),
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const { userId, newRole } = body;

    if (!userId || !newRole) {
      return NextResponse.json(
        errorResponse('User ID and new role are required', 'MISSING_FIELDS'),
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['owner', 'member'];
    if (!validRoles.includes(newRole)) {
      return NextResponse.json(
        errorResponse(`Invalid role. Must be either 'owner' or 'member'`, 'INVALID_ROLE'),
        { status: 400 }
      );
    }

    // Verify the target user belongs to the same organization
    // Use admin client to bypass RLS for lookup
    const adminClient = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: targetUser, error: targetError } = await (adminClient
      .from('user_profiles') as any)
      .select('organization_id, role, full_name')
      .eq('id', userId)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json(
        errorResponse('User not found', 'USER_NOT_FOUND'),
        { status: 404 }
      );
    }

    const targetUserData = targetUser as { organization_id?: string; role?: string; full_name?: string };
    if (targetUserData.organization_id !== profile.organization_id) {
      return NextResponse.json(
        errorResponse('User does not belong to your organization', 'FORBIDDEN'),
        { status: 403 }
      );
    }

    // Prevent changing own role
    if (userId === user.id) {
      return NextResponse.json(
        errorResponse('You cannot change your own role', 'FORBIDDEN'),
        { status: 403 }
      );
    }

    // Update the user's role
    const updatedUser = await updateUserRole(userId, newRole);

    return NextResponse.json(
      successResponse(
        updatedUser,
        `User role updated to ${newRole} successfully`
      )
    );
  } catch (error) {
    console.error('Error updating user role:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      errorResponse(
        `Failed to update user role: ${errorMessage}`,
        'UPDATE_ERROR'
      ),
      { status: 500 }
    );
  }
}
