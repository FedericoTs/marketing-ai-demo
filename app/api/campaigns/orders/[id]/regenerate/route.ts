import { NextRequest, NextResponse } from 'next/server';
import { getOrderById, updateOrderFiles } from '@/lib/database/order-queries';
import { generateOrderPDF } from '@/lib/pdf/order-sheet';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import fs from 'fs';
import path from 'path';

/**
 * POST /api/campaigns/orders/[id]/regenerate
 * Regenerate PDF for an order after edits
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    console.log('📦 [Order Regenerate API] POST request for order:', orderId);

    // Check if order exists
    const order = getOrderById(orderId);

    if (!order) {
      console.log('❌ [Order Regenerate API] Order not found:', orderId);
      return NextResponse.json(
        errorResponse('Order not found', 'ORDER_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Delete old PDF if it exists
    if (order.pdf_url) {
      try {
        const oldPdfPath = path.join(process.cwd(), 'public', order.pdf_url);
        if (fs.existsSync(oldPdfPath)) {
          fs.unlinkSync(oldPdfPath);
          console.log('🗑️ [Order Regenerate API] Deleted old PDF:', order.pdf_url);
        }
      } catch (error) {
        console.warn('⚠️ [Order Regenerate API] Failed to delete old PDF:', error);
        // Continue anyway - not critical
      }
    }

    // Generate new PDF
    console.log('📄 [Order Regenerate API] Generating new PDF...');
    const pdfUrl = await generateOrderPDF(orderId);

    // Update order with new PDF URL
    updateOrderFiles(orderId, pdfUrl);

    // Get updated order
    const updatedOrder = getOrderById(orderId);

    console.log(`✅ [Order Regenerate API] Regenerated PDF for order ${order.order_number}`);

    return NextResponse.json(
      successResponse(
        {
          order: updatedOrder,
          pdfUrl,
        },
        `PDF regenerated successfully for order ${order.order_number}`
      )
    );
  } catch (error) {
    console.error('❌ [Order Regenerate API] Error regenerating PDF:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to regenerate PDF';

    return NextResponse.json(
      errorResponse(errorMessage, 'REGENERATE_ERROR'),
      { status: 500 }
    );
  }
}
