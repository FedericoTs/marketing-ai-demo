import { NextRequest, NextResponse } from 'next/server';
import { getCanvasSession } from '@/lib/database/canvas-supabase-queries';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json(
        errorResponse('Session ID is required', 'MISSING_SESSION_ID'),
        { status: 400 }
      );
    }

    const session = await getCanvasSession(sessionId);

    if (!session) {
      return NextResponse.json(
        errorResponse('Session not found', 'SESSION_NOT_FOUND'),
        { status: 404 }
      );
    }

    return NextResponse.json(
      successResponse(session, 'Canvas session retrieved successfully')
    );
  } catch (error) {
    console.error('Error fetching canvas session:', error);
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : 'Failed to fetch session data',
        'FETCH_ERROR'
      ),
      { status: 500 }
    );
  }
}
