import { NextResponse } from 'next/server';
import {
  getRetailStoreById,
  updateRetailStore,
  deleteRetailStore,
} from '@/lib/database/retail-queries';

// GET: Get store by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const store = getRetailStoreById(id);

    if (!store) {
      return NextResponse.json(
        { success: false, error: 'Store not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: store,
    });
  } catch (error: any) {
    console.error('Error fetching store:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch store' },
      { status: 500 }
    );
  }
}

// PATCH: Update store
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Check if store exists
    const existingStore = getRetailStoreById(id);
    if (!existingStore) {
      return NextResponse.json(
        { success: false, error: 'Store not found' },
        { status: 404 }
      );
    }

    // Update store
    const updated = updateRetailStore(id, {
      store_number: body.storeNumber,
      name: body.name,
      address: body.address,
      city: body.city,
      state: body.state,
      zip: body.zip,
      region: body.region,
      district: body.district,
      size_category: body.sizeCategory,
      demographic_profile: body.demographicProfile ? JSON.stringify(body.demographicProfile) : undefined,
      lat: body.lat ? parseFloat(body.lat) : undefined,
      lng: body.lng ? parseFloat(body.lng) : undefined,
      timezone: body.timezone,
      is_active: body.isActive !== undefined ? (body.isActive ? 1 : 0) : undefined,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Failed to update store' },
        { status: 500 }
      );
    }

    // Get updated store
    const updatedStore = getRetailStoreById(id);

    return NextResponse.json({
      success: true,
      data: updatedStore,
      message: 'Store updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating store:', error);

    // Check for duplicate store number
    if (error.message && error.message.includes('UNIQUE constraint')) {
      return NextResponse.json(
        { success: false, error: 'Store number already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update store' },
      { status: 500 }
    );
  }
}

// DELETE: Delete store
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if store exists
    const store = getRetailStoreById(id);
    if (!store) {
      return NextResponse.json(
        { success: false, error: 'Store not found' },
        { status: 404 }
      );
    }

    // Delete store
    const deleted = deleteRetailStore(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete store' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Store "${store.name}" deleted successfully`,
    });
  } catch (error: any) {
    console.error('Error deleting store:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete store' },
      { status: 500 }
    );
  }
}
