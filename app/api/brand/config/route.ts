import { NextRequest, NextResponse } from 'next/server';
import { getBrandProfile, updateBrandKit } from '@/lib/database/tracking-queries';

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
        { success: false, error: 'Company name is required' },
        { status: 400 }
      );
    }

    const brandProfile = getBrandProfile(companyName);

    if (!brandProfile) {
      // Return default brand config
      return NextResponse.json({
        success: true,
        data: {
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
      });
    }

    return NextResponse.json({
      success: true,
      data: brandProfile,
    });
  } catch (error) {
    console.error('Error fetching brand config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch brand configuration' },
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
        { success: false, error: 'Company name is required' },
        { status: 400 }
      );
    }

    // Update brand kit
    const updatedProfile = updateBrandKit({
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
    });

    if (!updatedProfile) {
      return NextResponse.json(
        { success: false, error: 'Failed to update brand configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedProfile,
      message: 'Brand configuration updated successfully',
    });
  } catch (error) {
    console.error('Error updating brand config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update brand configuration' },
      { status: 500 }
    );
  }
}
