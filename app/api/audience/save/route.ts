/**
 * API Route: /api/audience/save
 * POST - Save audience filter to database
 *
 * Creates a saved audience segment that can be reused across campaigns
 * Stores filter criteria + cached count/cost data
 */

import { NextResponse } from 'next/server';
import { createAudience, updateAudience } from '@/lib/database/audience-queries';
import type { AudienceFilters } from '@/lib/audience';

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const {
      audienceId,
      organizationId,
      userId,
      name,
      description,
      tags,
      filters,
      lastCount,
      lastEstimatedCost,
      lastUserCharge,
    } = body;

    // Validate required fields for new audience
    if (!audienceId) {
      if (!organizationId || !userId || !name || !filters) {
        return NextResponse.json(
          {
            error: 'Missing required fields',
            required: ['organizationId', 'userId', 'name', 'filters']
          },
          { status: 400 }
        );
      }
    }

    // Update existing audience
    if (audienceId) {
      const updated = await updateAudience(audienceId, {
        name,
        description,
        tags,
        filters: filters as AudienceFilters,
        lastCount,
        lastEstimatedCost,
        lastUserCharge,
      });

      return NextResponse.json({
        success: true,
        audience: updated,
        message: 'Audience updated successfully'
      });
    }

    // Create new audience
    const created = await createAudience({
      organizationId,
      createdBy: userId,
      name,
      description,
      tags,
      filters: filters as AudienceFilters,
      lastCount,
      lastEstimatedCost,
      lastUserCharge,
    });

    return NextResponse.json({
      success: true,
      audience: created,
      message: 'Audience saved successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error saving audience:', error);

    // Handle Supabase RLS policy violations
    if (error.message?.includes('policy')) {
      return NextResponse.json(
        {
          error: 'Permission denied',
          message: 'You do not have permission to perform this action'
        },
        { status: 403 }
      );
    }

    // Handle duplicate name errors
    if (error.message?.includes('unique') || error.code === '23505') {
      return NextResponse.json(
        {
          error: 'Duplicate name',
          message: 'An audience with this name already exists in your organization'
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to save audience',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Method not allowed
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}
