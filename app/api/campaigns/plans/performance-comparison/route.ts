/**
 * Performance Comparison API
 * POST /api/campaigns/plans/performance-comparison
 *
 * Calculates scientific performance comparison between AI recommendation and user override
 */

import { NextRequest, NextResponse } from 'next/server';
import { comparePerformance } from '@/lib/analytics/performance-predictor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      aiStoreId,
      userStoreId,
      aiOriginalQuantity,
      userOverrideQuantity,
      unitCost,
      aiExpectedConversions,
      aiExpectedRate,
    } = body;

    // Validate inputs
    if (
      !aiStoreId ||
      !userStoreId ||
      aiOriginalQuantity === undefined ||
      userOverrideQuantity === undefined ||
      unitCost === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters',
        },
        { status: 400 }
      );
    }

    // Calculate performance comparison with response curve modeling
    const comparison = comparePerformance({
      aiStoreId,
      userStoreId,
      aiOriginalQuantity,
      userOverrideQuantity,
      unitCost,
      aiExpectedConversions: aiExpectedConversions || 0,
      aiExpectedRate: aiExpectedRate || 3.0,
    });

    return NextResponse.json({
      success: true,
      data: comparison,
    });
  } catch (error: any) {
    console.error('❌ Error calculating performance comparison:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to calculate performance comparison',
      },
      { status: 500 }
    );
  }
}
