import { NextResponse } from 'next/server';
import { bulkCreateRetailStores } from '@/lib/database/retail-queries';

// POST: Bulk import stores from CSV data
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.stores || !Array.isArray(body.stores)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request: stores array is required' },
        { status: 400 }
      );
    }

    if (body.stores.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No stores to import' },
        { status: 400 }
      );
    }

    // Validate total number of stores (soft limit warning, but no hard cap)
    if (body.stores.length > 10000) {
      console.warn(`Large import: ${body.stores.length} stores`);
      // Still proceed, but log for monitoring
    }

    // Import stores
    const result = bulkCreateRetailStores(body.stores);

    return NextResponse.json({
      success: result.errors.length === 0,
      data: {
        created: result.created,
        failed: result.errors.length,
        total: body.stores.length,
      },
      errors: result.errors,
      message: `Successfully imported ${result.created} of ${body.stores.length} stores`,
    });
  } catch (error: any) {
    console.error('Error importing stores:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to import stores' },
      { status: 500 }
    );
  }
}
