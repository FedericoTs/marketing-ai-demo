/**
 * Batch VDP Processor
 *
 * Orchestrates the entire campaign generation workflow:
 * 1. Load campaign, template, and recipient data
 * 2. For each recipient: personalize canvas, generate QR, export PDF
 * 3. Upload PDFs to Supabase Storage
 * 4. Save campaign_recipients records with tracking codes
 * 5. Update campaign status and progress
 *
 * Phase 3A: Client-Side MVP (100 recipients max)
 * Uses client-side PDF export for simplicity and speed
 */

import { nanoid } from 'nanoid'
import { personalizeCanvasWithRecipient } from './personalization-engine'
import { convertCanvasToPDF } from '@/lib/pdf/canvas-to-pdf-simple'
import { createServiceClient } from '@/lib/supabase/server'
import type {
  Campaign,
  CampaignRecipient,
  Recipient,
  DesignTemplate,
} from '@/lib/database/types'
import { getFrontSurface, getBackSurface } from '@/lib/database/types'
import {
  getCampaignById,
  updateCampaignStatus,
  createCampaignRecipient,
  createLandingPage,
} from '@/lib/database/campaign-supabase-queries'

// ==================== TYPES ====================

export interface VDPProgress {
  current: number
  total: number
  percentage: number
  currentRecipient: string | null
  status: 'initializing' | 'processing' | 'completed' | 'failed'
  errors: Array<{
    recipientId: string
    recipientName: string
    error: string
  }>
}

export interface VDPResult {
  success: boolean
  campaignId: string
  totalRecipients: number
  successCount: number
  failureCount: number
  errors: VDPProgress['errors']
  duration: number
}

// ==================== HELPERS ====================

/**
 * Load all recipients for a recipient list
 */
async function getRecipientsByListId(recipientListId: string): Promise<Recipient[]> {
  const supabase = createServiceClient()

  const { data: recipients, error } = await supabase
    .from('recipients')
    .select('*')
    .eq('recipient_list_id', recipientListId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('❌ [getRecipientsByListId] Error:', error)
    throw new Error(`Failed to fetch recipients: ${error.message}`)
  }

  return recipients || []
}

/**
 * Load design template by ID
 */
async function getTemplateById(
  templateId: string,
  organizationId: string
): Promise<DesignTemplate | null> {
  const supabase = createServiceClient()

  const { data: template, error } = await supabase
    .from('design_templates')
    .select('*')
    .eq('id', templateId)
    .eq('organization_id', organizationId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    console.error('❌ [getTemplateById] Error:', error)
    throw new Error(`Failed to fetch template: ${error.message}`)
  }

  return template
}

/**
 * Upload PDF blob to Supabase Storage
 */
async function uploadPersonalizedPDF(
  campaignId: string,
  recipientId: string,
  pdfData: Blob | Buffer
): Promise<string> {
  const supabase = createServiceClient()

  const fileName = `${campaignId}/${recipientId}.pdf`

  // Upload to Supabase Storage (accepts both Blob and Buffer)
  const { data, error } = await supabase.storage
    .from('personalized-pdfs')
    .upload(fileName, pdfData, {
      contentType: 'application/pdf',
      cacheControl: '3600',
      upsert: true, // Overwrite if exists
    })

  if (error) {
    console.error('❌ [uploadPersonalizedPDF] Error:', error)
    throw new Error(`Failed to upload PDF: ${error.message}`)
  }

  // Generate signed URL (7-day expiration)
  const { data: signedUrlData } = await supabase.storage
    .from('personalized-pdfs')
    .createSignedUrl(fileName, 604800) // 7 days

  if (!signedUrlData?.signedUrl) {
    throw new Error('Failed to generate signed URL for PDF')
  }

  console.log('✅ [uploadPersonalizedPDF] PDF uploaded:', fileName)
  return signedUrlData.signedUrl
}

// ==================== MAIN PROCESSOR ====================

/**
 * Process entire campaign batch
 * Generates personalized designs for all recipients
 *
 * @param campaignId - Campaign UUID
 * @param organizationId - Organization UUID (for auth verification)
 * @param onProgress - Optional callback for real-time progress updates
 * @returns VDP result summary
 */
export async function processCampaignBatch(
  campaignId: string,
  organizationId: string,
  onProgress?: (progress: VDPProgress) => void
): Promise<VDPResult> {
  const startTime = Date.now()

  const progress: VDPProgress = {
    current: 0,
    total: 0,
    percentage: 0,
    currentRecipient: null,
    status: 'initializing',
    errors: [],
  }

  try {
    console.log('🚀 [processCampaignBatch] Starting batch VDP for campaign:', campaignId)

    // ==================== STEP 1: Load Campaign Data ====================
    onProgress?.({ ...progress, status: 'initializing' })

    const campaign = await getCampaignById(campaignId, organizationId)
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`)
    }

    if (!campaign.recipient_list_id) {
      throw new Error('Campaign has no recipient list')
    }

    if (!campaign.template_id) {
      throw new Error('Campaign has no template')
    }

    console.log('📋 [processCampaignBatch] Campaign loaded:', campaign.name)

    // Update campaign status to 'sending'
    await updateCampaignStatus(campaignId, organizationId, 'sending')

    // ==================== STEP 2: Load Template ====================
    const template = await getTemplateById(campaign.template_id, organizationId)
    if (!template) {
      throw new Error(`Template not found: ${campaign.template_id}`)
    }

    console.log('🎨 [processCampaignBatch] Template loaded:', template.name)

    // Load front and back surfaces from template
    const frontSurface = getFrontSurface(template)
    const backSurface = getBackSurface(template)

    if (!frontSurface) {
      throw new Error('Template has no front surface')
    }

    const frontCanvasJSON = frontSurface.canvas_json
    const backCanvasJSON = backSurface?.canvas_json || null
    const variableMappings = frontSurface.variable_mappings || template.variable_mappings || campaign.variable_mappings_snapshot

    if (backCanvasJSON) {
      console.log('📄 [processCampaignBatch] Template has custom back page ✅')
    } else {
      console.log('📄 [processCampaignBatch] Template uses blank back page (PostGrid address block)')
    }

    // ==================== STEP 3: Load Recipients ====================
    const recipients = await getRecipientsByListId(campaign.recipient_list_id)
    if (recipients.length === 0) {
      throw new Error('No recipients found in list')
    }

    console.log(`👥 [processCampaignBatch] Loaded ${recipients.length} recipients`)

    progress.total = recipients.length
    progress.status = 'processing'
    onProgress?.(progress)

    // ==================== STEP 4: Process Each Recipient ====================
    let successCount = 0
    let failureCount = 0

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i]
      const recipientName = `${recipient.first_name} ${recipient.last_name}`

      progress.current = i + 1
      progress.currentRecipient = recipientName
      progress.percentage = Math.round((progress.current / progress.total) * 100)
      onProgress?.(progress)

      console.log(`  [${i + 1}/${recipients.length}] Processing ${recipientName}...`)

      try {
        // Generate unique tracking code
        const trackingCode = nanoid(12)

        // Generate unique QR code URL for tracking
        const qrCodeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/lp/campaign/${campaignId}?r=${encodeURIComponent(recipient.id)}&t=${trackingCode}`

        // Prepare recipient data
        const recipientData = {
          name: recipient.first_name,
          lastname: recipient.last_name,
          address: recipient.address,
          city: recipient.city,
          zip: recipient.zip_code,
        }

        // Generate personalized PDF (front + back pages)
        const pdfResult = await convertCanvasToPDF(
          frontCanvasJSON,        // Front page canvas
          backCanvasJSON,         // Back page canvas (null = blank for PostGrid)
          recipientData,          // Recipient data for personalization
          template.format_type,   // Format (e.g., 'postcard_4x6')
          `${campaign.name}-${recipient.id}`
        )
        const personalizedPDFBuffer = pdfResult.buffer

        // Upload PDF to Supabase Storage
        const pdfUrl = await uploadPersonalizedPDF(campaignId, recipient.id, personalizedPDFBuffer)

        // Save to campaign_recipients table
        await createCampaignRecipient({
          campaignId,
          recipientId: recipient.id,
          personalizedCanvasJson: frontCanvasJSON, // Store front canvas reference
          trackingCode,
          qrCodeUrl: qrCodeUrl, // Store QR URL for reference
          personalizedPdfUrl: pdfUrl,
          landingPageUrl: `/lp/campaign/${campaignId}?r=${encodeURIComponent(recipient.id)}&t=${trackingCode}`,
        })

        // Create landing page if configured
        if (campaign.description && JSON.parse(campaign.description || '{}').landingPageConfig) {
          const config = JSON.parse(campaign.description).landingPageConfig

          await createLandingPage({
            campaignId,
            trackingCode,
            templateType: config.template_type || 'default',
            pageConfig: config,
            recipientData: {
              firstName: recipient.first_name,
              lastName: recipient.last_name,
              city: recipient.city,
              state: recipient.state,
              zip: recipient.zip_code,
              email: recipient.email || undefined,
              phone: recipient.phone || undefined,
            },
          })
        }

        successCount++
        console.log(`    ✅ Success: ${recipientName}`)
      } catch (error) {
        failureCount++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        console.error(`    ❌ Failed: ${recipientName}`, errorMessage)

        progress.errors.push({
          recipientId: recipient.id,
          recipientName,
          error: errorMessage,
        })
      }
    }

    // ==================== STEP 5: Update Campaign Status ====================
    const finalStatus = failureCount === 0 ? 'completed' : failureCount === recipients.length ? 'failed' : 'completed'

    await updateCampaignStatus(campaignId, organizationId, finalStatus)

    progress.status = 'completed'
    progress.currentRecipient = null
    onProgress?.(progress)

    const duration = (Date.now() - startTime) / 1000

    console.log(`✅ [processCampaignBatch] Batch complete: ${successCount} success, ${failureCount} failures (${duration}s)`)

    return {
      success: failureCount < recipients.length,
      campaignId,
      totalRecipients: recipients.length,
      successCount,
      failureCount,
      errors: progress.errors,
      duration,
    }
  } catch (error) {
    console.error('❌ [processCampaignBatch] Fatal error:', error)

    progress.status = 'failed'
    onProgress?.(progress)

    // Update campaign to failed status
    await updateCampaignStatus(campaignId, organizationId, 'failed')

    const duration = (Date.now() - startTime) / 1000

    return {
      success: false,
      campaignId,
      totalRecipients: progress.total,
      successCount: 0,
      failureCount: progress.total,
      errors: [
        {
          recipientId: 'system',
          recipientName: 'System Error',
          error: error instanceof Error ? error.message : 'Unknown fatal error',
        },
      ],
      duration,
    }
  }
}
