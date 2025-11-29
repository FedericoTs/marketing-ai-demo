/**
 * Demo Event Tracking API
 *
 * POST /api/demo/[code]/track
 * Tracks user interactions with demo landing pages.
 *
 * Phase 9.2.15 - Interactive Demo System
 */

import { NextRequest, NextResponse } from 'next/server';
import { trackDemoEvent } from '@/lib/demo/demo-queries';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { event_type, event_data } = body;

    // Validation
    const validTypes = ['qr_scan', 'page_view', 'cta_click', 'form_submit', 'email_open'];
    if (!event_type || !validTypes.includes(event_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid event type' },
        { status: 400 }
      );
    }

    // Get metadata
    const user_agent = request.headers.get('user-agent') || undefined;
    const referrer = request.headers.get('referer') || undefined;
    const ip_address = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                       request.headers.get('x-real-ip') ||
                       undefined;

    // Track event
    const success = await trackDemoEvent({
      demo_code: code,
      event_type,
      user_agent,
      ip_address,
      referrer,
      event_data: event_data || {},
    });

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to track event' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[POST /api/demo/[code]/track] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
