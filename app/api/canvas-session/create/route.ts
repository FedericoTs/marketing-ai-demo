import { NextRequest, NextResponse } from 'next/server';
import { createCanvasSession } from '@/lib/database/canvas-supabase-queries';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user's organization
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        errorResponse('Unauthorized', 'UNAUTHORIZED'),
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        errorResponse('Profile not found', 'PROFILE_NOT_FOUND'),
        { status: 404 }
      );
    }

    const body = await request.json();

    const {
      campaignId,
      backgroundImage,
      qrCodeDataUrl,
      trackingId,
      landingPageUrl,
      recipientName,
      recipientLastname,
      recipientAddress,
      recipientCity,
      recipientZip,
      message,
      companyName,
      campaignName,
      logoUrl,
      primaryColor,
      textColor,
      canvasWidth,
      canvasHeight,
      phoneNumber,
      dmTemplateId, // NEW: Optional template ID for loading saved designs
    } = body;

    // Validate required fields
    if (!campaignId || !backgroundImage || !qrCodeDataUrl || !trackingId || !landingPageUrl ||
        !recipientName || !recipientLastname || !message || !companyName ||
        !canvasWidth || !canvasHeight || !phoneNumber) {
      return NextResponse.json(
        errorResponse('Missing required fields', 'MISSING_FIELDS'),
        { status: 400 }
      );
    }

    const sessionId = await createCanvasSession({
      campaignId,
      backgroundImage,
      qrCodeDataUrl,
      trackingId,
      landingPageUrl,
      recipientName,
      recipientLastname,
      recipientAddress: recipientAddress || '',
      recipientCity: recipientCity || '',
      recipientZip: recipientZip || '',
      message,
      companyName,
      campaignName,
      logoUrl,
      primaryColor,
      textColor,
      canvasWidth,
      canvasHeight,
      phoneNumber,
      dmTemplateId, // NEW: Pass template ID to session
    }, profile.organization_id);

    console.log(`✅ Canvas session created: ${sessionId}`);

    return NextResponse.json(
      successResponse({ sessionId }, 'Canvas session created successfully')
    );
  } catch (error) {
    console.error('Error creating canvas session:', error);
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : 'Failed to create session',
        'CREATE_ERROR'
      ),
      { status: 500 }
    );
  }
}
