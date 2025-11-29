/**
 * Demo Landing Page Data API
 *
 * GET /api/demo/[code]
 * Returns demo submission data for landing page rendering.
 *
 * Phase 9.2.15 - Interactive Demo System
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDemoSubmissionByCode } from '@/lib/demo/demo-queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const submission = await getDemoSubmissionByCode(code);

    if (!submission) {
      return NextResponse.json(
        { success: false, error: 'Demo not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        name: submission.name,
        demo_code: submission.demo_code,
        created_at: submission.created_at,
      },
    });
  } catch (error) {
    console.error('[GET /api/demo/[code]] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
