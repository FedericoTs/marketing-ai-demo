import { NextRequest, NextResponse } from 'next/server';
import {
  saveAsset,
  getStorageStats,
  cleanupOrphanedAssets,
} from '@/lib/database/asset-management';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * GET /api/campaigns/assets
 * Get storage statistics
 */
export async function GET(request: NextRequest) {
  try {
    const stats = getStorageStats();

    return NextResponse.json(
      successResponse(stats, 'Storage statistics retrieved successfully')
    );
  } catch (error) {
    console.error('Error fetching storage stats:', error);
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : 'Failed to fetch storage statistics',
        'FETCH_ERROR'
      ),
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
        errorResponse('File, asset type, and asset name are required', 'MISSING_FIELDS'),
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

    return NextResponse.json(
      successResponse(asset, 'Asset uploaded successfully')
    );
  } catch (error) {
    console.error('Error uploading asset:', error);
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : 'Failed to upload asset',
        'UPLOAD_ERROR'
      ),
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

    return NextResponse.json(
      successResponse(
        { deletedCount },
        `Cleaned up ${deletedCount} orphaned asset(s)`
      )
    );
  } catch (error) {
    console.error('Error cleaning up assets:', error);
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : 'Failed to clean up assets',
        'CLEANUP_ERROR'
      ),
      { status: 500 }
    );
  }
}
