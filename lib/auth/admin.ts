/**
 * Admin Authentication & Authorization
 *
 * Centralized admin access control for DropLab platform
 * Uses database-driven role system (platform_role column in user_profiles)
 */

import { createServerClient } from '@/lib/supabase/server';

/**
 * Get current user's ID from Supabase session
 * Server-side only
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user.id;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

/**
 * Get current user's platform role from database
 * Server-side only
 */
export async function getCurrentUserPlatformRole(): Promise<string | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('platform_role')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error('Error fetching user platform role:', error);
      return null;
    }

    return data.platform_role || 'user';
  } catch (error) {
    console.error('Error fetching user platform role:', error);
    return null;
  }
}

/**
 * Check if current session user is an admin
 * Server-side only
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const platformRole = await getCurrentUserPlatformRole();
    const isAdmin = platformRole === 'admin' || platformRole === 'super_admin';

    // Debug logging
    console.log('[Admin Auth] User platform role:', platformRole);
    console.log('[Admin Auth] Is admin:', isAdmin);

    return isAdmin;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Verify admin access or throw 403 error
 * Use in API routes to protect admin-only endpoints
 */
export async function requireAdmin(): Promise<void> {
  const isAdmin = await isCurrentUserAdmin();

  if (!isAdmin) {
    throw new Error('Admin access required');
  }
}

/**
 * Get admin user info for audit logging
 */
export async function getAdminAuditInfo(): Promise<{
  email: string;
  userId: string | null;
} | null> {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return null;
    }

    const supabase = await createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      email: user.email || '',
      userId: user.id
    };
  } catch (error) {
    console.error('Error fetching admin audit info:', error);
    return null;
  }
}

/**
 * Log admin action to audit trail
 */
export async function logAdminAction(
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, any>,
  request?: Request
): Promise<void> {
  try {
    const adminInfo = await getAdminAuditInfo();
    if (!adminInfo) {
      throw new Error('Admin info not available for audit log');
    }

    const supabase = await createServerClient();

    // Extract request metadata
    const ipAddress = request?.headers.get('x-forwarded-for') ||
                      request?.headers.get('x-real-ip') ||
                      'unknown';
    const userAgent = request?.headers.get('user-agent') || 'unknown';

    await supabase.from('admin_audit_log').insert({
      admin_email: adminInfo.email,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details: details || {},
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (error) {
    console.error('Error logging admin action:', error);
    // Don't throw - audit logging failure shouldn't break the operation
  }
}
