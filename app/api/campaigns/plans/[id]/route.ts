/**
 * Campaign Plan API - Individual Plan Operations
 * GET /api/campaigns/plans/[id] - Get plan by ID
 * PATCH /api/campaigns/plans/[id] - Update plan metadata
 * DELETE /api/campaigns/plans/[id] - Delete plan
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPlanById, getPlanSummary, updatePlan, deletePlan } from '@/lib/database/planning-queries';
import type { UpdatePlanInput } from '@/types/planning';

/**
 * GET /api/campaigns/plans/[id]
 * Get a single campaign plan by ID
 * Query params:
 * - summary: 'true' to get aggregated stats
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeSummary = searchParams.get('summary') === 'true';

    const plan = includeSummary
      ? getPlanSummary(id)
      : getPlanById(id);

    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error('Error fetching plan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch plan' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/campaigns/plans/[id]
 * Update plan metadata (name, description, notes)
 * Body: { name?, description?, notes? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as UpdatePlanInput;

    // Check if plan exists
    const existing = getPlanById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Don't allow editing executed plans
    if (existing.status === 'executed') {
      return NextResponse.json(
        { success: false, error: 'Cannot edit executed plan' },
        { status: 400 }
      );
    }

    const updated = updatePlan(id, body);

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Plan updated successfully',
    });
  } catch (error) {
    console.error('Error updating plan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update plan' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/campaigns/plans/[id]
 * Delete a campaign plan (cascades to items, waves, logs)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if plan exists
    const existing = getPlanById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Don't allow deleting executed plans
    if (existing.status === 'executed') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete executed plan' },
        { status: 400 }
      );
    }

    deletePlan(id);

    return NextResponse.json({
      success: true,
      message: 'Plan deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting plan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete plan' },
      { status: 500 }
    );
  }
}
