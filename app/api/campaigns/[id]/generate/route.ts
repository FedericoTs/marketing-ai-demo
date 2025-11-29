/**
 * Campaign Generation API Endpoint
 *
 * POST /api/campaigns/[id]/generate
 *
 * Triggers batch VDP processing for entire campaign
 * Generates personalized designs for all recipients
 * Returns immediately and processes in background (Phase 3A: synchronous)
 */

import { NextRequest, NextResponse } from 'next/server'
import { processCampaignBatch } from '@/lib/campaigns/batch-vdp-processor'
import { successResponse, errorResponse } from '@/lib/utils/api-response'

/**
 * Generate campaign designs
 * Phase 3A: Synchronous processing (client-side MVP)
 * Future: Move to background job queue (BullMQ)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params

    console.log('🚀 [Campaign Generate API] Starting generation for campaign:', campaignId)

    // TODO: Get organizationId from authenticated session
    // For now, extract from request body as temporary solution
    let body: any = {}
    try {
      const text = await request.text()
      if (text && text.trim()) {
        body = JSON.parse(text)
      }
    } catch (parseError) {
      console.error('❌ [Campaign Generate API] Failed to parse request body:', parseError)
      return NextResponse.json(
        errorResponse('Invalid request body', 'INVALID_BODY'),
        { status: 400 }
      )
    }

    const organizationId = body.organizationId

    if (!organizationId) {
      return NextResponse.json(
        errorResponse('Organization ID required', 'MISSING_ORG_ID'),
        { status: 400 }
      )
    }

    // Check if campaign is already completed
    const { getCampaignById } = await import('@/lib/database/campaign-supabase-queries')
    const campaign = await getCampaignById(campaignId, organizationId)

    if (campaign?.status === 'completed') {
      console.log('ℹ️ [Campaign Generate API] Campaign already completed, skipping regeneration')

      // Return existing results
      const supabase = await import('@/lib/supabase/server').then(m => m.createServiceClient())
      const { data: recipients } = await supabase
        .from('campaign_recipients')
        .select('id')
        .eq('campaign_id', campaignId)

      return NextResponse.json(
        successResponse({
          campaignId,
          totalRecipients: recipients?.length || 0,
          successCount: recipients?.length || 0,
          failureCount: 0,
          duration: 0,
          errors: [],
          message: 'Campaign already generated'
        })
      )
    }

    // Process campaign batch (synchronous for Phase 3A)
    const result = await processCampaignBatch(campaignId, organizationId)

    if (!result.success) {
      console.error('❌ [Campaign Generate API] Generation failed:', result.errors)

      return NextResponse.json(
        errorResponse(
          `Generation failed: ${result.failureCount} of ${result.totalRecipients} recipients failed`,
          'GENERATION_FAILED'
        ),
        { status: 500 }
      )
    }

    console.log(
      `✅ [Campaign Generate API] Generation complete: ${result.successCount}/${result.totalRecipients} succeeded in ${result.duration}s`
    )

    return NextResponse.json(
      successResponse({
        campaignId,
        totalRecipients: result.totalRecipients,
        successCount: result.successCount,
        failureCount: result.failureCount,
        duration: result.duration,
        errors: result.errors,
      })
    )
  } catch (error) {
    console.error('❌ [Campaign Generate API] Unexpected error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Failed to generate campaign'

    return NextResponse.json(
      errorResponse(errorMessage, 'GENERATION_ERROR'),
      { status: 500 }
    )
  }
}

/**
 * Get generation status (for progress polling)
 * Future enhancement: WebSocket for real-time progress
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params

    // TODO: Implement progress tracking
    // For now, return campaign status from database

    return NextResponse.json(
      successResponse({
        campaignId,
        status: 'not_implemented',
        message: 'Progress tracking coming in Phase 3B with BullMQ',
      })
    )
  } catch (error) {
    console.error('❌ [Campaign Generate API] Error fetching status:', error)

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch generation status'

    return NextResponse.json(
      errorResponse(errorMessage, 'STATUS_ERROR'),
      { status: 500 }
    )
  }
}
