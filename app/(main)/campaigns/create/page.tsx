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
import type { CampaignWizardState, DesignTemplate, RecipientList, VariableMapping } from '@/lib/database/types';

export default function CampaignCreatePage() {
  const router = useRouter();
  const [wizardState, setWizardState] = useState<CampaignWizardState>({
    selectedTemplate: null,
    selectedRecipientList: null,
    audienceSource: null,
    variableMappings: [],
    campaignName: '',
    campaignDescription: '',
    currentStep: 1,
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
            onCampaignNameChange={handleCampaignNameChange}
            onCampaignDescriptionChange={handleCampaignDescriptionChange}
            onLaunch={handleCampaignLaunch}
            onBack={handleStep4Back}
          />
        );

      default:
        return null;
    }
  };

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
