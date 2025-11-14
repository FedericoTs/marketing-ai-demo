import { NextRequest, NextResponse } from 'next/server'
import { getCampaignRecipients } from '@/lib/database/campaign-supabase-queries'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/campaigns/[id]/recipients
 * Fetch all campaign recipients with PDF URLs and landing page links
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id

    console.log(`📋 [GET /api/campaigns/${campaignId}/recipients] Fetching recipients...`)

    // Fetch campaign recipients with associated recipient data
    const supabase = createServiceClient()

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

    console.log(`✅ [GET /api/campaigns/${campaignId}/recipients] Found ${recipients.length} recipients`)

    return NextResponse.json({
      success: true,
      recipients,
      total: recipients.length,
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
