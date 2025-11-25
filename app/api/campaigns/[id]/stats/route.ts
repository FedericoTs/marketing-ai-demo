/**
 * Campaign Stats API
 * GET /api/campaigns/[id]/stats
 *
 * Returns campaign statistics including generated PDF count
 * Server-side only, bypasses RLS
 *
 * OPTIMIZATION (Nov 25, 2025): Added 5-second cache to reduce polling overhead
 * - Before: 30 calls/min during generation (every 2 seconds)
 * - After: 12 calls/min (cache reduces by 60%)
 * REVERSIBILITY: Remove cache logic to disable caching
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { successResponse, errorResponse } from '@/lib/utils/api-response'

// OPTIMIZATION: Simple in-memory cache with 5-second TTL
interface CacheEntry {
  data: any
  timestamp: number
}
const statsCache = new Map<string, CacheEntry>()
const CACHE_TTL = 5000 // 5 seconds

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params

    // OPTIMIZATION: Check cache first
    const cached = statsCache.get(campaignId)
    const now = Date.now()
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      console.log(`📊 [Campaign Stats] Cache HIT for ${campaignId} (age: ${Math.round((now - cached.timestamp) / 1000)}s)`)
      return NextResponse.json(successResponse(cached.data))
    }

    console.log('📊 [Campaign Stats] Fetching stats for campaign:', campaignId)

    const supabase = createServiceClient()

    // Get campaign basic info
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name, status, total_recipients, organization_id, created_at')
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
      createdAt: campaign.created_at,
    }

    // OPTIMIZATION: Cache the result for 5 seconds
    statsCache.set(campaignId, {
      data: stats,
      timestamp: Date.now(),
    })

    console.log('✅ [Campaign Stats] Stats loaded and cached:', stats)

    return NextResponse.json(successResponse(stats))
  } catch (error) {
    console.error('❌ [Campaign Stats] Unexpected error:', error)
    return NextResponse.json(
      errorResponse('Failed to load stats', 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}
