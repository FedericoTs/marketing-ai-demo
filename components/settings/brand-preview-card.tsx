'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Check } from 'lucide-react';

interface BrandPreviewCardProps {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  headingFont?: string;
  bodyFont?: string;
  companyName?: string;
  landingPageTemplate?: string;
}

export function BrandPreviewCard({
  logoUrl,
  primaryColor = '#1E3A8A',
  secondaryColor = '#FF6B35',
  accentColor = '#10B981',
  headingFont = 'Inter',
  bodyFont = 'Open Sans',
  companyName = 'Your Company',
  landingPageTemplate = 'professional',
}: BrandPreviewCardProps) {

  // Don't show card if no brand data exists
  const hasBrandData = logoUrl || primaryColor !== '#1E3A8A' || secondaryColor !== '#FF6B35';

  if (!hasBrandData) {
    return null;
  }

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 via-white to-blue-50 shadow-md">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-100 rounded-lg">
            <Sparkles className="h-4 w-4 text-purple-600" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Your Brand Preview</CardTitle>
            <CardDescription className="text-xs">
              How your brand appears across the platform
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Logo Preview */}
        {logoUrl && (
          <div className="flex items-center justify-center p-4 bg-white rounded-lg border border-purple-100">
            <img
              src={logoUrl}
              alt={`${companyName} logo`}
              className="h-12 max-w-full object-contain"
              onError={(e) => {
                // Hide image if it fails to load
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Color Palette */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700">Brand Colors</p>
          <div className="flex gap-2">
            <div
              className="h-14 flex-1 rounded-lg shadow-sm border border-slate-200 relative group cursor-pointer"
              style={{ backgroundColor: primaryColor }}
              title={`Primary: ${primaryColor}`}
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                <span className="text-xs text-white font-mono font-semibold drop-shadow">
                  {primaryColor}
                </span>
              </div>
            </div>
            <div
              className="h-14 flex-1 rounded-lg shadow-sm border border-slate-200 relative group cursor-pointer"
              style={{ backgroundColor: secondaryColor }}
              title={`Secondary: ${secondaryColor}`}
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                <span className="text-xs text-white font-mono font-semibold drop-shadow">
                  {secondaryColor}
                </span>
              </div>
            </div>
            <div
              className="h-14 flex-1 rounded-lg shadow-sm border border-slate-200 relative group cursor-pointer"
              style={{ backgroundColor: accentColor }}
              title={`Accent: ${accentColor}`}
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                <span className="text-xs text-white font-mono font-semibold drop-shadow">
                  {accentColor}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Font Preview */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700">Brand Typography</p>
          <div className="p-4 bg-white rounded-lg border border-purple-100 space-y-2">
            <p
              className="text-lg font-bold leading-tight"
              style={{ fontFamily: `${headingFont}, sans-serif` }}
            >
              Heading Font
            </p>
            <p
              className="text-sm text-slate-600 leading-relaxed"
              style={{ fontFamily: `${bodyFont}, sans-serif` }}
            >
              Body Font: The quick brown fox jumps over the lazy dog
            </p>
          </div>
        </div>

        {/* Brand Status */}
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="p-1 bg-green-100 rounded-full">
            <Check className="h-3.5 w-3.5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-green-900">Brand Identity Active</p>
            <p className="text-xs text-green-700">
              All marketing materials use your brand automatically
            </p>
          </div>
        </div>

        {/* Template Badge */}
        <div className="flex items-center justify-between pt-2 border-t border-purple-100">
          <span className="text-xs text-slate-600">Landing Page Template:</span>
          <span className="text-xs font-semibold text-purple-900 capitalize">
            {landingPageTemplate}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
