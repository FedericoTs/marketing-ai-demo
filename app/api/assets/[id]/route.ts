/**
 * API Route: /api/assets/[id]
 * Handles individual asset operations (GET, DELETE)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ============================================================================
// GET - Get Single Asset
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Create Supabase server client
    const supabase = await createClient();

    // Fetch asset from database using direct query
    const { data: asset, error: fetchError } = await supabase
      .from('design_assets')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    const { data: urlData } = await supabase.storage
      .from('design-assets')
      .createSignedUrl(asset.storage_url, 3600); // 1 hour expiry

    return NextResponse.json({
      success: true,
      asset: {
        ...asset,
        signedUrl: urlData?.signedUrl || null
      }
    });

  } catch (error) {
    console.error('Asset fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch asset' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Delete Asset
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Create Supabase server client
    const supabase = await createClient();

    // Fetch asset to get storage path
    const { data: asset, error: fetchError } = await supabase
      .from('design_assets')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('design-assets')
      .remove([asset.storage_url]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
      // Continue with soft delete even if storage deletion fails
    }

    // Soft delete from database
    const { data: deletedAsset, error: deleteError } = await supabase
      .from('design_assets')
      .update({
        deleted_at: new Date().toISOString(),
        status: 'deleted'
      })
      .eq('id', id)
      .select()
      .single();

    if (deleteError) {
      return NextResponse.json(
        { error: `Failed to delete asset: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      asset: deletedAsset,
      message: 'Asset deleted successfully'
    });

  } catch (error) {
    console.error('Asset deletion error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete asset' },
      { status: 500 }
    );
  }
}
