/**
 * Simple Canvas-to-PDF using proven Puppeteer pattern
 *
 * KEY INSIGHT: Don't pass personalized canvas JSON to browser
 * Instead: Pass original template + recipient data, let browser personalize
 *
 * This matches the working canvas-renderer-puppeteer.ts pattern
 */

import type { Browser } from 'puppeteer'
import { jsPDF } from 'jspdf'
import { getFormat } from '@/lib/design/print-formats'
import { createServiceClient } from '@/lib/supabase/server'

// Browser pool
let browserInstance: Browser | null = null
let browserRefCount = 0

async function getBrowserInstance(): Promise<Browser> {
  if (browserInstance) {
    browserRefCount++
    return browserInstance
  }

  const puppeteer = await import('puppeteer')
  browserInstance = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  })
  browserRefCount = 1
  console.log('✅ [PDF] Browser launched')
  return browserInstance
}

async function releaseBrowserInstance(): Promise<void> {
  browserRefCount--
  if (browserRefCount <= 0 && browserInstance) {
    await browserInstance.close()
    browserInstance = null
    browserRefCount = 0
    console.log('✅ [PDF] Browser closed')
  }
}

/**
 * Download Supabase image as base64 data URL
 */
async function downloadImageAsDataURL(url: string): Promise<string> {
  const match = url.match(/\/storage\/v1\/object\/(?:sign|public)\/([^/]+)\/(.+?)(?:\?|$)/)
  if (!match) throw new Error('Invalid Supabase Storage URL')

  const [, bucket, path] = match
  const supabase = createServiceClient()
  const { data, error } = await supabase.storage.from(bucket).download(path)

  if (error) throw new Error(`Storage error: ${error.message}`)
  if (!data) throw new Error('No data returned')

  const buffer = Buffer.from(await data.arrayBuffer())
  return `data:image/png;base64,${buffer.toString('base64')}`
}

/**
 * Pre-download all images in canvas JSON
 */
async function downloadCanvasImages(canvasJSON: any): Promise<any> {
  const parsed = typeof canvasJSON === 'string' ? JSON.parse(canvasJSON) : canvasJSON
  const images = parsed?.objects?.filter((obj: any) => obj.type === 'Image') || []

  if (images.length > 0) {
    console.log(`📥 [PDF] Downloading ${images.length} images...`)
    await Promise.all(
      images.map(async (obj: any) => {
        if (obj.src && obj.src.includes('supabase.co/storage')) {
          obj.src = await downloadImageAsDataURL(obj.src)
        }
      })
    )
    console.log('✅ [PDF] Images downloaded')
  }

  return parsed
}

/**
 * Create HTML with Fabric.js - uses ORIGINAL template, not personalized JSON
 */
function createHTML(templateJSON: string, recipientData: any, width: number, height: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>body{margin:0;padding:0;overflow:hidden}</style>
</head>
<body>
  <canvas id="canvas" width="${width}" height="${height}"></canvas>

  <script>
    window.renderComplete = false;
    window.renderError = null;

    const recipientData = ${JSON.stringify(recipientData)};

    function loadFabric() {
      return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/fabric@5.3.0/dist/fabric.min.js';
        s.onload = resolve;
        s.onerror = () => {
          window.renderError = 'Failed to load Fabric.js';
          reject();
        };
        document.head.appendChild(s);
      });
    }

    async function render() {
      try {
        await loadFabric();
        console.log('Fabric loaded');

        const canvas = new fabric.Canvas('canvas', {
          width: ${width},
          height: ${height},
          backgroundColor: '#ffffff'
        });

        const templateJSON = ${templateJSON};

        await new Promise((resolve, reject) => {
          canvas.loadFromJSON(templateJSON, () => {
            console.log('Template loaded, personalizing...');

            // Personalize text objects (support both {var} and {{var}} syntax)
            canvas.getObjects().forEach(obj => {
              if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
                let text = obj.text || '';

                // Replace placeholders - support both single and double braces
                text = text.replace(/\\{\\{?firstName\\}?\\}/g, recipientData.name || recipientData.firstName || '');
                text = text.replace(/\\{\\{?name\\}?\\}/g, recipientData.name || '');
                text = text.replace(/\\{\\{?lastName\\}?\\}/g, recipientData.lastname || recipientData.lastName || '');
                text = text.replace(/\\{\\{?lastname\\}?\\}/g, recipientData.lastname || '');
                text = text.replace(/\\{\\{?fullName\\}?\\}/g,
                  (recipientData.name || recipientData.firstName || '') + ' ' + (recipientData.lastname || recipientData.lastName || ''));
                text = text.replace(/\\{\\{?address\\}?\\}/g, recipientData.address || '');
                text = text.replace(/\\{\\{?addressLine1\\}?\\}/g, recipientData.address || recipientData.addressLine1 || '');
                text = text.replace(/\\{\\{?city\\}?\\}/g, recipientData.city || '');
                text = text.replace(/\\{\\{?zip\\}?\\}/g, recipientData.zip || recipientData.zipCode || '');
                text = text.replace(/\\{\\{?state\\}?\\}/g, recipientData.state || '');

                obj.set({ text });
              }
            });

            canvas.renderAll();
            console.log('✅ Personalized and rendered');
            window.renderComplete = true;
            resolve();
          }, (err) => {
            console.error('Load error:', err);
            window.renderError = 'Load failed: ' + (err && err.message ? err.message : String(err));
            reject(err);
          });
        });
      } catch (err) {
        console.error('Render error:', err);
        window.renderError = err.message || 'Render failed';
      }
    }

    render();
  </script>
</body>
</html>`
}

export interface PDFResult {
  buffer: Buffer
  fileName: string
  fileSizeBytes: number
  metadata: {
    format: string
    widthInches: number
    heightInches: number
    widthPixels: number
    heightPixels: number
    dpi: number
    pages: number
  }
}

/**
 * Render a canvas to PNG image using Puppeteer + Fabric.js
 * Extracted helper for reusability (front/back pages)
 *
 * @param canvasJSON - Fabric.js canvas JSON (template, not personalized)
 * @param recipientData - Data for variable replacement
 * @param width - Canvas width in pixels
 * @param height - Canvas height in pixels
 * @param browser - Puppeteer browser instance
 * @returns Base64 PNG image data
 */
async function renderCanvasToImage(
  canvasJSON: any,
  recipientData: { name?: string; lastname?: string; address?: string; city?: string; zip?: string },
  width: number,
  height: number,
  browser: Browser
): Promise<string> {
  const page = await browser.newPage()

  try {
    // Download images (replace Supabase signed URLs with data URLs)
    const processedTemplate = await downloadCanvasImages(canvasJSON)

    await page.setViewport({
      width,
      height,
      deviceScaleFactor: 2,
    })

    // Create HTML with Fabric.js canvas
    const templateString = JSON.stringify(processedTemplate)
    const html = createHTML(templateString, recipientData, width, height)

    // Forward browser console
    page.on('console', msg => {
      const text = msg.text()
      if (msg.type() === 'error') console.error(`  [Browser] ${text}`)
      else console.log(`  [Browser] ${text}`)
    })

    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 })
    await page.waitForFunction(() => window.renderComplete || window.renderError, { timeout: 60000 })

    // Check render status
    const renderComplete = await page.evaluate(() => (window as any).renderComplete)
    const error = await page.evaluate(() => (window as any).renderError)

    if (!renderComplete && error) {
      throw new Error(`Render failed: ${error}`)
    }

    // Screenshot canvas element
    const canvasEl = await page.$('#canvas')
    if (!canvasEl) throw new Error('Canvas element not found')

    const imgBuffer = await canvasEl.screenshot({ type: 'png', omitBackground: false })
    return (imgBuffer as Buffer).toString('base64')
  } finally {
    await page.close()
  }
}

/**
 * Create a blank white page image as base64 PNG
 * Used when no custom back page is provided (backwards compatibility)
 *
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns Base64 PNG image data
 */
function createBlankPageImage(width: number, height: number): string {
  // Create minimal SVG for blank white page
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="#ffffff"/>
  </svg>`

  // Convert to base64 (SVG as data URL works in jsPDF)
  const base64 = Buffer.from(svg).toString('base64')
  return base64
}

/**
 * Convert canvas to PDF with optional front and back pages
 *
 * @param frontCanvasJSON - Front page canvas JSON (REQUIRED)
 * @param backCanvasJSON - Back page canvas JSON (OPTIONAL - null = blank white page)
 * @param recipientData - Data for personalization { name, lastname, address, city, zip }
 * @param formatType - Print format (e.g., 'postcard_4x6')
 * @param fileName - Output filename
 *
 * BACKWARDS COMPATIBLE:
 * - Old signature: convertCanvasToPDF(canvasJSON, recipientData, formatType, fileName)
 *   → Treats first arg as frontCanvasJSON, second arg type-checks to recipientData
 * - New signature: convertCanvasToPDF(frontJSON, backJSON, recipientData, formatType, fileName)
 *   → Both front and back canvases rendered separately
 */
export async function convertCanvasToPDF(
  frontCanvasJSON: any,
  backCanvasJSON: any | null | { name?: string; lastname?: string },  // null OR recipientData (for backwards compat)
  recipientData: { name?: string; lastname?: string; address?: string; city?: string; zip?: string } | string,  // recipientData OR formatType
  formatType?: string,
  fileName: string = 'design'
): Promise<PDFResult> {
  // BACKWARDS COMPATIBILITY DETECTION
  // Old signature: (canvasJSON, recipientData, formatType, fileName)
  // New signature: (frontJSON, backJSON, recipientData, formatType, fileName)
  //
  // Detection: If 2nd arg has recipient properties (name/lastname/address),
  // it's old signature → shift arguments
  let actualFrontCanvas: any
  let actualBackCanvas: any | null
  let actualRecipientData: any
  let actualFormatType: string
  let actualFileName: string

  if (
    backCanvasJSON &&
    typeof backCanvasJSON === 'object' &&
    ('name' in backCanvasJSON || 'lastname' in backCanvasJSON || 'address' in backCanvasJSON) &&
    typeof recipientData === 'string'
  ) {
    // OLD SIGNATURE DETECTED: (frontCanvas, recipientData, formatType, fileName)
    console.log('📌 [PDF] Old signature detected (backwards compatibility mode)')
    actualFrontCanvas = frontCanvasJSON
    actualBackCanvas = null  // No back page in old signature
    actualRecipientData = backCanvasJSON  // 2nd arg is recipientData
    actualFormatType = recipientData as string  // 3rd arg is formatType
    actualFileName = formatType || fileName
  } else {
    // NEW SIGNATURE: (frontCanvas, backCanvas, recipientData, formatType, fileName)
    actualFrontCanvas = frontCanvasJSON
    actualBackCanvas = backCanvasJSON
    actualRecipientData = recipientData
    actualFormatType = formatType as string
    actualFileName = fileName
  }
  console.log(`🖼️ [PDF] Converting ${actualBackCanvas ? 'front + custom back' : 'front + blank back'} for ${actualRecipientData.name || 'recipient'}...`)

  const browser = await getBrowserInstance()

  try {
    const format = getFormat(actualFormatType)
    console.log(`📐 [PDF] Format: ${format.widthPixels}×${format.heightPixels}px`)

    // RENDER FRONT PAGE (required)
    console.log('🎨 [PDF] Rendering front page...')
    const frontImageBase64 = await renderCanvasToImage(
      actualFrontCanvas,
      actualRecipientData,
      format.widthPixels,
      format.heightPixels,
      browser
    )
    console.log('✅ [PDF] Front page rendered')

    // RENDER BACK PAGE (custom or blank)
    let backImageBase64: string
    if (actualBackCanvas) {
      console.log('🎨 [PDF] Rendering custom back page...')
      backImageBase64 = await renderCanvasToImage(
        actualBackCanvas,
        actualRecipientData,
        format.widthPixels,
        format.heightPixels,
        browser
      )
      console.log('✅ [PDF] Custom back page rendered')
    } else {
      console.log('📄 [PDF] Creating blank back page (PostGrid address block)...')
      backImageBase64 = createBlankPageImage(format.widthPixels, format.heightPixels)
      console.log('✅ [PDF] Blank back page created')
    }

    // CREATE PDF WITH BOTH PAGES
    console.log('📄 [PDF] Assembling 2-page PDF...')
    const orientation = format.widthInches > format.heightInches ? 'landscape' : 'portrait'

    // Canvas pixels already include bleed (e.g., 1875×1275px = 6.25"×4.25" at 300 DPI)
    const pdfWidth = format.widthPixels / format.dpi      // 1875/300 = 6.25"
    const pdfHeight = format.heightPixels / format.dpi    // 1275/300 = 4.25"

    const pdf = new jsPDF({
      orientation,
      unit: 'in',
      format: [pdfWidth, pdfHeight],
      compress: true,
    })

    console.log(`📏 [PDF] Dimensions: ${pdfWidth}" × ${pdfHeight}" (trim: ${format.widthInches}" × ${format.heightInches}", bleed: ${format.bleedInches}")`)

    // PAGE 1: Front design (personalized)
    pdf.addImage(`data:image/png;base64,${frontImageBase64}`, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST')

    // PAGE 2: Back design (custom or blank)
    pdf.addPage([pdfWidth, pdfHeight], orientation)
    if (actualBackCanvas) {
      // Custom back page with design
      pdf.addImage(`data:image/png;base64,${backImageBase64}`, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST')
    } else {
      // Blank white back page (for PostGrid address overlay)
      pdf.setFillColor(255, 255, 255)
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F')
    }

    console.log(`✅ [PDF] 2-page PDF created (front + ${actualBackCanvas ? 'custom back' : 'blank back'})`)

    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'))
    console.log(`✅ [PDF] Complete: ${(pdfBuffer.length / 1024).toFixed(2)} KB (2 pages)`)

    return {
      buffer: pdfBuffer,
      fileName: `${actualFileName}.pdf`,
      fileSizeBytes: pdfBuffer.length,
      metadata: {
        format: actualFormatType,
        widthInches: pdfWidth,   // PDF dimensions include bleed
        heightInches: pdfHeight,
        widthPixels: format.widthPixels,
        heightPixels: format.heightPixels,
        dpi: format.dpi,
        pages: 2,  // Front + back (PostGrid requirement)
      },
    }
  } catch (error) {
    console.error('❌ [PDF] Failed:', error)
    throw error
  } finally {
    await releaseBrowserInstance()
  }
}

export async function cleanup(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close()
    browserInstance = null
    browserRefCount = 0
  }
}
