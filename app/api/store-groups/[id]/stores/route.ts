import { NextRequest, NextResponse } from 'next/server';
import {
  addStoresToGroup,
  removeStoreFromGroup,
  getStoreGroupById,
} from '@/lib/database/store-groups-queries';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * POST /api/store-groups/[id]/stores
 * Add stores to a group
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    const body = await request.json();
    const { storeIds } = body;

    console.log('📋 [Store Groups API] POST add stores to group:', groupId);

    // Validation
    if (!Array.isArray(storeIds) || storeIds.length === 0) {
      return NextResponse.json(
        errorResponse('storeIds array is required and cannot be empty', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    // Check if group exists
    const group = getStoreGroupById(groupId);
    if (!group) {
      return NextResponse.json(errorResponse('Store group not found', 'NOT_FOUND'), {
        status: 404,
      });
    }

    // Add stores
    const result = addStoresToGroup(groupId, storeIds);

    console.log(`✅ [Store Groups API] Added ${result.added} stores to group (${result.skipped} skipped)`);

    return NextResponse.json(
      successResponse({
        message: `Added ${result.added} stores to group`,
        added: result.added,
        skipped: result.skipped,
      })
    );
  } catch (error) {
    console.error('❌ [Store Groups API] Error adding stores to group:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to add stores to group';

    return NextResponse.json(errorResponse(errorMessage, 'ADD_ERROR'), { status: 500 });
  }
}

/**
 * DELETE /api/store-groups/[id]/stores/[storeId]
 * Remove a store from a group
 * (This would need to be implemented as a separate route if needed)
 */
