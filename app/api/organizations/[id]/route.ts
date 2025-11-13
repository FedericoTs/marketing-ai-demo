/**
 * Organization API Route
 * GET /api/organizations/[id]
 *
 * Returns organization details including credits balance
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { successResponse, errorResponse } from '@/lib/utils/api-response'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await params

    console.log('🏢 [Organization API] Fetching organization:', organizationId)

    const supabase = createServiceClient()

    const { data: organization, error } = await supabase
      .from('organizations')
      .select('id, name, credits, created_at, updated_at')
      .eq('id', organizationId)
      .single()

    if (error || !organization) {
      console.error('❌ [Organization API] Not found:', error)
      return NextResponse.json(
        errorResponse('Organization not found', 'NOT_FOUND'),
        { status: 404 }
      )
    }

    console.log('✅ [Organization API] Found:', organization.name, `$${organization.credits} credits`)

    return NextResponse.json(successResponse(organization))
  } catch (error) {
    console.error('❌ [Organization API] Unexpected error:', error)
    return NextResponse.json(
      errorResponse('Failed to fetch organization', 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}
