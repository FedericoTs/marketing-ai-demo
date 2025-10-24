import { NextRequest, NextResponse } from 'next/server';
import { getOrderById, updateOrderStatus } from '@/lib/database/order-queries';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * PATCH /api/campaigns/orders/[id]/status
 * Update order status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await request.json();

    console.log('📦 [Order Status API] PATCH request for order:', orderId);

    // Check if order exists
    const order = getOrderById(orderId);

    if (!order) {
      console.log('❌ [Order Status API] Order not found:', orderId);
      return NextResponse.json(
        errorResponse('Order not found', 'ORDER_NOT_FOUND'),
        { status: 404 }
      );
    }

    const { status, trackingNumber, sentAt, deliveredAt } = body;

    // Validation
    const validStatuses = ['draft', 'pending', 'sent', 'printing', 'shipped', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        errorResponse('Invalid status', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    // Don't allow changing from certain statuses
    if (order.status === 'cancelled' && status !== 'cancelled') {
      return NextResponse.json(
        errorResponse('Cannot change status of cancelled order', 'INVALID_STATUS'),
        { status: 400 }
      );
    }

    if (order.status === 'delivered' && status !== 'delivered') {
      return NextResponse.json(
        errorResponse('Cannot change status of delivered order', 'INVALID_STATUS'),
        { status: 400 }
      );
    }

    // Update status
    const additionalData: any = {};
    if (trackingNumber) {
      additionalData.trackingNumber = trackingNumber;
    }
    if (sentAt) {
      additionalData.sentAt = sentAt;
    }
    if (deliveredAt) {
      additionalData.deliveredAt = deliveredAt;
    }

    const updated = updateOrderStatus(orderId, status as any, additionalData);

    if (!updated) {
      console.log('❌ [Order Status API] Failed to update status:', orderId);
      return NextResponse.json(
        errorResponse('Failed to update status', 'UPDATE_ERROR'),
        { status: 500 }
      );
    }

    // Get updated order
    const updatedOrder = getOrderById(orderId);

    console.log(`✅ [Order Status API] Updated order ${order.order_number} status to ${status}`);

    return NextResponse.json(
      successResponse(
        { order: updatedOrder },
        `Order ${order.order_number} status updated to '${status}'`
      )
    );
  } catch (error) {
    console.error('❌ [Order Status API] Error updating status:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to update status';

    return NextResponse.json(
      errorResponse(errorMessage, 'UPDATE_ERROR'),
      { status: 500 }
    );
  }
}
