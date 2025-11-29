import { NextRequest, NextResponse } from 'next/server';
import {
  getOrderById,
  updateOrderItem,
  deleteOrderItem,
  getOrderItems
} from '@/lib/database/order-queries';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * PATCH /api/campaigns/orders/[id]/items/[itemId]
 * Update an order item
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: orderId, itemId } = await params;
    const body = await request.json();

    console.log('📦 [Order Item API] PATCH request for item:', itemId);

    // Check if order exists
    const order = getOrderById(orderId);

    if (!order) {
      console.log('❌ [Order Item API] Order not found:', orderId);
      return NextResponse.json(
        errorResponse('Order not found', 'ORDER_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Only allow editing of draft/pending orders
    if (!['draft', 'pending'].includes(order.status)) {
      console.log('❌ [Order Item API] Cannot edit order in status:', order.status);
      return NextResponse.json(
        errorResponse(
          `Cannot edit order in '${order.status}' status`,
          'INVALID_STATUS'
        ),
        { status: 400 }
      );
    }

    // Verify item belongs to this order using Supabase
    const supabase = createServiceClient();
    const { data: item, error: itemError } = await supabase
      .from('campaign_order_items')
      .select('*')
      .eq('id', itemId)
      .eq('order_id', orderId)
      .single();

    if (itemError || !item) {
      console.log('❌ [Order Item API] Item not found:', itemId);
      return NextResponse.json(
        errorResponse('Item not found in this order', 'ITEM_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Extract update fields
    const { quantity, notes } = body;

    // Validate quantity if provided
    if (quantity !== undefined && quantity <= 0) {
      return NextResponse.json(
        errorResponse('Quantity must be greater than 0', 'INVALID_QUANTITY'),
        { status: 400 }
      );
    }

    // Update item
    const updated = updateOrderItem(itemId, {
      approvedQuantity: quantity,
      notes,
    });

    if (!updated) {
      console.log('❌ [Order Item API] Failed to update item:', itemId);
      return NextResponse.json(
        errorResponse('Failed to update item', 'UPDATE_ERROR'),
        { status: 500 }
      );
    }

    // Get updated order
    const updatedOrder = getOrderById(orderId);

    console.log(`✅ [Order Item API] Updated item in order ${order.order_number}`);

    return NextResponse.json(
      successResponse(
        { order: updatedOrder },
        'Item updated successfully'
      )
    );
  } catch (error) {
    console.error('❌ [Order Item API] Error updating item:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to update item';

    return NextResponse.json(
      errorResponse(errorMessage, 'UPDATE_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/campaigns/orders/[id]/items/[itemId]
 * Delete an order item
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: orderId, itemId } = await params;

    console.log('📦 [Order Item API] DELETE request for item:', itemId);

    // Check if order exists
    const order = getOrderById(orderId);

    if (!order) {
      console.log('❌ [Order Item API] Order not found:', orderId);
      return NextResponse.json(
        errorResponse('Order not found', 'ORDER_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Only allow editing of draft/pending orders
    if (!['draft', 'pending'].includes(order.status)) {
      console.log('❌ [Order Item API] Cannot edit order in status:', order.status);
      return NextResponse.json(
        errorResponse(
          `Cannot edit order in '${order.status}' status`,
          'INVALID_STATUS'
        ),
        { status: 400 }
      );
    }

    // Verify item belongs to this order using Supabase
    const supabase = createServiceClient();
    const { data: item, error: itemError } = await supabase
      .from('campaign_order_items')
      .select('*')
      .eq('id', itemId)
      .eq('order_id', orderId)
      .single();

    if (itemError || !item) {
      console.log('❌ [Order Item API] Item not found:', itemId);
      return NextResponse.json(
        errorResponse('Item not found in this order', 'ITEM_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Check if this is the last item
    const currentItems = getOrderItems(orderId);
    if (currentItems.length <= 1) {
      return NextResponse.json(
        errorResponse(
          'Cannot delete the last item from an order',
          'LAST_ITEM'
        ),
        { status: 400 }
      );
    }

    // Delete item
    const deleted = deleteOrderItem(itemId);

    if (!deleted) {
      console.log('❌ [Order Item API] Failed to delete item:', itemId);
      return NextResponse.json(
        errorResponse('Failed to delete item', 'DELETE_ERROR'),
        { status: 500 }
      );
    }

    // Get updated order
    const updatedOrder = getOrderById(orderId);

    console.log(`✅ [Order Item API] Deleted item from order ${order.order_number}`);

    return NextResponse.json(
      successResponse(
        { order: updatedOrder },
        'Item deleted successfully'
      )
    );
  } catch (error) {
    console.error('❌ [Order Item API] Error deleting item:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to delete item';

    return NextResponse.json(
      errorResponse(errorMessage, 'DELETE_ERROR'),
      { status: 500 }
    );
  }
}
