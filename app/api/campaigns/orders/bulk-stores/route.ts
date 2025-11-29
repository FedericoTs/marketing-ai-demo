import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
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

    const supabase = createServiceClient();

    // Build query with filters
    let query = supabase
      .from('retail_stores')
      .select('id, store_number, name, city, state, region, address', { count: 'exact' });

    if (isActive) {
      query = query.eq('is_active', true);
    }

    if (region && region !== 'all') {
      query = query.eq('region', region);
    }

    if (state && state !== 'all') {
      query = query.eq('state', state);
    }

    if (city && city !== 'all') {
      query = query.eq('city', city);
    }

    const { data: stores, count, error } = await query
      .order('region', { ascending: true })
      .order('state', { ascending: true })
      .order('city', { ascending: true })
      .order('store_number', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch stores: ${error.message}`);
    }

    console.log(`✅ [Bulk Stores API] Found ${stores?.length || 0} stores matching filters`);

    return NextResponse.json(
      successResponse({
        stores: stores || [],
        count: count || 0,
        filters: { region, state, city, isActive },
      })
    );
  } catch (error) {
    console.error('❌ [Bulk Stores API] Error fetching stores:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stores';

    return NextResponse.json(errorResponse(errorMessage, 'FETCH_ERROR'), { status: 500 });
  }
}
