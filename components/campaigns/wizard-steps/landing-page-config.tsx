'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe, Sparkles, Info } from 'lucide-react';
import type { LandingPageConfig, LandingPageTemplateType } from '@/lib/database/types';
import { LandingPageTemplateCard } from '@/components/campaigns/landing-page-template-card';

interface LandingPageConfigProps {
  enabled: boolean;
  config: LandingPageConfig;
  campaignName: string;
  onEnabledChange: (enabled: boolean) => void;
  onConfigChange: (config: LandingPageConfig) => void;
}

export function LandingPageConfigComponent({
  enabled,
  config,
  campaignName,
  onEnabledChange,
  onConfigChange,
}: LandingPageConfigProps) {
  const updateConfig = (updates: Partial<LandingPageConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  return (
    <Card className="border-2 border-dashed border-slate-200 hover:border-blue-300 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Landing Pages
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  <Sparkles className="h-3 w-3" />
                  Optional
                </span>
              </CardTitle>
              <CardDescription>
                Create personalized landing pages for QR code scans
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={onEnabledChange}
          />
        </div>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-6 pt-0">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-1">
                  Each recipient gets a unique landing page
                </p>
                <p className="text-blue-700">
                  Personalized with their name and linked to their QR code for tracking.
                  Use <code className="px-1.5 py-0.5 bg-blue-100 rounded text-xs">
                    {'{firstName}'}
                  </code> to add personalization.
                </p>
              </div>
            </div>
          </div>

          {/* Template Type - Visual Card Grid */}
          <div className="space-y-3">
            <Label>Template Type</Label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {(['default', 'appointment', 'questionnaire', 'product', 'contact'] as LandingPageTemplateType[]).map(
                (templateType) => (
                  <LandingPageTemplateCard
                    key={templateType}
                    templateType={templateType}
                    isSelected={config.template_type === templateType}
                    primaryColor={config.primary_color || '#3B82F6'}
                    secondaryColor={config.secondary_color || '#8B5CF6'}
                    onSelect={(type) => updateConfig({ template_type: type })}
                  />
                )
              )}
            </div>
            <p className="text-xs text-slate-500">
              Select a template that matches your campaign goals
            </p>
          </div>

          {/* CTA URL */}
          <div className="space-y-2">
            <Label htmlFor="cta-url">Call-to-Action URL</Label>
            <Input
              id="cta-url"
              type="url"
              placeholder="https://example.com/schedule"
              value={config.ctaUrl || ''}
              onChange={(e) => updateConfig({ ctaUrl: e.target.value })}
            />
            <p className="text-xs text-slate-500">
              Where the button should link to
            </p>
          </div>

          {/* Headline */}
          <div className="space-y-2">
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              placeholder={`Welcome to ${campaignName}!`}
              value={config.headline || ''}
              onChange={(e) => updateConfig({ headline: e.target.value })}
            />
            <p className="text-xs text-slate-500">
              Main headline - use {'{firstName}'} for personalization
            </p>
          </div>

          {/* Subheadline */}
          <div className="space-y-2">
            <Label htmlFor="subheadline">Subheadline</Label>
            <Textarea
              id="subheadline"
              placeholder="Thanks for scanning our direct mail piece!"
              value={config.subheadline || ''}
              onChange={(e) => updateConfig({ subheadline: e.target.value })}
              rows={2}
            />
            <p className="text-xs text-slate-500">
              Supporting text below the headline
            </p>
          </div>

          {/* CTA Text */}
          <div className="space-y-2">
            <Label htmlFor="cta-text">Button Text</Label>
            <Input
              id="cta-text"
              placeholder="Schedule Your Free Consultation"
              value={config.ctaText || ''}
              onChange={(e) => updateConfig({ ctaText: e.target.value })}
            />
            <p className="text-xs text-slate-500">
              Text on the call-to-action button
            </p>
          </div>

          {/* Color Pickers */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={config.primary_color || '#3B82F6'}
                  onChange={(e) => updateConfig({ primary_color: e.target.value })}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={config.primary_color || '#3B82F6'}
                  onChange={(e) => updateConfig({ primary_color: e.target.value })}
                  placeholder="#3B82F6"
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary-color">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary-color"
                  type="color"
                  value={config.secondary_color || '#8B5CF6'}
                  onChange={(e) => updateConfig({ secondary_color: e.target.value })}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={config.secondary_color || '#8B5CF6'}
                  onChange={(e) => updateConfig({ secondary_color: e.target.value })}
                  placeholder="#8B5CF6"
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="background-color">Background</Label>
              <div className="flex gap-2">
                <Input
                  id="background-color"
                  type="color"
                  value={config.background_color || '#FFFFFF'}
                  onChange={(e) => updateConfig({ background_color: e.target.value })}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={config.background_color || '#FFFFFF'}
                  onChange={(e) => updateConfig({ background_color: e.target.value })}
                  placeholder="#FFFFFF"
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Preview Badge */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900 text-sm">Ready to create landing pages</p>
                <p className="text-xs text-slate-600 mt-1">
                  Unique pages will be generated for each of your recipients
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{
                background: `linear-gradient(135deg, ${config.primary_color || '#3B82F6'} 0%, ${config.secondary_color || '#8B5CF6'} 100%)`
              }}>
                <Globe className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
