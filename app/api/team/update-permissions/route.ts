/**
 * API Route: /api/team/update-permissions
 * POST - Update a user's specific permissions (granular control)
 * Requires owner role
 *
 * Body: {
 *   userId: string,
 *   permissions: {
 *     can_create_designs?: boolean,
 *     can_send_campaigns?: boolean,
 *     can_manage_billing?: boolean,
 *     can_invite_users?: boolean,
 *     can_approve_designs?: boolean,
 *     can_manage_templates?: boolean,
 *     can_access_analytics?: boolean,
 *     can_access_api?: boolean
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateUserPermissions, createAdminClient } from '@/lib/database/supabase-queries';
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

    // Only owners can update permissions
    if (profile.role !== 'owner') {
      return NextResponse.json(
        errorResponse('Only owners can update user permissions', 'FORBIDDEN'),
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const { userId, permissions } = body;

    if (!userId || !permissions) {
      return NextResponse.json(
        errorResponse('User ID and permissions are required', 'MISSING_FIELDS'),
        { status: 400 }
      );
    }

    // Validate permissions object
    const validPermissions = [
      'can_create_designs',
      'can_send_campaigns',
      'can_manage_billing',
      'can_invite_users',
      'can_approve_designs',
      'can_manage_templates',
      'can_access_analytics',
      'can_access_api'
    ];

    const permissionKeys = Object.keys(permissions);
    const invalidKeys = permissionKeys.filter(key => !validPermissions.includes(key));

    if (invalidKeys.length > 0) {
      return NextResponse.json(
        errorResponse(
          `Invalid permission keys: ${invalidKeys.join(', ')}`,
          'INVALID_PERMISSIONS'
        ),
        { status: 400 }
      );
    }

    // Verify all permission values are boolean
    const nonBooleanValues = permissionKeys.filter(key => typeof permissions[key] !== 'boolean');
    if (nonBooleanValues.length > 0) {
      return NextResponse.json(
        errorResponse(
          'All permission values must be boolean',
          'INVALID_PERMISSION_VALUES'
        ),
        { status: 400 }
      );
    }

    // Verify the target user belongs to the same organization
    // Use admin client to bypass RLS for lookup
    const adminClient = createAdminClient();
    const { data: targetUser, error: targetError } = await adminClient
      .from('user_profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json(
        errorResponse('User not found', 'USER_NOT_FOUND'),
        { status: 404 }
      );
    }

    if (targetUser.organization_id !== profile.organization_id) {
      return NextResponse.json(
        errorResponse('User does not belong to your organization', 'FORBIDDEN'),
        { status: 403 }
      );
    }

    // Prevent changing own permissions
    if (userId === user.id) {
      return NextResponse.json(
        errorResponse('You cannot change your own permissions', 'FORBIDDEN'),
        { status: 403 }
      );
    }

    // Update the user's permissions
    const updatedUser = await updateUserPermissions(userId, permissions);

    return NextResponse.json(
      successResponse(
        updatedUser,
        'User permissions updated successfully'
      )
    );
  } catch (error) {
    console.error('Error updating user permissions:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      errorResponse(
        `Failed to update user permissions: ${errorMessage}`,
        'UPDATE_ERROR'
      ),
      { status: 500 }
    );
  }
}
