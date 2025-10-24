import { NextRequest, NextResponse } from 'next/server';
import {
  getAllStoreGroups,
  createStoreGroup,
} from '@/lib/database/store-groups-queries';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * GET /api/store-groups
 * Get all store groups
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📋 [Store Groups API] GET all groups');

    const groups = getAllStoreGroups();

    console.log(`✅ [Store Groups API] Retrieved ${groups.length} groups`);

    return NextResponse.json(successResponse({ groups }));
  } catch (error) {
    console.error('❌ [Store Groups API] Error fetching groups:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch store groups';

    return NextResponse.json(errorResponse(errorMessage, 'FETCH_ERROR'), { status: 500 });
  }
}

/**
 * POST /api/store-groups
 * Create a new store group
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    console.log('📋 [Store Groups API] POST create group', { name });

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        errorResponse('Group name is required', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        errorResponse('Group name must be 100 characters or less', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    const group = createStoreGroup({
      name: name.trim(),
      description: description?.trim(),
    });

    console.log(`✅ [Store Groups API] Created group: ${group.id}`);

    return NextResponse.json(successResponse({ group }), { status: 201 });
  } catch (error) {
    console.error('❌ [Store Groups API] Error creating group:', error);

    // Check for unique constraint violation
    const errorMessage = error instanceof Error ? error.message : 'Failed to create store group';
    const isUniqueError = errorMessage.includes('UNIQUE');

    if (isUniqueError) {
      return NextResponse.json(
        errorResponse('A group with this name already exists', 'DUPLICATE_NAME'),
        { status: 409 }
      );
    }

    return NextResponse.json(errorResponse(errorMessage, 'CREATE_ERROR'), { status: 500 });
  }
}
