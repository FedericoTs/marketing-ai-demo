/**
 * API endpoint to get calls for a specific campaign
 * GET /api/campaigns/[id]/calls
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCampaignCalls } from '@/lib/database/call-tracking-queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get calls for this campaign
    const calls = getCampaignCalls(id, 100); // Limit to 100 most recent calls

    return NextResponse.json({
      success: true,
      data: {
        calls,
        total: calls.length,
      },
    });
  } catch (error) {
    console.error('Error fetching campaign calls:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch calls',
      },
      { status: 500 }
    );
  }
}
