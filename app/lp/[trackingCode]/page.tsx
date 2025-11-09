/**
 * Public Landing Page Route
 * Serves personalized landing pages for QR code scan tracking
 *
 * Route: /lp/[trackingCode]
 * Access: Public (no authentication required)
 *
 * Features:
 * - Fetches landing page data by tracking code
 * - Renders appropriate template
 * - Automatically tracks page view
 * - Shows 404 for invalid tracking codes
 * - SEO optimized with metadata
 * - Mobile-first responsive
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLandingPageByTrackingCode } from '@/lib/database/landing-queries';
import { DefaultTemplate } from '@/components/landing/templates/default-template';

// Dynamic route params type
interface PageProps {
  params: Promise<{
    trackingCode: string;
  }>;
}

// ============================================================================
// METADATA (SEO)
// ============================================================================

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { trackingCode } = await params;
  const landingPage = await getLandingPageByTrackingCode(trackingCode);

  if (!landingPage) {
    return {
      title: 'Page Not Found',
      description: 'The page you are looking for could not be found.',
    };
  }

  const headline = landingPage.page_config.headline || 'Welcome';
  const subheadline = landingPage.page_config.subheadline || 'Thanks for visiting';

  return {
    title: headline,
    description: subheadline,
    openGraph: {
      title: headline,
      description: subheadline,
      images: landingPage.page_config.image_url
        ? [landingPage.page_config.image_url]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: headline,
      description: subheadline,
      images: landingPage.page_config.image_url
        ? [landingPage.page_config.image_url]
        : [],
    },
    robots: {
      index: false, // Don't index personalized landing pages
      follow: false,
    },
  };
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default async function LandingPage({ params }: PageProps) {
  const { trackingCode } = await params;

  // Fetch landing page data (public access, no auth required)
  const landingPage = await getLandingPageByTrackingCode(trackingCode);

  // Show 404 if landing page not found or inactive
  if (!landingPage) {
    notFound();
  }

  // Track page view (server-side)
  // This will be logged to the events table
  await trackPageView(trackingCode);

  // Render template based on template_type
  const renderTemplate = () => {
    switch (landingPage.template_type) {
      case 'default':
        return (
          <DefaultTemplate
            config={landingPage.page_config}
            recipientData={landingPage.recipient_data}
            trackingCode={trackingCode}
          />
        );

      // Future templates can be added here
      // case 'appointment':
      //   return <AppointmentTemplate ... />;
      // case 'questionnaire':
      //   return <QuestionnaireTemplate ... />;
      // case 'product':
      //   return <ProductTemplate ... />;
      // case 'contact':
      //   return <ContactTemplate ... />;

      default:
        // Fallback to default template
        return (
          <DefaultTemplate
            config={landingPage.page_config}
            recipientData={landingPage.recipient_data}
            trackingCode={trackingCode}
          />
        );
    }
  };

  return (
    <>
      {/* Render selected template */}
      {renderTemplate()}

      {/* Client-side analytics tracking (if configured) */}
      {landingPage.page_config.google_analytics_id && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${landingPage.page_config.google_analytics_id}');
            `,
          }}
        />
      )}

      {/* Facebook Pixel (if configured) */}
      {landingPage.page_config.facebook_pixel_id && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${landingPage.page_config.facebook_pixel_id}');
              fbq('track', 'PageView');
            `,
          }}
        />
      )}
    </>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Track page view event
 * Logs to events table for analytics
 */
async function trackPageView(trackingCode: string): Promise<void> {
  try {
    // Call tracking API (server-side)
    // Use absolute URL for server-side fetch
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    await fetch(`${baseUrl}/api/tracking/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackingId: trackingCode, // API expects trackingId
        eventType: 'page_view', // API expects eventType
        eventData: {
          timestamp: new Date().toISOString(),
          source: 'landing_page',
        },
      }),
    });
  } catch (error) {
    // Silent fail - don't break page load if tracking fails
    console.error('Error tracking page view:', error);
  }
}
