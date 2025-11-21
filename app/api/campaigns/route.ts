import { NextRequest, NextResponse } from 'next/server';
import { getAllCampaigns, createCampaign } from '@/lib/database/campaign-supabase-queries';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { createLandingPages } from '@/lib/database/landing-queries';
import { nanoid } from 'nanoid';
import type { LandingPageInsert, LandingPageConfig } from '@/lib/database/types';
import { validateBillingAccess } from '@/lib/server/billing-middleware';

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

    // 4. Fetch campaigns with Supabase
    const filters: any = {
      limit,
      offset,
    };

    if (status && status !== 'all') {
      filters.status = status as any;
    }

    const { campaigns, total } = await getAllCampaigns(userProfile.organization_id, filters);

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

    // 🔐 BILLING CHECK: Validate billing access for campaign creation
    const billingCheck = await validateBillingAccess(supabase, user.id, 'campaigns');
    if (!billingCheck.hasAccess) {
      return NextResponse.json(
        errorResponse(
          billingCheck.error || 'Payment required',
          'PAYMENT_REQUIRED',
          { billingStatus: billingCheck.billingStatus }
        ),
        { status: 402 } // 402 Payment Required
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const {
      name,
      message,
      designSnapshot,
      variableMappingsSnapshot,
      templateId,
      recipientListId,
      totalRecipients,
      status,
      includeLandingPage,
      landingPageConfig
    } = body;

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

    // 5. Generate landing pages if enabled
    if (includeLandingPage && recipientListId && landingPageConfig) {
      try {
        // Fetch recipients from the recipient list
        const supabaseService = createServiceClient();
        const { data: recipients, error: recipientsError } = await supabaseService
          .from('recipients')
          .select('id, first_name, last_name, city, state, zip_code')
          .eq('recipient_list_id', recipientListId)
          .limit(1000); // Safety limit for batch operations

        if (recipientsError) {
          console.error('❌ [Campaigns API] Error fetching recipients:', recipientsError);
        } else if (recipients && recipients.length > 0) {
          // Generate landing pages for each recipient
          const landingPagesToCreate: LandingPageInsert[] = recipients.map((recipient) => {
            // Generate unique tracking code for this recipient
            const trackingCode = nanoid(12);

            return {
              campaign_id: campaign.id,
              tracking_code: trackingCode,
              template_type: landingPageConfig.template_type || 'default',
              page_config: landingPageConfig as LandingPageConfig,
              recipient_data: {
                firstName: recipient.first_name || '',
                lastName: recipient.last_name || '',
                city: recipient.city || '',
                state: recipient.state || '',
                zipCode: recipient.zip_code || '',
              },
              is_active: true,
            };
          });

          // Batch create landing pages
          const createdPages = await createLandingPages(landingPagesToCreate);
        }
      } catch (landingPageError) {
        // Log error but don't fail campaign creation
        console.error('❌ [Campaigns API] Error creating landing pages:', landingPageError);
      }
    }

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
