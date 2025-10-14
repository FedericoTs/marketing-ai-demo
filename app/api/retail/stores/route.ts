import { NextResponse } from 'next/server';
import {
  getRetailStores,
  createRetailStore,
  getRetailRegions,
  getRetailStates,
  getRetailStoreCount,
} from '@/lib/database/retail-queries';

// GET: List stores with pagination and filtering
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    const search = searchParams.get('search') || '';
    const region = searchParams.get('region') || undefined;
    const state = searchParams.get('state') || undefined;
    const isActiveParam = searchParams.get('isActive');
    const isActive = isActiveParam === 'true' ? true : isActiveParam === 'false' ? false : undefined;
    const sortBy = (searchParams.get('sortBy') as any) || 'store_number';
    const sortOrder = (searchParams.get('sortOrder') as 'ASC' | 'DESC') || 'ASC';

    // Validate pagination parameters
    if (page < 1) {
      return NextResponse.json(
        { success: false, error: 'Page must be >= 1' },
        { status: 400 }
      );
    }

    if (pageSize < 1 || pageSize > 1000) {
      return NextResponse.json(
        { success: false, error: 'Page size must be between 1 and 1000' },
        { status: 400 }
      );
    }

    // Get paginated stores
    const result = getRetailStores({
      page,
      pageSize,
      search,
      region,
      state,
      isActive,
      sortBy,
      sortOrder,
    });

    // Get filter options
    const regions = getRetailRegions();
    const states = getRetailStates();
    const totalCount = getRetailStoreCount();

    return NextResponse.json({
      success: true,
      data: result,
      filters: {
        regions,
        states,
      },
      meta: {
        totalStores: totalCount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching stores:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch stores' },
      { status: 500 }
    );
  }
}

// POST: Create a new store
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.storeNumber || !body.name) {
      return NextResponse.json(
        { success: false, error: 'Store number and name are required' },
        { status: 400 }
      );
    }

    // Create store
    const store = createRetailStore({
      storeNumber: body.storeNumber,
      name: body.name,
      address: body.address,
      city: body.city,
      state: body.state,
      zip: body.zip,
      region: body.region,
      district: body.district,
      sizeCategory: body.sizeCategory,
      demographicProfile: body.demographicProfile,
      lat: body.lat ? parseFloat(body.lat) : undefined,
      lng: body.lng ? parseFloat(body.lng) : undefined,
      timezone: body.timezone,
    });

    return NextResponse.json({
      success: true,
      data: store,
      message: 'Store created successfully',
    });
  } catch (error: any) {
    console.error('Error creating store:', error);

    // Check for duplicate store number
    if (error.message && error.message.includes('UNIQUE constraint')) {
      return NextResponse.json(
        { success: false, error: 'Store number already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create store' },
      { status: 500 }
    );
  }
}
