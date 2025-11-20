import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/supabase/server';
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

    const db = createServiceClient();

    // Build IN clause with placeholders
    const placeholders = storeNumbers.map(() => '?').join(',');
    const query = `
      SELECT id, store_number, name, city, state, region, address
      FROM retail_stores
      WHERE store_number IN (${placeholders})
        AND is_active = 1
      ORDER BY store_number
    `;

    const stores = db.prepare(query).all(...storeNumbers);

    console.log(`✅ [Bulk Lookup API] Found ${stores.length} stores`);

    // Return matched stores and identify not found
    const foundStoreNumbers = new Set(
      (stores as Array<{ store_number: string }>).map((s) => s.store_number)
    );
    const notFound = storeNumbers.filter((num) => !foundStoreNumbers.has(num));

    return NextResponse.json(
      successResponse({
        stores,
        notFound,
        summary: {
          requested: storeNumbers.length,
          found: stores.length,
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
