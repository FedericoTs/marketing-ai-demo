'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Check, FileText, Calendar, ClipboardList, Package, Mail, Palette } from 'lucide-react';
import type { LandingPageTemplateType } from '@/lib/database/types';

interface LandingPageTemplateCardProps {
  templateType: LandingPageTemplateType;
  isSelected: boolean;
  primaryColor?: string;
  secondaryColor?: string;
  onSelect: (templateType: LandingPageTemplateType) => void;
}

const TEMPLATE_METADATA: Record<
  LandingPageTemplateType,
  {
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    features: string[];
  }
> = {
  default: {
    name: 'Simple Landing Page',
    description: 'Clean, conversion-focused design',
    icon: FileText,
    features: ['Hero section', 'CTA button', 'Trust signals'],
  },
  appointment: {
    name: 'Appointment Booking',
    description: 'Schedule consultations easily',
    icon: Calendar,
    features: ['Calendar picker', 'Time slots', 'Contact form'],
  },
  questionnaire: {
    name: 'Questionnaire Form',
    description: 'Multi-step data collection',
    icon: ClipboardList,
    features: ['Progress bar', 'Multi-step', 'Form validation'],
  },
  product: {
    name: 'Product Showcase',
    description: 'Highlight products or services',
    icon: Package,
    features: ['Image gallery', 'Product details', 'Add to cart'],
  },
  contact: {
    name: 'Contact Form',
    description: 'Simple contact information',
    icon: Mail,
    features: ['Name/email fields', 'Message textarea', 'Submit button'],
  },
  custom: {
    name: 'Custom Template',
    description: 'Fully customizable layout',
    icon: Palette,
    features: ['Custom branding', 'Flexible layout', 'Any content type'],
  },
};

export function LandingPageTemplateCard({
  templateType,
  isSelected,
  primaryColor = '#3B82F6',
  secondaryColor = '#8B5CF6',
  onSelect,
}: LandingPageTemplateCardProps) {
  const metadata = TEMPLATE_METADATA[templateType];
  const Icon = metadata.icon;

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
        isSelected ? 'ring-2 ring-blue-500 shadow-lg scale-105' : ''
      }`}
      onClick={() => onSelect(templateType)}
    >
      <CardContent className="p-4">
        {/* Mini Browser Mockup Preview */}
        <div className="relative mb-3 h-40 rounded-lg overflow-hidden border-2 border-slate-200 bg-white">
          {/* Browser chrome */}
          <div className="h-5 bg-slate-100 border-b border-slate-200 flex items-center px-2 gap-1">
            <div className="w-2 h-2 rounded-full bg-red-400"></div>
            <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
          </div>

          {/* Template Preview Content */}
          <div className="h-[calc(100%-20px)] p-3 flex flex-col">
            {/* Header with gradient */}
            <div
              className="h-12 rounded-md mb-2 flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
              }}
            >
              <Icon className="h-6 w-6 text-white" />
            </div>

            {/* Content Lines (simulating text) */}
            <div className="space-y-1.5 flex-1">
              <div className="h-2 bg-slate-200 rounded w-3/4"></div>
              <div className="h-2 bg-slate-200 rounded w-full"></div>
              <div className="h-2 bg-slate-200 rounded w-2/3"></div>

              {/* Template-specific elements */}
              {templateType === 'appointment' && (
                <div className="mt-2 grid grid-cols-3 gap-1">
                  <div className="h-4 bg-slate-100 rounded border border-slate-300"></div>
                  <div className="h-4 bg-slate-100 rounded border border-slate-300"></div>
                  <div className="h-4 bg-slate-100 rounded border border-slate-300"></div>
                </div>
              )}

              {templateType === 'questionnaire' && (
                <div className="mt-2 space-y-1">
                  <div className="h-1 bg-blue-200 rounded w-1/2"></div>
                  <div className="h-3 bg-slate-100 rounded border border-slate-300"></div>
                  <div className="h-3 bg-slate-100 rounded border border-slate-300"></div>
                </div>
              )}

              {templateType === 'product' && (
                <div className="mt-2 grid grid-cols-2 gap-1">
                  <div className="h-8 bg-slate-100 rounded"></div>
                  <div className="h-8 bg-slate-100 rounded"></div>
                </div>
              )}

              {templateType === 'contact' && (
                <div className="mt-2 space-y-1">
                  <div className="h-2 bg-slate-100 rounded border border-slate-300"></div>
                  <div className="h-2 bg-slate-100 rounded border border-slate-300"></div>
                  <div className="h-4 bg-slate-100 rounded border border-slate-300"></div>
                </div>
              )}
            </div>

            {/* CTA Button */}
            <div
              className="h-6 rounded mt-2"
              style={{ backgroundColor: primaryColor }}
            ></div>
          </div>

          {/* Selected indicator */}
          {isSelected && (
            <div className="absolute top-6 right-2 bg-blue-500 text-white rounded-full p-1.5 shadow-lg">
              <Check className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Template Info */}
        <div>
          <div className="flex items-start gap-2 mb-2">
            <Icon className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 text-sm mb-0.5">
                {metadata.name}
              </h3>
              <p className="text-xs text-slate-600">{metadata.description}</p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-1">
            {metadata.features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
