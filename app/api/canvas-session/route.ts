import { NextRequest, NextResponse } from 'next/server';
import { getCanvasSession } from '@/lib/database/canvas-queries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const session = getCanvasSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Error fetching canvas session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch session data' },
      { status: 500 }
    );
  }
}
