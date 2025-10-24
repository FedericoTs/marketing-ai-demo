import { NextRequest, NextResponse } from 'next/server';
import {
  getCampaignLandingPage,
  getCampaignLandingPageConfig,
  upsertCampaignLandingPage,
  getCampaign,
  type CampaignLandingPageConfig,
} from '@/lib/database/campaign-landing-page-queries';
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

    // Fetch landing page config
    const landingPage = getCampaignLandingPage(campaignId);

    if (!landingPage) {
      console.log('⚠️ [Landing Page API] Landing page not found for campaign:', campaignId);
      return NextResponse.json(
        errorResponse('Landing page not found', 'LANDING_PAGE_NOT_FOUND'),
        { status: 404 }
      );
    }

    console.log('✅ [Landing Page API] Landing page found, template ID:', landingPage.campaign_template_id);

    // Parse and return config
    const config = JSON.parse(landingPage.page_config);

    console.log('✅ [Landing Page API] Returning landing page config');

    return NextResponse.json(
      successResponse(
        {
          ...landingPage,
          page_config: config, // Return parsed config
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
    const landingPage = upsertCampaignLandingPage(campaignId, config, templateId);

    return NextResponse.json(
      successResponse(
        {
          ...landingPage,
          page_config: JSON.parse(landingPage.page_config),
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
    const landingPage = upsertCampaignLandingPage(
      campaignId,
      updatedConfig,
      templateId !== undefined ? templateId : existing.campaign_template_id || undefined
    );

    return NextResponse.json(
      successResponse(
        {
          ...landingPage,
          page_config: JSON.parse(landingPage.page_config),
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
