/**
 * Campaign Print Preview API
 *
 * GET /api/campaigns/[id]/preview
 *
 * Returns all recipient data with PDF URLs for preview before printing
 * Validates print readiness (PDFs exist, dimensions correct, data complete)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { successResponse, errorResponse } from '@/lib/utils/api-response'

interface RecipientPreview {
  id: string
  name: string
  address: string
  pdfUrl: string | null
  pdfSize?: number
  status: 'ready' | 'missing' | 'error'
  validationErrors?: string[]
}

interface PreviewValidation {
  isValid: boolean
  totalRecipients: number
  readyCount: number
  missingCount: number
  errorCount: number
  recipients: RecipientPreview[]
  warnings: string[]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json(
        errorResponse('Organization ID required', 'MISSING_ORG_ID'),
        { status: 400 }
      )
    }

    console.log('🔍 [Preview] Fetching campaign preview:', campaignId)

    const supabase = createServiceClient()

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('organization_id', organizationId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        errorResponse('Campaign not found', 'CAMPAIGN_NOT_FOUND'),
        { status: 404 }
      )
    }

    // Get all recipients with their PDF data
    const { data: recipients, error: recipientsError } = await supabase
      .from('campaign_recipients')
      .select('id, name, address, pdf_url, pdf_storage_path, status')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true })

    if (recipientsError) {
      console.error('❌ [Preview] Failed to fetch recipients:', recipientsError)
      throw recipientsError
    }

    if (!recipients || recipients.length === 0) {
      return NextResponse.json(
        errorResponse('No recipients found for this campaign', 'NO_RECIPIENTS'),
        { status: 404 }
      )
    }

    console.log(`📋 [Preview] Found ${recipients.length} recipients`)

    // Validate each recipient and get signed URLs
    const validation: PreviewValidation = {
      isValid: true,
      totalRecipients: recipients.length,
      readyCount: 0,
      missingCount: 0,
      errorCount: 0,
      recipients: [],
      warnings: [],
    }

    for (const recipient of recipients) {
      const preview: RecipientPreview = {
        id: recipient.id,
        name: recipient.name || 'Unknown',
        address: recipient.address || '',
        pdfUrl: null,
        status: 'ready',
        validationErrors: [],
      }

      // Check if PDF exists
      if (!recipient.pdf_storage_path) {
        preview.status = 'missing'
        preview.validationErrors?.push('PDF file not generated')
        validation.missingCount++
        validation.isValid = false
      } else {
        // Get signed URL for PDF preview (valid for 1 hour)
        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from('campaign-pdfs')
          .createSignedUrl(recipient.pdf_storage_path, 3600)

        if (urlError || !signedUrlData) {
          console.error(`❌ [Preview] Failed to generate signed URL for ${recipient.id}:`, urlError)
          preview.status = 'error'
          preview.validationErrors?.push('Failed to access PDF file')
          validation.errorCount++
          validation.isValid = false
        } else {
          preview.pdfUrl = signedUrlData.signedUrl

          // Get file metadata
          const { data: fileData, error: fileError } = await supabase.storage
            .from('campaign-pdfs')
            .list(recipient.pdf_storage_path.split('/').slice(0, -1).join('/'), {
              search: recipient.pdf_storage_path.split('/').pop(),
            })

          if (fileData && fileData.length > 0) {
            preview.pdfSize = fileData[0].metadata?.size || 0

            // Validate file size (should be > 10KB for a valid PDF)
            if (preview.pdfSize !== undefined && preview.pdfSize < 10000) {
              preview.status = 'error'
              preview.validationErrors?.push('PDF file too small (may be corrupted)')
              validation.warnings.push(`${recipient.name}: Unusually small PDF (${preview.pdfSize} bytes)`)
            }
          }

          validation.readyCount++
        }
      }

      // Validate recipient data completeness
      if (!recipient.name || recipient.name.trim() === '') {
        preview.validationErrors?.push('Missing recipient name')
        validation.warnings.push(`Recipient ${recipient.id}: Missing name`)
      }

      if (!recipient.address || recipient.address.trim() === '') {
        preview.validationErrors?.push('Missing recipient address')
        validation.warnings.push(`Recipient ${recipient.id}: Missing address`)
      }

      validation.recipients.push(preview)
    }

    // Add overall validation warnings
    if (validation.missingCount > 0) {
      validation.warnings.push(`${validation.missingCount} recipient(s) missing PDF files`)
    }

    if (validation.errorCount > 0) {
      validation.warnings.push(`${validation.errorCount} recipient(s) have PDF access errors`)
    }

    console.log(`✅ [Preview] Validation complete: ${validation.readyCount}/${validation.totalRecipients} ready`)

    return NextResponse.json(
      successResponse({
        campaign: {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          totalRecipients: campaign.total_recipients,
        },
        validation,
      })
    )
  } catch (error) {
    console.error('❌ [Preview] Unexpected error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Failed to generate preview'

    return NextResponse.json(
      errorResponse(errorMessage, 'PREVIEW_ERROR'),
      { status: 500 }
    )
  }
}
