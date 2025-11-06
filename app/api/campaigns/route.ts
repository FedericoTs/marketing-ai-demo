import { NextRequest, NextResponse } from 'next/server';
import { getAllCampaigns, createCampaign } from '@/lib/database/campaign-supabase-queries';
import { createServerClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * GET /api/campaigns
 * Get all campaigns with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        errorResponse('Authentication required', 'UNAUTHORIZED'),
        { status: 401 }
      );
    }

    // 2. Get user's organization
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      return NextResponse.json(
        errorResponse('Organization not found', 'NO_ORGANIZATION'),
        { status: 404 }
      );
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('📋 [Campaigns API] GET request', { status, limit, offset, organizationId: userProfile.organization_id });

    // 4. Fetch campaigns with Supabase
    const filters: any = {
      limit,
      offset,
    };

    if (status && status !== 'all') {
      filters.status = status as any;
    }

    const { campaigns, total } = await getAllCampaigns(userProfile.organization_id, filters);

    console.log(`✅ [Campaigns API] Retrieved ${campaigns.length} campaigns (total: ${total})`);

    return NextResponse.json(
      successResponse({
        campaigns,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + campaigns.length < total,
        },
      })
    );
  } catch (error) {
    console.error('❌ [Campaigns API] Error fetching campaigns:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch campaigns';

    return NextResponse.json(
      errorResponse(errorMessage, 'FETCH_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/campaigns
 * Create a new campaign
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        errorResponse('Authentication required', 'UNAUTHORIZED'),
        { status: 401 }
      );
    }

    // 2. Get user's organization
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      return NextResponse.json(
        errorResponse('Organization not found', 'NO_ORGANIZATION'),
        { status: 404 }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const { name, message, designSnapshot, variableMappingsSnapshot, templateId, recipientListId, totalRecipients, status } = body;

    console.log('📝 [Campaigns API] POST request - Creating campaign:', { name, organizationId: userProfile.organization_id });

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        errorResponse('Missing required field: name', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    // 4. Create campaign using Supabase function
    const campaign = await createCampaign({
      organizationId: userProfile.organization_id,
      userId: user.id,
      name,
      description: message || null,
      designSnapshot: designSnapshot || {},
      variableMappingsSnapshot: variableMappingsSnapshot || {},
      templateId: templateId || undefined,
      recipientListId: recipientListId || undefined,
      totalRecipients: totalRecipients || 0,
      status: status || 'draft',
    });

    console.log('✅ [Campaigns API] Campaign created:', campaign.id);

    return NextResponse.json(
      successResponse(campaign)
    );
  } catch (error) {
    console.error('❌ [Campaigns API] Error creating campaign:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to create campaign';

    return NextResponse.json(
      errorResponse(errorMessage, 'CREATE_ERROR'),
      { status: 500 }
    );
  }
}
