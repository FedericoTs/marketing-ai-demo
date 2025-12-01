/**
 * PDF Generation - Environment Switcher
 *
 * Automatically selects the appropriate PDF generator based on runtime environment:
 * - Vercel: Uses @sparticuz/chromium-min (serverless-compatible)
 * - Local/Self-hosted: Uses standard Puppeteer (faster, more reliable)
 *
 * This allows the same codebase to work both locally and on Vercel without
 * any code changes in consuming modules.
 */

import type { PDFResult } from './canvas-to-pdf-simple'

// Environment detection
const isVercel = !!process.env.VERCEL
const isServerless = !!process.env.AWS_LAMBDA_FUNCTION_NAME || isVercel

// Log which implementation is being used (helpful for debugging)
if (process.env.NODE_ENV !== 'production') {
  console.log(`📄 [PDF] Environment detected: ${isVercel ? 'Vercel' : isServerless ? 'AWS Lambda' : 'Local/Self-hosted'}`)
  console.log(`📄 [PDF] Using: ${isServerless ? 'canvas-to-pdf-vercel (chromium-min)' : 'canvas-to-pdf-simple (puppeteer)'}`)
}

// Dynamic import based on environment
// Using conditional require to ensure proper tree-shaking
let pdfModule: {
  convertCanvasToPDF: typeof import('./canvas-to-pdf-simple').convertCanvasToPDF
  cleanup: typeof import('./canvas-to-pdf-simple').cleanup
}

if (isServerless) {
  // Vercel/Lambda: Use chromium-min version
  pdfModule = require('./canvas-to-pdf-vercel')
} else {
  // Local/Self-hosted: Use standard Puppeteer version
  pdfModule = require('./canvas-to-pdf-simple')
}

// Re-export the appropriate implementation
export const convertCanvasToPDF = pdfModule.convertCanvasToPDF
export const cleanup = pdfModule.cleanup

// Re-export types for TypeScript consumers
export type { PDFResult }

/**
 * Get the current PDF generator implementation name
 * Useful for logging and debugging
 */
export function getPDFGeneratorInfo(): { name: string; environment: string; isServerless: boolean } {
  return {
    name: isServerless ? 'canvas-to-pdf-vercel' : 'canvas-to-pdf-simple',
    environment: isVercel ? 'Vercel' : isServerless ? 'AWS Lambda' : 'Local',
    isServerless,
  }
}
