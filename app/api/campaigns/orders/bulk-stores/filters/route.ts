import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
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

    const supabase = createServiceClient();

    // Get unique regions
    const { data: regionsData, error: regionsError } = await supabase
      .from('retail_stores')
      .select('region')
      .eq('is_active', true)
      .not('region', 'is', null)
      .order('region', { ascending: true });

    if (regionsError) {
      throw new Error(`Failed to fetch regions: ${regionsError.message}`);
    }

    const regions = [...new Set(regionsData?.map(r => r.region).filter(Boolean) || [])];

    // Get unique states (filtered by region if selected)
    let statesQuery = supabase
      .from('retail_stores')
      .select('state')
      .eq('is_active', true)
      .not('state', 'is', null);

    if (region && region !== 'all') {
      statesQuery = statesQuery.eq('region', region);
    }

    const { data: statesData, error: statesError } = await statesQuery.order('state', { ascending: true });

    if (statesError) {
      throw new Error(`Failed to fetch states: ${statesError.message}`);
    }

    const states = [...new Set(statesData?.map(s => s.state).filter(Boolean) || [])];

    // Get unique cities (filtered by region and state if selected)
    let citiesQuery = supabase
      .from('retail_stores')
      .select('city')
      .eq('is_active', true)
      .not('city', 'is', null);

    if (region && region !== 'all') {
      citiesQuery = citiesQuery.eq('region', region);
    }

    if (state && state !== 'all') {
      citiesQuery = citiesQuery.eq('state', state);
    }

    const { data: citiesData, error: citiesError } = await citiesQuery.order('city', { ascending: true });

    if (citiesError) {
      throw new Error(`Failed to fetch cities: ${citiesError.message}`);
    }

    const cities = [...new Set(citiesData?.map(c => c.city).filter(Boolean) || [])];

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
