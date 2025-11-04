import { NextRequest, NextResponse } from 'next/server';
import {
  createAdminClient,
  getOrganizationTemplates,
} from '@/lib/database/supabase-queries';
import type { DesignTemplateInsert } from '@/lib/database/types';
import { getFormat } from '@/lib/design/print-formats';

/**
 * GET /api/design-templates
 * Get all design templates for the current organization
 * Query params:
 *   - organizationId (required): Organization ID
 *   - status (optional): Filter by status (draft, active, archived)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organizationId');
    const status = searchParams.get('status') || undefined;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    const templates = await getOrganizationTemplates(organizationId, status);

    return NextResponse.json({
      success: true,
      templates,
      count: templates.length,
    });
  } catch (error) {
    console.error('❌ Error fetching design templates:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch templates',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/design-templates
 * Create a new design template
 * Body: DesignTemplateInsert
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.organization_id) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
    }

    if (!body.created_by) {
      return NextResponse.json(
        { error: 'created_by is required' },
        { status: 400 }
      );
    }

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

    // Get format details to populate dimensions
    const format = getFormat(body.format_type);

    // Build template insert payload
    const templateData: DesignTemplateInsert = {
      organization_id: body.organization_id,
      created_by: body.created_by,
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
      background_generation_prompt: body.background_generation_prompt || null,
      background_cost: body.background_cost || 0,
      status: body.status || 'draft',
    };

    console.log('📝 Creating design template:', {
      name: templateData.name,
      format: templateData.format_type,
      dimensions: `${templateData.canvas_width}×${templateData.canvas_height}px`,
    });

    // Use admin client to bypass RLS for server-side operations
    const supabase = createAdminClient();

    const { data: template, error } = await supabase
      .from('design_templates')
      .insert(templateData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create template: ${error.message}`);
    }

    console.log('✅ Template created:', template.id);

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('❌ Error creating design template:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create template',
      },
      { status: 500 }
    );
  }
}
