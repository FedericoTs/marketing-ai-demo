import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getConversionTypeForTemplate } from '@/lib/template-conversion-mapper';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * POST /api/landing-page/submit
 * Handle form submissions from campaign landing pages
 *
 * NOW SUPPORTS CTA-ALIGNED TRACKING:
 * - Uses templateId to determine correct conversion_type
 * - Tracks appointments as 'appointment_booked'
 * - Tracks downloads as 'download'
 * - Falls back to 'form_submission' for unknown templates
 *
 * Supports both:
 * - Personalized submissions (with tracking_id)
 * - Generic submissions (campaign-level only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaign_id, tracking_id, mode, formData, templateId } = body as {
      campaign_id: string;
      tracking_id?: string;
      mode: 'personalized' | 'generic';
      templateId?: string; // Template ID for CTA-aligned tracking
      formData: {
        name: string;
        email: string;
        phone: string;
        preferredDate?: string;
        message?: string;
      };
    };

    // Validate required fields
    if (!campaign_id || !formData.name || !formData.email || !formData.phone) {
      return NextResponse.json(
        errorResponse('Missing required fields', 'MISSING_FIELDS'),
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const now = new Date().toISOString();

    // Determine conversion type based on template CTA
    // This enables accurate analytics differentiation between:
    // - Appointments ('appointment_booked')
    // - Downloads ('download')
    // - Generic forms ('form_submission')
    const conversionType = getConversionTypeForTemplate(templateId);

    console.log(`[Landing Page Submit] Campaign: ${campaign_id}, Template: ${templateId || 'none'}, Conversion Type: ${conversionType}`);

    if (mode === 'personalized' && tracking_id) {
      // Personalized submission - create conversion record
      const { error } = await supabase
        .from('conversions')
        .insert({
          id: submissionId,
          tracking_id,
          conversion_type: conversionType,
          conversion_data: formData,
          created_at: now
        });

      if (error) {
        throw new Error(`Failed to record conversion: ${error.message}`);
      }

      console.log(`✅ Personalized ${conversionType} recorded for tracking_id: ${tracking_id}`);
    } else {
      // Generic submission - log for now (could create a generic submissions table in future)
      console.log(`✅ Generic ${conversionType} for campaign ${campaign_id}:`, formData);
      // TODO: Create generic_submissions table for campaign-level tracking
    }

    return NextResponse.json(
      successResponse(
        { submissionId },
        'Form submitted successfully'
      )
    );
  } catch (error) {
    console.error('Error submitting form:', error);
    return NextResponse.json(
      errorResponse('Failed to submit form', 'SUBMISSION_ERROR'),
      { status: 500 }
    );
  }
}
