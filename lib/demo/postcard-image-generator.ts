/**
 * Postcard Image Generator
 *
 * Renders HTML postcards as PNG images using Puppeteer for professional email delivery.
 *
 * Phase 9.2.15 - Phase 4: Server-side postcard image generation
 */

import puppeteer, { Browser } from 'puppeteer';

let browser: Browser | null = null;

/**
 * Get or create Puppeteer browser instance (reusable for performance)
 */
async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Overcome limited resource problems
        '--disable-gpu',
      ],
    });
  }
  return browser;
}

/**
 * Generate PNG image from HTML postcard
 *
 * @param html - Complete HTML document for postcard
 * @param options - Image generation options
 * @returns Base64-encoded PNG data URL
 */
export async function generatePostcardImage(
  html: string,
  options: {
    width?: number;
    height?: number;
  } = {}
): Promise<string> {
  const { width = 1200, height = 800 } = options;

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Set viewport to match postcard dimensions
    await page.setViewport({
      width,
      height,
      deviceScaleFactor: 2, // 2x resolution for crisp images
    });

    // Load HTML content
    await page.setContent(html, {
      waitUntil: 'networkidle0', // Wait for all resources to load
    });

    // Take screenshot as PNG
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false, // Use viewport dimensions
      encoding: 'base64',
    });

    // Convert to data URL
    const dataUrl = `data:image/png;base64,${screenshot}`;

    return dataUrl;
  } catch (error) {
    console.error('[generatePostcardImage] Error:', error);
    throw new Error('Failed to generate postcard image');
  } finally {
    await page.close();
  }
}

/**
 * Generate PNG buffer from HTML postcard
 *
 * @param html - Complete HTML document for postcard
 * @param options - Image generation options
 * @returns PNG buffer for file attachment
 */
export async function generatePostcardImageBuffer(
  html: string,
  options: {
    width?: number;
    height?: number;
  } = {}
): Promise<Buffer> {
  const { width = 1200, height = 800 } = options;

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({
      width,
      height,
      deviceScaleFactor: 2,
    });

    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });

    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false,
      encoding: 'binary',
    });

    return screenshot as Buffer;
  } catch (error) {
    console.error('[generatePostcardImageBuffer] Error:', error);
    throw new Error('Failed to generate postcard image buffer');
  } finally {
    await page.close();
  }
}

/**
 * Cleanup browser instance when shutting down
 */
export async function cleanup() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
