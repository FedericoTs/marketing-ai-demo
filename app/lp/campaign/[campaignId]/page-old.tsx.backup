import { notFound } from 'next/navigation';
import { decryptRecipientId } from '@/lib/landing-page/encryption';
import {
  getCampaignLandingPageConfig,
  getRecipientById,
  getCampaign,
  getCampaignLandingPage,
} from '@/lib/database/campaign-landing-page-queries';
import { getActiveTrackingSnippets, getTemplateConfig } from '@/lib/database/template-queries';
import { getBrandProfile } from '@/lib/database/tracking-queries';
import { mergeBrandKitWithTemplate } from '@/lib/templates/brand-kit-merger';
import CampaignLandingPageClient from '@/components/landing/campaign-landing-page';

/**
 * Campaign-Based Landing Page (Server Component)
 *
 * Dual Mode Architecture:
 * 1. Personalized Mode: /lp/campaign/{campaignId}?r={encrypted_recipient_id}
 *    - Decrypts recipient ID from QR code
 *    - Pre-fills form with recipient data
 *    - Shows personalized greeting
 *    - Tracks with recipient attribution
 *
 * 2. Generic Mode: /lp/campaign/{campaignId}
 *    - No recipient ID provided
 *    - Shows generic greeting
 *    - Empty form (user fills manually)
 *    - Tracks as generic conversion
 *
 * Benefits:
 * - One landing page per campaign (vs one per recipient)
 * - Shareable campaign URLs
 * - Works without recipients (preview, testing)
 * - Graceful degradation
 */

interface PageProps {
  params: Promise<{
    campaignId: string;
  }>;
  searchParams: Promise<{
    r?: string; // Encrypted recipient ID
    t?: string; // Optional tracking parameter
  }>;
}

export default async function CampaignLandingPage({ params, searchParams }: PageProps) {
  // Await the params and searchParams
  const { campaignId } = await params;
  const { r: encryptedRecipientId, t: trackingParam } = await searchParams;

  // 1. Fetch campaign data
  const campaign = getCampaign(campaignId);

  if (!campaign) {
    console.log(`Campaign not found: ${campaignId}`);
    notFound();
  }

  // 2. Fetch campaign landing page configuration
  const config = getCampaignLandingPageConfig(campaignId);
  const landingPageRecord = getCampaignLandingPage(campaignId);

  // 3. Fetch active tracking snippets
  const trackingSnippets = getActiveTrackingSnippets();

  // 4. Fetch and apply template configuration (if template is linked)
  let templateConfig = null;
  if (landingPageRecord?.campaign_template_id) {
    const rawTemplateConfig = getTemplateConfig(landingPageRecord.campaign_template_id);

    if (rawTemplateConfig) {
      // Fetch brand profile for the company
      const brandProfile = getBrandProfile(campaign.company_name);

      // Merge brand kit with template (brand kit takes priority)
      templateConfig = mergeBrandKitWithTemplate(rawTemplateConfig, brandProfile);

      console.log(`✅ Template applied: ${landingPageRecord.campaign_template_id} with brand kit integration`);
    }
  }

  if (!config) {
    console.log(`Landing page config not found for campaign: ${campaignId}`);
    // Return a basic landing page based on campaign data
    // This allows campaigns without explicit landing page configs to still work
    const fallbackConfig = {
      title: campaign.name,
      message: campaign.message,
      companyName: campaign.company_name,
      formFields: ['name', 'email', 'phone', 'preferredDate'],
      ctaText: 'Schedule Consultation',
      thankYouMessage: 'Thank you! We will contact you soon.',
      fallbackMessage: 'Welcome! Schedule your consultation today.',
    };

    return (
      <CampaignLandingPageClient
        config={fallbackConfig}
        campaignId={campaignId}
        campaignName={campaign.name}
        recipientData={null}
        mode="generic"
        trackingSnippets={trackingSnippets}
        templateConfig={templateConfig}
      />
    );
  }

  // 5. Check for personalization (encrypted recipient ID in query parameter)
  let recipientData = null;
  let mode: 'personalized' | 'generic' = 'generic';

  if (encryptedRecipientId) {
    // Attempt to decrypt recipient ID
    const recipientId = decryptRecipientId(encryptedRecipientId, campaignId);

    if (recipientId) {
      // Successfully decrypted - fetch recipient data
      const recipient = getRecipientById(recipientId);

      if (recipient && recipient.campaign_id === campaignId) {
        // Valid recipient for this campaign
        recipientData = recipient;
        mode = 'personalized';
        console.log(`Personalized mode activated for recipient: ${recipient.name} ${recipient.lastname}`);
      } else {
        // Recipient not found or doesn't belong to this campaign
        console.log('Recipient not found or campaign mismatch - falling back to generic mode');
      }
    } else {
      // Decryption failed (tampered, expired, wrong campaign)
      console.log('Failed to decrypt recipient ID - falling back to generic mode');
    }
  }

  // 6. Render landing page with appropriate mode and template
  return (
    <CampaignLandingPageClient
      config={config}
      campaignId={campaignId}
      campaignName={campaign.name}
      recipientData={recipientData}
      mode={mode}
      trackingSnippets={trackingSnippets}
      templateConfig={templateConfig}
    />
  );
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params }: PageProps) {
  const { campaignId } = await params;
  const campaign = getCampaign(campaignId);

  if (!campaign) {
    return {
      title: 'Campaign Not Found',
    };
  }

  const config = getCampaignLandingPageConfig(campaignId);

  return {
    title: config?.title || campaign.name,
    description: config?.message || campaign.message,
  };
}
