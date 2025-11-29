'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { WizardProgress } from '@/components/campaigns/wizard-progress';
import { Step1Template } from '@/components/campaigns/wizard-steps/step1-template';
import { Step2Audience } from '@/components/campaigns/wizard-steps/step2-audience';
import { Step3Mapping } from '@/components/campaigns/wizard-steps/step3-mapping';
import { Step4Review } from '@/components/campaigns/wizard-steps/step4-review';
import { toast } from 'sonner';
import type { CampaignWizardState, DesignTemplate, RecipientList, VariableMapping, LandingPageConfig } from '@/lib/database/types';
import { useBillingStatus } from '@/lib/hooks/use-billing-status';
import { FeatureLocked } from '@/components/billing/feature-locked';
import { Loader2 } from 'lucide-react';

export default function CampaignCreatePage() {
  const { isFeatureLocked, isLoading } = useBillingStatus();
  const router = useRouter();
  const [wizardState, setWizardState] = useState<CampaignWizardState>({
    selectedTemplate: null,
    selectedRecipientList: null,
    audienceSource: null,
    variableMappings: [],
    campaignName: '',
    campaignDescription: '',
    currentStep: 1,
    // Landing Page Configuration (Optional)
    includeLandingPage: false,
    landingPageConfig: {
      headline: '',
      subheadline: '',
      cta_text: '',
      cta_url: '',
      primary_color: '#3B82F6',
      secondary_color: '#8B5CF6',
      background_color: '#FFFFFF',
    },
  });

  // Navigate to specific step (only allow going back)
  const handleStepClick = (step: number) => {
    if (step < wizardState.currentStep) {
      setWizardState((prev) => ({ ...prev, currentStep: step }));
    }
  };

  // Step 1: Template Selection
  const handleTemplateSelect = (template: DesignTemplate) => {
    setWizardState((prev) => ({ ...prev, selectedTemplate: template }));
  };

  const handleStep1Next = () => {
    setWizardState((prev) => ({ ...prev, currentStep: 2 }));
  };

  // Step 2: Audience Selection (to be implemented)
  const handleRecipientListSelect = (list: RecipientList) => {
    setWizardState((prev) => ({ ...prev, selectedRecipientList: list }));
  };

  const handleAudienceSourceSelect = (source: 'data_axle' | 'csv') => {
    setWizardState((prev) => ({ ...prev, audienceSource: source }));
  };

  const handleStep2Next = () => {
    setWizardState((prev) => ({ ...prev, currentStep: 3 }));
  };

  const handleStep2Back = () => {
    setWizardState((prev) => ({ ...prev, currentStep: 1 }));
  };

  // Step 3: Variable Mapping (to be implemented)
  const handleVariableMappingsChange = (mappings: VariableMapping[]) => {
    setWizardState((prev) => ({ ...prev, variableMappings: mappings }));
  };

  const handleStep3Next = () => {
    setWizardState((prev) => ({ ...prev, currentStep: 4 }));
  };

  const handleStep3Back = () => {
    setWizardState((prev) => ({ ...prev, currentStep: 2 }));
  };

  // Step 4: Review & Launch
  const handleCampaignNameChange = (name: string) => {
    setWizardState((prev) => ({ ...prev, campaignName: name }));
  };

  const handleCampaignDescriptionChange = (description: string) => {
    setWizardState((prev) => ({ ...prev, campaignDescription: description }));
  };

  const handleIncludeLandingPageChange = (enabled: boolean) => {
    setWizardState((prev) => ({ ...prev, includeLandingPage: enabled }));
  };

  const handleLandingPageConfigChange = (config: LandingPageConfig) => {
    setWizardState((prev) => ({ ...prev, landingPageConfig: config }));
  };

  const handleCampaignLaunch = async () => {
    if (!wizardState.selectedTemplate || !wizardState.selectedRecipientList) {
      toast.error('Missing required data');
      return;
    }

    if (!wizardState.campaignName.trim()) {
      toast.error('Please enter a campaign name');
      return;
    }

    console.log('🚀 Launching campaign with state:', wizardState);

    // Create campaign in database
    const response = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: wizardState.campaignName,
        description: wizardState.campaignDescription,
        templateId: wizardState.selectedTemplate.id,
        recipientListId: wizardState.selectedRecipientList.id,
        designSnapshot: wizardState.selectedTemplate.canvas_json,
        variableMappingsSnapshot: wizardState.variableMappings,
        totalRecipients: wizardState.selectedRecipientList.total_recipients,
        status: 'draft',
        // Landing page configuration (optional)
        includeLandingPage: wizardState.includeLandingPage,
        landingPageConfig: wizardState.includeLandingPage ? wizardState.landingPageConfig : undefined,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create campaign');
    }

    const { data: campaign } = await response.json();
    console.log('✅ Campaign created:', campaign);

    toast.success('Campaign created successfully!');

    // Redirect to campaign dashboard
    router.push('/campaigns');
  };

  const handleStep4Back = () => {
    setWizardState((prev) => ({ ...prev, currentStep: 3 }));
  };

  // Render current step
  const renderStep = () => {
    switch (wizardState.currentStep) {
      case 1:
        return (
          <Step1Template
            selectedTemplate={wizardState.selectedTemplate}
            onTemplateSelect={handleTemplateSelect}
            onNext={handleStep1Next}
          />
        );

      case 2:
        return (
          <Step2Audience
            selectedRecipientList={wizardState.selectedRecipientList}
            audienceSource={wizardState.audienceSource}
            onRecipientListSelect={handleRecipientListSelect}
            onAudienceSourceSelect={handleAudienceSourceSelect}
            onNext={handleStep2Next}
            onBack={handleStep2Back}
          />
        );

      case 3:
        return (
          <Step3Mapping
            selectedTemplate={wizardState.selectedTemplate}
            variableMappings={wizardState.variableMappings}
            onVariableMappingsChange={handleVariableMappingsChange}
            onNext={handleStep3Next}
            onBack={handleStep3Back}
          />
        );

      case 4:
        return (
          <Step4Review
            selectedTemplate={wizardState.selectedTemplate}
            selectedRecipientList={wizardState.selectedRecipientList}
            variableMappings={wizardState.variableMappings}
            campaignName={wizardState.campaignName}
            campaignDescription={wizardState.campaignDescription}
            includeLandingPage={wizardState.includeLandingPage}
            landingPageConfig={wizardState.landingPageConfig}
            onCampaignNameChange={handleCampaignNameChange}
            onCampaignDescriptionChange={handleCampaignDescriptionChange}
            onIncludeLandingPageChange={handleIncludeLandingPageChange}
            onLandingPageConfigChange={handleLandingPageConfigChange}
            onLaunch={handleCampaignLaunch}
            onBack={handleStep4Back}
          />
        );

      default:
        return null;
    }
  };

  // Show loading state while checking billing status
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-600 mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show locked state if feature is not accessible
  if (isFeatureLocked('campaigns')) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-3xl font-bold text-slate-900">Create New Campaign</h1>
            <p className="text-slate-600 mt-2">
              Campaign creation requires an active subscription
            </p>
          </div>
        </div>

        {/* Locked Feature UI */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <FeatureLocked feature="campaigns" variant="card" showDetails={true} />
        </div>
      </div>
    );
  }

  // Show normal wizard for paid users
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-slate-900">Create New Campaign</h1>
          <p className="text-slate-600 mt-2">
            Follow the steps below to create and launch your direct mail campaign
          </p>
        </div>
      </div>

      {/* Wizard Progress */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <WizardProgress
          currentStep={wizardState.currentStep}
          onStepClick={handleStepClick}
        />
      </div>

      {/* Step Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <Card>
          <CardContent className="p-6 sm:p-8 lg:p-12">
            {renderStep()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
