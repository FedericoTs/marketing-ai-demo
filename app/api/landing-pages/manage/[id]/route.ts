/**
 * Landing Page Update API
 *
 * GET /api/landing-pages/[id] - Get single landing page
 * PATCH /api/landing-pages/[id] - Update landing page config
 *
 * Phase 9.2.13 - Landing Page Manager
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get landing page with campaign info
    const { data: landingPage, error: fetchError } = await supabase
      .from('landing_pages')
      .select(`
        *,
        campaigns!inner(
          id,
          name,
          organization_id
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError || !landingPage) {
      return NextResponse.json(
        { error: 'Landing page not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile || landingPage.campaigns.organization_id !== profile.organization_id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: landingPage,
    });
  } catch (error) {
    console.error('[Landing Page GET] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch landing page',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get landing page with campaign ownership info
    const { data: landingPage, error: fetchError } = await supabase
      .from('landing_pages')
      .select(`
        *,
        campaigns!inner(
          organization_id
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError || !landingPage) {
      return NextResponse.json(
        { error: 'Landing page not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile || landingPage.campaigns.organization_id !== profile.organization_id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get update payload
    const { page_config } = await request.json();

    if (!page_config) {
      return NextResponse.json(
        { error: 'page_config is required' },
        { status: 400 }
      );
    }

    // Update landing page config (preserving tracking_code and other fields)
    const { data: updated, error: updateError } = await supabase
      .from('landing_pages')
      .update({
        page_config,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[Landing Page PATCH] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update landing page' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('[Landing Page PATCH] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update landing page',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
