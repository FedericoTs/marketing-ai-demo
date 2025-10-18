import { NextRequest, NextResponse } from 'next/server';
import { saveAsset, getAssetPublicUrl } from '@/lib/database/asset-management';
import { updateBrandKit, getBrandProfile } from '@/lib/database/tracking-queries';

/**
 * POST /api/brand/upload-logo
 * Upload company logo and associate with brand profile
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('logo') as File;
    const companyName = formData.get('companyName') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Logo file is required' },
        { status: 400 }
      );
    }

    if (!companyName) {
      return NextResponse.json(
        { success: false, error: 'Company name is required' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Please upload PNG, JPG, SVG, or WebP' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size too large. Maximum 5MB allowed' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get or create brand profile
    let brandProfile = getBrandProfile(companyName);
    if (!brandProfile) {
      // Create minimal profile if doesn't exist
      const { saveBrandProfile } = await import('@/lib/database/tracking-queries');
      brandProfile = saveBrandProfile({ companyName });
    }

    // Save logo as asset (no templateId - we track via logo_asset_id in brand_profiles)
    const asset = saveAsset({
      assetType: 'logo',
      assetName: `${companyName} - Logo`,
      fileData: buffer,
      mimeType: file.type,
      metadata: {
        originalFilename: file.name,
        uploadedAt: new Date().toISOString(),
        companyName,
        brandProfileId: brandProfile.id,
      },
    });

    // Get public URL for the asset
    const logoUrl = getAssetPublicUrl(asset.id);

    // Update brand profile with logo
    const updatedProfile = updateBrandKit({
      companyName,
      logoUrl: logoUrl ?? undefined,
      logoAssetId: asset.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        assetId: asset.id,
        logoUrl,
        brandProfile: updatedProfile,
      },
      message: 'Logo uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload logo' },
      { status: 500 }
    );
  }
}
