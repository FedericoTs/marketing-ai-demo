/**
 * PDF Export Engine for DropLab
 *
 * Converts Fabric.js canvas designs to print-ready PDFs
 * - 300 DPI resolution
 * - Exact physical dimensions
 * - High-quality PNG embedding
 *
 * Phase 1 (MVP): RGB color space with high-res export
 * Phase 2 (Future): CMYK conversion, vector SVG export, bleed marks
 */

import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import type { PrintFormat } from '@/lib/design/print-formats';

export interface PDFExportOptions {
  /** Canvas JSON from Fabric.js */
  canvasJSON: any;

  /** Print format with dimensions */
  format: PrintFormat;

  /** File name (without .pdf extension) */
  fileName?: string;

  /** Include bleed marks (future) */
  includeBleed?: boolean;

  /** Include crop marks (future) */
  includeCropMarks?: boolean;
}

export interface PDFExportResult {
  /** PDF blob for download */
  blob: Blob;

  /** File name */
  fileName: string;

  /** File size in bytes */
  fileSizeBytes: number;

  /** Metadata */
  metadata: {
    format: string;
    widthInches: number;
    heightInches: number;
    widthPixels: number;
    heightPixels: number;
    dpi: number;
    colorSpace: 'RGB' | 'CMYK';
  };
}

/**
 * Export canvas to print-ready PDF
 *
 * CRITICAL: This function is client-side only (uses Fabric.js browser rendering)
 */
export async function exportCanvasToPDF(
  canvas: fabric.Canvas,
  options: Omit<PDFExportOptions, 'canvasJSON'>
): Promise<PDFExportResult> {
  const { format, fileName = 'design' } = options;

  console.log('📄 [PDF EXPORT] Starting PDF generation...', {
    format: format.name,
    dimensions: `${format.widthInches}" × ${format.heightInches}"`,
    pixels: `${format.widthPixels}px × ${format.heightPixels}px`,
    dpi: format.dpi,
  });

  try {
    // Step 1: Export canvas as high-res PNG (at current 300 DPI)
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1.0,
      multiplier: 1, // Keep current resolution (already at 300 DPI)
      enableRetinaScaling: false,
    });

    console.log('🖼️ [PDF EXPORT] Canvas exported to PNG');

    // Step 2: Create PDF with exact physical dimensions + bleed
    // jsPDF uses points (pt) where 1 inch = 72 points
    // Add bleed on all sides (0.125" each side = 0.25" total per dimension)
    const widthPt = (format.widthInches + format.bleedInches * 2) * 72;
    const heightPt = (format.heightInches + format.bleedInches * 2) * 72;

    // Create PDF in portrait or landscape based on dimensions
    const orientation = format.widthInches > format.heightInches ? 'landscape' : 'portrait';

    const pdf = new jsPDF({
      orientation,
      unit: 'pt', // Use points for precise control
      format: [widthPt, heightPt], // Custom page size
      compress: true,
    });

    console.log('📋 [PDF EXPORT] PDF document created', {
      orientation,
      pageSize: `${widthPt}pt × ${heightPt}pt`,
    });

    // Step 3: Embed PNG at 300 DPI with bleed
    // Scale canvas image to fill the bleed area (extends design to edges)
    // This creates a "full bleed" effect where the design extends past trim lines
    const bleedPt = format.bleedInches * 72;

    pdf.addImage(
      dataURL,
      'PNG',
      -bleedPt, // Offset left by bleed amount (negative to extend beyond page)
      -bleedPt, // Offset top by bleed amount
      widthPt, // Full width including bleed
      heightPt, // Full height including bleed
      undefined, // alias
      'FAST' // compression (FAST = best quality)
    );

    console.log('✅ [PDF EXPORT] Image embedded at 300 DPI with bleed', {
      pdfPageSize: `${widthPt}pt × ${heightPt}pt`,
      bleedOffset: `${bleedPt}pt (${format.bleedInches}")`,
      trimSize: `${format.widthInches}" × ${format.heightInches}"`,
      finalSize: `${(widthPt/72)}" × ${(heightPt/72)}"`,
    });

    // Step 4: Add metadata
    pdf.setProperties({
      title: fileName,
      subject: `Print-ready direct mail - ${format.name}`,
      author: 'DropLab',
      keywords: 'direct mail, print, 300 DPI',
      creator: 'DropLab PDF Export Engine v1.0',
    });

    // Step 5: Generate blob
    const pdfBlob = pdf.output('blob');
    const fileSizeBytes = pdfBlob.size;

    console.log('🎉 [PDF EXPORT] PDF generated successfully', {
      fileSize: `${(fileSizeBytes / 1024).toFixed(2)} KB`,
      fileName: `${fileName}.pdf`,
    });

    return {
      blob: pdfBlob,
      fileName: `${fileName}.pdf`,
      fileSizeBytes,
      metadata: {
        format: format.id,
        widthInches: format.widthInches,
        heightInches: format.heightInches,
        widthPixels: format.widthPixels,
        heightPixels: format.heightPixels,
        dpi: format.dpi,
        colorSpace: 'RGB', // Phase 1: RGB only
      },
    };
  } catch (error) {
    console.error('❌ [PDF EXPORT] Error generating PDF:', error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Download PDF to user's computer
 */
export function downloadPDF(result: PDFExportResult): void {
  try {
    const url = URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.fileName;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up object URL
    setTimeout(() => URL.revokeObjectURL(url), 100);

    console.log('💾 [PDF EXPORT] PDF downloaded:', result.fileName);
  } catch (error) {
    console.error('❌ [PDF EXPORT] Error downloading PDF:', error);
    throw new Error('Failed to download PDF');
  }
}

/**
 * Validate canvas before PDF export
 */
export function validateCanvasForExport(canvas: fabric.Canvas, format: PrintFormat): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check canvas dimensions match format
  if (canvas.width !== format.widthPixels) {
    issues.push(`Canvas width (${canvas.width}px) does not match format width (${format.widthPixels}px)`);
  }

  if (canvas.height !== format.heightPixels) {
    issues.push(`Canvas height (${canvas.height}px) does not match format height (${format.heightPixels}px)`);
  }

  // Check for objects
  const objects = canvas.getObjects();
  if (objects.length === 0) {
    issues.push('Canvas is empty - no objects to export');
  }

  // Check for very small text (may not be legible in print)
  const smallTextObjects = objects.filter((obj: any) => {
    const objType = (obj.type || '').toLowerCase();
    if (objType === 'textbox' || objType === 'itext' || objType === 'i-text' || objType === 'text') {
      const fontSize = obj.fontSize || 0;
      return fontSize < 8; // Less than 8pt is hard to read
    }
    return false;
  });

  if (smallTextObjects.length > 0) {
    issues.push(`${smallTextObjects.length} text object(s) have very small font size (<8pt) - may not be legible when printed`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Create off-screen canvas from JSON and export to PDF
 *
 * This is used for batch PDF generation where we don't have a visible canvas
 */
export async function exportCanvasJSONToPDF(
  canvasJSON: any,
  format: PrintFormat,
  fileName: string = 'design'
): Promise<PDFExportResult> {
  // Dynamically import Canvas class from Fabric.js v6
  const { Canvas } = await import('fabric');

  console.log('🖼️ [PDF EXPORT] Creating off-screen canvas for PDF export...');
  console.log('🔍 [PDF EXPORT] Received canvasJSON type:', typeof canvasJSON);
  console.log('🔍 [PDF EXPORT] Received canvasJSON:', canvasJSON);
  console.log('🔍 [PDF EXPORT] canvasJSON has objects?:', !!canvasJSON?.objects);
  console.log('🔍 [PDF EXPORT] canvasJSON objects count:', canvasJSON?.objects?.length || 0);

  return new Promise((resolve, reject) => {
    try {
      // Create off-screen canvas element
      const canvasElement = document.createElement('canvas');
      canvasElement.width = format.widthPixels;
      canvasElement.height = format.heightPixels;

      // CRITICAL FIX: Append to DOM for proper rendering
      // Some browsers don't render off-screen canvases properly
      canvasElement.style.position = 'absolute';
      canvasElement.style.left = '-9999px';
      canvasElement.style.top = '-9999px';
      canvasElement.style.visibility = 'hidden';
      document.body.appendChild(canvasElement);

      console.log('📐 [PDF EXPORT] Canvas element created and appended to DOM:', {
        width: canvasElement.width,
        height: canvasElement.height,
        context: canvasElement.getContext('2d') ? 'OK' : 'MISSING',
        inDOM: document.body.contains(canvasElement)
      });

      // Initialize Fabric.js canvas
      const fabricCanvas = new Canvas(canvasElement, {
        width: format.widthPixels,
        height: format.heightPixels,
        backgroundColor: '#ffffff',
      });

      // Load JSON data into canvas
      fabricCanvas.loadFromJSON(canvasJSON, async () => {
        console.log('✅ [PDF EXPORT] Canvas loaded from JSON');

        // Log object count and types for debugging
        const objects = fabricCanvas.getObjects();
        console.log('📊 [PDF EXPORT] Canvas objects:', {
          count: objects.length,
          types: objects.map((obj: any) => obj.type)
        });

        // Render canvas to ensure all objects are drawn
        fabricCanvas.renderAll();

        // Wait for fonts to be ready (critical for text rendering)
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
          console.log('🔤 [PDF EXPORT] Fonts ready');
        }

        // Wait for all images to load (critical for image objects)
        const imageObjects = objects.filter((obj: any) => obj.type === 'image');
        if (imageObjects.length > 0) {
          console.log(`🖼️ [PDF EXPORT] Waiting for ${imageObjects.length} images to load...`);
          await Promise.all(
            imageObjects.map((img: any) => {
              return new Promise((resolve) => {
                if (img._element && img._element.complete) {
                  resolve(true);
                } else if (img._element) {
                  img._element.onload = () => resolve(true);
                  img._element.onerror = () => resolve(false);
                } else {
                  resolve(true);
                }
              });
            })
          );
          console.log('✅ [PDF EXPORT] All images loaded');

          // Re-render after images load
          fabricCanvas.renderAll();
        }

        // Use requestAnimationFrame to ensure browser paint cycle completes
        await new Promise(resolve => requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve(true));
        }));

        console.log('🎨 [PDF EXPORT] Canvas rendered, verifying content...');

        // Verify canvas has actual content (not blank)
        const ctx = canvasElement.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);
          const pixels = imageData.data;

          // Check if canvas is entirely white/blank
          let hasContent = false;
          for (let i = 0; i < pixels.length; i += 4) {
            // Check if any pixel is not white (255,255,255)
            if (pixels[i] !== 255 || pixels[i + 1] !== 255 || pixels[i + 2] !== 255) {
              hasContent = true;
              break;
            }
          }

          console.log('🔍 [PDF EXPORT] Canvas content verification:', {
            hasContent,
            totalPixels: pixels.length / 4,
            dimensions: `${canvasElement.width}x${canvasElement.height}`
          });

          if (!hasContent) {
            console.warn('⚠️ [PDF EXPORT] Warning: Canvas appears to be blank!');
          }
        }

        // Export to PDF
        const result = await exportCanvasToPDF(fabricCanvas as any, { format, fileName });

        // Clean up off-screen canvas
        fabricCanvas.dispose();
        canvasElement.remove();

        resolve(result);
      });
    } catch (error) {
      console.error('❌ [PDF EXPORT] Error creating canvas from JSON:', error);
      reject(error);
    }
  });
}

/**
 * Bundle Item for ZIP export
 * Contains PDF data and metadata for each variant
 */
export interface PDFBundleItem {
  /** PDF result from export */
  pdfResult: PDFExportResult;
  /** Recipient data from CSV row */
  recipientData: Record<string, string>;
  /** Variant number (1-based index) */
  variantNumber: number;
  /** Row index in original CSV (0-based) */
  rowIndex: number;
}

/**
 * ZIP Bundle Result
 */
export interface ZIPBundleResult {
  /** ZIP file blob */
  blob: Blob;
  /** ZIP filename */
  fileName: string;
  /** Total file size in bytes */
  fileSizeBytes: number;
  /** Number of PDFs bundled */
  pdfCount: number;
  /** Bundle metadata */
  metadata: {
    created: string;
    templateName: string;
    totalVariants: number;
    successCount: number;
    failedCount: number;
  };
}

/**
 * Progress callback for ZIP bundling
 */
export type ZIPBundleProgressCallback = (progress: {
  current: number;
  total: number;
  percentage: number;
  stage: 'exporting' | 'bundling' | 'complete';
  currentFileName?: string;
}) => void;

/**
 * Bundle multiple PDFs into a single ZIP file with manifest
 *
 * Creates organized ZIP structure:
 * - pdfs/ folder with all PDF files
 * - manifest.csv with metadata
 *
 * @param items - Array of PDF bundle items (pre-exported PDFs)
 * @param templateName - Base name for ZIP file
 * @param onProgress - Optional progress callback
 */
export async function bundlePDFsToZip(
  items: PDFBundleItem[],
  templateName: string,
  onProgress?: ZIPBundleProgressCallback
): Promise<ZIPBundleResult> {
  console.log('📦 [ZIP BUNDLE] Starting ZIP creation...', {
    itemCount: items.length,
    templateName
  });

  try {
    // Create new ZIP instance
    const zip = new JSZip();

    // Create pdfs folder
    const pdfsFolder = zip.folder('pdfs');
    if (!pdfsFolder) {
      throw new Error('Failed to create pdfs folder in ZIP');
    }

    // Track stats
    let successCount = 0;
    let failedCount = 0;

    // Add each PDF to ZIP
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        // Report progress
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: items.length,
            percentage: Math.round(((i + 1) / items.length) * 100),
            stage: 'bundling',
            currentFileName: item.pdfResult.fileName
          });
        }

        // Add PDF to zip with zero-padded variant number for sorting
        const paddedNumber = item.variantNumber.toString().padStart(3, '0');
        const zipFileName = `variant-${paddedNumber}-${item.pdfResult.fileName}`;

        pdfsFolder.file(zipFileName, item.pdfResult.blob);

        successCount++;

        console.log(`✅ [ZIP BUNDLE] Added PDF ${i + 1}/${items.length}:`, zipFileName);
      } catch (error) {
        failedCount++;
        console.error(`❌ [ZIP BUNDLE] Failed to add PDF ${i + 1}:`, error);
      }
    }

    // Generate manifest.csv
    console.log('📋 [ZIP BUNDLE] Generating manifest.csv...');
    const manifestRows: string[] = [
      // CSV header
      'variant_number,filename,row_index,file_size_kb,recipient_data'
    ];

    items.forEach((item) => {
      const paddedNumber = item.variantNumber.toString().padStart(3, '0');
      const zipFileName = `variant-${paddedNumber}-${item.pdfResult.fileName}`;
      const fileSizeKB = (item.pdfResult.fileSizeBytes / 1024).toFixed(2);

      // Convert recipient data to key:value pairs
      const recipientDataStr = Object.entries(item.recipientData)
        .map(([key, value]) => `${key}:${value}`)
        .join('; ');

      // Escape commas and quotes in recipient data
      const escapedData = `"${recipientDataStr.replace(/"/g, '""')}"`;

      manifestRows.push(
        `${item.variantNumber},${zipFileName},${item.rowIndex},${fileSizeKB},${escapedData}`
      );
    });

    const manifestContent = manifestRows.join('\n');
    zip.file('manifest.csv', manifestContent);

    console.log('✅ [ZIP BUNDLE] Manifest generated with', items.length, 'entries');

    // Generate ZIP blob
    console.log('🗜️ [ZIP BUNDLE] Compressing ZIP file...');
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6 // Balanced compression (0-9, higher = more compression)
      }
    }, (metadata) => {
      // Progress during ZIP generation
      if (onProgress) {
        onProgress({
          current: Number(metadata.currentFile) || 0,
          total: items.length,
          percentage: Math.round(metadata.percent),
          stage: 'bundling'
        });
      }
    });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const safeTemplateName = templateName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const zipFileName = `${safeTemplateName}-${timestamp}.zip`;

    const result: ZIPBundleResult = {
      blob: zipBlob,
      fileName: zipFileName,
      fileSizeBytes: zipBlob.size,
      pdfCount: successCount,
      metadata: {
        created: new Date().toISOString(),
        templateName,
        totalVariants: items.length,
        successCount,
        failedCount
      }
    };

    console.log('🎉 [ZIP BUNDLE] ZIP created successfully:', {
      fileName: zipFileName,
      fileSize: `${(zipBlob.size / 1024 / 1024).toFixed(2)} MB`,
      pdfCount: successCount,
      failedCount
    });

    // Final progress callback
    if (onProgress) {
      onProgress({
        current: items.length,
        total: items.length,
        percentage: 100,
        stage: 'complete'
      });
    }

    return result;
  } catch (error) {
    console.error('❌ [ZIP BUNDLE] Error creating ZIP:', error);
    throw new Error(`ZIP creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Download ZIP file to user's computer
 */
export function downloadZIP(result: ZIPBundleResult): void {
  try {
    const url = URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.fileName;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up object URL
    setTimeout(() => URL.revokeObjectURL(url), 100);

    console.log('💾 [ZIP BUNDLE] ZIP downloaded:', result.fileName);
  } catch (error) {
    console.error('❌ [ZIP BUNDLE] Error downloading ZIP:', error);
    throw new Error('Failed to download ZIP file');
  }
}
