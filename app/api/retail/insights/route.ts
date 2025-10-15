import { NextRequest, NextResponse } from 'next/server';
import { generateRetailInsights } from '@/lib/ai/retail-optimizer';

/**
 * GET /api/retail/insights
 * AI-generated insights from retail data
 * Uses GPT-4o-mini for cost efficiency
 */
export async function GET(request: NextRequest) {
  try {
    // Generate AI insights (uses GPT-4o-mini)
    const insights = await generateRetailInsights();

    return NextResponse.json({
      success: true,
      data: insights,
      message: 'Insights generated successfully',
    });
  } catch (error: any) {
    console.error('Error generating insights:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate insights',
      },
      { status: 500 }
    );
  }
}
