import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/connection';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateIds = searchParams.get('ids')?.split(',') || [
      '2cH6aCVbqcimmS6-',
      'TDEibYk71tR7lwKj',
      'WPiJZYn26A-0OJEH'
    ];

    const db = getDatabase();
    const results: any = {};

    for (const templateId of templateIds) {
      const analysis: any = { templateId };

      // 1. Check campaign template exists
      const campaignTemplate = db.prepare('SELECT * FROM campaign_templates WHERE id = ?').get(templateId) as any;
      analysis.campaign_template = campaignTemplate ? {
        id: campaignTemplate.id,
        name: campaignTemplate.name,
        category: campaignTemplate.category,
        is_system: campaignTemplate.is_system_template
      } : null;

      // 2. Check DM template linked to this campaign template
      const dmTemplate = db.prepare(`
        SELECT id, campaign_id, campaign_template_id, name,
               CASE WHEN preview_image IS NULL THEN 0 ELSE 1 END as has_preview,
               LENGTH(preview_image) as preview_size
        FROM dm_templates
        WHERE campaign_template_id = ?
      `).get(templateId) as any;
      analysis.dm_template = dmTemplate || null;

      // 3. Get campaigns that used this template
      const campaigns = db.prepare(`
        SELECT c.id, c.name, c.created_at,
               dt.id as dm_template_id,
               CASE WHEN dt.preview_image IS NULL THEN 0 ELSE 1 END as has_dm_preview
        FROM dm_templates dt
        JOIN campaigns c ON c.id = dt.campaign_id
        WHERE dt.campaign_template_id = ?
        ORDER BY c.created_at DESC
      `).all(templateId) as any[];
      analysis.campaigns_using_template = campaigns;

      // 4. Check landing pages for these campaigns
      if (campaigns.length > 0) {
        const firstCampaignId = campaigns[0].id;
        const landingPage = db.prepare(`
          SELECT id, campaign_id, campaign_template_id,
                 LENGTH(page_config) as config_size,
                 created_at
          FROM campaign_landing_pages
          WHERE campaign_id = ?
        `).get(firstCampaignId);
        analysis.first_campaign_landing_page = landingPage || null;

        // Check all campaigns
        const allCampaignIds = campaigns.map((c: any) => c.id);
        const allLandingPages = db.prepare(`
          SELECT campaign_id, campaign_template_id, id
          FROM campaign_landing_pages
          WHERE campaign_id IN (${allCampaignIds.map(() => '?').join(',')})
        `).all(...allCampaignIds);
        analysis.all_landing_pages_count = allLandingPages.length;
        analysis.all_landing_pages = allLandingPages;
      }

      // 5. Check recipients for these campaigns (to understand data flow)
      if (campaigns.length > 0) {
        const allCampaignIds = campaigns.map((c: any) => c.id);
        const recipientsCount = db.prepare(`
          SELECT COUNT(*) as count
          FROM recipients
          WHERE campaign_id IN (${allCampaignIds.map(() => '?').join(',')})
        `).get(...allCampaignIds) as any;
        analysis.total_recipients = recipientsCount?.count || 0;
      }

      // 6. Summary
      analysis.summary = {
        has_campaign_template: !!campaignTemplate,
        has_dm_template: !!dmTemplate,
        has_dm_preview: !!(dmTemplate && dmTemplate.has_preview),
        campaigns_count: campaigns.length,
        has_landing_page: !!(analysis.first_campaign_landing_page),

        // Diagnosis
        issue: !dmTemplate ? 'NO_DM_TEMPLATE_LINKED' :
               !dmTemplate.has_preview ? 'DM_TEMPLATE_WITHOUT_PREVIEW' :
               campaigns.length === 0 ? 'NO_CAMPAIGNS_USING_TEMPLATE' :
               !analysis.first_campaign_landing_page ? 'NO_LANDING_PAGE_FOR_CAMPAIGN' :
               'ALL_DATA_PRESENT'
      };

      results[templateId] = analysis;
    }

    return NextResponse.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
