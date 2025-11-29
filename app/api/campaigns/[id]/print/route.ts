/**
 * Print Submission API Route
 *
 * Submits campaign to PostGrid for production printing
 *
 * POST /api/campaigns/[id]/print
 * - Validates campaign has generated PDFs
 * - Estimates printing costs
 * - Reserves organization credits
 * - Submits to PostGrid API
 * - Tracks print job status
 *
 * Two-phase workflow:
 * 1. Preview: Generate PDFs with /api/campaigns/[id]/generate
 * 2. Print: Submit PDFs to PostGrid with this endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { createPostGridClient } from '@/lib/postgrid/client'
import { createServiceClient } from '@/lib/supabase/server'
import {
  createPrintJob,
  updatePrintJob,
  updatePrintJobStatus,
} from '@/lib/database/print-job-queries'
import { getCampaignById } from '@/lib/database/campaign-supabase-queries'
import { successResponse, errorResponse } from '@/lib/utils/api-response'

// ==================== TYPES ====================

interface PrintRequestBody {
  organizationId: string
  environment?: 'test' | 'live'
  mailType?: 'usps_first_class' | 'usps_standard'
  returnAddress?: {
    firstName?: string
    lastName?: string
    addressLine1: string
    addressLine2?: string
    city: string
    provinceOrState: string
    postalOrZip: string
  }
}

// ==================== POST - Submit Campaign for Printing ====================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()

  try {
    const { id: campaignId } = await params
    const body: PrintRequestBody = await request.json()
    const { organizationId, environment = 'test', mailType = 'usps_first_class', returnAddress } = body

    console.log(`🖨️ [Print] Starting print submission for campaign ${campaignId}`)

    // ==================== STEP 1: Validate Campaign ====================
    const campaign = await getCampaignById(campaignId, organizationId)
    if (!campaign) {
      return NextResponse.json(errorResponse('Campaign not found', 'NOT_FOUND'), { status: 404 })
    }

    if (campaign.status !== 'completed') {
      return NextResponse.json(
        errorResponse('Campaign must be completed (PDFs generated) before printing', 'BAD_REQUEST'),
        { status: 400 }
      )
    }

    // ==================== STEP 2: Get Campaign Recipients ====================
    const supabase = createServiceClient()
    const { data: recipients, error: recipientsError } = await supabase
      .from('campaign_recipients')
      .select('id, recipient_id, personalized_pdf_url, recipients(*)')
      .eq('campaign_id', campaignId)

    if (recipientsError || !recipients || recipients.length === 0) {
      return NextResponse.json(
        errorResponse('No recipients found with generated PDFs', 'NO_RECIPIENTS'),
        { status: 400 }
      )
    }

    console.log(`📋 [Print] Found ${recipients.length} recipients`)

    // ==================== STEP 3: Get Template Info ====================
    const template = campaign.template_id
      ? await supabase
          .from('design_templates')
          .select('format_type')
          .eq('id', campaign.template_id)
          .single()
      : null

    const formatType = template?.data?.format_type || 'postcard_4x6'

    // Map format to PostGrid size (PostGrid uses width x height format)
    const sizeMap: Record<string, '6x4' | '6x9' | '6x11'> = {
      postcard_4x6: '6x4', // 4x6 inch postcard → PostGrid format 6x4
      postcard_6x9: '6x9',
      postcard_6x11: '6x11',
    }
    const postcardSize = sizeMap[formatType] || '6x4'

    // ==================== STEP 4: Estimate Costs ====================
    const postgridClient = createPostGridClient(environment)
    const costEstimate = await postgridClient.estimateCost(postcardSize, recipients.length, mailType)

    console.log(
      `💰 [Print] Estimated cost: $${costEstimate.totalCost} (${recipients.length} × $${costEstimate.costPerPiece})`
    )

    // ==================== STEP 5: Check Credits ====================
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, credits')
      .eq('id', organizationId)
      .single()

    if (orgError || !org) {
      console.error('❌ [Print] Organization not found:', orgError)
      return NextResponse.json(errorResponse('Organization not found', 'ORG_NOT_FOUND'), { status: 404 })
    }

    console.log(`💳 [Print] Organization found: ${org.id}, Credits: $${org.credits}`)

    const creditsNeeded = costEstimate.totalCost
    if (org.credits < creditsNeeded) {
      return NextResponse.json(
        errorResponse(
          `Insufficient credits. Need $${creditsNeeded.toFixed(2)}, have $${org.credits.toFixed(2)}`,
          'INSUFFICIENT_CREDITS'
        ),
        { status: 400 }
      )
    }

    // ==================== STEP 6: Create Print Job ====================
    console.log(`📝 [Print] Creating print job (MVP - created_by set to NULL temporarily)`)

    const printJob = await createPrintJob({
      organizationId,
      campaignId,
      createdBy: null as any, // TODO: Get actual user ID from auth session
      formatType,
      totalRecipients: recipients.length,
      estimatedCostPerPiece: costEstimate.costPerPiece,
      estimatedTotalCost: costEstimate.totalCost,
      apiEnvironment: environment,
      mailType,
    })

    console.log(`📄 [Print] Print job created: ${printJob.id}`)

    // ==================== STEP 7: Reserve Credits ====================
    await updatePrintJob(printJob.id, organizationId, {
      status: 'submitting',
      creditsReserved: creditsNeeded,
    })

    // ==================== STEP 8: Download PDFs and Submit to PostGrid ====================
    const failedRecipients: any[] = []
    const successfulSubmissions: any[] = []

    for (const recipient of recipients) {
      try {
        // Download PDF from Supabase Storage
        if (!recipient.personalized_pdf_url) {
          failedRecipients.push({
            recipient_id: recipient.recipient_id,
            reason: 'No PDF URL',
          })
          continue
        }

        // Parse Supabase signed URL to get storage path
        const urlMatch = recipient.personalized_pdf_url.match(
          /\/storage\/v1\/object\/sign\/([^/]+)\/(.+?)\?/
        )
        if (!urlMatch) {
          failedRecipients.push({
            recipient_id: recipient.recipient_id,
            reason: 'Invalid PDF URL format',
          })
          continue
        }

        const [, bucket, path] = urlMatch
        const { data: pdfData, error: downloadError } = await supabase.storage
          .from(bucket)
          .download(path)

        if (downloadError || !pdfData) {
          failedRecipients.push({
            recipient_id: recipient.recipient_id,
            reason: `PDF download failed: ${downloadError?.message || 'Unknown error'}`,
          })
          continue
        }

        // Convert blob to buffer
        const pdfBuffer = Buffer.from(await pdfData.arrayBuffer())

        // Submit to PostGrid
        // Type assertion for the joined recipient data
        const recipientData = (Array.isArray(recipient.recipients)
          ? recipient.recipients[0]
          : recipient.recipients) as {
            first_name: string;
            last_name: string;
            address_line1: string;
            address_line2?: string;
            city: string;
            state: string;
            zip_code: string;
            country?: string;
          }

        const postcardResponse = await postgridClient.createPostcard({
          to: {
            firstName: recipientData.first_name,
            lastName: recipientData.last_name,
            addressLine1: recipientData.address_line1,
            addressLine2: recipientData.address_line2 || undefined,
            city: recipientData.city,
            provinceOrState: recipientData.state,
            postalOrZip: recipientData.zip_code,
            countryCode: recipientData.country || 'US',
          },
          from: returnAddress,
          size: postcardSize,
          pdf: pdfBuffer,
          mailType,
          description: `Campaign: ${campaign.name} | Recipient: ${recipient.recipient_id}`,
        })

        successfulSubmissions.push({
          recipient_id: recipient.recipient_id,
          postgrid_id: postcardResponse.id,
        })

        console.log(`  ✅ [Print] Submitted for ${recipientData.first_name} ${recipientData.last_name}`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        failedRecipients.push({
          recipient_id: recipient.recipient_id,
          reason: errorMessage,
        })
        console.error(`  ❌ [Print] Failed for recipient ${recipient.recipient_id}:`, errorMessage)
      }
    }

    // ==================== STEP 9: Update Print Job with Results ====================
    const successCount = successfulSubmissions.length
    const failedCount = failedRecipients.length
    const finalStatus: any =
      failedCount === 0
        ? 'submitted'
        : successCount === 0
          ? 'failed'
          : 'partially_failed'

    await updatePrintJob(printJob.id, organizationId, {
      status: finalStatus,
      recipientsSubmitted: successCount,
      recipientsFailed: failedCount,
      failedRecipients,
      submittedAt: new Date().toISOString(),
      postgridResponse: {
        successfulSubmissions,
        totalSubmitted: successCount,
        totalFailed: failedCount,
      },
    })

    // ==================== STEP 10: Charge Credits ====================
    const actualCost = (costEstimate.costPerPiece * successCount)
    await updatePrintJob(printJob.id, organizationId, {
      creditsCharged: actualCost,
      actualCostPerPiece: costEstimate.costPerPiece,
      actualTotalCost: actualCost,
    })

    // Deduct credits from organization
    const { error: creditError } = await supabase
      .from('organizations')
      .update({ credits: org.credits - actualCost })
      .eq('id', organizationId)

    if (creditError) {
      console.error('[Print] Failed to deduct credits:', creditError)
    }

    // Create credit transaction record
    await supabase.from('credit_transactions').insert({
      organization_id: organizationId,
      transaction_type: 'spend',
      amount: -actualCost,
      balance_before: org.credits,
      balance_after: org.credits - actualCost,
      reference_type: 'print_job',
      reference_id: printJob.id,
      description: `PostGrid printing for campaign: ${campaign.name}`,
      metadata: {
        campaign_id: campaignId,
        print_job_id: printJob.id,
        recipients_printed: successCount,
        cost_per_piece: costEstimate.costPerPiece,
      },
    })

    // Track vendor cost for margin analysis
    // PostGrid wholesale cost: $0.85/postcard, User price: $1.00/postcard
    const postgridWholesaleCost = 0.85 * successCount
    const userCharge = actualCost

    await supabase.from('vendor_costs').insert({
      organization_id: organizationId,
      vendor_name: 'postgrid',
      service_type: 'printing',
      cost_amount: postgridWholesaleCost,
      credits_charged: userCharge,
      transaction_id: null, // PostGrid transaction IDs stored in postgridResponse
      internal_reference_id: printJob.id,
      internal_reference_type: 'print_job',
      payment_status: 'pending', // Will be marked 'paid' when PostGrid invoice is processed
      payment_method: environment === 'test' ? 'prepaid_wallet' : 'invoice',
      quantity: successCount,
      unit_cost: 0.85,
      metadata: {
        campaign_id: campaignId,
        campaign_name: campaign.name,
        mail_type: mailType,
        environment,
        cost_per_piece_user: costEstimate.costPerPiece,
      },
    })

    const duration = (Date.now() - startTime) / 1000

    console.log(
      `✅ [Print] Completed: ${successCount} sent, ${failedCount} failed (${duration.toFixed(2)}s)`
    )

    return NextResponse.json(
      successResponse({
        printJobId: printJob.id,
        status: finalStatus,
        totalRecipients: recipients.length,
        successCount,
        failedCount,
        estimatedCost: costEstimate.totalCost,
        actualCost,
        creditsCharged: actualCost,
        remainingCredits: org.credits - actualCost,
        failedRecipients,
        duration,
      })
    )
  } catch (error) {
    console.error('❌ [Print] Fatal error:', error)

    return NextResponse.json(
      errorResponse(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}

// ==================== GET - Get Print Jobs for Campaign ====================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json(errorResponse('organizationId required', 'MISSING_ORG_ID'), { status: 400 })
    }

    const supabase = createServiceClient()
    const { data: printJobs, error } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(errorResponse(error.message, 'DATABASE_ERROR'), { status: 500 })
    }

    return NextResponse.json(successResponse({ printJobs }))
  } catch (error) {
    return NextResponse.json(
      errorResponse(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}
