import { NextRequest, NextResponse } from 'next/server';
import { updateCampaignStatus } from '@/lib/database/campaign-management';

/**
 * PATCH /api/campaigns/[id]/status
 * Update campaign status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['active', 'paused', 'completed', 'archived'].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid status. Must be: active, paused, completed, or archived',
        },
        { status: 400 }
      );
    }

    const updated = updateCampaignStatus(campaignId, status);

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          error: 'Campaign not found or status unchanged',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Campaign ${status === 'archived' ? 'archived' : `marked as ${status}`} successfully`,
    });
  } catch (error) {
    console.error('Error updating campaign status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update campaign status',
      },
      { status: 500 }
    );
  }
}
