/**
 * API Route: /api/audience/recipient-lists
 * GET - List all recipient lists for the user's organization
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();

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
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Get all recipient lists for the organization
    const { data: recipientLists, error: listsError } = await supabase
      .from('recipient_lists')
      .select(`
        id,
        name,
        description,
        source,
        total_recipients,
        data_axle_filters,
        created_at,
        created_by
      `)
      .eq('organization_id', userProfile.organization_id)
      .order('created_at', { ascending: false });

    if (listsError) {
      console.error('[Recipient Lists API] Error fetching lists:', listsError);
      return NextResponse.json(
        { error: 'Failed to fetch recipient lists', details: listsError.message },
        { status: 500 }
      );
    }

    // Fetch user profiles for the creators
    const creatorIds = recipientLists?.map(list => list.created_by).filter(Boolean) || [];
    let userProfilesMap: Record<string, string> = {};

    if (creatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', creatorIds);

      if (profiles) {
        userProfilesMap = profiles.reduce((acc, profile) => {
          acc[profile.id] = profile.full_name;
          return acc;
        }, {} as Record<string, string>);
      }
    }

    // Get contact purchase info for Data Axle lists
    const listIds = recipientLists?.map(list => list.id) || [];
    let purchaseInfo: Record<string, any> = {};

    if (listIds.length > 0) {
      const { data: purchases } = await supabase
        .from('contact_purchases')
        .select('recipient_list_id, contact_count, total_user_charge, purchased_at')
        .in('recipient_list_id', listIds);

      if (purchases) {
        purchaseInfo = purchases.reduce((acc: Record<string, any>, purchase) => {
          acc[purchase.recipient_list_id] = purchase;
          return acc;
        }, {});
      }
    }

    // Enrich recipient lists with purchase info and creator names
    const enrichedLists = recipientLists?.map(list => ({
      ...list,
      created_by_name: userProfilesMap[list.created_by] || 'Unknown',
      purchase_info: purchaseInfo[list.id] || null,
    }));

    return NextResponse.json({
      success: true,
      lists: enrichedLists || [],
      total: enrichedLists?.length || 0,
    });
  } catch (error: any) {
    console.error('[Recipient Lists API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
