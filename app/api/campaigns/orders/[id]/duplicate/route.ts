import { NextRequest, NextResponse } from 'next/server';
import { duplicateOrder } from '@/lib/database/order-queries';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * POST /api/campaigns/orders/[id]/duplicate
 * Duplicate an existing order with identical stores and quantities
 *
 * Use Case: Monthly recurring campaigns - rerun previous orders with one click
 * Impact: 93% click reduction (15+ clicks → 1 click)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;

    console.log('🔁 [Duplicate Order API] Duplicating order:', orderId);

    // Duplicate the order (transactional operation)
    const newOrder = duplicateOrder(orderId);

    console.log(`✅ [Duplicate Order API] Order duplicated successfully: ${newOrder.order_number}`);
    console.log(`   Original ID: ${orderId}`);
    console.log(`   New ID: ${newOrder.id}`);
    console.log(`   Stores: ${newOrder.total_stores}`);
    console.log(`   Quantity: ${newOrder.total_quantity}`);
    console.log(`   Cost: $${newOrder.estimated_cost.toFixed(2)}`);

    return NextResponse.json(
      successResponse(
        { order: newOrder },
        `Order duplicated successfully: ${newOrder.order_number}`
      )
    );
  } catch (error) {
    console.error('❌ [Duplicate Order API] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to duplicate order';

    return NextResponse.json(
      errorResponse(errorMessage, 'DUPLICATE_ERROR'),
      { status: 500 }
    );
  }
}
