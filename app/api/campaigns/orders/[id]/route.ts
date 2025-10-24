import { NextRequest, NextResponse } from 'next/server';
import {
  getOrderById,
  getOrderItems,
  deleteOrder,
  updateOrderDetails
} from '@/lib/database/order-queries';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * GET /api/campaigns/orders/[id]
 * Get a specific campaign order with its items
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    console.log('📦 [Order Detail API] GET request for order:', orderId);

    // Get order
    const order = getOrderById(orderId);

    if (!order) {
      console.log('❌ [Order Detail API] Order not found:', orderId);
      return NextResponse.json(
        errorResponse('Order not found', 'ORDER_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Get order items with details
    const items = getOrderItems(orderId);

    console.log(`✅ [Order Detail API] Retrieved order ${order.order_number} with ${items.length} items`);

    return NextResponse.json(
      successResponse(
        {
          order,
          items,
        },
        'Order details retrieved successfully'
      )
    );
  } catch (error) {
    console.error('❌ [Order Detail API] Error fetching order:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch order';

    return NextResponse.json(
      errorResponse(errorMessage, 'FETCH_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/campaigns/orders/[id]
 * Delete a campaign order
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    console.log('📦 [Order Detail API] DELETE request for order:', orderId);

    // Check if order exists
    const order = getOrderById(orderId);

    if (!order) {
      console.log('❌ [Order Detail API] Order not found:', orderId);
      return NextResponse.json(
        errorResponse('Order not found', 'ORDER_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Don't allow deletion of orders that have been sent/shipped/delivered
    if (['sent', 'printing', 'shipped', 'delivered'].includes(order.status)) {
      console.log('❌ [Order Detail API] Cannot delete order in status:', order.status);
      return NextResponse.json(
        errorResponse(
          `Cannot delete order in '${order.status}' status`,
          'INVALID_STATUS'
        ),
        { status: 400 }
      );
    }

    // Delete order
    const deleted = deleteOrder(orderId);

    if (!deleted) {
      console.log('❌ [Order Detail API] Failed to delete order:', orderId);
      return NextResponse.json(
        errorResponse('Failed to delete order', 'DELETE_ERROR'),
        { status: 500 }
      );
    }

    console.log(`✅ [Order Detail API] Deleted order ${order.order_number}`);

    return NextResponse.json(
      successResponse(
        { orderId, orderNumber: order.order_number },
        `Order ${order.order_number} deleted successfully`
      )
    );
  } catch (error) {
    console.error('❌ [Order Detail API] Error deleting order:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to delete order';

    return NextResponse.json(
      errorResponse(errorMessage, 'DELETE_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/campaigns/orders/[id]
 * Update order details (notes, supplier email)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await request.json();

    console.log('📦 [Order Detail API] PATCH request for order:', orderId);

    // Check if order exists
    const order = getOrderById(orderId);

    if (!order) {
      console.log('❌ [Order Detail API] Order not found:', orderId);
      return NextResponse.json(
        errorResponse('Order not found', 'ORDER_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Only allow editing of draft/pending orders
    if (!['draft', 'pending'].includes(order.status)) {
      console.log('❌ [Order Detail API] Cannot edit order in status:', order.status);
      return NextResponse.json(
        errorResponse(
          `Cannot edit order in '${order.status}' status`,
          'INVALID_STATUS'
        ),
        { status: 400 }
      );
    }

    // Extract update fields
    const { notes, supplierEmail } = body;

    // Update order
    const updated = updateOrderDetails(orderId, {
      notes,
      supplierEmail,
    });

    if (!updated) {
      console.log('❌ [Order Detail API] Failed to update order:', orderId);
      return NextResponse.json(
        errorResponse('Failed to update order', 'UPDATE_ERROR'),
        { status: 500 }
      );
    }

    // Get updated order
    const updatedOrder = getOrderById(orderId);

    console.log(`✅ [Order Detail API] Updated order ${order.order_number}`);

    return NextResponse.json(
      successResponse(
        { order: updatedOrder },
        `Order ${order.order_number} updated successfully`
      )
    );
  } catch (error) {
    console.error('❌ [Order Detail API] Error updating order:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to update order';

    return NextResponse.json(
      errorResponse(errorMessage, 'UPDATE_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * PUT /api/campaigns/orders/[id]
 * Update full order with items (for edit page)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await request.json();

    console.log('📦 [Order Detail API] PUT request for order:', orderId);

    // Check if order exists
    const order = getOrderById(orderId);

    if (!order) {
      console.log('❌ [Order Detail API] Order not found:', orderId);
      return NextResponse.json(
        errorResponse('Order not found', 'ORDER_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Only allow editing of draft/pending orders
    if (!['draft', 'pending'].includes(order.status)) {
      console.log('❌ [Order Detail API] Cannot edit order in status:', order.status);
      return NextResponse.json(
        errorResponse(
          `Cannot edit order in '${order.status}' status`,
          'INVALID_STATUS'
        ),
        { status: 400 }
      );
    }

    const { orderItems, notes, supplierEmail } = body;

    // Validation
    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return NextResponse.json(
        errorResponse('Order must have at least one item', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    // Import necessary functions
    const { updateOrderItem, addOrderItem, deleteOrderItem, recalculateOrderTotals } = await import('@/lib/database/order-queries');

    // Get existing items
    const existingItems = getOrderItems(orderId);
    const existingItemIds = new Set(existingItems.map(item => item.id));
    const updatedItemIds = new Set(orderItems.filter((item: any) => item.id).map((item: any) => item.id));

    // Delete items that are no longer in the order
    for (const existingItem of existingItems) {
      if (!updatedItemIds.has(existingItem.id)) {
        console.log(`🗑️ [Order Detail API] Deleting item ${existingItem.id}`);
        deleteOrderItem(existingItem.id);
      }
    }

    // Update or add items
    for (const item of orderItems) {
      if (item.id && existingItemIds.has(item.id)) {
        // Update existing item
        console.log(`✏️ [Order Detail API] Updating item ${item.id}`);
        updateOrderItem(item.id, {
          approvedQuantity: item.approvedQuantity,
          notes: item.notes,
        });
      } else {
        // Add new item
        console.log(`➕ [Order Detail API] Adding new item`);
        addOrderItem(orderId, {
          storeId: item.storeId,
          campaignId: item.campaignId,
          recommendedQuantity: item.recommendedQuantity || item.approvedQuantity,
          approvedQuantity: item.approvedQuantity,
          notes: item.notes,
        });
      }
    }

    // Update order details
    if (notes !== undefined || supplierEmail !== undefined) {
      updateOrderDetails(orderId, {
        notes,
        supplierEmail,
      });
    }

    // Recalculate totals
    recalculateOrderTotals(orderId);

    // Get updated order and items
    const updatedOrder = getOrderById(orderId);
    const updatedItems = getOrderItems(orderId);

    console.log(`✅ [Order Detail API] Updated order ${order.order_number} with ${updatedItems.length} items`);

    return NextResponse.json(
      successResponse(
        {
          order: updatedOrder,
          items: updatedItems,
        },
        `Order ${order.order_number} updated successfully`
      )
    );
  } catch (error) {
    console.error('❌ [Order Detail API] Error updating order:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to update order';

    return NextResponse.json(
      errorResponse(errorMessage, 'UPDATE_ERROR'),
      { status: 500 }
    );
  }
}
