import { NextRequest, NextResponse } from 'next/server';
import { updateCampaignStatus } from '@/lib/database/campaign-management';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

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
        errorResponse(
          'Invalid status. Must be: active, paused, completed, or archived',
          'INVALID_STATUS'
        ),
        { status: 400 }
      );
    }

    const updated = updateCampaignStatus(campaignId, status);

    if (!updated) {
      return NextResponse.json(
        errorResponse('Campaign not found or status unchanged', 'CAMPAIGN_NOT_FOUND'),
        { status: 404 }
      );
    }

    return NextResponse.json(
      successResponse(
        null,
        `Campaign ${status === 'archived' ? 'archived' : `marked as ${status}`} successfully`
      )
    );
  } catch (error) {
    console.error('Error updating campaign status:', error);
    return NextResponse.json(
      errorResponse('Failed to update campaign status', 'UPDATE_ERROR'),
      { status: 500 }
    );
  }
}
