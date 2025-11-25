/**
 * API Route: /api/admin/users/[id]/role
 * PUT - Update a user's platform role
 *
 * Admin-only endpoint for role management
 */

import { NextResponse } from 'next/server';
import { requireAdmin, logAdminAction, getCurrentUserId } from '@/lib/auth/admin';
import { createServiceClient } from '@/lib/supabase/server';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin access
    await requireAdmin();
  } catch (error: any) {
    const isForbidden = error.message?.includes('FORBIDDEN');
    return NextResponse.json(
      { error: error.message || 'Authentication required' },
      { status: isForbidden ? 403 : 401 }
    );
  }

  try {
    const { id: targetUserId } = params;
    const body = await request.json();
    const { platform_role } = body;

    // Validate platform_role
    const validRoles = ['user', 'admin', 'super_admin'];
    if (!platform_role || !validRoles.includes(platform_role)) {
      return NextResponse.json(
        { error: 'Invalid platform_role. Must be one of: user, admin, super_admin' },
        { status: 400 }
      );
    }

    // Prevent self-demotion (admin can't remove their own admin access)
    const currentUserId = await getCurrentUserId();
    if (currentUserId === targetUserId && platform_role === 'user') {
      return NextResponse.json(
        { error: 'Cannot remove your own admin access' },
        { status: 403 }
      );
    }

    const supabase = createServiceClient();

    // Update user's platform role
    const { data: updatedUser, error } = await supabase
      .from('user_profiles')
      .update({
        platform_role,
        platform_role_updated_at: new Date().toISOString(),
        platform_role_updated_by: currentUserId,
      })
      .eq('id', targetUserId)
      .select('id, full_name, platform_role')
      .single();

    if (error) {
      throw new Error(`Failed to update user role: ${error.message}`);
    }

    // Get target user's email for audit log
    const { data: authUser } = await supabase.auth.admin.getUserById(targetUserId);
    const targetUserEmail = authUser?.user?.email || 'unknown';

    // Log admin action
    await logAdminAction(
      'update_user_role',
      'user',
      targetUserId,
      {
        target_user_email: targetUserEmail,
        new_role: platform_role,
      },
      request
    );

    return NextResponse.json({
      success: true,
      user: {
        ...updatedUser,
        email: targetUserEmail,
      },
      message: `User role updated to ${platform_role}`,
    });
  } catch (error: any) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Failed to update user role', message: error.message },
      { status: 500 }
    );
  }
}
