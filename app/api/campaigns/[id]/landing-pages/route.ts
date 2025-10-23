import { NextRequest, NextResponse } from 'next/server';
import { getLandingPagesByCampaign } from '@/lib/database/tracking-queries';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * GET /api/campaigns/[id]/landing-pages
 * Get all landing pages for a specific campaign
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const landingPages = getLandingPagesByCampaign(campaignId);

    // Parse page_data JSON for each landing page
    const parsedPages = landingPages.map((page) => ({
      ...page,
      page_data: JSON.parse(page.page_data),
    }));

    return NextResponse.json(
      successResponse(parsedPages, 'Landing pages retrieved successfully')
    );
  } catch (error) {
    console.error('Error fetching landing pages:', error);
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : 'Failed to fetch landing pages',
        'FETCH_ERROR'
      ),
      { status: 500 }
    );
  }
}
