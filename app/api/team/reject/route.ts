/**
 * API Route: /api/team/reject
 * POST - Reject a pending user
 * Requires owner/admin role (enforced by RLS)
 *
 * Body: { userId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rejectUser } from '@/lib/database/supabase-queries';
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

    // Check if user is owner or admin
    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return NextResponse.json(
        errorResponse('Only owners and admins can reject users', 'FORBIDDEN'),
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        errorResponse('User ID is required', 'MISSING_USER_ID'),
        { status: 400 }
      );
    }

    // Verify the user being rejected belongs to the same organization
    const { data: targetUser, error: targetError } = await supabase
      .from('user_profiles')
      .select('organization_id, approval_status')
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

    if (targetUser.approval_status !== 'pending') {
      return NextResponse.json(
        errorResponse('User is not pending approval', 'INVALID_STATUS'),
        { status: 400 }
      );
    }

    // Reject the user
    const rejectedUser = await rejectUser(userId);

    return NextResponse.json(
      successResponse(rejectedUser, 'User rejected successfully')
    );
  } catch (error) {
    console.error('Error rejecting user:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      errorResponse(
        `Failed to reject user: ${errorMessage}`,
        'REJECT_ERROR'
      ),
      { status: 500 }
    );
  }
}
