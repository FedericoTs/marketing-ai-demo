/**
 * Plan Approval API
 * POST /api/campaigns/plans/[id]/approve - Approve plan for execution
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPlanById, approvePlan } from '@/lib/database/planning-queries';

/**
 * POST /api/campaigns/plans/[id]/approve
 * Approve a plan (change status from draft to approved)
 * Locks plan for review before execution
 */
export async function POST(
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

    // Validate plan status
    if (plan.status === 'approved') {
      return NextResponse.json(
        { success: false, error: 'Plan is already approved' },
        { status: 400 }
      );
    }

    if (plan.status === 'executed') {
      return NextResponse.json(
        { success: false, error: 'Cannot approve executed plan' },
        { status: 400 }
      );
    }

    // Validate plan has items
    if (plan.total_stores === 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot approve plan with no stores' },
        { status: 400 }
      );
    }

    const approved = approvePlan(id);

    return NextResponse.json({
      success: true,
      data: approved,
      message: 'Plan approved successfully',
    });
  } catch (error) {
    console.error('Error approving plan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to approve plan' },
      { status: 500 }
    );
  }
}
