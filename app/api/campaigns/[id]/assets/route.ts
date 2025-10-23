import { NextRequest, NextResponse } from 'next/server';
import {
  getCampaignAssets,
  getAssetPublicUrl,
} from '@/lib/database/asset-management';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * GET /api/campaigns/[id]/assets
 * Get all assets for a specific campaign
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const assets = getCampaignAssets(campaignId);

    // Add public URLs to each asset
    const assetsWithUrls = assets.map((asset) => ({
      ...asset,
      publicUrl: getAssetPublicUrl(asset.id),
      metadata: asset.metadata ? JSON.parse(asset.metadata) : null,
    }));

    return NextResponse.json(
      successResponse(assetsWithUrls, 'Campaign assets retrieved successfully')
    );
  } catch (error) {
    console.error('Error fetching campaign assets:', error);
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : 'Failed to fetch campaign assets',
        'FETCH_ERROR'
      ),
      { status: 500 }
    );
  }
}
