import { NextRequest, NextResponse } from 'next/server';
import { optimizeCampaignDeployment } from '@/lib/ai/retail-optimizer';

/**
 * POST /api/retail/optimize
 * AI-powered campaign optimization
 * Uses GPT-4o for balanced cost/performance
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      campaignName,
      message,
      targetAudience,
      budget,
      desiredStoreCount,
    } = body;

    // Validate required fields
    if (!campaignName || !message) {
      return NextResponse.json(
        {
          success: false,
          error: 'Campaign name and message are required',
        },
        { status: 400 }
      );
    }

    // Run optimization (uses AI)
    const result = await optimizeCampaignDeployment({
      campaignName,
      message,
      targetAudience,
      budget,
      desiredStoreCount: desiredStoreCount || 15,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Campaign optimized successfully',
    });
  } catch (error: any) {
    console.error('Error optimizing campaign:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to optimize campaign',
      },
      { status: 500 }
    );
  }
}
