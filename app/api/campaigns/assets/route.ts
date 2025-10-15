import { NextRequest, NextResponse } from 'next/server';
import {
  saveAsset,
  getStorageStats,
  cleanupOrphanedAssets,
} from '@/lib/database/asset-management';

/**
 * GET /api/campaigns/assets
 * Get storage statistics
 */
export async function GET(request: NextRequest) {
  try {
    const stats = getStorageStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching storage stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch storage statistics',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/campaigns/assets
 * Upload a new asset
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file = formData.get('file') as File;
    const assetType = formData.get('assetType') as string;
    const assetName = formData.get('assetName') as string;
    const campaignId = formData.get('campaignId') as string | null;
    const templateId = formData.get('templateId') as string | null;
    const metadata = formData.get('metadata') as string | null;

    if (!file || !assetType || !assetName) {
      return NextResponse.json(
        {
          success: false,
          error: 'File, asset type, and asset name are required',
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save asset
    const asset = saveAsset({
      assetType: assetType as any,
      assetName,
      fileData: buffer,
      campaignId: campaignId || undefined,
      templateId: templateId || undefined,
      mimeType: file.type,
      metadata: metadata ? JSON.parse(metadata) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: asset,
      message: 'Asset uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading asset:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upload asset',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/campaigns/assets
 * Clean up orphaned assets
 */
export async function DELETE(request: NextRequest) {
  try {
    const deletedCount = cleanupOrphanedAssets();

    return NextResponse.json({
      success: true,
      data: { deletedCount },
      message: `Cleaned up ${deletedCount} orphaned asset(s)`,
    });
  } catch (error) {
    console.error('Error cleaning up assets:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clean up assets',
      },
      { status: 500 }
    );
  }
}
