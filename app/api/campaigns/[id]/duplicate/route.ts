import { NextRequest, NextResponse } from 'next/server';
import { duplicateCampaign } from '@/lib/database/campaign-management';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * POST /api/campaigns/[id]/duplicate
 * Duplicate an existing campaign
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;

    const newCampaign = duplicateCampaign(campaignId);

    if (!newCampaign) {
      return NextResponse.json(
        errorResponse('Campaign not found', 'CAMPAIGN_NOT_FOUND'),
        { status: 404 }
      );
    }

    return NextResponse.json(
      successResponse(newCampaign, 'Campaign duplicated successfully')
    );
  } catch (error) {
    console.error('Error duplicating campaign:', error);
    return NextResponse.json(
      errorResponse('Failed to duplicate campaign', 'DUPLICATE_ERROR'),
      { status: 500 }
    );
  }
}
