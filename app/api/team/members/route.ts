/**
 * API Route: /api/team/members
 * GET - Get all members for current user's organization with email addresses
 * Requires owner/admin role (enforced by RLS)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationUsersWithEmail } from '@/lib/database/supabase-queries';
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
        errorResponse('Only owners and admins can view team members', 'FORBIDDEN'),
        { status: 403 }
      );
    }

    // Get all users with emails
    const members = await getOrganizationUsersWithEmail(profile.organization_id);

    return NextResponse.json(
      successResponse(members, 'Team members retrieved successfully')
    );
  } catch (error) {
    console.error('Error fetching team members:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      errorResponse(
        `Failed to fetch team members: ${errorMessage}`,
        'FETCH_ERROR'
      ),
      { status: 500 }
    );
  }
}
