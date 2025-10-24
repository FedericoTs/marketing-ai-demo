import { NextRequest, NextResponse } from 'next/server';
import { createOrder, updateOrderFiles, type CreateOrderParams } from '@/lib/database/order-queries';
import { generateOrderPDF } from '@/lib/pdf/order-sheet';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * POST /api/campaigns/orders/generate
 * Generate a new campaign order from approved recommendations
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📦 [Order Generate API] Generating new campaign order...');

    const body = await request.json();
    const { approvals, notes, supplierEmail } = body as {
      approvals: Array<{
        storeId: string;
        campaignId: string;
        recommendedQuantity: number;
        approvedQuantity: number;
        notes?: string;
      }>;
      notes?: string;
      supplierEmail?: string;
    };

    // Validation
    if (!approvals || !Array.isArray(approvals) || approvals.length === 0) {
      console.log('❌ [Order Generate API] No approvals provided');
      return NextResponse.json(
        errorResponse('At least one store approval is required', 'MISSING_APPROVALS'),
        { status: 400 }
      );
    }

    // Validate each approval
    for (const approval of approvals) {
      if (!approval.storeId || !approval.campaignId) {
        console.log('❌ [Order Generate API] Invalid approval data:', approval);
        return NextResponse.json(
          errorResponse('Each approval must have storeId and campaignId', 'INVALID_APPROVAL'),
          { status: 400 }
        );
      }

      if (
        typeof approval.recommendedQuantity !== 'number' ||
        typeof approval.approvedQuantity !== 'number' ||
        approval.approvedQuantity <= 0
      ) {
        console.log('❌ [Order Generate API] Invalid quantities:', approval);
        return NextResponse.json(
          errorResponse('Approved quantity must be a positive number', 'INVALID_QUANTITY'),
          { status: 400 }
        );
      }
    }

    console.log(`✅ [Order Generate API] Creating order with ${approvals.length} items...`);

    // Create order params
    const orderParams: CreateOrderParams = {
      orderItems: approvals.map(approval => ({
        storeId: approval.storeId,
        campaignId: approval.campaignId,
        recommendedQuantity: approval.recommendedQuantity,
        approvedQuantity: approval.approvedQuantity,
        notes: approval.notes,
      })),
      notes,
      supplierEmail,
    };

    // Create the order
    const order = createOrder(orderParams);

    console.log(`✅ [Order Generate API] Order created:`, {
      id: order.id,
      orderNumber: order.order_number,
      totalStores: order.total_stores,
      totalQuantity: order.total_quantity,
      estimatedCost: order.estimated_cost,
    });

    // Generate PDF
    console.log(`📄 [Order Generate API] Generating PDF for order ${order.order_number}...`);
    const pdfUrl = await generateOrderPDF(order.id);

    // Update order with PDF URL
    updateOrderFiles(order.id, pdfUrl);

    console.log(`✅ [Order Generate API] PDF generated: ${pdfUrl}`);

    return NextResponse.json(
      successResponse(
        {
          orderId: order.id,
          orderNumber: order.order_number,
          totalStores: order.total_stores,
          totalQuantity: order.total_quantity,
          estimatedCost: order.estimated_cost,
          status: order.status,
          pdfUrl,
        },
        `Order ${order.order_number} generated successfully`
      ),
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ [Order Generate API] Error generating order:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to generate order';

    return NextResponse.json(
      errorResponse(errorMessage, 'GENERATION_ERROR'),
      { status: 500 }
    );
  }
}
