import { NextRequest, NextResponse } from 'next/server';
import { getOrderById, getOrderItems } from '@/lib/database/order-queries';
import { generateOrderCSV, getOrderCSVFilename } from '@/lib/csv/order-export';

/**
 * GET /api/campaigns/orders/[id]/csv
 * Export order as CSV file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    console.log('📋 [Order CSV API] GET request for order:', orderId);

    // Get order
    const order = getOrderById(orderId);

    if (!order) {
      console.log('❌ [Order CSV API] Order not found:', orderId);
      return new NextResponse('Order not found', { status: 404 });
    }

    // Get order items with details
    const items = getOrderItems(orderId);

    // Generate CSV content
    const csvContent = generateOrderCSV(order, items);

    // Generate filename
    const filename = getOrderCSVFilename(order.order_number);

    console.log(`✅ [Order CSV API] Generated CSV for order ${order.order_number}`);

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('❌ [Order CSV API] Error generating CSV:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to generate CSV';

    return new NextResponse(errorMessage, { status: 500 });
  }
}
