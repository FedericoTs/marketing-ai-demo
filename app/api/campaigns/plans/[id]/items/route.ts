/**
 * Plan Items API - List and Create Items
 * GET /api/campaigns/plans/[id]/items - List all items for a plan
 * POST /api/campaigns/plans/[id]/items - Add item(s) to plan
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getPlanItems,
  getPlanItemsWithStoreDetails,
  createPlanItem,
  bulkCreatePlanItems,
  getPlanById,
} from '@/lib/database/planning-queries';
import type { CreatePlanItemInput } from '@/types/planning';

/**
 * GET /api/campaigns/plans/[id]/items
 * List all plan items for a plan
 * Query params:
 * - includeStoreDetails: 'true' to include full store context
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeStoreDetails = searchParams.get('includeStoreDetails') === 'true';

    // Check if plan exists
    const plan = getPlanById(id);
    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plan not found' },
        { status: 404 }
      );
    }

    const items = includeStoreDetails
      ? getPlanItemsWithStoreDetails(id)
      : getPlanItems(id);

    return NextResponse.json({
      success: true,
      data: items,
      count: items.length,
    });
  } catch (error) {
    console.error('Error fetching plan items:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch plan items' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/campaigns/plans/[id]/items
 * Add item(s) to a plan
 * Body (single): { store_id, store_number, store_name, campaign_id, ... }
 * Body (bulk): { items: [{ store_id, ... }, { store_id, ... }] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if plan exists
    const plan = getPlanById(id);
    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Don't allow editing executed plans
    if (plan.status === 'executed') {
      return NextResponse.json(
        { success: false, error: 'Cannot edit executed plan' },
        { status: 400 }
      );
    }

    // Check if bulk or single
    const isBulk = Array.isArray(body.items);

    if (isBulk) {
      // Bulk create
      const items: CreatePlanItemInput[] = body.items.map((item: any) => ({
        ...item,
        plan_id: id,
      }));

      // Validation
      if (items.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No items provided' },
          { status: 400 }
        );
      }

      for (const item of items) {
        if (!item.store_id || !item.campaign_id || !item.quantity) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields: store_id, campaign_id, quantity' },
            { status: 400 }
          );
        }
      }

      const created = bulkCreatePlanItems(items);

      return NextResponse.json({
        success: true,
        data: created,
        count: created.length,
        message: `${created.length} items added to plan`,
      });
    } else {
      // Single create
      const itemInput: CreatePlanItemInput = {
        ...body,
        plan_id: id,
      };

      // Validation
      if (!itemInput.store_id || !itemInput.campaign_id || !itemInput.quantity) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: store_id, campaign_id, quantity' },
          { status: 400 }
        );
      }

      const created = createPlanItem(itemInput);

      return NextResponse.json({
        success: true,
        data: created,
        message: 'Item added to plan',
      });
    }
  } catch (error) {
    console.error('Error creating plan items:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create plan items' },
      { status: 500 }
    );
  }
}
