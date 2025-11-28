'use client';

import { useEffect, useState } from 'react';
import { useTour } from '@/lib/tour/tour-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Onboarding Tour Component
 *
 * Displays guided tour for new users
 * - Modal steps: Centered dialog
 * - Spotlight steps: Highlight specific UI elements
 */

export function OnboardingTour() {
  const tour = useTour();
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [confetti, setConfetti] = useState(false);

  // Debug: Log tour state changes
  useEffect(() => {
    console.log('[OnboardingTour] Tour state:', {
      isActive: tour.isActive,
      currentStep: tour.currentStep?.id,
      totalSteps: tour.totalSteps,
    });
  }, [tour.isActive, tour.currentStep, tour.totalSteps]);

  // Update spotlight position when step changes
  useEffect(() => {
    if (!tour.isActive || !tour.currentStep) return;

    if (tour.currentStep.type === 'spotlight' && tour.currentStep.target) {
      // Find target element
      const element = document.querySelector(tour.currentStep.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setSpotlightRect(rect);

        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        console.warn(`Tour target not found: ${tour.currentStep.target}`);
        setSpotlightRect(null);
      }
    } else {
      setSpotlightRect(null);
    }
  }, [tour.isActive, tour.currentStep]);

  // Show confetti on completion
  useEffect(() => {
    if (tour.currentStep?.showConfetti) {
      setConfetti(true);
      const timer = setTimeout(() => setConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [tour.currentStep]);

  if (!tour.isActive || !tour.currentStep) {
    return null;
  }

  const step = tour.currentStep;
  const isModal = step.type === 'modal';
  const isSpotlight = step.type === 'spotlight';

  // Helper function to parse markdown (bold text **text**)
  const parseMarkdown = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // Modal Step
  if (isModal) {
    return (
      <>
        <Dialog open={true} onOpenChange={() => tour.skip()}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              {step.id === 'welcome' ? (
                <DialogTitle className="text-2xl flex items-center gap-2 flex-wrap">
                  <span>Welcome to</span>
                  <div className="flex items-center gap-1.5">
                    <img
                      src="/images/logo_icon_tbg.png"
                      alt="DropLab"
                      className="h-7 w-auto object-contain"
                    />
                    <span className="font-bold">DropLab</span>
                  </div>
                  <span>🎉</span>
                </DialogTitle>
              ) : (
                <DialogTitle className="text-2xl">{step.title}</DialogTitle>
              )}
              {step.content && (
                <DialogDescription className="text-base text-slate-600 whitespace-pre-line pt-4">
                  {parseMarkdown(step.content)}
                </DialogDescription>
              )}
            </DialogHeader>

            {tour.showProgress && tour.totalSteps > 0 && (
              <div className="text-sm text-slate-500">
                Step {tour.currentStepIndex + 1} of {tour.totalSteps}
              </div>
            )}

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {step.secondaryButton && (
                <Button
                  variant="outline"
                  onClick={() => tour.handleAction(step.secondaryButton!.action, step.secondaryButton!.url)}
                  className="w-full sm:w-auto"
                >
                  {step.secondaryButton.action === 'back' && <ArrowLeft className="mr-2 h-4 w-4" />}
                  {step.secondaryButton.text}
                </Button>
              )}
              <Button
                onClick={() => tour.handleAction(step.primaryButton.action, step.primaryButton.url)}
                className="w-full sm:w-auto"
              >
                {step.primaryButton.text}
                {step.primaryButton.action === 'next' && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confetti Animation */}
        {confetti && (
          <div className="fixed inset-0 pointer-events-none z-[100]">
            <div className="confetti-container">
              {[...Array(50)].map((_, i) => (
                <div
                  key={i}
                  className="confetti"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                    backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'][Math.floor(Math.random() * 5)],
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </>
    );
  }

  // Spotlight Step
  if (isSpotlight && spotlightRect) {
    const placement = step.placement || 'right';
    const tooltipPosition = getTooltipPosition(spotlightRect, placement);

    return (
      <>
        {/* Overlay with spotlight cutout */}
        <div
          className="fixed inset-0 bg-black/50 z-[60]"
          style={{
            clipPath: `polygon(
              0% 0%,
              0% 100%,
              100% 100%,
              100% 0%,
              0% 0%,
              ${spotlightRect.left - 8}px ${spotlightRect.top - 8}px,
              ${spotlightRect.left - 8}px ${spotlightRect.bottom + 8}px,
              ${spotlightRect.right + 8}px ${spotlightRect.bottom + 8}px,
              ${spotlightRect.right + 8}px ${spotlightRect.top - 8}px,
              ${spotlightRect.left - 8}px ${spotlightRect.top - 8}px
            )`,
          }}
          onClick={() => tour.skip()}
        />

        {/* Highlighted element outline */}
        <div
          className="fixed z-[61] border-4 border-blue-500 rounded-lg pointer-events-none animate-pulse"
          style={{
            left: spotlightRect.left - 8,
            top: spotlightRect.top - 8,
            width: spotlightRect.width + 16,
            height: spotlightRect.height + 16,
          }}
        />

        {/* Tooltip */}
        <div
          className={cn(
            "fixed z-[62] bg-white rounded-lg shadow-2xl p-6 max-w-md",
            "animate-in fade-in slide-in-from-bottom-4 duration-300"
          )}
          style={{
            left: tooltipPosition.left,
            top: tooltipPosition.top,
          }}
        >
          {/* Close button */}
          <button
            onClick={() => tour.skip()}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Content */}
          <div className="mb-4">
            <h3 className="text-xl font-bold text-slate-900 mb-2 pr-8">
              {step.title}
            </h3>
            <p className="text-slate-600 whitespace-pre-line text-sm">
              {parseMarkdown(step.content || '')}
            </p>
          </div>

          {/* Progress */}
          {tour.showProgress && tour.totalSteps > 0 && (
            <div className="text-xs text-slate-500 mb-4">
              Step {tour.currentStepIndex + 1} of {tour.totalSteps}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 justify-end">
            {step.secondaryButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => tour.handleAction(step.secondaryButton!.action, step.secondaryButton!.url)}
              >
                {step.secondaryButton.action === 'back' && <ArrowLeft className="mr-2 h-4 w-4" />}
                {step.secondaryButton.text}
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => tour.handleAction(step.primaryButton.action, step.primaryButton.url)}
            >
              {step.primaryButton.text}
              {step.primaryButton.action === 'next' && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </div>
      </>
    );
  }

  return null;
}

/**
 * Calculate tooltip position based on target element and placement
 */
function getTooltipPosition(rect: DOMRect, placement: string) {
  const SPACING = 16; // Gap between tooltip and target
  const TOOLTIP_WIDTH = 384; // max-w-md
  const TOOLTIP_HEIGHT = 200; // Approximate

  let left = 0;
  let top = 0;

  switch (placement) {
    case 'right':
      left = rect.right + SPACING;
      top = rect.top + (rect.height / 2) - (TOOLTIP_HEIGHT / 2);
      break;
    case 'left':
      left = rect.left - TOOLTIP_WIDTH - SPACING;
      top = rect.top + (rect.height / 2) - (TOOLTIP_HEIGHT / 2);
      break;
    case 'top':
      left = rect.left + (rect.width / 2) - (TOOLTIP_WIDTH / 2);
      top = rect.top - TOOLTIP_HEIGHT - SPACING;
      break;
    case 'bottom':
      left = rect.left + (rect.width / 2) - (TOOLTIP_WIDTH / 2);
      top = rect.bottom + SPACING;
      break;
    default:
      left = rect.right + SPACING;
      top = rect.top;
  }

  // Keep tooltip in viewport
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  if (left + TOOLTIP_WIDTH > viewportWidth) {
    left = viewportWidth - TOOLTIP_WIDTH - SPACING;
  }
  if (left < SPACING) {
    left = SPACING;
  }
  if (top + TOOLTIP_HEIGHT > viewportHeight) {
    top = viewportHeight - TOOLTIP_HEIGHT - SPACING;
  }
  if (top < SPACING) {
    top = SPACING;
  }

  return { left, top };
}
