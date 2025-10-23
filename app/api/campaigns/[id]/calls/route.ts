/**
 * API endpoint to get calls for a specific campaign
 * GET /api/campaigns/[id]/calls
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCampaignCalls } from '@/lib/database/call-tracking-queries';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get calls for this campaign
    const calls = getCampaignCalls(id, 100); // Limit to 100 most recent calls

    return NextResponse.json(
      successResponse(
        {
          calls,
          total: calls.length,
        },
        'Campaign calls retrieved successfully'
      )
    );
  } catch (error) {
    console.error('Error fetching campaign calls:', error);

    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : 'Failed to fetch calls',
        'FETCH_ERROR'
      ),
      { status: 500 }
    );
  }
}
