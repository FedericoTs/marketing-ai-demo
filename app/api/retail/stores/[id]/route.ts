import { NextResponse } from 'next/server';
import {
  getRetailStoreById,
  updateRetailStore,
  deleteRetailStore,
} from '@/lib/database/retail-queries';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

// GET: Get store by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const store = getRetailStoreById(id);

    if (!store) {
      return NextResponse.json(
        errorResponse('Store not found', 'STORE_NOT_FOUND'),
        { status: 404 }
      );
    }

    return NextResponse.json(
      successResponse(store, 'Store retrieved successfully')
    );
  } catch (error: any) {
    console.error('Error fetching store:', error);
    return NextResponse.json(
      errorResponse(error.message || 'Failed to fetch store', 'FETCH_ERROR'),
      { status: 500 }
    );
  }
}

// PATCH: Update store
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if store exists
    const existingStore = getRetailStoreById(id);
    if (!existingStore) {
      return NextResponse.json(
        errorResponse('Store not found', 'STORE_NOT_FOUND'),
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
        errorResponse('Failed to update store', 'UPDATE_FAILED'),
        { status: 500 }
      );
    }

    // Get updated store
    const updatedStore = getRetailStoreById(id);

    return NextResponse.json(
      successResponse(updatedStore, 'Store updated successfully')
    );
  } catch (error: any) {
    console.error('Error updating store:', error);

    // Check for duplicate store number
    if (error.message && error.message.includes('UNIQUE constraint')) {
      return NextResponse.json(
        errorResponse('Store number already exists', 'DUPLICATE_STORE'),
        { status: 409 }
      );
    }

    return NextResponse.json(
      errorResponse(error.message || 'Failed to update store', 'UPDATE_ERROR'),
      { status: 500 }
    );
  }
}

// DELETE: Delete store
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if store exists
    const store = getRetailStoreById(id);
    if (!store) {
      return NextResponse.json(
        errorResponse('Store not found', 'STORE_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Delete store
    const deleted = deleteRetailStore(id);

    if (!deleted) {
      return NextResponse.json(
        errorResponse('Failed to delete store', 'DELETE_FAILED'),
        { status: 500 }
      );
    }

    return NextResponse.json(
      successResponse(null, `Store "${store.name}" deleted successfully`)
    );
  } catch (error: any) {
    console.error('Error deleting store:', error);
    return NextResponse.json(
      errorResponse(error.message || 'Failed to delete store', 'DELETE_ERROR'),
      { status: 500 }
    );
  }
}
