import { NextRequest, NextResponse } from 'next/server';
import {
  bulkUpdateCampaignStatus,
  bulkArchiveCampaigns,
  bulkPermanentlyDeleteCampaigns,
} from '@/lib/database/campaign-management';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * POST /api/campaigns/bulk
 * Perform bulk operations on campaigns
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, campaignIds } = body;

    if (!action || !campaignIds || !Array.isArray(campaignIds)) {
      return NextResponse.json(
        errorResponse('Action and campaign IDs array are required', 'MISSING_FIELDS'),
        { status: 400 }
      );
    }

    if (campaignIds.length === 0) {
      return NextResponse.json(
        errorResponse('No campaigns selected', 'EMPTY_SELECTION'),
        { status: 400 }
      );
    }

    let count = 0;
    let message = '';

    switch (action) {
      case 'activate':
        count = bulkUpdateCampaignStatus(campaignIds, 'active');
        message = `${count} campaign(s) activated`;
        break;

      case 'pause':
        count = bulkUpdateCampaignStatus(campaignIds, 'paused');
        message = `${count} campaign(s) paused`;
        break;

      case 'complete':
        count = bulkUpdateCampaignStatus(campaignIds, 'completed');
        message = `${count} campaign(s) marked as completed`;
        break;

      case 'archive':
        count = bulkArchiveCampaigns(campaignIds);
        message = `${count} campaign(s) archived`;
        break;

      case 'delete':
        count = bulkPermanentlyDeleteCampaigns(campaignIds);
        message = `${count} campaign(s) permanently deleted`;
        break;

      default:
        return NextResponse.json(
          errorResponse(
            'Invalid action. Must be: activate, pause, complete, archive, or delete',
            'INVALID_ACTION'
          ),
          { status: 400 }
        );
    }

    return NextResponse.json(
      successResponse({ count }, message)
    );
  } catch (error) {
    console.error('Error performing bulk operation:', error);
    return NextResponse.json(
      errorResponse('Failed to perform bulk operation', 'BULK_OPERATION_ERROR'),
      { status: 500 }
    );
  }
}
