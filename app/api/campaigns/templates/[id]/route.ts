import { NextRequest, NextResponse } from 'next/server';
import {
  getTemplateById,
  deleteTemplate,
  updateTemplate,
  incrementTemplateUseCount,
} from '@/lib/database/campaign-management';

/**
 * GET /api/campaigns/templates/[id]
 * Get a specific template by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const template = getTemplateById(id);

    if (!template) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...template,
        template_data: JSON.parse(template.template_data),
      },
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch template',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/campaigns/templates/[id]
 * Update a template
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, category, templateData } = body;

    const success = updateTemplate(id, {
      name,
      description,
      category,
      templateData,
    });

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update template (template not found or is a system template)',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Template updated successfully',
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update template',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/campaigns/templates/[id]
 * Delete a template (system templates are protected)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = deleteTemplate(id);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete template (template not found or is a system template)',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete template',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/campaigns/templates/[id]/use
 * Increment template use count
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    incrementTemplateUseCount(id);

    return NextResponse.json({
      success: true,
      message: 'Template use count incremented',
    });
  } catch (error) {
    console.error('Error incrementing template use count:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to increment template use count',
      },
      { status: 500 }
    );
  }
}
