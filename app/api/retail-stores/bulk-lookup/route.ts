import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * POST /api/retail-stores/bulk-lookup
 * Look up multiple stores by store numbers
 * Used for CSV upload validation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeNumbers } = body;

    if (!Array.isArray(storeNumbers) || storeNumbers.length === 0) {
      return NextResponse.json(
        errorResponse('storeNumbers array is required', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    console.log('🔍 [Bulk Lookup API] Looking up', storeNumbers.length, 'stores');

    const supabase = createServiceClient();

    const { data: stores, error } = await supabase
      .from('retail_stores')
      .select('id, store_number, name, city, state, region, address')
      .in('store_number', storeNumbers)
      .eq('is_active', true)
      .order('store_number', { ascending: true });

    if (error) {
      throw new Error(`Failed to lookup stores: ${error.message}`);
    }

    console.log(`✅ [Bulk Lookup API] Found ${stores?.length || 0} stores`);

    // Return matched stores and identify not found
    const foundStoreNumbers = new Set(
      (stores || []).map((s) => s.store_number)
    );
    const notFound = storeNumbers.filter((num: string) => !foundStoreNumbers.has(num));

    return NextResponse.json(
      successResponse({
        stores: stores || [],
        notFound,
        summary: {
          requested: storeNumbers.length,
          found: stores?.length || 0,
          notFound: notFound.length,
        },
      })
    );
  } catch (error) {
    console.error('❌ [Bulk Lookup API] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to lookup stores';

    return NextResponse.json(errorResponse(errorMessage, 'LOOKUP_ERROR'), { status: 500 });
  }
}
