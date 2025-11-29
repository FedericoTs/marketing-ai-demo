/**
 * Plan Activity Log API
 * GET /api/campaigns/plans/[id]/activity - Get activity log for a plan
 */

import { NextRequest, NextResponse } from 'next/server';
import { getActivityLog, getPlanById } from '@/lib/database/planning-queries';

/**
 * GET /api/campaigns/plans/[id]/activity
 * Get activity log (audit trail) for a plan
 * Shows all changes made to the plan over time
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Check if plan exists
    const plan = getPlanById(id);
    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plan not found' },
        { status: 404 }
      );
    }

    const activity = getActivityLog(id);

    return NextResponse.json({
      success: true,
      data: activity,
      count: activity.length,
    });
  } catch (error) {
    console.error('Error fetching activity log:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity log' },
      { status: 500 }
    );
  }
}
