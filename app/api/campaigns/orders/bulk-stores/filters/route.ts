import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/connection';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * POST /api/campaigns/orders/bulk-stores/filters
 * Get available filter options (regions, states, cities) with cascading support
 * Used to populate dropdowns in bulk selection UI
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { region, state } = body;

    console.log('🔍 [Bulk Stores Filters API] POST request', { region, state });

    const db = getDatabase();

    // Build WHERE clause for cascading filters
    const whereClauses: string[] = ['is_active = 1'];
    const params: any[] = [];

    if (region && region !== 'all') {
      whereClauses.push('region = ?');
      params.push(region);
    }

    if (state && state !== 'all') {
      whereClauses.push('state = ?');
      params.push(state);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Get unique regions
    const regionsQuery = `
      SELECT DISTINCT region
      FROM retail_stores
      WHERE region IS NOT NULL AND is_active = 1
      ORDER BY region ASC
    `;
    const regions = (db.prepare(regionsQuery).all() as Array<{ region: string }>).map(
      (r) => r.region
    );

    // Get unique states (filtered by region if selected)
    let statesQuery = `
      SELECT DISTINCT state
      FROM retail_stores
      WHERE state IS NOT NULL AND is_active = 1
    `;
    let statesParams: any[] = [];

    if (region && region !== 'all') {
      statesQuery += ' AND region = ?';
      statesParams.push(region);
    }

    statesQuery += ' ORDER BY state ASC';

    const states = (
      db.prepare(statesQuery).all(...statesParams) as Array<{ state: string }>
    ).map((s) => s.state);

    // Get unique cities (filtered by region and state if selected)
    let citiesQuery = `
      SELECT DISTINCT city
      FROM retail_stores
      WHERE city IS NOT NULL AND is_active = 1
    `;
    let citiesParams: any[] = [];

    if (region && region !== 'all') {
      citiesQuery += ' AND region = ?';
      citiesParams.push(region);
    }

    if (state && state !== 'all') {
      citiesQuery += ' AND state = ?';
      citiesParams.push(state);
    }

    citiesQuery += ' ORDER BY city ASC';

    const cities = (db.prepare(citiesQuery).all(...citiesParams) as Array<{ city: string }>).map(
      (c) => c.city
    );

    console.log(`✅ [Bulk Stores Filters API] Filters:`, {
      regions: regions.length,
      states: states.length,
      cities: cities.length,
    });

    return NextResponse.json(
      successResponse({
        regions,
        states,
        cities,
      })
    );
  } catch (error) {
    console.error('❌ [Bulk Stores Filters API] Error fetching filters:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch filters';

    return NextResponse.json(errorResponse(errorMessage, 'FETCH_ERROR'), { status: 500 });
  }
}
