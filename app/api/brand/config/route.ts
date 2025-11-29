import { NextRequest, NextResponse } from 'next/server';
import { getBrandProfile, updateBrandKit } from '@/lib/database/tracking-queries';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * GET /api/brand/config
 * Get active brand configuration (for current company in settings)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyName = searchParams.get('companyName');

    if (!companyName) {
      return NextResponse.json(
        errorResponse('Company name is required', 'MISSING_COMPANY_NAME'),
        { status: 400 }
      );
    }

    const brandProfile = getBrandProfile(companyName);

    if (!brandProfile) {
      // Return default brand config
      return NextResponse.json(
        successResponse(
          {
            companyName,
            primaryColor: '#1E3A8A',
            secondaryColor: '#FF6B35',
            accentColor: '#10B981',
            backgroundColor: '#FFFFFF',
            textColor: '#1F2937',
            headingFont: 'Inter',
            bodyFont: 'Open Sans',
            landingPageTemplate: 'professional',
          },
          'Default brand configuration returned'
        )
      );
    }

    return NextResponse.json(
      successResponse(brandProfile, 'Brand configuration retrieved successfully')
    );
  } catch (error) {
    console.error('Error fetching brand config:', error);
    return NextResponse.json(
      errorResponse('Failed to fetch brand configuration', 'FETCH_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/brand/config
 * Update brand configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      companyName,
      logoUrl,
      logoAssetId,
      primaryColor,
      secondaryColor,
      accentColor,
      backgroundColor,
      textColor,
      headingFont,
      bodyFont,
      landingPageTemplate,
      websiteUrl,
    } = body;

    if (!companyName) {
      return NextResponse.json(
        errorResponse('Company name is required', 'MISSING_COMPANY_NAME'),
        { status: 400 }
      );
    }

    // Update brand kit (map camelCase to snake_case)
    const updatedProfile = updateBrandKit({
      company_name: companyName,
      logo_url: logoUrl,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      accent_color: accentColor,
      heading_font: headingFont,
      body_font: bodyFont,
      landing_page_template: landingPageTemplate,
    });

    if (!updatedProfile) {
      return NextResponse.json(
        errorResponse('Failed to update brand configuration', 'UPDATE_ERROR'),
        { status: 500 }
      );
    }

    return NextResponse.json(
      successResponse(updatedProfile, 'Brand configuration updated successfully')
    );
  } catch (error) {
    console.error('Error updating brand config:', error);
    return NextResponse.json(
      errorResponse('Failed to update brand configuration', 'UPDATE_ERROR'),
      { status: 500 }
    );
  }
}
