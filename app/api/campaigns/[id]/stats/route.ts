/**
 * Campaign Stats API
 * GET /api/campaigns/[id]/stats
 *
 * Returns campaign statistics including generated PDF count
 * Server-side only, bypasses RLS
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { successResponse, errorResponse } from '@/lib/utils/api-response'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params

    console.log('📊 [Campaign Stats] Fetching stats for campaign:', campaignId)

    const supabase = createServiceClient()

    // Get campaign basic info
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name, status, total_recipients, organization_id')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      console.error('❌ [Campaign Stats] Campaign not found:', campaignError)
      return NextResponse.json(
        errorResponse('Campaign not found', 'NOT_FOUND'),
        { status: 404 }
      )
    }

    // Count generated PDFs (those with personalized_pdf_url)
    const { count: generatedCount, error: countError } = await supabase
      .from('campaign_recipients')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .not('personalized_pdf_url', 'is', null)

    if (countError) {
      console.error('❌ [Campaign Stats] Failed to count PDFs:', countError)
      // Don't fail completely, just return 0
    }

    const stats = {
      campaignId: campaign.id,
      campaignName: campaign.name,
      status: campaign.status,
      totalRecipients: campaign.total_recipients || 0,
      generatedCount: generatedCount || 0,
      organizationId: campaign.organization_id,
    }

    console.log('✅ [Campaign Stats] Stats loaded:', stats)

    return NextResponse.json(successResponse(stats))
  } catch (error) {
    console.error('❌ [Campaign Stats] Unexpected error:', error)
    return NextResponse.json(
      errorResponse('Failed to load stats', 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}
