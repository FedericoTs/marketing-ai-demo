import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/database/connection";
import { getTemplateById } from "@/lib/database/campaign-management";

export const dynamic = "force-dynamic";

/**
 * GET /api/campaigns/templates/[id]/analytics
 * Get REAL analytics data for a specific template by joining database tables
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get the template
    const template = getTemplateById(id);
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const db = getDatabase();

    // REAL ANALYTICS: Get actual campaigns that used this template
    // Join: campaign_templates -> dm_templates -> campaigns -> recipients -> conversions
    const realStatsStmt = db.prepare(`
      SELECT
        COUNT(DISTINCT dt.campaign_id) as campaigns_using_template,
        COUNT(DISTINCT r.id) as total_recipients,
        COUNT(DISTINCT CASE WHEN e.event_type = 'page_view' THEN r.tracking_id END) as total_page_views,
        COUNT(DISTINCT CASE WHEN e.event_type = 'qr_scan' THEN r.tracking_id END) as total_qr_scans,
        COUNT(DISTINCT c.id) as total_conversions,
        COUNT(DISTINCT CASE WHEN c.conversion_type = 'appointment_booked' THEN c.id END) as appointment_conversions
      FROM dm_templates dt
      LEFT JOIN recipients r ON r.campaign_id = dt.campaign_id
      LEFT JOIN events e ON e.tracking_id = r.tracking_id
      LEFT JOIN conversions c ON c.tracking_id = r.tracking_id
      WHERE dt.campaign_template_id = ?
    `);

    const realStats = realStatsStmt.get(id) as {
      campaigns_using_template: number;
      total_recipients: number;
      total_page_views: number;
      total_qr_scans: number;
      total_conversions: number;
      appointment_conversions: number;
    };

    // Calculate REAL conversion rate
    const conversionRate = realStats.total_recipients > 0
      ? (realStats.total_conversions / realStats.total_recipients) * 100
      : 0;

    // Calculate page view rate (how many recipients actually viewed the page)
    const pageViewRate = realStats.total_recipients > 0
      ? (realStats.total_page_views / realStats.total_recipients) * 100
      : 0;

    // Get usage history - actual campaigns using this template
    const usageHistoryStmt = db.prepare(`
      SELECT
        c.id,
        c.name,
        c.created_at,
        COUNT(DISTINCT r.id) as recipients_count,
        COUNT(DISTINCT conv.id) as conversions_count,
        CASE
          WHEN COUNT(DISTINCT r.id) > 0
          THEN (COUNT(DISTINCT conv.id) * 100.0 / COUNT(DISTINCT r.id))
          ELSE 0
        END as conversion_rate
      FROM dm_templates dt
      JOIN campaigns c ON c.id = dt.campaign_id
      LEFT JOIN recipients r ON r.campaign_id = c.id
      LEFT JOIN conversions conv ON conv.tracking_id = r.tracking_id
      WHERE dt.campaign_template_id = ?
      GROUP BY c.id, c.name, c.created_at
      ORDER BY c.created_at DESC
      LIMIT 10
    `);

    const usageHistory = usageHistoryStmt.all(id) as Array<{
      id: string;
      name: string;
      created_at: string;
      recipients_count: number;
      conversions_count: number;
      conversion_rate: number;
    }>;

    // Get category comparison stats
    const categoryStmt = db.prepare(`
      SELECT
        COUNT(*) as total_templates,
        AVG(use_count) as avg_use_count
      FROM campaign_templates
      WHERE category = ?
    `);
    const categoryStats = categoryStmt.get(template.category) as {
      total_templates: number;
      avg_use_count: number;
    };

    // Get overall platform stats for context
    const platformStmt = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM campaigns) as total_campaigns,
        (SELECT COUNT(*) FROM recipients) as total_recipients,
        (SELECT COUNT(*) FROM events WHERE event_type = 'page_view') as total_page_views,
        (SELECT COUNT(*) FROM events WHERE event_type = 'qr_scan') as total_qr_scans,
        (SELECT COUNT(*) FROM conversions) as total_conversions
    `);
    const platformStats = platformStmt.get() as {
      total_campaigns: number;
      total_recipients: number;
      total_page_views: number;
      total_qr_scans: number;
      total_conversions: number;
    };

    const analytics = {
      template: {
        id: template.id,
        name: template.name,
        category: template.category,
        use_count: template.use_count,
        created_at: template.created_at,
      },
      performance: {
        // REAL DATA from database joins
        campaigns_count: realStats.campaigns_using_template,
        total_recipients: realStats.total_recipients,
        total_page_views: realStats.total_page_views,
        total_qr_scans: realStats.total_qr_scans,
        total_conversions: realStats.total_conversions,
        appointment_conversions: realStats.appointment_conversions,
        conversion_rate: conversionRate,
        page_view_rate: pageViewRate,
      },
      category_comparison: {
        total_templates: categoryStats.total_templates,
        avg_use_count: Math.round(categoryStats.avg_use_count),
        rank: template.use_count >= categoryStats.avg_use_count ? 'above_average' : 'below_average',
      },
      platform_context: platformStats,
      usage_history: usageHistory,
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Error fetching template analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
