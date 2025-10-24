import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/connection';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * GET /api/campaigns
 * Get all campaigns with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('📋 [Campaigns API] GET request', { status, limit, offset });

    const db = getDatabase();

    // Build query
    let query = 'SELECT * FROM campaigns';
    const params: any[] = [];

    if (status && status !== 'all') {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const campaigns = db.prepare(query).all(...params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM campaigns';
    const countParams: any[] = [];

    if (status && status !== 'all') {
      countQuery += ' WHERE status = ?';
      countParams.push(status);
    }

    const countResult = db.prepare(countQuery).get(...countParams) as { count: number };

    console.log(`✅ [Campaigns API] Retrieved ${campaigns.length} campaigns (total: ${countResult.count})`);

    return NextResponse.json(
      successResponse({
        campaigns,
        pagination: {
          limit,
          offset,
          total: countResult.count,
          hasMore: offset + campaigns.length < countResult.count,
        },
      })
    );
  } catch (error) {
    console.error('❌ [Campaigns API] Error fetching campaigns:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch campaigns';

    return NextResponse.json(
      errorResponse(errorMessage, 'FETCH_ERROR'),
      { status: 500 }
    );
  }
}
