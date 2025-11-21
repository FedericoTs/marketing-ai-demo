/**
 * Landing Pages List API
 *
 * GET /api/landing-pages
 * Returns all landing pages for user's organization with analytics
 *
 * Phase 9.2.13 - Landing Page Manager
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLandingPagesWithAnalytics } from '@/lib/database/landing-page-analytics-queries';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Get landing pages with analytics
    const landingPages = await getLandingPagesWithAnalytics(profile.organization_id);

    return NextResponse.json({
      success: true,
      data: landingPages,
    });
  } catch (error) {
    console.error('[Landing Pages API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch landing pages',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
