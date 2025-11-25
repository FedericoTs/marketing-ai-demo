import { NextRequest, NextResponse } from 'next/server'
import { getCampaignRecipients } from '@/lib/database/campaign-supabase-queries'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/campaigns/[id]/recipients
 * Fetch campaign recipients with PDF URLs and landing page links
 *
 * OPTIMIZATION (Nov 25, 2025): Added pagination to prevent loading 1000+ rows
 * Query params:
 * - limit: Number of recipients per page (default: 50, max: 200)
 * - offset: Starting offset (default: 0)
 *
 * REVERSIBILITY: Remove limit/offset params to load all recipients
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const { searchParams } = new URL(request.url)

    // OPTIMIZATION: Pagination parameters (default 50 per page)
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '50'),
      200 // Max 200 to prevent abuse
    )
    const offset = parseInt(searchParams.get('offset') || '0')

    console.log(`📋 [GET /api/campaigns/${campaignId}/recipients] Fetching recipients (limit: ${limit}, offset: ${offset})...`)

    // Fetch campaign recipients with associated recipient data
    const supabase = createServiceClient()

    // OPTIMIZATION: Get total count first (fast with existing index)
    const { count: totalCount, error: countError } = await supabase
      .from('campaign_recipients')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)

    if (countError) {
      throw new Error(`Count query error: ${countError.message}`)
    }

    // OPTIMIZATION: Fetch only requested page with LIMIT/OFFSET
    const { data: campaignRecipients, error } = await supabase
      .from('campaign_recipients')
      .select(`
        id,
        campaign_id,
        recipient_id,
        tracking_code,
        qr_code_url,
        personalized_pdf_url,
        landing_page_url,
        status,
        created_at,
        recipients (
          id,
          first_name,
          last_name,
          email,
          phone,
          address_line1,
          city,
          state,
          zip_code
        )
      `)
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)  // OPTIMIZATION: Pagination

    if (error) {
      throw new Error(`Database query error: ${error.message}`)
    }

    // Transform data for frontend consumption
    const recipients = campaignRecipients.map((cr: any) => ({
      id: cr.id,
      recipientId: cr.recipient_id,
      name: `${cr.recipients.first_name} ${cr.recipients.last_name}`,
      email: cr.recipients.email,
      phone: cr.recipients.phone,
      address: `${cr.recipients.address_line1}, ${cr.recipients.city}, ${cr.recipients.state} ${cr.recipients.zip_code}`,
      trackingCode: cr.tracking_code,
      qrCodeUrl: cr.qr_code_url,
      pdfUrl: cr.personalized_pdf_url,
      landingPageUrl: cr.landing_page_url,
      status: cr.status,
      createdAt: cr.created_at,
    }))

    console.log(`✅ [GET /api/campaigns/${campaignId}/recipients] Found ${recipients.length}/${totalCount} recipients`)

    return NextResponse.json({
      success: true,
      recipients,
      total: totalCount || 0,  // Total count across all pages
      limit,                   // Current page size
      offset,                  // Current offset
      hasMore: offset + limit < (totalCount || 0),  // Whether there are more pages
    })
  } catch (error) {
    console.error('❌ [GET /api/campaigns/[id]/recipients] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch recipients',
      },
      { status: 500 }
    )
  }
}
