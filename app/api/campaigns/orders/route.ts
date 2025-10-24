import { NextRequest, NextResponse } from 'next/server';
import { getAllOrders, getOrdersCount, getOrderStatistics } from '@/lib/database/order-queries';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * GET /api/campaigns/orders
 * Get all campaign orders with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') || undefined;
    const searchQuery = searchParams.get('search') || undefined;
    const includeStats = searchParams.get('includeStats') === 'true';

    console.log('📦 [Orders API] GET request:', { limit, offset, status, searchQuery, includeStats });

    // Get orders
    const orders = getAllOrders({ limit, offset, status, searchQuery });
    const totalCount = getOrdersCount(status);

    // Optionally include statistics
    const statistics = includeStats ? getOrderStatistics() : undefined;

    console.log(`✅ [Orders API] Retrieved ${orders.length} orders (total: ${totalCount})`);

    return NextResponse.json(
      successResponse(
        {
          orders,
          pagination: {
            limit,
            offset,
            total: totalCount,
            hasMore: offset + orders.length < totalCount,
          },
          statistics,
        },
        'Orders retrieved successfully'
      )
    );
  } catch (error) {
    console.error('❌ [Orders API] Error fetching orders:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch orders';

    return NextResponse.json(
      errorResponse(errorMessage, 'FETCH_ERROR'),
      { status: 500 }
    );
  }
}
