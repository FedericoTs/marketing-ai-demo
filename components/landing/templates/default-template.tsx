'use client';

/**
 * Default Landing Page Template
 * Simple, conversion-focused design for direct mail QR code destinations
 *
 * Design Philosophy:
 * - Mobile-first responsive
 * - Minimal distractions
 * - Strong, clear CTA
 * - Fast loading (<2s)
 * - Personalized greeting
 */

import type { LandingPageConfig, LandingPageRecipientData } from '@/lib/database/types';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

interface DefaultTemplateProps {
  config: LandingPageConfig;
  recipientData: LandingPageRecipientData | null;
  trackingCode: string;
}

export function DefaultTemplate({
  config,
  recipientData,
  trackingCode,
}: DefaultTemplateProps) {
  // Default values
  const headline = config.headline || 'Welcome!';
  const subheadline = config.subheadline || 'Thanks for scanning our mailer.';
  const ctaText = config.ctaText || 'Get Started';
  const ctaUrl = config.ctaUrl || '#';
  const primaryColor = config.primary_color || '#3B82F6'; // Blue-600
  const secondaryColor = config.secondary_color || '#8B5CF6'; // Purple-600

  // Personalization
  const firstName = recipientData?.firstName || 'there';

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
      }}
    >
      {/* Main Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 md:p-12">
        {/* Logo (if provided) */}
        {config.logo_url && (
          <div className="flex justify-center mb-8">
            <img
              src={config.logo_url}
              alt="Company Logo"
              className="h-12 md:h-16 object-contain"
            />
          </div>
        )}

        {/* Personalized Greeting */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            {headline.replace('{firstName}', firstName)}
          </h1>
          <p className="text-lg text-slate-600">
            {subheadline.replace('{firstName}', firstName)}
          </p>
        </div>

        {/* Image (if provided) */}
        {config.image_url && (
          <div className="mb-8 rounded-xl overflow-hidden">
            <img
              src={config.image_url}
              alt="Feature image"
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        {/* Benefits/Features (if provided in config) */}
        {config.custom_css && (
          <div className="mb-8 space-y-3">
            {/* Placeholder for benefits - can be customized */}
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="h-5 w-5 flex-shrink-0 mt-0.5"
                style={{ color: primaryColor }}
              />
              <p className="text-slate-700">Fast and easy to get started</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="h-5 w-5 flex-shrink-0 mt-0.5"
                style={{ color: primaryColor }}
              />
              <p className="text-slate-700">Personalized just for you</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="h-5 w-5 flex-shrink-0 mt-0.5"
                style={{ color: primaryColor }}
              />
              <p className="text-slate-700">No commitment required</p>
            </div>
          </div>
        )}

        {/* CTA Button */}
        <div className="mb-6">
          <Button
            asChild
            size="lg"
            className="w-full text-lg py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            style={{
              backgroundColor: primaryColor,
              borderColor: primaryColor,
            }}
          >
            <a
              href={ctaUrl}
              onClick={(e) => {
                // Track button click
                if (typeof window !== 'undefined') {
                  fetch('/api/tracking/event', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      trackingId: trackingCode, // API expects trackingId
                      eventType: 'button_click', // API expects eventType
                      eventData: { cta_text: ctaText, cta_url: ctaUrl },
                    }),
                  }).catch((error) =>
                    console.error('Error tracking button click:', error)
                  );
                }
              }}
            >
              {ctaText}
            </a>
          </Button>
        </div>

        {/* Trust Signals */}
        <div className="text-center text-sm text-slate-500">
          <p className="flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4" style={{ color: primaryColor }} />
            Secure and confidential
          </p>
        </div>

        {/* Recipient Info (for debugging - can be removed in production) */}
        {process.env.NODE_ENV === 'development' && recipientData && (
          <div className="mt-8 p-4 bg-slate-50 rounded-lg text-xs text-slate-600">
            <p className="font-semibold mb-2">Debug Info:</p>
            <p>Tracking Code: {trackingCode}</p>
            <p>
              Recipient: {recipientData.firstName} {recipientData.lastName}
            </p>
            {recipientData.city && <p>Location: {recipientData.city}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
