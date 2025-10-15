import { NextRequest, NextResponse } from 'next/server';
import { getTemplateAssets, getAssetPublicUrl } from '@/lib/database/asset-management';

/**
 * GET /api/campaigns/templates/[id]/assets
 * Get all assets for a specific template
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: templateId } = await params;
    const assets = getTemplateAssets(templateId);

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
    console.error('Error fetching template assets:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch template assets',
      },
      { status: 500 }
    );
  }
}
