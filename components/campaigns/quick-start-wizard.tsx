"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { WizardStepCampaign, QuickStartWizardData } from "./wizard-step-campaign";
import { WizardStepTemplate } from "./wizard-step-template";
import { WizardStepPreview } from "./wizard-step-preview";

interface QuickStartWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (campaignId: string) => void;
}

/**
 * Campaign Quick Start Wizard
 *
 * 3-step wizard for rapid campaign creation:
 * 1. Campaign Details (name, company, message + AI generation)
 * 2. Template Selection (choose from existing templates)
 * 3. Preview & Confirm
 *
 * Impact: 75% click reduction (12+ clicks → 3 clicks)
 */
export function QuickStartWizard({ open, onOpenChange, onComplete }: QuickStartWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [wizardData, setWizardData] = useState<Partial<QuickStartWizardData>>({});

  // Auto-suggest campaign name based on company + current month
  useEffect(() => {
    if (open && !wizardData.campaignName) {
      const companyName = localStorage.getItem('companyName') || 'My Company';
      const now = new Date();
      const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      setWizardData(prev => ({
        ...prev,
        campaignName: `${companyName} Campaign - ${monthYear}`,
        companyName,
      }));
    }
  }, [open]);

  // Reset wizard when closed
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(1);
        setWizardData({});
      }, 300); // Wait for dialog close animation
    }
  }, [open]);

  const handleNext = () => {
    // Validate current step
    if (step === 1) {
      if (!wizardData.campaignName?.trim()) {
        toast.error('Please enter a campaign name');
        return;
      }
      if (!wizardData.message?.trim()) {
        toast.error('Please enter a marketing message');
        return;
      }
      if (!wizardData.companyName?.trim()) {
        toast.error('Please enter a company name');
        return;
      }
    } else if (step === 2) {
      if (!wizardData.templateId) {
        toast.error('Please select a template');
        return;
      }
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleComplete = async () => {
    setLoading(true);

    try {
      console.log('📝 [Quick Start Wizard] Creating campaign:', wizardData.campaignName);

      // Step 1: Create campaign
      const campaignResponse = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: wizardData.campaignName,
          message: wizardData.message,
          companyName: wizardData.companyName,
        }),
      });

      const campaignResult = await campaignResponse.json();

      if (!campaignResult.success) {
        throw new Error(campaignResult.error || 'Failed to create campaign');
      }

      const campaignId = campaignResult.data.id;
      console.log('✅ [Quick Start Wizard] Campaign created:', campaignId);

      // Step 2: Increment template use count (non-critical, don't fail if this errors)
      if (wizardData.templateId) {
        try {
          await fetch(`/api/campaigns/templates/${wizardData.templateId}/use`, {
            method: 'POST',
          });
        } catch (error) {
          console.warn('⚠️ [Quick Start Wizard] Failed to increment template use count:', error);
          // Continue anyway - this is not critical
        }
      }

      toast.success(`Campaign "${wizardData.campaignName}" created successfully!`);
      onOpenChange(false);

      if (onComplete) {
        onComplete(campaignId);
      } else {
        // Default: Navigate to orders page to create first order
        setTimeout(() => {
          router.push(`/campaigns/orders/new?campaignId=${campaignId}&fromWizard=true`);
        }, 500);
      }

    } catch (error) {
      console.error('❌ [Quick Start Wizard] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const stepTitles = [
    'Campaign Details',
    'Template Selection',
    'Preview & Confirm'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-2xl">Quick Start Campaign Wizard</DialogTitle>

          {/* Progress Bar */}
          <div className="flex items-center gap-2 mt-6">
            {[1, 2, 3].map(num => (
              <div
                key={num}
                className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                  num < step ? 'bg-green-600' :
                  num === step ? 'bg-blue-600' :
                  'bg-slate-200'
                }`}
              />
            ))}
          </div>

          {/* Step Title */}
          <p className="text-sm text-slate-600 mt-3 font-medium">
            Step {step} of 3: {stepTitles[step - 1]}
          </p>
        </DialogHeader>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-6">
          {step === 1 && (
            <WizardStepCampaign
              data={wizardData}
              onChange={setWizardData}
            />
          )}

          {step === 2 && (
            <WizardStepTemplate
              data={wizardData}
              onChange={setWizardData}
            />
          )}

          {step === 3 && (
            <WizardStepPreview
              data={wizardData as QuickStartWizardData}
            />
          )}
        </div>

        {/* Footer with Navigation */}
        <div className="flex justify-between pt-4 border-t flex-shrink-0">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1 || loading}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>

            {step < 3 ? (
              <Button
                onClick={handleNext}
                disabled={loading}
                className="gap-2"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={loading}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Create Campaign
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
