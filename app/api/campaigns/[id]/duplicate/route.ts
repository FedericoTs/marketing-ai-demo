import { NextRequest, NextResponse } from 'next/server';
import { duplicateCampaign } from '@/lib/database/campaign-management';

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
        {
          success: false,
          error: 'Campaign not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: newCampaign,
      message: 'Campaign duplicated successfully',
    });
  } catch (error) {
    console.error('Error duplicating campaign:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to duplicate campaign',
      },
      { status: 500 }
    );
  }
}
