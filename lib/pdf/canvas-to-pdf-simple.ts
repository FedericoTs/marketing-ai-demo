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
 * Convert canvas to PDF
 *
 * @param templateCanvasJSON - ORIGINAL template JSON (not personalized)
 * @param recipientData - Data for personalization { name, lastname, address, city, zip }
 * @param formatType - Print format
 * @param fileName - Output filename
 */
export async function convertCanvasToPDF(
  templateCanvasJSON: any,
  recipientData: { name?: string; lastname?: string; address?: string; city?: string; zip?: string },
  formatType: string,
  fileName: string = 'design'
): Promise<PDFResult> {
  console.log(`🖼️ [PDF] Converting canvas for ${recipientData.name || 'recipient'}...`)

  const browser = await getBrowserInstance()
  const page = await browser.newPage()

  try {
    const format = getFormat(formatType)
    console.log(`📐 [PDF] Format: ${format.widthPixels}×${format.heightPixels}px`)

    // Download images in template (replaces signed URLs with data URLs)
    const processedTemplate = await downloadCanvasImages(templateCanvasJSON)

    await page.setViewport({
      width: format.widthPixels,
      height: format.heightPixels,
      deviceScaleFactor: 2,
    })

    // Create HTML with original template + recipient data
    const templateString = JSON.stringify(processedTemplate)
    const html = createHTML(templateString, recipientData, format.widthPixels, format.heightPixels)

    // Forward browser console
    page.on('console', msg => {
      const text = msg.text()
      if (msg.type() === 'error') console.error(`  [Browser] ${text}`)
      else console.log(`  [Browser] ${text}`)
    })

    console.log('🎨 [PDF] Loading page...')
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 })

    console.log('⏳ [PDF] Waiting for render...')
    await page.waitForFunction(() => window.renderComplete || window.renderError, { timeout: 60000 })

    // Check if render succeeded (prioritize success over error)
    const renderComplete = await page.evaluate(() => (window as any).renderComplete)
    const error = await page.evaluate(() => (window as any).renderError)

    if (!renderComplete && error) {
      throw new Error(`Render failed: ${error}`)
    }

    console.log('✅ [PDF] Rendered')

    // Screenshot
    const canvasEl = await page.$('#canvas')
    if (!canvasEl) throw new Error('Canvas not found')

    console.log('📸 [PDF] Capturing...')
    const imgBuffer = await canvasEl.screenshot({ type: 'png', omitBackground: false })
    const base64 = (imgBuffer as Buffer).toString('base64')

    // Create PDF with bleed dimensions
    console.log('📄 [PDF] Creating PDF...')
    const orientation = format.widthInches > format.heightInches ? 'landscape' : 'portrait'

    // Canvas already includes bleed (e.g., 1875×1275px = 6.25"×4.25" at 300 DPI)
    const pdfWidth = format.widthPixels / format.dpi      // 1875/300 = 6.25"
    const pdfHeight = format.heightPixels / format.dpi    // 1275/300 = 4.25"

    const pdf = new jsPDF({
      orientation,
      unit: 'in',
      format: [pdfWidth, pdfHeight],
      compress: true,
    })

    console.log(`📏 [PDF] Dimensions: ${pdfWidth}" × ${pdfHeight}" (trim: ${format.widthInches}" × ${format.heightInches}", bleed: ${format.bleedInches}")`)

    // Page 1: Front design (personalized template)
    pdf.addImage(`data:image/png;base64,${base64}`, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST')

    // Page 2: Back page (blank - PostGrid will overlay address automatically)
    console.log('📄 [PDF] Adding back page for PostGrid address block...')
    pdf.addPage([pdfWidth, pdfHeight], orientation)

    // Optional: Add a simple white background to back page
    pdf.setFillColor(255, 255, 255)
    pdf.rect(0, 0, pdfWidth, pdfHeight, 'F')

    console.log('✅ [PDF] 2-page PDF created (front + back)')

    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'))
    console.log(`✅ [PDF] Complete: ${(pdfBuffer.length / 1024).toFixed(2)} KB (2 pages)`)

    return {
      buffer: pdfBuffer,
      fileName: `${fileName}.pdf`,
      fileSizeBytes: pdfBuffer.length,
      metadata: {
        format: formatType,
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
    await page.close()
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
