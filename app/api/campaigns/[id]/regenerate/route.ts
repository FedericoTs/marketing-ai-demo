/**
 * Admin endpoint to force campaign regeneration
 * Bypasses auth for testing - DELETE before production
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const supabase = createServiceClient()

    console.log(`🔄 [Admin Regenerate] Resetting campaign: ${campaignId}`)

    // Reset campaign status to draft
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({
        status: 'draft',
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)

    if (updateError) {
      throw new Error(`Failed to reset campaign: ${updateError.message}`)
    }

    // Clear PDF URLs from recipients
    const { error: clearError } = await supabase
      .from('campaign_recipients')
      .update({
        personalized_pdf_url: null,
        personalized_at: null,
      })
      .eq('campaign_id', campaignId)

    if (clearError) {
      throw new Error(`Failed to clear PDFs: ${clearError.message}`)
    }

    console.log(`✅ [Admin Regenerate] Campaign reset to draft, PDFs cleared`)

    return NextResponse.json({
      success: true,
      message: 'Campaign reset to draft. Refresh page and click Generate Campaign.',
      campaignId,
    })
  } catch (error) {
    console.error('❌ [Admin Regenerate] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
