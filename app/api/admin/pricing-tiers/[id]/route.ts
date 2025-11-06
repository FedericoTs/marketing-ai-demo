/**
 * API Route: /api/admin/pricing-tiers/[id]
 * PUT - Update pricing tier
 * DELETE - Delete pricing tier
 *
 * Admin-only access (federicosciuca@gmail.com)
 */

import { NextResponse } from 'next/server';
import { requireAdmin, logAdminAction } from '@/lib/auth/admin';
import { createServiceClient } from '@/lib/supabase/server';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin access
    await requireAdmin();

    const { id } = params;
    const body = await request.json();
    const {
      name,
      description,
      minContacts,
      maxContacts,
      costPerContact,
      userCostPerContact,
      isActive,
    } = body;

    // Validation
    if (minContacts !== undefined && minContacts < 0) {
      return NextResponse.json(
        { error: 'minContacts must be >= 0' },
        { status: 400 }
      );
    }

    if (
      minContacts !== undefined &&
      maxContacts !== null &&
      maxContacts !== undefined &&
      maxContacts <= minContacts
    ) {
      return NextResponse.json(
        { error: 'maxContacts must be greater than minContacts' },
        { status: 400 }
      );
    }

    if (
      (costPerContact !== undefined && costPerContact < 0) ||
      (userCostPerContact !== undefined && userCostPerContact < 0)
    ) {
      return NextResponse.json(
        { error: 'Costs must be >= 0' },
        { status: 400 }
      );
    }

    if (
      costPerContact !== undefined &&
      userCostPerContact !== undefined &&
      userCostPerContact < costPerContact
    ) {
      return NextResponse.json(
        { error: 'userCostPerContact must be >= costPerContact (ensure positive margin)' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Build update object
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (minContacts !== undefined) updates.min_contacts = minContacts;
    if (maxContacts !== undefined) updates.max_contacts = maxContacts || null;
    if (costPerContact !== undefined) updates.cost_per_contact = costPerContact;
    if (userCostPerContact !== undefined) updates.user_cost_per_contact = userCostPerContact;
    if (isActive !== undefined) updates.is_active = isActive;

    // Update pricing tier (trigger will validate no overlaps)
    const { data: updatedTier, error } = await supabase
      .from('pricing_tiers')
      .update(updates)
      .eq('id', id)
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

      throw new Error(`Failed to update pricing tier: ${error.message}`);
    }

    if (!updatedTier) {
      return NextResponse.json(
        { error: 'Pricing tier not found' },
        { status: 404 }
      );
    }

    // Log admin action
    await logAdminAction(
      'update_tier',
      'pricing_tier',
      id,
      updates,
      request
    );

    return NextResponse.json({
      success: true,
      tier: updatedTier,
      message: 'Pricing tier updated successfully',
    });

  } catch (error: any) {
    console.error('Error updating pricing tier:', error);

    if (error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update pricing tier', message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin access
    await requireAdmin();

    const { id } = params;
    const supabase = createServiceClient();

    // Get tier info before deleting for audit log
    const { data: tier } = await supabase
      .from('pricing_tiers')
      .select('name, min_contacts, max_contacts')
      .eq('id', id)
      .single();

    // Delete pricing tier
    const { error } = await supabase
      .from('pricing_tiers')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete pricing tier: ${error.message}`);
    }

    // Log admin action
    await logAdminAction(
      'delete_tier',
      'pricing_tier',
      id,
      tier || {},
      request
    );

    return NextResponse.json({
      success: true,
      message: 'Pricing tier deleted successfully',
    });

  } catch (error: any) {
    console.error('Error deleting pricing tier:', error);

    if (error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete pricing tier', message: error.message },
      { status: 500 }
    );
  }
}
