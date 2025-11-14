'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { RecipientData, CampaignLandingPageConfig } from '@/lib/database/campaign-landing-page-queries';
import type { TemplateConfig, TrackingSnippet } from '@/types/landing-page-template';
import Script from 'next/script';
import { LayoutRouter } from './layouts/layout-router';

/**
 * Campaign Landing Page Component (Client)
 *
 * NOW SUPPORTS DYNAMIC LAYOUTS!
 * - 8 different layout types based on CTA goal
 * - Template configuration (colors, fonts, layout)
 * - Brand kit integration (logo, colors, fonts)
 * - Dual mode rendering (personalized + generic)
 *
 * Supports dual mode rendering:
 * - Personalized: Pre-filled form, personalized greeting, recipient attribution
 * - Generic: Empty form, generic greeting, campaign-level tracking
 */

interface CampaignLandingPageProps {
  config: CampaignLandingPageConfig;
  campaignId: string;
  campaignName?: string;
  recipientData: RecipientData | null;
  mode?: 'personalized' | 'generic';
  templateConfig?: TemplateConfig | null;
  trackingSnippets?: TrackingSnippet[];
  isPreview?: boolean;
}

export default function CampaignLandingPageClient({
  config,
  campaignId,
  campaignName = '',
  recipientData,
  mode = 'generic',
  templateConfig = null,
  trackingSnippets = [],
  isPreview = false,
}: CampaignLandingPageProps) {
  // Get theme colors and branding from template or fall back to config
  const theme = templateConfig ? {
    primaryColor: templateConfig.colors.primary,
    secondaryColor: templateConfig.colors.secondary,
    accentColor: templateConfig.colors.accent,
    backgroundColor: templateConfig.colors.background,
    textColor: templateConfig.colors.text,
    headingFont: templateConfig.typography.headingFont,
    bodyFont: templateConfig.typography.bodyFont,
    gradientBg: templateConfig.effects.gradientBackground,
  } : {
    primaryColor: config.primaryColor || '#4F46E5',
    secondaryColor: '#FF6B35',
    accentColor: '#10B981',
    backgroundColor: '#FFFFFF',
    textColor: '#1F2937',
    headingFont: 'Inter',
    bodyFont: 'Open Sans',
    gradientBg: true,
  };

  // Extract brand logo from template config
  const brandLogo = (templateConfig as any)?.branding?.logoUrl || undefined;

  // If template config exists and has template_id property, use the dynamic layout router
  const templateId = (templateConfig as any)?.template_id;
  if (templateConfig && templateId) {
    // Map template ID to layout type
    const layoutTypeMap: Record<string, string> = {
      'book-appointment': 'appointment',
      'download-guide': 'download',
      'shop-products': 'shop',
      'start-trial': 'trial',
      'get-quote': 'quote',
      'register-event': 'event',
      'take-assessment': 'assessment',
      'request-demo': 'demo',
    };
    const actualLayoutType = layoutTypeMap[templateId] || 'appointment';
    console.log('🎯 Template ID:', templateId, '→ Layout Type:', actualLayoutType);

    const layoutConfig = {
      title: config.title,
      message: config.message,
      companyName: config.companyName || campaignName,
      ctaText: config.ctaText || 'Submit',
    };

    const handleSubmit = async (formData: any) => {
      if (isPreview) {
        toast.success('Preview mode - form not submitted');
        return;
      }

      // Actual form submission logic
      try {
        const response = await fetch('/api/landing-page/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaign_id: campaignId,
            tracking_id: mode === 'personalized' ? recipientData?.tracking_id : undefined,
            mode,
            templateId: templateId,  // ✅ CRITICAL: Pass template ID for CTA-aligned tracking
            formData,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to submit form');
        }

        toast.success('Form submitted successfully!');
      } catch (error) {
        throw error;
      }
    };

    return (
      <>
        {/* Tracking Scripts */}
        {trackingSnippets.map((snippet) => (
          <Script
            key={snippet.id}
            id={`tracking-${snippet.id}`}
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{ __html: snippet.code }}
          />
        ))}

        {/* Dynamic Layout based on template type */}
        <LayoutRouter
          layoutType={actualLayoutType}
          theme={theme}
          config={layoutConfig}
          brandLogo={brandLogo}
          isPreview={isPreview}
          onSubmit={handleSubmit}
        />
      </>
    );
  }

  // Fallback to original layout if no template config
  const legacyTheme = theme;

  // Initialize form data based on mode (avoid hydration mismatch)
  const [formData, setFormData] = useState(() => {
    if (mode === 'personalized' && recipientData) {
      return {
        name: `${recipientData.name} ${recipientData.lastname}`,
        email: recipientData.email || '',
        phone: recipientData.phone || '',
        preferredDate: '',
        message: '',
      };
    }
    return {
      name: '',
      email: '',
      phone: '',
      preferredDate: '',
      message: '',
    };
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Track page view
  useEffect(() => {
    const trackView = async () => {
      try {
        if (mode === 'personalized' && recipientData) {
          // Track with recipient attribution
          await fetch('/api/tracking/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tracking_id: recipientData.tracking_id,
              event_type: 'page_view',
              event_data: JSON.stringify({
                campaign_id: campaignId,
                mode: 'personalized',
                source: 'qr_code',
              }),
            }),
          });
        } else {
          // Track as generic campaign visit
          console.log('Generic page view:', { campaignId, mode });
          // TODO: Implement generic campaign-level tracking
        }
      } catch (error) {
        console.error('Error tracking page view:', error);
      }
    };

    trackView();
  }, [mode, recipientData, campaignId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit form data
      const response = await fetch('/api/landing-page/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaignId,
          tracking_id: mode === 'personalized' ? recipientData?.tracking_id : undefined,
          mode,
          templateId: undefined,  // ✅ No template in fallback mode, will use form_submission
          formData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit form');
      }

      // Track conversion
      if (mode === 'personalized' && recipientData) {
        await fetch('/api/tracking/conversion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tracking_id: recipientData.tracking_id,
            conversion_type: 'form_submission',
            conversion_data: JSON.stringify(formData),
          }),
        });
      }

      setIsSubmitted(true);
      toast.success(config.thankYouMessage);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to submit form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Success state
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mb-6">
              <svg
                className="w-20 h-20 text-green-500 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Thank You!</h1>
            <p className="text-lg text-slate-700 mb-6">{config.thankYouMessage}</p>
            <p className="text-sm text-slate-500">
              We'll contact you soon at {formData.email} or {formData.phone}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main landing page
  return (
    <>
      {/* Load Google Fonts */}
      {templateConfig && (
        <link
          href={`https://fonts.googleapis.com/css2?family=${theme.headingFont.replace(' ', '+')}:wght@300;400;600;700;800;900&family=${theme.bodyFont.replace(' ', '+')}:wght@300;400;600;700&display=swap`}
          rel="stylesheet"
        />
      )}

      {/* Inject tracking snippets - HEAD position */}
      {trackingSnippets
        .filter((snippet) => snippet.position === 'head')
        .map((snippet) => (
          <Script
            key={snippet.id}
            id={`tracking-${snippet.id}`}
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{ __html: snippet.code }}
          />
        ))}

      {/* Inject tracking snippets - BODY position */}
      {trackingSnippets
        .filter((snippet) => snippet.position === 'body')
        .map((snippet) => (
          <div
            key={snippet.id}
            dangerouslySetInnerHTML={{ __html: snippet.code }}
          />
        ))}

      <div
        className={`min-h-screen py-12 px-4 ${theme.gradientBg ? 'bg-gradient-to-br from-blue-50 to-indigo-100' : ''}`}
        style={{
          backgroundColor: !theme.gradientBg ? theme.backgroundColor : undefined,
          fontFamily: theme.bodyFont,
          color: theme.textColor,
        }}
      >
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            {config.logoUrl && (
              <img
                src={config.logoUrl}
                alt={config.companyName}
                className="h-16 w-auto mx-auto mb-4 object-contain"
              />
            )}
            <h1
              className="text-4xl font-bold mb-4"
              style={{
                fontFamily: theme.headingFont,
                color: theme.textColor,
              }}
            >
              {mode === 'personalized' && recipientData
                ? `Welcome back, ${recipientData.name}!`
                : config.fallbackMessage}
            </h1>
            <h2
              className="text-2xl font-semibold mb-4"
              style={{
                fontFamily: theme.headingFont,
                color: theme.primaryColor,
              }}
            >
              {config.title}
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: theme.textColor }}>
              {config.message}
            </p>
          </div>

        {/* Form Card */}
        <Card>
          <CardContent className="pt-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              {config.formFields.includes('name') && (
                <div>
                  <Label htmlFor="name">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="John Doe"
                    required
                    disabled={mode === 'personalized' && !!recipientData?.name}
                  />
                </div>
              )}

              {/* Email */}
              {config.formFields.includes('email') && (
                <div>
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="john@example.com"
                    required
                  />
                </div>
              )}

              {/* Phone */}
              {config.formFields.includes('phone') && (
                <div>
                  <Label htmlFor="phone">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>
              )}

              {/* Preferred Date */}
              {config.formFields.includes('preferredDate') && (
                <div>
                  <Label htmlFor="preferredDate">Preferred Consultation Date</Label>
                  <Input
                    id="preferredDate"
                    type="date"
                    value={formData.preferredDate}
                    onChange={(e) => handleInputChange('preferredDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}

              {/* Message */}
              <div>
                <Label htmlFor="message">Additional Comments (Optional)</Label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  placeholder="Tell us more about your needs..."
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
                size="lg"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {isSubmitting ? 'Submitting...' : config.ctaText}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-slate-200 text-center">
              <p className="text-sm text-slate-500">{config.companyName}</p>
              {mode === 'personalized' && recipientData && (
                <p className="text-xs text-slate-400 mt-2">
                  Personalized for {recipientData.name} {recipientData.lastname}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

          {/* Privacy Note */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              We respect your privacy. Your information will only be used to contact you about your
              consultation.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
