/**
 * API Route: /api/assets
 * Handles asset upload (POST) and listing (GET)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';

// ============================================================================
// POST - Upload Asset
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const organizationId = formData.get('organizationId') as string;
    const assetType = formData.get('assetType') as string || 'image';
    const isBrandAsset = formData.get('isBrandAsset') === 'true';

    // Validation
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    // File validation
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} not allowed. Allowed types: ${allowedTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size ${file.size} exceeds maximum of ${maxSize} bytes (10MB)` },
        { status: 400 }
      );
    }

    // Create Supabase server client (with user session)
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Generate unique file ID and path
    const fileId = nanoid();
    const fileExt = file.name.split('.').pop();
    const fileName = `${fileId}.${fileExt}`;
    const storagePath = `${organizationId}/${fileName}`;

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('design-assets')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL (even though bucket is private, we need the path)
    const { data: urlData } = supabase.storage
      .from('design-assets')
      .getPublicUrl(storagePath);

    // Create database record with correct column names
    const { data: asset, error: insertError } = await supabase
      .from('design_assets')
      .insert({
        organization_id: organizationId,
        uploaded_by: user.id, // Required field
        name: file.name, // NOT file_name
        mime_type: file.type, // NOT file_type
        file_size_bytes: file.size,
        storage_url: storagePath,
        asset_type: assetType,
        is_brand_asset: isBrandAsset,
        status: 'active',
        tags: [],
        source_type: 'upload'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return NextResponse.json(
        { error: `Failed to create asset record: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      asset,
      storageUrl: urlData.publicUrl
    });

  } catch (error) {
    console.error('Asset upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - List Assets
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const assetType = searchParams.get('assetType') || undefined;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId query parameter is required' },
        { status: 400 }
      );
    }

    // Create Supabase server client (with user session)
    const supabase = await createClient();

    // Fetch assets from database using direct query
    let query = supabase
      .from('design_assets')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (assetType && assetType !== 'all') {
      query = query.eq('asset_type', assetType);
    }

    const { data: assets, error: fetchError } = await query;

    if (fetchError) {
      console.error('Asset fetch error:', fetchError);
      return NextResponse.json(
        { error: `Failed to fetch assets: ${fetchError.message}` },
        { status: 500 }
      );
    }

    const assetsWithUrls = await Promise.all(
      assets.map(async (asset) => {
        // Generate signed URL valid for 1 hour
        const { data: urlData } = await supabase.storage
          .from('design-assets')
          .createSignedUrl(asset.storage_url, 3600);

        return {
          ...asset,
          signedUrl: urlData?.signedUrl || null
        };
      })
    );

    return NextResponse.json({
      success: true,
      assets: assetsWithUrls,
      count: assetsWithUrls.length
    });

  } catch (error) {
    console.error('Asset list error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch assets' },
      { status: 500 }
    );
  }
}
