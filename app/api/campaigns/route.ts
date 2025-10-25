import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/connection';
import { createCampaign } from '@/lib/database/tracking-queries';
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

/**
 * POST /api/campaigns
 * Create a new campaign
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, message, companyName } = body;

    console.log('📝 [Campaigns API] POST request - Creating campaign:', { name });

    // Validate required fields
    if (!name || !message || !companyName) {
      return NextResponse.json(
        errorResponse('Missing required fields: name, message, companyName', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    // Create campaign using database function
    const campaign = createCampaign({
      name,
      message,
      companyName,
    });

    console.log('✅ [Campaigns API] Campaign created:', campaign.id);

    return NextResponse.json(
      successResponse(campaign)
    );
  } catch (error) {
    console.error('❌ [Campaigns API] Error creating campaign:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to create campaign';

    return NextResponse.json(
      errorResponse(errorMessage, 'CREATE_ERROR'),
      { status: 500 }
    );
  }
}
