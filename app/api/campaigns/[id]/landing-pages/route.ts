import { NextRequest, NextResponse } from 'next/server';
import { getLandingPagesByCampaign } from '@/lib/database/landing-queries';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * GET /api/campaigns/[id]/landing-pages
 * Get all landing pages for a campaign
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('📄 [Landing Pages API] Fetching landing pages for campaign:', id);

    const landingPages = await getLandingPagesByCampaign(id);

    console.log(`✅ [Landing Pages API] Found ${landingPages.length} landing pages`);

    // Return array directly (component expects result.data to be array)
    return NextResponse.json(
      successResponse(landingPages)
    );
  } catch (error) {
    console.error('❌ [Landing Pages API] Error fetching landing pages:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch landing pages';

    return NextResponse.json(
      errorResponse(errorMessage, 'FETCH_ERROR'),
      { status: 500 }
    );
  }
}
