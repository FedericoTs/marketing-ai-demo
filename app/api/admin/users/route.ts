/**
 * API Route: /api/admin/users
 * GET - List all users with their platform roles
 *
 * Admin-only endpoint for user management
 */

import { NextResponse } from 'next/server';
import { requireAdmin, logAdminAction } from '@/lib/auth/admin';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
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
    const supabase = createServiceClient();

    // Fetch all users from auth.users joined with user_profiles
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select(`
        id,
        full_name,
        platform_role,
        platform_role_updated_at,
        last_active_at,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    // Get email addresses from auth.users for each user
    const usersWithEmails = await Promise.all(
      (users || []).map(async (user) => {
        const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
        return {
          ...user,
          email: authUser?.user?.email || 'unknown',
        };
      })
    );

    // Log admin action
    await logAdminAction('list_users', 'user', undefined, { count: usersWithEmails.length }, request);

    return NextResponse.json({
      success: true,
      users: usersWithEmails,
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', message: error.message },
      { status: 500 }
    );
  }
}
