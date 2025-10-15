import { NextRequest, NextResponse } from 'next/server';
import {
  getCampaignAssets,
  getAssetPublicUrl,
} from '@/lib/database/asset-management';

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

    return NextResponse.json({
      success: true,
      data: assetsWithUrls,
    });
  } catch (error) {
    console.error('Error fetching campaign assets:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch campaign assets',
      },
      { status: 500 }
    );
  }
}
