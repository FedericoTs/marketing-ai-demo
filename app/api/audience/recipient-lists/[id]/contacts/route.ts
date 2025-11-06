/**
 * API Route: /api/audience/recipient-lists/[id]/contacts
 * GET - Get paginated contacts for a specific recipient list
 */

import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const search = searchParams.get('search') || '';

    const supabase = await createServerClient();
    const serviceSupabase = createServiceClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Check feature flag for contact details (use service role)
    const { data: orgData } = await serviceSupabase
      .from('organizations')
      .select('feature_flags')
      .eq('id', userProfile.organization_id)
      .single();

    const contactDetailsEnabled = orgData?.feature_flags?.contact_details_enabled !== false;

    if (!contactDetailsEnabled) {
      return NextResponse.json(
        { error: 'Contact details viewing is disabled for your organization' },
        { status: 403 }
      );
    }

    // Verify the recipient list belongs to user's organization (use service role)
    const { data: recipientList, error: listError } = await serviceSupabase
      .from('recipient_lists')
      .select('id, name, organization_id, total_recipients, source, created_at')
      .eq('id', id)
      .eq('organization_id', userProfile.organization_id)
      .single();

    if (listError || !recipientList) {
      return NextResponse.json(
        { error: 'Recipient list not found or access denied' },
        { status: 404 }
      );
    }

    // Calculate pagination
    const offset = (page - 1) * limit;

    // Build query for contacts (use service role)
    let query = serviceSupabase
      .from('recipients')
      .select('*', { count: 'exact' })
      .eq('recipient_list_id', id)
      .eq('organization_id', userProfile.organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Add search filter if provided
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%,state.ilike.%${search}%`);
    }

    const { data: contacts, error: contactsError, count } = await query;

    if (contactsError) {
      console.error('[Contacts API] Error fetching contacts:', contactsError);
      return NextResponse.json(
        { error: 'Failed to fetch contacts', details: contactsError.message },
        { status: 500 }
      );
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      success: true,
      list: recipientList,
      contacts: contacts || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error: any) {
    console.error('[Contacts API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
