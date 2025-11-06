/**
 * API Route: /api/audience/count
 * POST - Get audience count from Data Axle (FREE preview)
 *
 * Uses Data Axle Insights API to get count without charging
 * Returns count + cost estimates for decision making
 */

import { NextResponse } from 'next/server';
import { getDataAxleClient } from '@/lib/audience';
import type { AudienceFilters } from '@/lib/audience';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Helper: Get pricing tier for a given contact count
 */
async function getPricingForCount(count: number): Promise<{
  costPerContact: number;
  userCostPerContact: number;
  tierName?: string;
}> {
  try {
    const supabase = await createServerClient();

    // Call database function to get applicable pricing tier
    const { data, error } = await supabase
      .rpc('get_pricing_for_count', { contact_count: count });

    if (error || !data || data.length === 0) {
      // Fallback to default if no tier found
      console.warn('No pricing tier found for count:', count, error);
      return {
        costPerContact: 0.15,
        userCostPerContact: 0.25,
      };
    }

    const tier = data[0];
    return {
      costPerContact: Number(tier.cost_per_contact),
      userCostPerContact: Number(tier.user_cost_per_contact),
      tierName: tier.tier_name,
    };
  } catch (error) {
    console.error('Error fetching pricing tier:', error);
    // Fallback to default
    return {
      costPerContact: 0.15,
      userCostPerContact: 0.25,
    };
  }
}

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { filters } = body as { filters: AudienceFilters };

    // Validate filters
    if (!filters || typeof filters !== 'object') {
      return NextResponse.json(
        { error: 'Invalid filters provided' },
        { status: 400 }
      );
    }

    // Check if any filters are set
    const hasFilters = Object.keys(filters).length > 0;
    if (!hasFilters) {
      return NextResponse.json(
        {
          error: 'At least one filter is required',
          hint: 'Add geographic, demographic, financial, or lifestyle filters'
        },
        { status: 400 }
      );
    }

    // Get Data Axle API key from environment
    const apiKey = process.env.DATA_AXLE_API_KEY;
    if (!apiKey) {
      console.error('DATA_AXLE_API_KEY not configured');

      // Return mock data for development with DYNAMIC pricing
      const mockCount = Math.floor(Math.random() * 2000000) + 100000;

      // Get pricing tier for this count
      const pricing = await getPricingForCount(mockCount);

      const estimatedCost = mockCount * pricing.costPerContact;
      const userCharge = mockCount * pricing.userCostPerContact;
      const margin = userCharge - estimatedCost;

      return NextResponse.json({
        count: mockCount,
        estimatedCost: Number(estimatedCost.toFixed(2)),
        userCharge: Number(userCharge.toFixed(2)),
        margin: Number(margin.toFixed(2)),
        costPerContact: Number(pricing.costPerContact.toFixed(2)),
        userCostPerContact: Number(pricing.userCostPerContact.toFixed(2)),
        tierName: pricing.tierName,
        isMockData: true,
        message: 'Using mock data - configure DATA_AXLE_API_KEY for real counts',
      });
    }

    // Get count from Data Axle API first (to know which pricing tier to use)
    const tempClient = getDataAxleClient({
      apiKey,
      costPerContact: 0.15, // Temporary, will recalculate
      userCostPerContact: 0.25,
      enableCache: true,
      cacheTTL: 300,
    });

    const tempResponse = await tempClient.getCount(filters);
    const actualCount = tempResponse.count;

    // Get dynamic pricing for actual count
    const pricing = await getPricingForCount(actualCount);

    // Recalculate costs with dynamic pricing
    const estimatedCost = actualCount * pricing.costPerContact;
    const userCharge = actualCount * pricing.userCostPerContact;
    const margin = userCharge - estimatedCost;

    return NextResponse.json({
      count: actualCount,
      estimatedCost: Number(estimatedCost.toFixed(2)),
      userCharge: Number(userCharge.toFixed(2)),
      margin: Number(margin.toFixed(2)),
      costPerContact: Number(pricing.costPerContact.toFixed(2)),
      userCostPerContact: Number(pricing.userCostPerContact.toFixed(2)),
      tierName: pricing.tierName,
      isMockData: false,
    });

  } catch (error: any) {
    console.error('Error fetching audience count:', error);

    // Handle Data Axle API errors gracefully
    if (error.statusCode) {
      return NextResponse.json(
        {
          error: 'Data Axle API error',
          message: error.message,
          statusCode: error.statusCode
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch audience count',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Method not allowed for other HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}
