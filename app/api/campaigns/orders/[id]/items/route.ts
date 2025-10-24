import { NextRequest, NextResponse } from 'next/server';
import {
  getOrderById,
  addOrderItem,
  getOrderItems
} from '@/lib/database/order-queries';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * POST /api/campaigns/orders/[id]/items
 * Add a new item to an order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await request.json();

    console.log('📦 [Order Items API] POST request for order:', orderId);

    // Check if order exists
    const order = getOrderById(orderId);

    if (!order) {
      console.log('❌ [Order Items API] Order not found:', orderId);
      return NextResponse.json(
        errorResponse('Order not found', 'ORDER_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Only allow editing of draft/pending orders
    if (!['draft', 'pending'].includes(order.status)) {
      console.log('❌ [Order Items API] Cannot edit order in status:', order.status);
      return NextResponse.json(
        errorResponse(
          `Cannot edit order in '${order.status}' status`,
          'INVALID_STATUS'
        ),
        { status: 400 }
      );
    }

    // Validate input
    const { storeId, campaignId, quantity, notes } = body;

    if (!storeId || !campaignId) {
      return NextResponse.json(
        errorResponse('Store ID and Campaign ID are required', 'MISSING_FIELDS'),
        { status: 400 }
      );
    }

    if (!quantity || quantity <= 0) {
      return NextResponse.json(
        errorResponse('Quantity must be greater than 0', 'INVALID_QUANTITY'),
        { status: 400 }
      );
    }

    // Check for duplicate store-campaign combination
    const existingItems = getOrderItems(orderId);
    const duplicate = existingItems.find(
      (item) => item.store_id === storeId && item.campaign_id === campaignId
    );

    if (duplicate) {
      return NextResponse.json(
        errorResponse(
          'This store-campaign combination already exists in the order',
          'DUPLICATE_ITEM'
        ),
        { status: 400 }
      );
    }

    // Add item
    const newItem = addOrderItem(orderId, {
      storeId,
      campaignId,
      recommendedQuantity: quantity,
      approvedQuantity: quantity,
      notes,
    });

    // Get updated order
    const updatedOrder = getOrderById(orderId);

    console.log(`✅ [Order Items API] Added item to order ${order.order_number}`);

    return NextResponse.json(
      successResponse(
        {
          item: newItem,
          order: updatedOrder,
        },
        'Item added successfully'
      ),
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ [Order Items API] Error adding item:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to add item';

    return NextResponse.json(
      errorResponse(errorMessage, 'ADD_ITEM_ERROR'),
      { status: 500 }
    );
  }
}
