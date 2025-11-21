/**
 * Demo Analytics API
 *
 * GET /api/demo/analytics
 * Returns aggregate analytics across all demo submissions.
 *
 * Phase 9.2.15 - Interactive Demo System
 */

import { NextResponse } from 'next/server';
import { getDemoAnalytics } from '@/lib/demo/demo-queries';

export async function GET() {
  try {
    const analytics = await getDemoAnalytics();

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('[GET /api/demo/analytics] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
