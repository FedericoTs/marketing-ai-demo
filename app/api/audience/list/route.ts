/**
 * API Route: /api/audience/list
 * GET - List saved audiences for organization
 *
 * Returns all saved audience segments with performance metrics
 * Supports search query parameter
 */

import { NextResponse } from 'next/server';
import { getOrganizationAudiences, searchAudiences } from '@/lib/database/audience-queries';

export async function GET(request: Request) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const searchQuery = searchParams.get('search');

    // Validate organization ID
    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId query parameter is required' },
        { status: 400 }
      );
    }

    // Search or list all
    let audiences;
    if (searchQuery) {
      audiences = await searchAudiences(organizationId, searchQuery);
    } else {
      audiences = await getOrganizationAudiences(organizationId);
    }

    return NextResponse.json({
      success: true,
      audiences,
      count: audiences.length,
    });

  } catch (error: any) {
    console.error('Error listing audiences:', error);

    // Handle RLS policy violations
    if (error.message?.includes('policy')) {
      return NextResponse.json(
        {
          error: 'Permission denied',
          message: 'You do not have permission to view these audiences'
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to list audiences',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Method not allowed
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET.' },
    { status: 405 }
  );
}
