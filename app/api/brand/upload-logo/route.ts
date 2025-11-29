import { NextRequest, NextResponse } from 'next/server';
import { saveAsset, getAssetPublicUrl } from '@/lib/database/asset-management';
import { updateBrandKit, getBrandProfile } from '@/lib/database/tracking-queries';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

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
        errorResponse('Logo file is required', 'MISSING_FILE'),
        { status: 400 }
      );
    }

    if (!companyName) {
      return NextResponse.json(
        errorResponse('Company name is required', 'MISSING_COMPANY_NAME'),
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        errorResponse('Invalid file type. Please upload PNG, JPG, SVG, or WebP', 'INVALID_FILE_TYPE'),
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        errorResponse('File size too large. Maximum 5MB allowed', 'FILE_TOO_LARGE'),
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
      brandProfile = saveBrandProfile({ company_name: companyName });
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

    // Update brand profile with logo (map to snake_case)
    const updatedProfile = updateBrandKit({
      company_name: companyName,
      logo_url: logoUrl ?? undefined,
    });

    return NextResponse.json(
      successResponse(
        {
          assetId: asset.id,
          logoUrl,
          brandProfile: updatedProfile,
        },
        'Logo uploaded successfully'
      )
    );
  } catch (error) {
    console.error('Error uploading logo:', error);
    return NextResponse.json(
      errorResponse('Failed to upload logo', 'UPLOAD_ERROR'),
      { status: 500 }
    );
  }
}
