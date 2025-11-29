/**
 * Plan Execution API
 * POST /api/campaigns/plans/[id]/execute - Execute plan (create orders)
 */

import { NextRequest, NextResponse } from 'next/server';
// TODO: Re-implement with Supabase
// import { getPlanById, getPlanItems, executePlan } from '@/lib/database/planning-queries';
// import { createOrder } from '@/lib/database/campaign-management';

/**
 * POST /api/campaigns/plans/[id]/execute
 * Execute a plan (change status to executed, create orders for all items)
 * This is the final step that creates actual campaign orders
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // TODO: Re-implement with Supabase database
  return NextResponse.json(
    {
      success: false,
      error: 'This endpoint is not yet implemented in the Supabase version',
      message: 'Plan execution will be available after Phase 1 completion'
    },
    { status: 501 }
  );

  /* SQLite version (to be re-implemented)
  try {
    // Check if plan exists
    const plan = getPlanById(params.id);
    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Validate plan status
    if (plan.status === 'draft') {
      return NextResponse.json(
        { success: false, error: 'Plan must be approved before execution' },
        { status: 400 }
      );
    }

    if (plan.status === 'executed') {
      return NextResponse.json(
        { success: false, error: 'Plan has already been executed' },
        { status: 400 }
      );
    }

    // Validate plan has items
    if (plan.total_stores === 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot execute plan with no stores' },
        { status: 400 }
      );
    }

    // Get all plan items that are included
    const items = getPlanItems(params.id).filter(item => item.is_included);

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot execute plan with no included stores' },
        { status: 400 }
      );
    }

    // Create orders for each plan item
    const createdOrders: string[] = [];
    const errors: string[] = [];

    for (const item of items) {
      try {
        const order = createOrder({
          store_id: item.store_id,
          campaign_id: item.campaign_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          status: 'pending', // Orders start as pending
          wave: item.wave || undefined,
          notes: `Created from plan: ${plan.name}${item.override_notes ? ` | ${item.override_notes}` : ''}`,
        });
        createdOrders.push(order.id);
      } catch (error) {
        console.error(`Error creating order for store ${item.store_id}:`, error);
        errors.push(`Store ${item.store_number}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // If all failed, return error
    if (createdOrders.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create any orders',
          details: errors,
        },
        { status: 500 }
      );
    }

    // Mark plan as executed
    const executed = executePlan(params.id);

    return NextResponse.json({
      success: true,
      data: {
        plan: executed,
        orders_created: createdOrders.length,
        order_ids: createdOrders,
        errors: errors.length > 0 ? errors : undefined,
      },
      message: `Plan executed successfully. ${createdOrders.length} orders created.${errors.length > 0 ? ` ${errors.length} errors occurred.` : ''}`,
    });
  } catch (error) {
    console.error('Error executing plan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to execute plan' },
      { status: 500 }
    );
  }
  */
}
