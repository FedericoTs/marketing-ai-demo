import { NextRequest, NextResponse } from 'next/server';

/**
 * Logo Proxy API
 * Proxies external logo URLs to avoid CORS issues in canvas composition
 * Converts external images to base64 data URLs that can be safely used in canvas
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const logoUrl = searchParams.get('url');

    if (!logoUrl) {
      return NextResponse.json(
        { success: false, error: 'Logo URL is required' },
        { status: 400 }
      );
    }

    console.log(`🔄 Proxying logo from: ${logoUrl.substring(0, 100)}...`);

    // Fetch the logo from external URL
    const response = await fetch(logoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.error(`❌ Failed to fetch logo: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { success: false, error: `Failed to fetch logo: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the image data
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get content type (default to PNG if not provided)
    const contentType = response.headers.get('content-type') || 'image/png';

    // Convert to base64 data URL
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;

    console.log(`✅ Logo proxied successfully: ${buffer.length} bytes, ${contentType}`);

    // Return as JSON with data URL
    return NextResponse.json({
      success: true,
      dataUrl,
      contentType,
      size: buffer.length,
    });

  } catch (error) {
    console.error('❌ Error proxying logo:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to proxy logo' },
      { status: 500 }
    );
  }
}
