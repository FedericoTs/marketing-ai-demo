/**
 * Simple Canvas-to-PDF Converter using Puppeteer
 *
 * Uses proven Puppeteer + Fabric.js HTML generation from canvas-renderer-puppeteer.ts
 * Simplified for direct canvas JSON input without database dependencies
 */

import type { Browser } from 'puppeteer'
import { jsPDF } from 'jspdf'
import { getFormat } from '@/lib/design/print-formats'
import { createServiceClient } from '@/lib/supabase/server'

// Browser instance pool
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
  console.log('✅ [PDF] Puppeteer browser launched')
  return browserInstance
}

async function releaseBrowserInstance(): Promise<void> {
  browserRefCount--
  if (browserRefCount <= 0 && browserInstance) {
    await browserInstance.close()
    browserInstance = null
    browserRefCount = 0
    console.log('✅ [PDF] Puppeteer browser closed')
  }
}

/**
 * Download image from Supabase Storage and convert to base64 data URL
 */
async function downloadImageAsDataURL(url: string): Promise<string> {
  const match = url.match(/\/storage\/v1\/object\/(?:sign|public)\/([^/]+)\/(.+?)(?:\?|$)/)
  if (!match) throw new Error('Invalid Supabase Storage URL')

  const [, bucket, path] = match
  const supabase = createServiceClient()
  const { data, error } = await supabase.storage.from(bucket).download(path)

  if (error) throw new Error(`Supabase Storage error: ${error.message}`)
  if (!data) throw new Error('No data returned from Supabase Storage')

  const arrayBuffer = await data.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const base64 = buffer.toString('base64')

  console.log(`📦 [PDF] Image downloaded: ${(buffer.length / 1024).toFixed(2)} KB`)
  return `data:image/png;base64,${base64}`
}

/**
 * Pre-process canvas JSON: download all Supabase images and replace with data URLs
 */
async function preprocessCanvasJSON(canvasJSON: any): Promise<any> {
  const parsed = typeof canvasJSON === 'string' ? JSON.parse(canvasJSON) : canvasJSON
  const imageObjects = parsed?.objects?.filter((obj: any) => obj.type === 'Image') || []

  console.log(`🖼️ [PDF] Found ${imageObjects.length} images to download`)

  if (imageObjects.length > 0) {
    await Promise.all(
      imageObjects.map(async (obj: any) => {
        if (obj.src && obj.src.includes('supabase.co/storage')) {
          obj.src = await downloadImageAsDataURL(obj.src)
        }
      })
    )
    console.log('✅ [PDF] All images downloaded')
  }

  return parsed
}

/**
 * Generate HTML with Fabric.js canvas renderer
 * Uses ORIGINAL template + variable mappings + recipient data
 * Based on working implementation from canvas-renderer-puppeteer.ts
 */
function createFabricHTML(
  templateJSON: any,
  variableMappings: any,
  recipientData: any,
  width: number,
  height: number
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 0; overflow: hidden; }
    #canvas-container { width: ${width}px; height: ${height}px; }
  </style>
</head>
<body>
  <div id="canvas-container">
    <canvas id="canvas" width="${width}" height="${height}"></canvas>
  </div>

  <script>
    window.renderComplete = false;
    window.renderError = null;

    // Load Fabric.js from CDN
    function loadFabricJS() {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/fabric@5.3.0/dist/fabric.min.js';
        script.onload = () => {
          console.log('✅ Fabric.js loaded');
          resolve();
        };
        script.onerror = () => {
          window.renderError = 'Failed to load Fabric.js';
          reject(new Error('Failed to load Fabric.js'));
        };
        document.head.appendChild(script);
      });
    }

    // Render canvas
    async function render() {
      try {
        await loadFabricJS();

        const canvas = new fabric.Canvas('canvas', {
          width: ${width},
          height: ${height},
          backgroundColor: '#ffffff'
        });

        const templateJSON = ${JSON.stringify(canvasJSON)};

        await new Promise((resolve, reject) => {
          canvas.loadFromJSON(templateJSON, () => {
            canvas.renderAll();
            console.log('✅ Canvas rendered');
            window.renderComplete = true;
            resolve();
          }, (err) => {
            console.error('Canvas load error:', err);
            const errorMsg = err ? (err.message || JSON.stringify(err) || String(err)) : 'Unknown error';
            window.renderError = 'Canvas load failed: ' + errorMsg;
            reject(err);
          });
        });
      } catch (error) {
        console.error('Render error:', error);
        window.renderError = error.message || 'Render failed';
      }
    }

    render();
  </script>
</body>
</html>
  `
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
    pages?: number
  }
}

/**
 * Convert canvas JSON to PDF using Puppeteer
 */
export async function convertCanvasToPDF(
  canvasJSON: any,
  formatType: string,
  fileName: string = 'design'
): Promise<PDFResult> {
  console.log('🖼️ [PDF] Starting canvas-to-PDF conversion...')

  const browser = await getBrowserInstance()
  const page = await browser.newPage()

  try {
    // Get format
    const format = getFormat(formatType)
    console.log(`📐 [PDF] Format: ${format.name} (${format.widthPixels}×${format.heightPixels}px)`)

    // Pre-process canvas JSON (download images)
    const processedJSON = await preprocessCanvasJSON(canvasJSON)

    // Set viewport
    await page.setViewport({
      width: format.widthPixels,
      height: format.heightPixels,
      deviceScaleFactor: 2,
    })

    // Create and load HTML
    const html = createFabricHTML(processedJSON, format.widthPixels, format.heightPixels)
    console.log('🎨 [PDF] Loading Fabric.js canvas in browser...')

    // Forward console logs
    page.on('console', (msg) => {
      const type = msg.type()
      const text = msg.text()
      if (type === 'error') console.error(`  [Browser] ${text}`)
      else console.log(`  [Browser] ${text}`)
    })

    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 })

    // Wait for render
    console.log('⏳ [PDF] Waiting for canvas render...')
    await page.waitForFunction(() => window.renderComplete || window.renderError, { timeout: 60000 })

    const renderError = await page.evaluate(() => (window as any).renderError)
    if (renderError) {
      throw new Error(`Canvas render failed: ${renderError}`)
    }

    console.log('✅ [PDF] Canvas rendered successfully')

    // Screenshot canvas
    const canvasElement = await page.$('#canvas')
    if (!canvasElement) throw new Error('Canvas element not found')

    console.log('📸 [PDF] Taking screenshot...')
    const imageBuffer = await canvasElement.screenshot({ type: 'png', omitBackground: false })
    const pngBase64 = (imageBuffer as Buffer).toString('base64')
    console.log(`✅ [PDF] PNG created: ${((imageBuffer as Buffer).length / 1024).toFixed(2)} KB`)

    // Create PDF - canvas already includes bleed
    console.log('📄 [PDF] Creating PDF from bleed-inclusive canvas...')
    const orientation = format.widthInches > format.heightInches ? 'landscape' : 'portrait'

    // Canvas pixels already include bleed (e.g., 1875×1275px = 6.25"×4.25" at 300 DPI)
    // Convert canvas pixels to inches for PDF dimensions
    const pdfWidth = format.widthPixels / format.dpi      // 1875/300 = 6.25"
    const pdfHeight = format.heightPixels / format.dpi    // 1275/300 = 4.25"

    const pdf = new jsPDF({
      orientation,
      unit: 'in',
      format: [pdfWidth, pdfHeight],
      compress: true,
    })

    console.log(`📏 [PDF] Dimensions: ${pdfWidth}" × ${pdfHeight}" (trim: ${format.widthInches}" × ${format.heightInches}", bleed: ${format.bleedInches}")`)

    // Image fills PDF exactly (no offset or scaling needed)
    const pngDataUrl = `data:image/png;base64,${pngBase64}`
    pdf.addImage(
      pngDataUrl,
      'PNG',
      0,           // No offset - canvas already includes bleed
      0,           // No offset - canvas already includes bleed
      pdfWidth,    // Exact match to PDF width
      pdfHeight,   // Exact match to PDF height
      undefined,
      'FAST'
    )

    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'))
    console.log(`✅ [PDF] Complete: ${(pdfBuffer.length / 1024).toFixed(2)} KB`)

    return {
      buffer: pdfBuffer,
      fileName: `${fileName}.pdf`,
      fileSizeBytes: pdfBuffer.length,
      metadata: {
        format: formatType,
        widthInches: pdfWidth,  // PDF dimensions include bleed
        heightInches: pdfHeight,
        widthPixels: format.widthPixels,
        heightPixels: format.heightPixels,
        dpi: format.dpi,
      },
    }
  } catch (error) {
    console.error('❌ [PDF] Conversion failed:', error)
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
