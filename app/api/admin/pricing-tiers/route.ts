/**
 * API Route: /api/admin/pricing-tiers
 * GET - List all pricing tiers
 * POST - Create new pricing tier
 *
 * Admin-only access (federicosciuca@gmail.com)
 */

import { NextResponse } from 'next/server';
import { requireAdmin, logAdminAction } from '@/lib/auth/admin';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    // Verify admin access
    await requireAdmin();
  } catch (error: any) {
    const isForbidden = error.message?.includes('FORBIDDEN');
    return NextResponse.json(
      { error: error.message || 'Authentication required' },
      { status: isForbidden ? 403 : 401 }
    );
  }

  try {
    const supabase = createServiceClient();

    // Get all pricing tiers (including inactive for admin view)
    const { data: tiers, error } = await supabase
      .from('pricing_tiers')
      .select('*')
      .order('min_contacts', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch pricing tiers: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      tiers: tiers || [],
    });

  } catch (error: any) {
    console.error('Error fetching pricing tiers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing tiers', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Verify admin access
    await requireAdmin();
  } catch (error: any) {
    const isForbidden = error.message?.includes('FORBIDDEN');
    return NextResponse.json(
      { error: error.message || 'Authentication required' },
      { status: isForbidden ? 403 : 401 }
    );
  }

  try {
    const body = await request.json();
    const {
      name,
      description,
      minContacts,
      maxContacts,
      costPerContact,
      userCostPerContact,
      isActive = true,
    } = body;

    // Validation
    if (!name || minContacts === undefined || costPerContact === undefined || userCostPerContact === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, minContacts, costPerContact, userCostPerContact' },
        { status: 400 }
      );
    }

    if (minContacts < 0) {
      return NextResponse.json(
        { error: 'minContacts must be >= 0' },
        { status: 400 }
      );
    }

    if (maxContacts !== null && maxContacts !== undefined && maxContacts <= minContacts) {
      return NextResponse.json(
        { error: 'maxContacts must be greater than minContacts' },
        { status: 400 }
      );
    }

    if (costPerContact < 0 || userCostPerContact < 0) {
      return NextResponse.json(
        { error: 'Costs must be >= 0' },
        { status: 400 }
      );
    }

    if (userCostPerContact < costPerContact) {
      return NextResponse.json(
        { error: 'userCostPerContact must be >= costPerContact (ensure positive margin)' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Insert new pricing tier (trigger will validate no overlaps)
    const { data: newTier, error } = await supabase
      .from('pricing_tiers')
      .insert({
        name,
        description: description || null,
        min_contacts: minContacts,
        max_contacts: maxContacts || null,
        cost_per_contact: costPerContact,
        user_cost_per_contact: userCostPerContact,
        is_active: isActive,
      })
      .select()
      .single();

    if (error) {
      // Check for overlap error from trigger
      if (error.message?.includes('overlaps')) {
        return NextResponse.json(
          { error: 'Pricing tier range overlaps with existing tier' },
          { status: 409 }
        );
      }

      throw new Error(`Failed to create pricing tier: ${error.message}`);
    }

    // Log admin action
    await logAdminAction(
      'create_tier',
      'pricing_tier',
      newTier.id,
      { name, minContacts, maxContacts, costPerContact, userCostPerContact },
      request
    );

    return NextResponse.json({
      success: true,
      tier: newTier,
      message: 'Pricing tier created successfully',
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating pricing tier:', error);
    return NextResponse.json(
      { error: 'Failed to create pricing tier', message: error.message },
      { status: 500 }
    );
  }
}
