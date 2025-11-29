import { NextRequest, NextResponse } from 'next/server';
import { getLandingPageByTrackingId } from '@/lib/database/tracking-queries';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * GET /api/landing-pages/[trackingId]
 * Get landing page data by tracking ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  try {
    const { trackingId } = await params;
    const landingPage = getLandingPageByTrackingId(trackingId);

    if (!landingPage) {
      return NextResponse.json(
        errorResponse('Landing page not found', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    // Parse page_config (may be object from stub or JSON string from real DB)
    const parsedData = typeof landingPage.page_config === 'string'
      ? JSON.parse(landingPage.page_config)
      : (landingPage.page_config || {});

    // Add campaign_id to the response so the redirect can work
    return NextResponse.json(
      successResponse(
        {
          ...parsedData,
          campaignId: landingPage.campaign_id, // Add campaign ID for redirect
        },
        'Landing page retrieved successfully'
      )
    );
  } catch (error) {
    console.error('Error fetching landing page:', error);
    return NextResponse.json(
      errorResponse('Failed to fetch landing page', 'FETCH_ERROR'),
      { status: 500 }
    );
  }
}
