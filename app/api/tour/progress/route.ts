import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTourVersion } from '@/lib/tour/tour-config';

// Force dynamic route - no caching (Next.js 15)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/tour/progress
 * Get user's tour progress
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's tour progress
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('onboarding_completed, onboarding_current_step, onboarding_skipped, tour_version, tour_completed_at')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Failed to fetch tour progress:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch tour progress' },
        { status: 500 }
      );
    }

    // Debug: Log what we actually read from database
    console.log('[Tour API] Raw profile from DB:', {
      tour_version: profile?.tour_version,
      onboarding_completed: profile?.onboarding_completed,
      user_id: user.id,
    });

    const responseData = {
      completed: profile?.onboarding_completed || false,
      currentStep: profile?.onboarding_current_step || 0,
      skipped: profile?.onboarding_skipped || false,
      version: profile?.tour_version || '1.0',
      completedAt: profile?.tour_completed_at,
    };

    console.log('[Tour API] Sending response:', responseData);

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Tour progress error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tour/progress
 * Update user's tour progress
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { stepId, action } = body;

    // Prepare update data based on action
    let updateData: any = {
      tour_version: getTourVersion(),
    };

    if (action === 'next') {
      // Moving to next step
      updateData.onboarding_current_step = (updateData.onboarding_current_step || 0) + 1;
    } else if (action === 'skip') {
      // User skipped tour
      updateData.onboarding_skipped = true;
      updateData.onboarding_completed = false;
    } else if (action === 'complete') {
      // User completed tour
      updateData.onboarding_completed = true;
      updateData.onboarding_skipped = false;
      updateData.tour_completed_at = new Date().toISOString();
    }

    // Update user's tour progress
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update tour progress:', updateError);
      return NextResponse.json(
        { error: 'Failed to update tour progress' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      currentStep: updateData.onboarding_current_step,
      action,
    });
  } catch (error) {
    console.error('Tour progress update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
