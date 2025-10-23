import { NextResponse } from 'next/server';
import {
  getAllTrackingSnippets,
  createTrackingSnippet,
  updateTrackingSnippet,
  deleteTrackingSnippet,
  toggleSnippetActive,
} from '@/lib/database/template-queries';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * GET /api/tracking-snippets
 * Get all tracking snippets
 */
export async function GET() {
  try {
    const snippets = getAllTrackingSnippets();

    return NextResponse.json(
      successResponse(
        {
          snippets,
          count: snippets.length,
        },
        'Tracking snippets retrieved successfully'
      )
    );
  } catch (error) {
    console.error('Error fetching tracking snippets:', error);
    return NextResponse.json(
      errorResponse('Failed to fetch tracking snippets', 'FETCH_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/tracking-snippets
 * Create new tracking snippet
 */
export async function POST(request: Request) {
  try {
    const { name, snippet_type, code, position } = await request.json();

    // Validation
    if (!name || !snippet_type || !code || !position) {
      return NextResponse.json(
        errorResponse('Missing required fields', 'MISSING_FIELDS'),
        { status: 400 }
      );
    }

    if (position !== 'head' && position !== 'body') {
      return NextResponse.json(
        errorResponse('Position must be "head" or "body"', 'INVALID_POSITION'),
        { status: 400 }
      );
    }

    const snippet = createTrackingSnippet(name, snippet_type, code, position);

    return NextResponse.json(
      successResponse(snippet, 'Tracking snippet created successfully')
    );
  } catch (error) {
    console.error('Error creating tracking snippet:', error);
    return NextResponse.json(
      errorResponse('Failed to create tracking snippet', 'CREATE_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tracking-snippets
 * Update or toggle tracking snippet
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, action, updates } = body;

    if (!id) {
      return NextResponse.json(
        errorResponse('Snippet ID is required', 'MISSING_ID'),
        { status: 400 }
      );
    }

    let snippet;

    if (action === 'toggle') {
      snippet = toggleSnippetActive(id);
    } else if (updates) {
      snippet = updateTrackingSnippet(id, updates);
    } else {
      return NextResponse.json(
        errorResponse('Invalid request: provide action or updates', 'INVALID_REQUEST'),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse(snippet, 'Tracking snippet updated successfully')
    );
  } catch (error) {
    console.error('Error updating tracking snippet:', error);
    return NextResponse.json(
      errorResponse('Failed to update tracking snippet', 'UPDATE_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tracking-snippets
 * Delete tracking snippet
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        errorResponse('Snippet ID is required', 'MISSING_ID'),
        { status: 400 }
      );
    }

    deleteTrackingSnippet(id);

    return NextResponse.json(
      successResponse(null, 'Tracking snippet deleted successfully')
    );
  } catch (error) {
    console.error('Error deleting tracking snippet:', error);
    return NextResponse.json(
      errorResponse('Failed to delete tracking snippet', 'DELETE_ERROR'),
      { status: 500 }
    );
  }
}
