/**
 * MINIMAL PostGrid Test
 * Tests PostGrid API with simplest possible postcard
 */

import { NextResponse } from 'next/server'
import { createPostGridClient } from '@/lib/postgrid/client'

export async function GET() {
  try {
    console.log('🧪 [PostGrid Test] Starting minimal test...')

    const postgrid = createPostGridClient('test')

    // Hardcoded test postcard
    const result = await postgrid.createPostcard({
      to: {
        firstName: 'John',
        lastName: 'Doe',
        addressLine1: '123 Test St',
        city: 'San Francisco',
        provinceOrState: 'CA',
        postalOrZip: '94102',
        countryCode: 'US',
      },
      from: {
        firstName: 'Test',
        lastName: 'Company',
        addressLine1: '456 Business Ave',
        city: 'New York',
        provinceOrState: 'NY',
        postalOrZip: '10001',
      },
      size: '6x4',
      pdf: Buffer.from(''), // Empty for now
      mailType: 'usps_first_class',
      description: 'Minimal PostGrid API Test',
    })

    console.log('✅ [PostGrid Test] Success!', result)

    return NextResponse.json({
      success: true,
      postcardId: result.id,
      result,
    })
  } catch (error) {
    console.error('❌ [PostGrid Test] Failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error,
      },
      { status: 500 }
    )
  }
}
