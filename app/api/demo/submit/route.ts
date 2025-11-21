/**
 * Demo Submission API
 *
 * POST /api/demo/submit
 * Creates a demo submission, generates postcard, sends email.
 *
 * Phase 9.2.15 - Interactive Demo System
 */

import { NextRequest, NextResponse } from 'next/server';
import { createDemoSubmission, updateDemoSubmission } from '@/lib/demo/demo-queries';
import { generateDemoPostcardHTML } from '@/lib/demo/postcard-generator';
import { generatePostcardImageBuffer } from '@/lib/demo/postcard-image-generator';
import { sendDemoEmail } from '@/lib/demo/email-sender';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email } = body;

    // Validation
    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Get user agent and IP for analytics
    const user_agent = request.headers.get('user-agent') || undefined;
    const ip_address = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                       request.headers.get('x-real-ip') ||
                       undefined;

    // Create demo submission
    const submission = await createDemoSubmission({
      name,
      email,
      user_agent,
      ip_address,
    });

    if (!submission) {
      return NextResponse.json(
        { success: false, error: 'Failed to create demo submission' },
        { status: 500 }
      );
    }

    // Generate demo URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const demo_url = `${baseUrl}/demo/${submission.demo_code}`;

    // Generate postcard HTML
    const postcardHTML = await generateDemoPostcardHTML({
      name: submission.name,
      demo_code: submission.demo_code,
      qr_url: demo_url,
    });

    // Generate postcard PNG image from HTML (Phase 4: Server-side image generation)
    let postcardImageBuffer: Buffer | undefined;
    try {
      postcardImageBuffer = await generatePostcardImageBuffer(postcardHTML, {
        width: 1200,
        height: 800,
      });
    } catch (error) {
      console.error('[POST /api/demo/submit] Failed to generate PNG, fallback to HTML:', error);
      // Continue without PNG - email will use HTML fallback
    }

    // Send email with PNG attachment (or HTML fallback if PNG generation failed)
    const emailResult = await sendDemoEmail({
      to: submission.email,
      name: submission.name,
      postcardHTML: !postcardImageBuffer ? postcardHTML : undefined, // Only use HTML if PNG failed
      postcardImageBuffer,
      demo_code: submission.demo_code,
      demo_url,
    });

    if (emailResult.success) {
      // Update submission with email sent timestamp
      await updateDemoSubmission(submission.demo_code, {
        email_sent_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        demo_code: submission.demo_code,
        demo_url,
        email_sent: emailResult.success,
      },
    });
  } catch (error) {
    console.error('[POST /api/demo/submit] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
