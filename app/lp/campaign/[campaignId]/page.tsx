import { notFound } from 'next/navigation';
import { decryptRecipientId } from '@/lib/landing-page/encryption';
import { getCampaignPublic, getRecipientPublic } from '@/lib/database/campaign-supabase-queries';
import { getLandingPagesByCampaign } from '@/lib/database/landing-queries';
import CampaignLandingPageClient from '@/components/landing/campaign-landing-page';

/**
 * Campaign-Based Landing Page (Server Component) - Supabase Version
 *
 * Dual Mode Architecture:
 * 1. Personalized Mode: /lp/campaign/{campaignId}?r={recipientId}&t={trackingCode}
 *    - Shows recipient data
 *    - Pre-fills form with recipient info
 *    - Personalized greeting
 *
 * 2. Generic Mode: /lp/campaign/{campaignId}
 *    - Generic greeting
 *    - Empty form
 */

interface PageProps {
  params: Promise<{
    campaignId: string;
  }>;
  searchParams: Promise<{
    r?: string; // Recipient ID (not encrypted in current implementation)
    t?: string; // Tracking code
  }>;
}

export default async function CampaignLandingPage({ params, searchParams }: PageProps) {
  // Await the params and searchParams
  const { campaignId } = await params;
  const { r: recipientId, t: trackingCode } = await searchParams;

  console.log(`🌐 [Landing Page] Campaign: ${campaignId}, Recipient: ${recipientId || 'none'}, Tracking: ${trackingCode || 'none'}`);

  // 1. Fetch campaign data from Supabase
  const campaign = await getCampaignPublic(campaignId);

  if (!campaign) {
    console.log(`❌ [Landing Page] Campaign not found: ${campaignId}`);
    notFound();
  }

  console.log(`✅ [Landing Page] Campaign loaded: ${campaign.name}`);

  // 2. Fetch landing pages for this campaign
  const landingPages = await getLandingPagesByCampaign(campaignId);

  console.log(`📋 [Landing Page] Found ${landingPages.length} landing pages for campaign`);

  // 3. Check for personalization (recipient ID in query parameter)
  let recipientData = null;
  let mode: 'personalized' | 'generic' = 'generic';

  if (recipientId) {
    // Fetch recipient data
    const recipient = await getRecipientPublic(recipientId);

    if (recipient) {
      recipientData = {
        id: recipient.id,
        name: recipient.first_name,
        lastname: recipient.last_name,
        firstName: recipient.first_name,
        lastName: recipient.last_name,
        email: recipient.email,
        phone: recipient.phone,
        address: recipient.address_line1,
        city: recipient.city,
        state: recipient.state,
        zip: recipient.zip_code,
        country: recipient.country,
      };
      mode = 'personalized';
      console.log(`✅ [Landing Page] Personalized mode for: ${recipient.first_name} ${recipient.last_name}`);
    } else {
      console.log(`⚠️ [Landing Page] Recipient not found: ${recipientId} - using generic mode`);
    }
  }

  // 4. Build config from landing page data or campaign fallback
  const landingPage = landingPages[0]; // Use first landing page if available

  const config = landingPage
    ? {
        title: landingPage.page_config?.title || campaign.name,
        message: landingPage.page_config?.message || campaign.description || 'Welcome to our campaign!',
        companyName: campaign.name,
        formFields: landingPage.page_config?.formFields || ['name', 'email', 'phone'],
        ctaText: landingPage.page_config?.ctaText || 'Submit',
        thankYouMessage: landingPage.page_config?.thankYouMessage || 'Thank you!',
        fallbackMessage: 'Welcome! Please fill out the form below.',
      }
    : {
        // Fallback config if no landing pages exist
        title: campaign.name,
        message: campaign.description || 'Welcome to our campaign!',
        companyName: campaign.name,
        formFields: ['name', 'email', 'phone', 'message'],
        ctaText: 'Submit',
        thankYouMessage: 'Thank you! We will be in touch soon.',
        fallbackMessage: 'Welcome! Please fill out the form below.',
      };

  // 5. Render landing page
  return (
    <CampaignLandingPageClient
      config={config}
      campaignId={campaignId}
      campaignName={campaign.name}
      recipientData={recipientData}
      mode={mode}
      trackingSnippets={[]} // No tracking snippets for now
      templateConfig={null} // No template config for now
    />
  );
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params }: PageProps) {
  const { campaignId } = await params;
  const campaign = await getCampaignPublic(campaignId);

  if (!campaign) {
    return {
      title: 'Campaign Not Found',
    };
  }

  return {
    title: campaign.name,
    description: campaign.description || `Campaign: ${campaign.name}`,
  };
}
