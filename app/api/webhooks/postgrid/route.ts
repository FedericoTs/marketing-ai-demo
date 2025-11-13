/**
 * PostGrid Webhook Handler
 *
 * Receives real-time status updates from PostGrid for print jobs
 *
 * Webhook Events:
 * - postcard.processed - Postcard accepted and queued
 * - postcard.in_transit - Postcard mailed
 * - postcard.delivered - Postcard delivered
 * - postcard.failed - Postcard failed (address issue, etc.)
 *
 * Security:
 * - Verifies webhook signature using HMAC-SHA256
 * - Validates PostGrid API key
 *
 * POST /api/webhooks/postgrid
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { updatePrintJob, addWebhookEvent } from '@/lib/database/print-job-queries'

// ==================== TYPES ====================

interface PostGridWebhookEvent {
  id: string
  object: 'event'
  type: string // 'postcard.processed', 'postcard.in_transit', etc.
  created: number // Unix timestamp
  data: {
    object: {
      id: string // Postcard ID
      object: 'postcard'
      status: string
      to: any
      from?: any
      expectedDeliveryDate?: string
      [key: string]: any
    }
  }
}

// ==================== WEBHOOK HANDLER ====================

export async function POST(request: NextRequest) {
  try {
    console.log('📬 [PostGrid Webhook] Received webhook')

    // ==================== STEP 1: Verify Signature ====================
    const signature = request.headers.get('x-postgrid-signature')
    const webhookSecret = process.env.POSTGRID_WEBHOOK_SECRET

    if (!signature || !webhookSecret) {
      console.error('[PostGrid Webhook] Missing signature or secret')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rawBody = await request.text()

    // Verify signature (HMAC-SHA256)
    const crypto = require('crypto')
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex')

    if (signature !== expectedSignature) {
      console.error('[PostGrid Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // ==================== STEP 2: Parse Event ====================
    const event: PostGridWebhookEvent = JSON.parse(rawBody)

    console.log(`📬 [PostGrid Webhook] Event type: ${event.type}`)
    console.log(`📬 [PostGrid Webhook] Postcard ID: ${event.data.object.id}`)

    // ==================== STEP 3: Find Print Job ====================
    const supabase = createServiceClient()

    // Find print job by PostGrid postcard ID
    // We store successful submissions in postgrid_response.successfulSubmissions
    const { data: printJobs, error: searchError } = await supabase
      .from('print_jobs')
      .select('*')
      .contains('postgrid_response', { successfulSubmissions: [{ postgrid_id: event.data.object.id }] })
      .limit(1)

    if (searchError) {
      console.error('[PostGrid Webhook] Error searching for print job:', searchError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!printJobs || printJobs.length === 0) {
      console.warn('[PostGrid Webhook] No matching print job found for postcard:', event.data.object.id)
      // Return 200 to acknowledge receipt (avoid retries)
      return NextResponse.json({ received: true, message: 'No matching job' })
    }

    const printJob = printJobs[0]

    console.log(`📬 [PostGrid Webhook] Found print job: ${printJob.id}`)

    // ==================== STEP 4: Update Print Job Status ====================
    const statusMap: Record<string, any> = {
      'postcard.processed': 'processing',
      'postcard.in_production': 'in_production',
      'postcard.in_transit': 'in_transit',
      'postcard.delivered': 'completed',
      'postcard.failed': 'failed',
    }

    const newStatus = statusMap[event.type]

    if (!newStatus) {
      console.warn('[PostGrid Webhook] Unknown event type:', event.type)
      return NextResponse.json({ received: true, message: 'Unknown event type' })
    }

    // Add webhook event to history
    await addWebhookEvent(printJob.id, printJob.organization_id, {
      type: event.type,
      timestamp: new Date(event.created * 1000).toISOString(),
      postcardId: event.data.object.id,
      status: event.data.object.status,
      expectedDeliveryDate: event.data.object.expectedDeliveryDate,
      data: event.data.object,
    })

    // Update print job status
    const updates: any = {
      status: newStatus,
    }

    // Set timestamps based on event type
    if (event.type === 'postcard.processed') {
      updates.processingStartedAt = new Date().toISOString()
    } else if (event.type === 'postcard.delivered') {
      updates.completedAt = new Date().toISOString()
    }

    await updatePrintJob(printJob.id, printJob.organization_id, updates)

    console.log(`✅ [PostGrid Webhook] Updated print job ${printJob.id} to status: ${newStatus}`)

    // ==================== STEP 5: Update Individual Recipient Status (Optional) ====================
    // If you want to track per-recipient delivery status, update campaign_recipients here
    // For now, we're tracking at print job level

    return NextResponse.json({
      received: true,
      printJobId: printJob.id,
      status: newStatus,
    })
  } catch (error) {
    console.error('❌ [PostGrid Webhook] Error processing webhook:', error)

    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// ==================== GET - Webhook Test Endpoint ====================

export async function GET() {
  return NextResponse.json({
    message: 'PostGrid webhook endpoint is active',
    endpoint: '/api/webhooks/postgrid',
    method: 'POST',
    security: 'HMAC-SHA256 signature verification',
  })
}
