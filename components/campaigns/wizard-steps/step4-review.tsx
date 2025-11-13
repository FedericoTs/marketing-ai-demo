'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  CheckCircle2,
  Loader2,
  FileText,
  Users,
  Link2,
  Rocket,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { CampaignPreviewModal } from '@/components/campaigns/campaign-preview-modal';
import { LandingPageConfigComponent } from '@/components/campaigns/wizard-steps/landing-page-config';
import type { DesignTemplate, RecipientList, VariableMapping, LandingPageConfig } from '@/lib/database/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface Step4ReviewProps {
  selectedTemplate: DesignTemplate | null;
  selectedRecipientList: RecipientList | null;
  variableMappings: VariableMapping[];
  campaignName: string;
  campaignDescription: string;
  includeLandingPage: boolean;
  landingPageConfig: LandingPageConfig;
  onCampaignNameChange: (name: string) => void;
  onCampaignDescriptionChange: (description: string) => void;
  onIncludeLandingPageChange: (enabled: boolean) => void;
  onLandingPageConfigChange: (config: LandingPageConfig) => void;
  onLaunch: () => Promise<void>;
  onBack: () => void;
}

export function Step4Review({
  selectedTemplate,
  selectedRecipientList,
  variableMappings,
  campaignName,
  campaignDescription,
  includeLandingPage,
  landingPageConfig,
  onCampaignNameChange,
  onCampaignDescriptionChange,
  onIncludeLandingPageChange,
  onLandingPageConfigChange,
  onLaunch,
  onBack,
}: Step4ReviewProps) {
  const [isLaunching, setIsLaunching] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleLaunch = async () => {
    setIsLaunching(true);
    try {
      await onLaunch();
    } catch (error) {
      console.error('Failed to launch campaign:', error);
    } finally {
      setIsLaunching(false);
    }
  };

  // Validation
  const isValid = campaignName.trim() && selectedTemplate && selectedRecipientList;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">Review & Launch Campaign</h2>
        <p className="text-slate-600 mt-2">
          Review your campaign details and launch when ready
        </p>
      </div>

      {/* Campaign Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Campaign Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Campaign Name */}
          <div>
            <Label htmlFor="campaign-name">Campaign Name *</Label>
            <Input
              id="campaign-name"
              placeholder="Enter campaign name..."
              value={campaignName}
              onChange={(e) => onCampaignNameChange(e.target.value)}
              className="mt-2"
            />
          </div>

          {/* Campaign Description */}
          <div>
            <Label htmlFor="campaign-description">Description (Optional)</Label>
            <Textarea
              id="campaign-description"
              placeholder="Add a description for this campaign..."
              value={campaignDescription}
              onChange={(e) => onCampaignDescriptionChange(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Template Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base">Template</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {selectedTemplate ? (
              <div className="space-y-3">
                {/* Thumbnail */}
                {selectedTemplate.thumbnail_url && (
                  <div className="relative aspect-[3/4] bg-slate-100 rounded-lg overflow-hidden">
                    <Image
                      src={selectedTemplate.thumbnail_url}
                      alt={selectedTemplate.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-slate-900">{selectedTemplate.name}</p>
                  {selectedTemplate.description && (
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                      {selectedTemplate.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="bg-slate-100 px-2 py-1 rounded">
                    {selectedTemplate.format_type.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No template selected</p>
            )}
          </CardContent>
        </Card>

        {/* Audience Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-base">Audience</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {selectedRecipientList ? (
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-slate-900">{selectedRecipientList.name}</p>
                  {selectedRecipientList.description && (
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                      {selectedRecipientList.description}
                    </p>
                  )}
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-900">
                      {selectedRecipientList.total_recipients.toLocaleString()}
                    </div>
                    <div className="text-xs text-purple-700 mt-1">Recipients</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="bg-slate-100 px-2 py-1 rounded">
                    {selectedRecipientList.source === 'data_axle' ? 'Data Axle' : 'CSV Upload'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No audience selected</p>
            )}
          </CardContent>
        </Card>

        {/* Mappings Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base">Variable Mappings</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {variableMappings.length > 0 ? (
              <div className="space-y-2">
                {variableMappings.map((mapping, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-sm border-b border-slate-100 pb-2 last:border-0"
                  >
                    <span className="text-slate-600 truncate">{mapping.templateVariable}</span>
                    <span className="text-slate-900 font-medium truncate ml-2">
                      {mapping.recipientField}
                    </span>
                  </div>
                ))}
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-slate-700">
                      {variableMappings.length} {variableMappings.length === 1 ? 'mapping' : 'mappings'} configured
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-slate-600">
                  No mappings needed for this template
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Landing Page Configuration */}
      <LandingPageConfigComponent
        enabled={includeLandingPage}
        config={landingPageConfig}
        campaignName={campaignName}
        onEnabledChange={onIncludeLandingPageChange}
        onConfigChange={onLandingPageConfigChange}
      />

      {/* Validation Warning */}
      {!isValid && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-900">Required Information Missing</h4>
              <p className="text-sm text-amber-700 mt-1">
                Please provide a campaign name to launch.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-6 border-t">
        <Button
          onClick={onBack}
          variant="outline"
          size="lg"
          disabled={isLaunching}
        >
          ← Back to Mapping
        </Button>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowPreview(true)}
            variant="outline"
            size="lg"
            disabled={!isValid}
            className="gap-2"
          >
            <Eye className="h-5 w-5" />
            Preview Campaign
          </Button>
          <Button
            onClick={handleLaunch}
            disabled={!isValid || isLaunching}
            size="lg"
            className="min-w-[200px] bg-green-600 hover:bg-green-700"
          >
            {isLaunching ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Launching...
              </>
            ) : (
              <>
                <Rocket className="h-5 w-5 mr-2" />
                Launch Campaign
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Preview Modal */}
      {selectedTemplate && selectedRecipientList && (
        <CampaignPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          template={selectedTemplate}
          recipientList={selectedRecipientList}
          variableMappings={variableMappings}
        />
      )}
    </div>
  );
}
