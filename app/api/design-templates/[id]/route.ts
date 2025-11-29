import { NextRequest, NextResponse } from 'next/server';
import {
  getTemplateById,
  updateTemplate,
  softDeleteTemplate,
} from '@/lib/database/supabase-queries';
import { getFormat } from '@/lib/design/print-formats';

/**
 * GET /api/design-templates/[id]
 * Get a single design template by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const template = await getTemplateById(id);

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('❌ Error fetching design template:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch template',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/design-templates/[id]
 * Update a design template
 * Body: Partial<DesignTemplateInsert>
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // If format_type is being updated, update dimensions too
    if (body.format_type) {
      const format = getFormat(body.format_type);
      body.format_width_inches = format.widthInches;
      body.format_height_inches = format.heightInches;
      body.canvas_width = format.widthPixels;
      body.canvas_height = format.heightPixels;
    }

    console.log('📝 Updating design template:', id);

    const template = await updateTemplate(id, body);

    console.log('✅ Template updated:', template.id);

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('❌ Error updating design template:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update template',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/design-templates/[id]
 * Soft delete a design template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('🗑️ Soft deleting design template:', id);

    const template = await softDeleteTemplate(id);

    console.log('✅ Template soft deleted:', template.id);

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('❌ Error deleting design template:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete template',
      },
      { status: 500 }
    );
  }
}
