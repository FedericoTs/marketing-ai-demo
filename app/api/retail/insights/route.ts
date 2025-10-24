import { NextRequest, NextResponse } from 'next/server';
import { generateRetailInsights } from '@/lib/ai/retail-optimizer';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * GET /api/retail/insights
 * AI-generated insights from retail data
 * Uses GPT-4o-mini for cost efficiency
 */
export async function GET(request: NextRequest) {
  try {
    // Generate AI insights (uses GPT-4o-mini)
    const insights = await generateRetailInsights();

    return NextResponse.json(
      successResponse(insights, 'Insights generated successfully')
    );
  } catch (error: any) {
    console.error('Error generating insights:', error);
    return NextResponse.json(
      errorResponse(
        error.message || 'Failed to generate insights',
        'INSIGHTS_ERROR'
      ),
      { status: 500 }
    );
  }
}
