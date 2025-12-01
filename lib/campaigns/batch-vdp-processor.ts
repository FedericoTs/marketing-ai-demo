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
 *
 * PERFORMANCE OPTIMIZATION (Phase 3B):
 * - Parallel PDF generation with controlled concurrency
 * - Vercel: 3 concurrent (memory-safe for 3GB limit)
 * - Local: 5 concurrent (faster with more memory)
 * - Expected speedup: 3-5x (100 PDFs: ~7min → ~1.5-2min)
 */

import { nanoid } from 'nanoid'
import { personalizeCanvasWithRecipient } from './personalization-engine'
import { convertCanvasToPDF } from '@/lib/pdf'
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

// ==================== CONCURRENCY CONFIGURATION ====================

/**
 * PDF generation concurrency limits
 * - Vercel: 3 concurrent (each PDF uses ~500MB peak, 3GB total limit)
 * - Local: 5 concurrent (more memory available)
 */
const PDF_CONCURRENCY = process.env.VERCEL ? 3 : 5

/**
 * Process items in parallel with controlled concurrency
 * Uses chunked batching to avoid memory exhaustion
 */
async function processInParallelChunks<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  concurrency: number,
  onChunkComplete?: (completed: number, total: number) => void
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = []

  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency)
    const chunkPromises = chunk.map((item, chunkIndex) =>
      processor(item, i + chunkIndex)
    )

    const chunkResults = await Promise.allSettled(chunkPromises)
    results.push(...chunkResults)

    // Report progress after each chunk
    onChunkComplete?.(Math.min(i + concurrency, items.length), items.length)
  }

  return results
}

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

    // 🔍 DEBUG: Log template structure
    console.log('🔍 [processCampaignBatch] Template structure:', {
      id: template.id,
      hasSurfaces: !!template.surfaces,
      surfaceCount: template.surfaces?.length || 0,
      surfaceSides: template.surfaces?.map(s => s.side) || [],
      hasLegacyCanvasJSON: !!template.canvas_json,
    })

    // Load front and back surfaces from template
    const frontSurface = getFrontSurface(template)
    const backSurface = getBackSurface(template)

    console.log('🔍 [processCampaignBatch] Surface extraction:', {
      hasFront: !!frontSurface,
      hasBack: !!backSurface,
      frontObjects: frontSurface?.canvas_json?.objects?.length || 0,
      backObjects: backSurface?.canvas_json?.objects?.length || 0,
      frontMappings: Object.keys(frontSurface?.variable_mappings || {}).length,
      backMappings: Object.keys(backSurface?.variable_mappings || {}).length,
    })

    if (!frontSurface) {
      throw new Error('Template has no front surface')
    }

    const frontCanvasJSON = frontSurface.canvas_json
    const backCanvasJSON = backSurface?.canvas_json || null

    // CRITICAL: User-defined mappings from Step 3 MUST take priority!
    // Campaign snapshot contains the manual {variable} → [field] associations
    const variableMappings = campaign.variable_mappings_snapshot
                          || frontSurface.variable_mappings
                          || template.variable_mappings

    // 🔍 DEBUG: Log actual canvas JSON structure
    console.log('🔍 [processCampaignBatch] Front canvas JSON structure:', {
      hasObjects: !!frontCanvasJSON?.objects,
      objectCount: frontCanvasJSON?.objects?.length || 0,
      objectTypes: frontCanvasJSON?.objects?.map((o: any) => o.type) || [],
      firstObject: frontCanvasJSON?.objects?.[0] ? {
        type: frontCanvasJSON.objects[0].type,
        hasText: 'text' in frontCanvasJSON.objects[0],
        text: frontCanvasJSON.objects[0].text || 'NO TEXT PROPERTY',
      } : 'NO OBJECTS',
    })

    // Determine which source was actually used
    let mappingSource = 'none';
    if (campaign.variable_mappings_snapshot) {
      mappingSource = 'campaign_snapshot (user-defined)';
    } else if (frontSurface.variable_mappings) {
      mappingSource = 'front_surface (template metadata)';
    } else if (template.variable_mappings) {
      mappingSource = 'template (legacy)';
    }

    console.log('🔍 [processCampaignBatch] Variable mappings source:', {
      source: mappingSource,
      fromCampaign: !!campaign.variable_mappings_snapshot,
      fromFrontSurface: !!frontSurface.variable_mappings,
      fromTemplate: !!template.variable_mappings,
      mappingCount: Array.isArray(variableMappings) ? variableMappings.length : Object.keys(variableMappings || {}).length,
      mappings: variableMappings,
    })

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

    // ==================== STEP 4: Process Each Recipient (PARALLEL) ====================
    // PERFORMANCE: Process recipients in parallel chunks for 3-5x speedup
    // Vercel: 3 concurrent, Local: 5 concurrent (based on memory limits)
    console.log(`⚡ [processCampaignBatch] Processing ${recipients.length} recipients with concurrency=${PDF_CONCURRENCY}`)

    // Define the processor function for a single recipient
    const processRecipient = async (recipient: Recipient, index: number): Promise<{ recipientId: string; recipientName: string }> => {
      const recipientName = `${recipient.first_name} ${recipient.last_name}`
      console.log(`  [${index + 1}/${recipients.length}] Processing ${recipientName}...`)

      // Generate unique tracking code
      const trackingCode = nanoid(12)

      // Generate unique QR code URL for tracking
      const qrCodeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/lp/campaign/${campaignId}?r=${encodeURIComponent(recipient.id)}&t=${trackingCode}`

      // Prepare recipient data (match database schema exactly)
      const recipientData = {
        // Legacy field names (for backwards compatibility)
        name: recipient.first_name,
        lastname: recipient.last_name,
        address: recipient.address_line1 || '',
        city: recipient.city,
        zip: recipient.zip_code,

        // Database schema field names (for variable mappings)
        // Convert null to undefined for type compatibility
        first_name: recipient.first_name,
        last_name: recipient.last_name,
        email: recipient.email ?? undefined,
        phone: recipient.phone ?? undefined,
        address_line1: recipient.address_line1 || '',
        address_line2: recipient.address_line2 ?? undefined,
        state: recipient.state,
        zip_code: recipient.zip_code,
        country: recipient.country,
      }

      // ==================== PERSONALIZE CANVAS (QR CODES + VARIABLES) ====================
      // Step 1: Personalize front canvas (replace QR codes with unique tracking codes)
      let personalizedFrontCanvasJSON = frontCanvasJSON
      if (frontSurface.variable_mappings && Object.keys(frontSurface.variable_mappings).length > 0) {
        console.log(`    🎨 Personalizing front canvas for ${recipientName}...`)
        personalizedFrontCanvasJSON = await personalizeCanvasWithRecipient(
          frontCanvasJSON,
          frontSurface.variable_mappings,
          recipient,
          campaignId
        )
      }

      // Step 2: Personalize back canvas if it exists and has variable mappings
      let personalizedBackCanvasJSON = backCanvasJSON
      if (backSurface && backCanvasJSON && backSurface.variable_mappings && Object.keys(backSurface.variable_mappings).length > 0) {
        console.log(`    🎨 Personalizing back canvas for ${recipientName}...`)
        personalizedBackCanvasJSON = await personalizeCanvasWithRecipient(
          backCanvasJSON,
          backSurface.variable_mappings,
          recipient,
          campaignId
        )
      }

      // ==================== GENERATE PDF WITH PERSONALIZED CANVASES ====================
      // Generate personalized PDF (front + back pages with unique QR codes)
      const pdfResult = await convertCanvasToPDF(
        personalizedFrontCanvasJSON,  // ✅ Personalized front (unique QR codes)
        personalizedBackCanvasJSON,   // ✅ Personalized back (unique QR codes if present)
        recipientData,                // Recipient data for text variable replacement
        template.format_type,         // Format (e.g., 'postcard_4x6')
        `${campaign.name}-${recipient.id}`,
        campaign.variable_mappings_snapshot // User-defined text variable mappings
      )
      const personalizedPDFBuffer = pdfResult.buffer

      // Upload PDF to Supabase Storage
      const pdfUrl = await uploadPersonalizedPDF(campaignId, recipient.id, personalizedPDFBuffer)

      // Save to campaign_recipients table
      await createCampaignRecipient({
        campaignId,
        recipientId: recipient.id,
        personalizedCanvasJson: personalizedFrontCanvasJSON, // ✅ Store personalized canvas with unique QR
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

      console.log(`    ✅ Success: ${recipientName}`)
      return { recipientId: recipient.id, recipientName }
    }

    // Process all recipients in parallel chunks
    const results = await processInParallelChunks(
      recipients,
      processRecipient,
      PDF_CONCURRENCY,
      (completed, total) => {
        // Update progress after each chunk completes
        progress.current = completed
        progress.percentage = Math.round((completed / total) * 100)
        progress.currentRecipient = `Processing batch... (${completed}/${total})`
        onProgress?.(progress)
        console.log(`  📊 Progress: ${completed}/${total} (${progress.percentage}%)`)
      }
    )

    // Count successes and failures from results
    let successCount = 0
    let failureCount = 0

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++
      } else {
        failureCount++
        const recipient = recipients[index]
        const recipientName = `${recipient.first_name} ${recipient.last_name}`
        const errorMessage = result.reason instanceof Error ? result.reason.message : 'Unknown error'

        console.error(`    ❌ Failed: ${recipientName}`, errorMessage)

        progress.errors.push({
          recipientId: recipient.id,
          recipientName,
          error: errorMessage,
        })
      }
    })

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
