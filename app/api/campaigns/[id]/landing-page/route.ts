import { NextRequest, NextResponse } from 'next/server';
import {
  getCampaignLandingPage,
  getCampaignLandingPageConfig,
  upsertCampaignLandingPage,
  getCampaign,
  type CampaignLandingPageConfig,
} from '@/lib/database/campaign-landing-page-queries';
import { createServiceClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * GET /api/campaigns/[id]/landing-page
 * Fetch campaign landing page configuration
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;

    console.log('🔍 [Landing Page API] GET request for campaign:', campaignId);

    // Check if campaign exists
    const campaign = getCampaign(campaignId);
    if (!campaign) {
      console.log('❌ [Landing Page API] Campaign not found:', campaignId);
      return NextResponse.json(
        errorResponse('Campaign not found', 'CAMPAIGN_NOT_FOUND'),
        { status: 404 }
      );
    }

    console.log('✅ [Landing Page API] Campaign found:', campaign.name);

    // Fetch campaign-level landing page config
    let landingPage = getCampaignLandingPage(campaignId);

    if (!landingPage) {
      console.log('⚠️ [Landing Page API] Campaign-level landing page not found, checking recipient-specific landing pages...');

      // Fallback: Check if there are recipient-specific landing pages for this campaign
      const supabase = createServiceClient();

      const { data: recipientLandingPage, error } = await supabase
        .from('landing_pages')
        .select('id, tracking_id, campaign_id, recipient_id, page_data, landing_page_url, created_at')
        .eq('campaign_id', campaignId)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ [Landing Page API] Error fetching recipient landing page:', error);
      }

      if (recipientLandingPage) {
        console.log('✅ [Landing Page API] Found recipient-specific landing page:', recipientLandingPage.id);

        // Convert recipient landing page to campaign landing page format
        const pageData = typeof recipientLandingPage.page_data === 'string'
          ? JSON.parse(recipientLandingPage.page_data)
          : recipientLandingPage.page_data;
        const config = {
          title: `${pageData.companyName || 'Campaign'} - Landing Page`,
          message: pageData.message || '',
          companyName: pageData.companyName || '',
          formFields: ['name', 'email', 'phone'],
          ctaText: 'Get Started',
          thankYouMessage: 'Thank you for your interest!',
          fallbackMessage: 'Welcome!',
          primaryColor: '#00747A',
          secondaryColor: '#63809D',
          accentColor: '#0F2033'
        };

        console.log('✅ [Landing Page API] Returning converted recipient landing page config');

        return NextResponse.json(
          successResponse(
            {
              id: recipientLandingPage.id,
              campaign_id: recipientLandingPage.campaign_id,
              campaign_template_id: null,
              tracking_id: recipientLandingPage.tracking_id,
              page_config: config,
              created_at: recipientLandingPage.created_at,
              updated_at: recipientLandingPage.created_at,
              _source: 'recipient_landing_page'
            },
            'Landing page configuration retrieved from recipient landing page'
          )
        );
      }

      console.log('❌ [Landing Page API] No landing pages found (campaign or recipient level)');
      return NextResponse.json(
        errorResponse('Landing page not found', 'LANDING_PAGE_NOT_FOUND'),
        { status: 404 }
      );
    }

    console.log('✅ [Landing Page API] Campaign-level landing page found, template ID:', landingPage.campaign_template_id);

    // Parse and return config
    const config = JSON.parse(landingPage.page_config);

    console.log('✅ [Landing Page API] Returning campaign-level landing page config');

    return NextResponse.json(
      successResponse(
        {
          ...landingPage,
          page_config: config, // Return parsed config
          _source: 'campaign_landing_page'
        },
        'Landing page configuration retrieved successfully'
      )
    );
  } catch (error) {
    console.error('❌ [Landing Page API] Error fetching campaign landing page:', error);
    return NextResponse.json(
      errorResponse('Failed to fetch landing page', 'FETCH_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/campaigns/[id]/landing-page
 * Create campaign landing page configuration
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;

    // Check if campaign exists
    const campaign = getCampaign(campaignId);
    if (!campaign) {
      return NextResponse.json(
        errorResponse('Campaign not found', 'CAMPAIGN_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { config, templateId } = body as {
      config: CampaignLandingPageConfig;
      templateId?: string;
    };

    // Validate config
    if (!config.title || !config.message || !config.companyName) {
      return NextResponse.json(
        errorResponse(
          'Missing required config fields: title, message, companyName',
          'MISSING_FIELDS'
        ),
        { status: 400 }
      );
    }

    // Create landing page
    const result = await upsertCampaignLandingPage(campaignId, config, templateId);

    if (!result.success || !result.data) {
      return NextResponse.json(
        errorResponse(result.error || 'Failed to create landing page', 'CREATE_ERROR'),
        { status: 500 }
      );
    }

    return NextResponse.json(
      successResponse(
        {
          ...result.data,
          page_config: JSON.parse(result.data.page_config),
        },
        'Landing page created successfully'
      ),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating campaign landing page:', error);
    return NextResponse.json(
      errorResponse('Failed to create landing page', 'CREATE_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/campaigns/[id]/landing-page
 * Update campaign landing page configuration
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;

    // Check if campaign exists
    const campaign = getCampaign(campaignId);
    if (!campaign) {
      return NextResponse.json(
        errorResponse('Campaign not found', 'CAMPAIGN_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Check if landing page exists
    const existing = getCampaignLandingPage(campaignId);
    if (!existing) {
      return NextResponse.json(
        errorResponse(
          'Landing page not found. Use POST to create.',
          'LANDING_PAGE_NOT_FOUND'
        ),
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { config, templateId } = body as {
      config: Partial<CampaignLandingPageConfig>;
      templateId?: string;
    };

    // Merge with existing config
    const existingConfig = JSON.parse(existing.page_config) as CampaignLandingPageConfig;
    const updatedConfig = { ...existingConfig, ...config };

    // Update landing page
    const result = await upsertCampaignLandingPage(
      campaignId,
      updatedConfig,
      templateId !== undefined ? templateId : existing.campaign_template_id || undefined
    );

    if (!result.success || !result.data) {
      return NextResponse.json(
        errorResponse(result.error || 'Failed to update landing page', 'UPDATE_ERROR'),
        { status: 500 }
      );
    }

    return NextResponse.json(
      successResponse(
        {
          ...result.data,
          page_config: JSON.parse(result.data.page_config),
        },
        'Landing page updated successfully'
      )
    );
  } catch (error) {
    console.error('Error updating campaign landing page:', error);
    return NextResponse.json(
      errorResponse('Failed to update landing page', 'UPDATE_ERROR'),
      { status: 500 }
    );
  }
}
