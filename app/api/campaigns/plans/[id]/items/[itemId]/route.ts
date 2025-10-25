/**
 * Plan Item Update API
 * PATCH /api/campaigns/plans/[id]/items/[itemId]
 *
 * Allows users to override AI recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { updatePlanItem, getPlanItemById } from '@/lib/database/planning-queries';
import type { UpdatePlanItemInput } from '@/types/planning';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: planId, itemId } = await params;
    const body = await request.json();

    // Validate item exists
    const existingItem = getPlanItemById(itemId);
    if (!existingItem) {
      return NextResponse.json(
        {
          success: false,
          error: 'Plan item not found',
        },
        { status: 404 }
      );
    }

    // Validate item belongs to plan
    if (existingItem.plan_id !== planId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Plan item does not belong to this plan',
        },
        { status: 400 }
      );
    }

    console.log('📝 Updating plan item:', itemId, body);

    // Update the item
    const updates: UpdatePlanItemInput = {};

    if (body.campaign_id !== undefined) {
      updates.campaign_id = body.campaign_id;
      updates.campaign_name = body.campaign_name;
    }

    if (body.quantity !== undefined) {
      updates.quantity = body.quantity;
    }

    if (body.override_notes !== undefined) {
      updates.override_notes = body.override_notes;
    }

    if (body.is_included !== undefined) {
      updates.is_included = body.is_included;
    }

    if (body.wave !== undefined) {
      updates.wave = body.wave;
      updates.wave_name = body.wave_name;
    }

    const updatedItem = updatePlanItem(itemId, updates);

    console.log('✅ Plan item updated successfully');

    return NextResponse.json({
      success: true,
      data: updatedItem,
      message: 'Plan item updated successfully',
    });
  } catch (error: any) {
    console.error('❌ Error updating plan item:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update plan item',
      },
      { status: 500 }
    );
  }
}
