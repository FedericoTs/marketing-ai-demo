import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export const dynamic = "force-dynamic";

/**
 * GET /api/campaigns/templates/[id]/analytics
 * Get analytics data for a specific template using Supabase
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    // Get the template
    const { data: template, error: templateError } = await supabase
      .from('campaign_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        errorResponse("Template not found", "TEMPLATE_NOT_FOUND"),
        { status: 404 }
      );
    }

    // Get campaigns that use this template
    const { data: dmTemplates, error: dmError } = await supabase
      .from('dm_templates')
      .select('campaign_id')
      .eq('campaign_template_id', id);

    if (dmError) {
      console.error("Error fetching dm_templates:", dmError);
    }

    const campaignIds = dmTemplates?.map(dt => dt.campaign_id).filter(Boolean) || [];

    // Get recipients for these campaigns
    let totalRecipients = 0;
    let totalConversions = 0;
    let totalPageViews = 0;
    let totalQrScans = 0;

    if (campaignIds.length > 0) {
      // Get recipient count
      const { count: recipientCount } = await supabase
        .from('campaign_recipients')
        .select('id', { count: 'exact', head: true })
        .in('campaign_id', campaignIds);

      totalRecipients = recipientCount || 0;

      // Get events for these recipients
      const { data: recipients } = await supabase
        .from('campaign_recipients')
        .select('tracking_code')
        .in('campaign_id', campaignIds);

      const trackingCodes = recipients?.map(r => r.tracking_code).filter(Boolean) || [];

      if (trackingCodes.length > 0) {
        // Get page views
        const { count: pageViewCount } = await supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .in('tracking_code', trackingCodes)
          .eq('event_type', 'page_view');

        totalPageViews = pageViewCount || 0;

        // Get QR scans
        const { count: qrScanCount } = await supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .in('tracking_code', trackingCodes)
          .eq('event_type', 'qr_scan');

        totalQrScans = qrScanCount || 0;

        // Get conversions
        const { count: conversionCount } = await supabase
          .from('conversions')
          .select('id', { count: 'exact', head: true })
          .in('tracking_code', trackingCodes);

        totalConversions = conversionCount || 0;
      }
    }

    // Calculate rates
    const conversionRate = totalRecipients > 0
      ? (totalConversions / totalRecipients) * 100
      : 0;

    const pageViewRate = totalRecipients > 0
      ? (totalPageViews / totalRecipients) * 100
      : 0;

    // Get category stats
    const { data: categoryTemplates } = await supabase
      .from('campaign_templates')
      .select('use_count')
      .eq('category', template.category);

    const avgUseCount = categoryTemplates && categoryTemplates.length > 0
      ? categoryTemplates.reduce((sum, t) => sum + (t.use_count || 0), 0) / categoryTemplates.length
      : 0;

    const analytics = {
      template: {
        id: template.id,
        name: template.name,
        category: template.category,
        use_count: template.use_count || 0,
        created_at: template.created_at,
      },
      performance: {
        campaigns_count: campaignIds.length,
        total_recipients: totalRecipients,
        total_page_views: totalPageViews,
        total_qr_scans: totalQrScans,
        total_conversions: totalConversions,
        appointment_conversions: 0, // Would need additional query
        conversion_rate: conversionRate,
        page_view_rate: pageViewRate,
      },
      category_comparison: {
        total_templates: categoryTemplates?.length || 0,
        avg_use_count: Math.round(avgUseCount),
        rank: (template.use_count || 0) >= avgUseCount ? 'above_average' : 'below_average',
      },
      platform_context: {
        total_campaigns: 0,
        total_recipients: 0,
        total_page_views: 0,
        total_qr_scans: 0,
        total_conversions: 0,
      },
      usage_history: [],
    };

    return NextResponse.json(
      successResponse(analytics, "Template analytics retrieved successfully")
    );
  } catch (error) {
    console.error("Error fetching template analytics:", error);
    return NextResponse.json(
      errorResponse("Failed to fetch analytics", "ANALYTICS_ERROR"),
      { status: 500 }
    );
  }
}
