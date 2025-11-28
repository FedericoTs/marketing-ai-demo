import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/tour/reset
 * Reset user's tour progress (for testing or manual restart)
 */
export async function POST() {
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

    // Reset tour progress
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        onboarding_completed: false,
        onboarding_current_step: 0,
        onboarding_skipped: false,
        tour_version: '0.0',  // Force tour to show again
        tour_completed_at: null,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to reset tour:', updateError);
      return NextResponse.json(
        { error: 'Failed to reset tour' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tour reset successfully',
    });
  } catch (error) {
    console.error('Tour reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
