import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * GET /api/campaigns/orders/bulk-stores
 * Get stores matching geographic filters (region, state, city)
 * Used for bulk store selection in order creation
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region') || 'all';
    const state = searchParams.get('state') || 'all';
    const city = searchParams.get('city') || 'all';
    const isActive = searchParams.get('isActive') !== 'false'; // Default true

    console.log('🔍 [Bulk Stores API] GET request', { region, state, city, isActive });

    const db = createServiceClient();

    // Build WHERE clause dynamically
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (isActive) {
      whereClauses.push('is_active = 1');
    }

    if (region && region !== 'all') {
      whereClauses.push('region = ?');
      params.push(region);
    }

    if (state && state !== 'all') {
      whereClauses.push('state = ?');
      params.push(state);
    }

    if (city && city !== 'all') {
      whereClauses.push('city = ?');
      params.push(city);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Get matching stores
    const query = `
      SELECT id, store_number, name, city, state, region, address
      FROM retail_stores
      ${whereClause}
      ORDER BY region, state, city, store_number
    `;

    const stores = db.prepare(query).all(...params) as Array<{
      id: string;
      store_number: string;
      name: string;
      city: string | null;
      state: string | null;
      region: string | null;
      address: string | null;
    }>;

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM retail_stores ${whereClause}`;
    const countResult = db.prepare(countQuery).get(...params) as { count: number };

    console.log(`✅ [Bulk Stores API] Found ${stores.length} stores matching filters`);

    return NextResponse.json(
      successResponse({
        stores,
        count: countResult.count,
        filters: { region, state, city, isActive },
      })
    );
  } catch (error) {
    console.error('❌ [Bulk Stores API] Error fetching stores:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stores';

    return NextResponse.json(errorResponse(errorMessage, 'FETCH_ERROR'), { status: 500 });
  }
}

