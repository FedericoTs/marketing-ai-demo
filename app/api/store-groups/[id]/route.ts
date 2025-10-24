import { NextRequest, NextResponse } from 'next/server';
import {
  getStoreGroupWithStores,
  updateStoreGroup,
  deleteStoreGroup,
} from '@/lib/database/store-groups-queries';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * GET /api/store-groups/[id]
 * Get a specific store group with its stores
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('📋 [Store Groups API] GET group:', id);

    const group = getStoreGroupWithStores(id);

    if (!group) {
      return NextResponse.json(errorResponse('Store group not found', 'NOT_FOUND'), {
        status: 404,
      });
    }

    console.log(`✅ [Store Groups API] Retrieved group: ${group.name} (${group.stores.length} stores)`);

    return NextResponse.json(successResponse({ group }));
  } catch (error) {
    console.error('❌ [Store Groups API] Error fetching group:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch store group';

    return NextResponse.json(errorResponse(errorMessage, 'FETCH_ERROR'), { status: 500 });
  }
}

/**
 * PUT /api/store-groups/[id]
 * Update a store group
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description } = body;

    console.log('📋 [Store Groups API] PUT update group:', id);

    // Validation
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          errorResponse('Group name cannot be empty', 'VALIDATION_ERROR'),
          { status: 400 }
        );
      }

      if (name.length > 100) {
        return NextResponse.json(
          errorResponse('Group name must be 100 characters or less', 'VALIDATION_ERROR'),
          { status: 400 }
        );
      }
    }

    const updated = updateStoreGroup(id, {
      name: name?.trim(),
      description: description?.trim(),
    });

    if (!updated) {
      return NextResponse.json(errorResponse('Store group not found', 'NOT_FOUND'), {
        status: 404,
      });
    }

    // Get updated group
    const group = getStoreGroupWithStores(id);

    console.log(`✅ [Store Groups API] Updated group: ${id}`);

    return NextResponse.json(successResponse({ group }));
  } catch (error) {
    console.error('❌ [Store Groups API] Error updating group:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to update store group';
    const isUniqueError = errorMessage.includes('UNIQUE');

    if (isUniqueError) {
      return NextResponse.json(
        errorResponse('A group with this name already exists', 'DUPLICATE_NAME'),
        { status: 409 }
      );
    }

    return NextResponse.json(errorResponse(errorMessage, 'UPDATE_ERROR'), { status: 500 });
  }
}

/**
 * DELETE /api/store-groups/[id]
 * Delete a store group
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('📋 [Store Groups API] DELETE group:', id);

    const deleted = deleteStoreGroup(id);

    if (!deleted) {
      return NextResponse.json(errorResponse('Store group not found', 'NOT_FOUND'), {
        status: 404,
      });
    }

    console.log(`✅ [Store Groups API] Deleted group: ${id}`);

    return NextResponse.json(successResponse({ message: 'Store group deleted successfully' }));
  } catch (error) {
    console.error('❌ [Store Groups API] Error deleting group:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to delete store group';

    return NextResponse.json(errorResponse(errorMessage, 'DELETE_ERROR'), { status: 500 });
  }
}
