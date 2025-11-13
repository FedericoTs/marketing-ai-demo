/**
 * Variable Overlay Engine (Phase 2 of Optimized VDP)
 *
 * KEY OPTIMIZATION: Overlay recipient data on base PDF (no re-rendering!)
 * Takes pre-rendered base PDF + recipient data → personalized PDF
 *
 * Performance: <1 second per recipient (vs 15 seconds with full render)
 *
 * Process:
 * 1. Load base PDF
 * 2. Generate unique QR code for recipient
 * 3. Overlay recipient text at known positions
 * 4. Overlay QR code
 * 5. Return personalized PDF buffer
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'

export interface RecipientData {
  name?: string
  lastname?: string
  address?: string
  city?: string
  zip?: string
}

export interface OverlayConfig {
  // Text positioning (in inches from top-left)
  namePosition?: { x: number; y: number }
  addressPosition?: { x: number; y: number }
  qrPosition?: { x: number; y: number; size: number }

  // Text styling
  fontSize?: number
  textColor?: { r: number; g: number; b: number }

  // QR code URL
  qrCodeUrl?: string
}

/**
 * Generate QR code as PNG data URL
 */
async function generateQRCode(url: string, size: number = 300): Promise<string> {
  return await QRCode.toDataURL(url, {
    width: size,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  })
}

/**
 * Overlay recipient data on base PDF
 *
 * This is the fast path: No browser, no rendering, just PDF manipulation
 *
 * @param basePDFBuffer - Pre-rendered base PDF
 * @param recipientData - Recipient information
 * @param config - Positioning and styling configuration
 * @returns Personalized PDF buffer
 */
export async function overlayVariablesOnPDF(
  basePDFBuffer: Buffer,
  recipientData: RecipientData,
  config: OverlayConfig = {}
): Promise<Buffer> {
  console.log(`⚡ [Variable Overlay] Personalizing for ${recipientData.name || 'recipient'}...`)

  try {
    // Load base PDF
    const pdfDoc = await PDFDocument.load(basePDFBuffer)
    const pages = pdfDoc.getPages()
    const firstPage = pages[0]

    // Get page dimensions
    const { width, height } = firstPage.getSize()

    // Load font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // Default configuration (postcard 4x6 layout)
    const fontSize = config.fontSize || 12
    const textColor = config.textColor || { r: 0, g: 0, b: 0 }
    const namePos = config.namePosition || { x: 0.5, y: 5.0 } // 0.5" from left, 5.0" from top
    const addressPos = config.addressPosition || { x: 0.5, y: 5.3 }
    const qrPos = config.qrPosition || { x: 3.0, y: 0.5, size: 1.5 } // Bottom right

    // Convert inches to points (1 inch = 72 points)
    const pointsPerInch = 72

    // Overlay recipient name (bold)
    if (recipientData.name || recipientData.lastname) {
      const fullName = `${recipientData.name || ''} ${recipientData.lastname || ''}`.trim()
      firstPage.drawText(fullName, {
        x: namePos.x * pointsPerInch,
        y: height - (namePos.y * pointsPerInch), // PDF coordinates are bottom-up
        size: fontSize + 2,
        font: boldFont,
        color: rgb(textColor.r, textColor.g, textColor.b),
      })
    }

    // Overlay address
    if (recipientData.address) {
      firstPage.drawText(recipientData.address, {
        x: addressPos.x * pointsPerInch,
        y: height - (addressPos.y * pointsPerInch),
        size: fontSize,
        font,
        color: rgb(textColor.r, textColor.g, textColor.b),
      })
    }

    // Overlay city/zip
    if (recipientData.city || recipientData.zip) {
      const cityZip = `${recipientData.city || ''}${recipientData.city && recipientData.zip ? ', ' : ''}${recipientData.zip || ''}`.trim()
      firstPage.drawText(cityZip, {
        x: addressPos.x * pointsPerInch,
        y: height - ((addressPos.y + 0.2) * pointsPerInch),
        size: fontSize,
        font,
        color: rgb(textColor.r, textColor.g, textColor.b),
      })
    }

    // Overlay QR code (if URL provided)
    if (config.qrCodeUrl) {
      console.log(`  📱 [Variable Overlay] Generating QR code...`)
      const qrDataUrl = await generateQRCode(config.qrCodeUrl, 300)
      const qrImageBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64')
      const qrImage = await pdfDoc.embedPng(qrImageBytes)

      const qrSizePoints = qrPos.size * pointsPerInch

      firstPage.drawImage(qrImage, {
        x: qrPos.x * pointsPerInch,
        y: height - ((qrPos.y + qrPos.size) * pointsPerInch), // Bottom-up coordinates
        width: qrSizePoints,
        height: qrSizePoints,
      })
    }

    // Save personalized PDF
    const pdfBytes = await pdfDoc.save()
    const finalBuffer = Buffer.from(pdfBytes)

    console.log(`✅ [Variable Overlay] Personalized PDF created: ${(finalBuffer.length / 1024).toFixed(2)} KB`)

    return finalBuffer
  } catch (error) {
    console.error('❌ [Variable Overlay] Failed:', error)
    throw error
  }
}

/**
 * Batch overlay: Process multiple recipients efficiently
 *
 * This reuses the base PDF for all recipients
 *
 * @param basePDFBuffer - Pre-rendered base PDF
 * @param recipients - Array of recipient data
 * @param configFn - Function to generate config per recipient (for unique QR codes)
 * @returns Array of personalized PDF buffers
 */
export async function batchOverlayVariables(
  basePDFBuffer: Buffer,
  recipients: RecipientData[],
  configFn: (recipient: RecipientData, index: number) => OverlayConfig
): Promise<Buffer[]> {
  console.log(`🚀 [Batch Overlay] Processing ${recipients.length} recipients...`)

  const startTime = Date.now()

  const results = await Promise.all(
    recipients.map((recipient, index) => {
      const config = configFn(recipient, index)
      return overlayVariablesOnPDF(basePDFBuffer, recipient, config)
    })
  )

  const duration = (Date.now() - startTime) / 1000
  console.log(`✅ [Batch Overlay] Complete: ${recipients.length} PDFs in ${duration.toFixed(2)}s (${(duration / recipients.length).toFixed(2)}s/PDF)`)

  return results
}
