import { notFound } from 'next/navigation';
import { getCampaign, getCampaignLandingPage } from '@/lib/database/campaign-landing-page-queries';
import { getTemplateById } from '@/lib/landing-page-templates';
import { getBrandProfile } from '@/lib/database/tracking-queries';
import CampaignLandingPageClient from '@/components/landing/campaign-landing-page';

/**
 * Landing Page Preview Route
 *
 * This route renders a landing page preview with customization applied.
 * Supports two modes:
 *
 * 1. **Live Preview Mode** (with query params):
 *    - Used by customization modal for real-time preview
 *    - Query params: template, config (JSON)
 *    - Does NOT save to database
 *
 * 2. **Saved Preview Mode** (without query params):
 *    - Loads saved configuration from campaign_landing_pages table
 *    - Shows the final customized landing page
 *    - URL: /lp/campaign/{campaignId}/preview
 *
 * Priority for config loading:
 * 1. Query params (for live preview)
 * 2. Database (for saved landing pages)
 * 3. Brand kit defaults
 */

interface PreviewPageProps {
  params: Promise<{
    campaignId: string;
  }>;
  searchParams: Promise<{
    template?: string;
    config?: string;
  }>;
}

export default async function LandingPagePreview({ params, searchParams }: PreviewPageProps) {
  const { campaignId } = await params;
  const { template, config: configParam } = await searchParams;

  console.log('🔍 Loading preview for campaign:', campaignId);

  // Fetch campaign data (for campaign context like name, message)
  const campaign = getCampaign(campaignId);

  if (!campaign) {
    console.log(`❌ Preview: Campaign not found: ${campaignId}`);
    notFound();
  }

  console.log('✅ Campaign loaded:', campaign.name);

  // Parse customization config from query parameter OR load from database
  let customization: any = {};
  if (configParam) {
    // Use config from query params (for live preview during customization)
    try {
      customization = JSON.parse(configParam);
    } catch (error) {
      console.error('Failed to parse preview config:', error);
    }
  } else {
    // Load saved config from database (for saved landing pages)
    try {
      const savedLandingPage = getCampaignLandingPage(campaignId);
      if (savedLandingPage) {
        customization = JSON.parse(savedLandingPage.page_config);
        console.log('✅ Loaded saved landing page config from database:', {
          templateId: savedLandingPage.campaign_template_id,
          colors: {
            primary: customization.primaryColor,
            secondary: customization.secondaryColor,
            accent: customization.accentColor
          }
        });
      }
    } catch (error) {
      console.error('Failed to load saved landing page config:', error);
    }
  }

  // Get template configuration
  // Priority: 1. Query param (live preview) 2. Saved template ID (from database) 3. Default
  const savedLandingPage = !configParam ? getCampaignLandingPage(campaignId) : null;
  const templateId = template || savedLandingPage?.campaign_template_id || 'book-appointment';
  const templateDef = getTemplateById(templateId);

  if (!templateDef) {
    console.log(`Template not found: ${templateId}`);
    notFound();
  }

  // Fetch brand profile for full brand kit inheritance (colors, fonts, logo)
  const brandProfile = campaign.company_name ? getBrandProfile(campaign.company_name) : undefined;

  // Priority: 1. User customization (from modal, which uses brand kit as default) > 2. Brand Kit > 3. Template defaults
  // The customization modal already applies brand kit colors, so user customization has brand kit baked in
  const primaryColor = customization.primaryColor || brandProfile?.primary_color || templateDef.colors.primary;
  const secondaryColor = customization.secondaryColor || brandProfile?.secondary_color || templateDef.colors.secondary;
  const accentColor = customization.accentColor || brandProfile?.accent_color || templateDef.colors.accent;
  const backgroundColor = customization.backgroundColor || brandProfile?.background_color || templateDef.colors.background;
  const textColor = customization.textColor || brandProfile?.text_color || templateDef.colors.text;

  // Apply brand fonts
  const headingFont = brandProfile?.heading_font || templateDef.typography.headingFont;
  const bodyFont = brandProfile?.body_font || templateDef.typography.bodyFont;

  // Get brand logo
  const logoUrl = brandProfile?.logo_url || null;

  console.log('🎨 Brand Kit inheritance:', {
    brandProfile: brandProfile ? {
      colors: { primary: brandProfile.primary_color, secondary: brandProfile.secondary_color, accent: brandProfile.accent_color },
      fonts: { heading: brandProfile.heading_font, body: brandProfile.body_font },
      logo: brandProfile.logo_url
    } : null,
    customization: { primary: customization.primaryColor, secondary: customization.secondaryColor, accent: customization.accentColor },
    final: { primaryColor, secondaryColor, accentColor, headingFont, bodyFont, logoUrl }
  });

  // Build preview config (merge customization with brand kit and template defaults)
  const previewConfig = {
    title: customization.title || `${campaign.name} - Schedule Consultation`,
    message: customization.message || campaign.message || 'Welcome to our campaign',
    companyName: campaign.company_name || 'Your Company',
    formFields: ['name', 'email', 'phone', 'preferredDate'],
    ctaText: customization.ctaText || 'Book Appointment',
    thankYouMessage: 'Thank you! We will contact you soon.',
    fallbackMessage: 'Welcome! Schedule your consultation today.',
    // Apply colors with priority: customization > brand kit > template
    primaryColor,
    secondaryColor,
    accentColor,
  };

  return (
    <div className="min-h-screen">
      {/* Preview Banner */}
      <div className="bg-purple-600 text-white py-2 px-4 text-center text-sm font-medium">
        <span className="opacity-90">Preview Mode</span> - This is how your landing page will look
      </div>

      {/* Render Landing Page */}
      <CampaignLandingPageClient
        config={previewConfig}
        campaignId={campaignId}
        campaignName={campaign.name}
        recipientData={null}
        mode="generic"
        trackingSnippets={[]}
        templateConfig={{
          template_id: templateId,
          colors: {
            primary: primaryColor,
            secondary: secondaryColor,
            accent: accentColor,
            background: backgroundColor,
            text: textColor,
            textLight: textColor + '80',
          },
          typography: {
            headingFont: headingFont,
            headingWeight: '700',
            bodyFont: bodyFont,
            bodyWeight: '400',
          },
          effects: {
            gradientBackground: templateDef.effects.gradientBackground,
            backgroundImage: null,
            cardShadow: true,
          },
          branding: {
            logoUrl: logoUrl,
          },
        } as any}
        isPreview={true}
      />
    </div>
  );
}
