/**
 * Batch Personalization Engine
 *
 * Processes CSV data and generates personalized canvas variants
 * Handles chunked processing for scalability (10-10,000 variants)
 */

import { replaceVariables } from '@/lib/design/variable-parser'
import { generateCampaignQRCode } from '@/lib/qr-generator'
import type { Recipient } from '@/lib/database/types'

export interface PersonalizationJob {
  templateId: string
  templateName: string
  canvasJSON: any
  csvData: Record<string, string>[]
  totalVariants: number
  organizationId: string
}

export interface PersonalizedVariant {
  rowIndex: number
  data: Record<string, string>
  canvasJSON: any
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error?: string
}

export interface PersonalizationProgress {
  completed: number
  total: number
  percentage: number
  currentBatch: number
  totalBatches: number
}

/**
 * Chunk size for batch processing
 * Process 50 variants at a time to avoid memory issues
 */
const CHUNK_SIZE = 50

/**
 * Convert Recipient database object to row data format for variable replacement
 * Maps database field names to friendly variable names
 */
function recipientToRowData(recipient: Recipient): Record<string, string> {
  return {
    // Name fields
    firstName: recipient.first_name,
    lastName: recipient.last_name,
    fullName: `${recipient.first_name} ${recipient.last_name}`,

    // Contact fields
    email: recipient.email || '',
    phone: recipient.phone || '',

    // Address fields
    addressLine1: recipient.address_line1,
    addressLine2: recipient.address_line2 || '',
    address: recipient.address_line2
      ? `${recipient.address_line1}\n${recipient.address_line2}`
      : recipient.address_line1,
    city: recipient.city,
    state: recipient.state,
    zipCode: recipient.zip_code,
    zip: recipient.zip_code,
    country: recipient.country,
    fullAddress: `${recipient.address_line1}${recipient.address_line2 ? '\n' + recipient.address_line2 : ''}\n${recipient.city}, ${recipient.state} ${recipient.zip_code}`,

    // Spread custom metadata fields
    ...(recipient.metadata || {}),
  }
}

/**
 * Create personalized canvas variants from CSV data
 * Replaces all {variable} fields in text objects with CSV row data
 */
export function personalizeCanvas(
  canvasJSON: any,
  rowData: Record<string, string>
): any {
  // Deep clone canvas JSON to avoid mutations
  const personalizedCanvas = JSON.parse(JSON.stringify(canvasJSON))

  // Process all objects in the canvas
  if (personalizedCanvas.objects) {
    personalizedCanvas.objects = personalizedCanvas.objects.map((obj: any) => {
      // Only process text-based objects
      // CRITICAL: Fabric.js v6 uses capital letters: 'Textbox', 'IText', 'Text'
      const objType = (obj.type || '').toLowerCase()
      if (objType === 'textbox' || objType === 'itext' || objType === 'i-text' || objType === 'text') {
        const originalText = obj.text || ''

        // Replace variables with actual data from CSV row
        const personalizedText = replaceVariables(originalText, rowData)

        // CRITICAL FIX: Remove Fabric.js character-level styles when text is replaced
        // These styles (purple chip styling) have indices that no longer match after replacement
        // Clean slate ensures text renders correctly without style artifacts
        const cleanedObj = {
          ...obj,
          text: personalizedText,
        }

        // Remove all character-level styling properties
        delete cleanedObj.styles
        delete cleanedObj.styleHas

        return cleanedObj
      }

      return obj
    })
  }

  return personalizedCanvas
}

/**
 * Enhanced personalization for campaign-based VDP
 * Supports QR code replacement and reusable element preservation
 *
 * @param canvasJSON - Template canvas JSON from Fabric.js
 * @param variableMappings - Index-based variable metadata (e.g., { "3": { variableType: "qrCode", isReusable: false } })
 * @param recipientData - Full recipient database record
 * @param campaignId - Campaign ID for QR code generation
 * @returns Personalized canvas JSON with recipient data and unique QR code
 */
export async function personalizeCanvasWithRecipient(
  canvasJSON: any,
  variableMappings: Record<string, { variableType: string; isReusable: boolean }>,
  recipientData: Recipient,
  campaignId: string
): Promise<any> {
  // Deep clone canvas JSON to avoid mutations
  const personalizedCanvas = JSON.parse(JSON.stringify(canvasJSON))

  // Convert recipient to row data for text replacement
  const rowData = recipientToRowData(recipientData)

  // Process all objects in the canvas
  if (personalizedCanvas.objects) {
    // Use Promise.all to handle async QR code generation
    personalizedCanvas.objects = await Promise.all(
      personalizedCanvas.objects.map(async (obj: any, index: number) => {
        const mapping = variableMappings[index.toString()]

        // STEP 1.3: Preserve reusable elements (logo, message)
        if (mapping?.isReusable) {
          return obj // Keep original object unchanged
        }

        // STEP 1.2: Handle QR code replacement
        if (mapping?.variableType === 'qrCode') {
          try {
            // Generate unique QR code for this recipient
            const qrCodeDataUrl = await generateCampaignQRCode(campaignId, recipientData.id)

            // Replace image source while preserving position/size
            return {
              ...obj,
              src: qrCodeDataUrl,
            }
          } catch (error) {
            console.error(`❌ Failed to generate QR code for recipient ${recipientData.id}:`, error)
            // Return original object on error (placeholder QR will remain)
            return obj
          }
        }

        // Handle text-based objects (existing logic)
        const objType = (obj.type || '').toLowerCase()
        if (objType === 'textbox' || objType === 'itext' || objType === 'i-text' || objType === 'text') {
          const originalText = obj.text || ''

          // Replace variables with actual data from recipient
          const personalizedText = replaceVariables(originalText, rowData)

          // Remove character-level styles (purple chip styling)
          const cleanedObj = {
            ...obj,
            text: personalizedText,
          }

          delete cleanedObj.styles
          delete cleanedObj.styleHas

          return cleanedObj
        }

        // Return unchanged for other object types
        return obj
      })
    )
  }

  return personalizedCanvas
}

/**
 * Process CSV data in chunks for better performance
 * Returns array of personalized variants with progress tracking
 */
export async function* processBatchPersonalization(
  job: PersonalizationJob,
  onProgress?: (progress: PersonalizationProgress) => void
): AsyncGenerator<PersonalizedVariant[], void, unknown> {
  const { canvasJSON, csvData } = job
  const totalBatches = Math.ceil(csvData.length / CHUNK_SIZE)

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const startIdx = batchIndex * CHUNK_SIZE
    const endIdx = Math.min(startIdx + CHUNK_SIZE, csvData.length)
    const batchData = csvData.slice(startIdx, endIdx)

    // Process batch
    const variants: PersonalizedVariant[] = []

    for (let i = 0; i < batchData.length; i++) {
      const rowIndex = startIdx + i
      const rowData = batchData[i]

      try {
        const personalizedCanvas = personalizeCanvas(canvasJSON, rowData)

        variants.push({
          rowIndex,
          data: rowData,
          canvasJSON: personalizedCanvas,
          status: 'completed',
        })
      } catch (error) {
        console.error(`❌ Failed to personalize variant ${rowIndex}:`, error)

        variants.push({
          rowIndex,
          data: rowData,
          canvasJSON: null,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Report progress
    if (onProgress) {
      onProgress({
        completed: endIdx,
        total: csvData.length,
        percentage: Math.round((endIdx / csvData.length) * 100),
        currentBatch: batchIndex + 1,
        totalBatches,
      })
    }

    // Yield batch results
    yield variants

    // Small delay to avoid blocking UI
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}

/**
 * Process all variants at once (for smaller datasets)
 * Useful for < 100 variants where chunking is unnecessary
 */
export function processAllVariants(job: PersonalizationJob): PersonalizedVariant[] {
  const { canvasJSON, csvData } = job

  return csvData.map((rowData, rowIndex) => {
    try {
      const personalizedCanvas = personalizeCanvas(canvasJSON, rowData)

      return {
        rowIndex,
        data: rowData,
        canvasJSON: personalizedCanvas,
        status: 'completed',
      }
    } catch (error) {
      console.error(`❌ Failed to personalize variant ${rowIndex}:`, error)

      return {
        rowIndex,
        data: rowData,
        canvasJSON: null,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Validate personalization readiness
 * Checks that template has variables and CSV has matching columns
 */
export function validatePersonalizationJob(
  canvasJSON: any,
  csvData: Record<string, string>[],
  requiredVariables: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check canvas JSON
  if (!canvasJSON || !canvasJSON.objects) {
    errors.push('Invalid canvas JSON - missing objects')
  }

  // Check CSV data
  if (!csvData || csvData.length === 0) {
    errors.push('CSV data is empty')
  }

  // Check required variables exist in CSV columns
  if (csvData.length > 0) {
    const csvColumns = Object.keys(csvData[0])
    const missingColumns = requiredVariables.filter(v => !csvColumns.includes(v))

    if (missingColumns.length > 0) {
      errors.push(`Missing CSV columns: ${missingColumns.join(', ')}`)
    }
  }

  // Check row limits
  if (csvData.length < 10) {
    errors.push(`Too few rows (${csvData.length}). Minimum is 10 rows.`)
  }

  if (csvData.length > 10000) {
    errors.push(`Too many rows (${csvData.length}). Maximum is 10,000 rows.`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
