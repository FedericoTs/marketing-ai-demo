import { NextRequest, NextResponse } from 'next/server';
import type { DesignTemplateInsert } from '@/lib/database/types';
import { getFormat } from '@/lib/design/print-formats';

/**
 * MOCK API for design templates
 * This is a temporary workaround until Supabase migrations are applied
 *
 * POST /api/design-templates/mock
 * Create a new design template (saved to localStorage on client-side)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    if (!body.canvas_json) {
      return NextResponse.json(
        { error: 'canvas_json is required' },
        { status: 400 }
      );
    }

    if (!body.format_type) {
      return NextResponse.json(
        { error: 'format_type is required' },
        { status: 400 }
      );
    }

    // Get format details
    const format = getFormat(body.format_type);

    // Generate mock template ID
    const templateId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Build template response (mimics database structure)
    const template = {
      id: templateId,
      organization_id: body.organization_id || 'mock-org',
      created_by: body.created_by || 'mock-user',
      name: body.name,
      description: body.description || null,
      thumbnail_url: body.thumbnail_url || null,
      tags: body.tags || [],
      canvas_json: body.canvas_json,
      canvas_width: body.canvas_width || format.widthPixels,
      canvas_height: body.canvas_height || format.heightPixels,
      variable_mappings: body.variable_mappings || {},
      format_type: body.format_type,
      format_width_inches: format.widthInches,
      format_height_inches: format.heightInches,
      postal_country: body.postal_country || 'US',
      background_image_url: body.background_image_url || null,
      status: body.status || 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('💾 Mock template created (client-side storage):', {
      name: template.name,
      format: template.format_type,
      dimensions: `${template.canvas_width}×${template.canvas_height}px`,
      id: templateId,
    });

    return NextResponse.json({
      success: true,
      template,
      warning: 'Template saved to browser localStorage. Run Supabase migrations to enable database storage.',
    });
  } catch (error) {
    console.error('❌ Error creating mock template:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create template',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/design-templates/mock
 * Get all mock templates (from localStorage on client-side)
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    templates: [],
    message: 'Mock templates are stored in browser localStorage. Use client-side retrieval.',
  });
}
