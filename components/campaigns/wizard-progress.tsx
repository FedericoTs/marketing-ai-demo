'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardStep {
  number: number;
  title: string;
  description: string;
}

interface WizardProgressProps {
  currentStep: number; // 1-4
  onStepClick?: (step: number) => void;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    number: 1,
    title: 'Choose Template',
    description: 'Select a design',
  },
  {
    number: 2,
    title: 'Choose Audience',
    description: 'Select recipients',
  },
  {
    number: 3,
    title: 'Map Variables',
    description: 'Connect fields',
  },
  {
    number: 4,
    title: 'Review & Launch',
    description: 'Preview and send',
  },
];

export function WizardProgress({ currentStep, onStepClick }: WizardProgressProps) {
  return (
    <div className="w-full py-8">
      {/* Mobile: Vertical progress */}
      <div className="sm:hidden">
        <div className="flex flex-col space-y-4">
          {WIZARD_STEPS.map((step, index) => {
            const isComplete = step.number < currentStep;
            const isCurrent = step.number === currentStep;
            const isClickable = step.number < currentStep;

            return (
              <div key={step.number} className="flex items-start gap-4">
                {/* Step indicator */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => isClickable && onStepClick?.(step.number)}
                    disabled={!isClickable}
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                      isComplete && 'bg-blue-600 text-white cursor-pointer hover:bg-blue-700',
                      isCurrent && 'bg-blue-600 text-white ring-4 ring-blue-200',
                      !isComplete && !isCurrent && 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    )}
                  >
                    {isComplete ? <Check className="h-5 w-5" /> : step.number}
                  </button>

                  {/* Connector line */}
                  {index < WIZARD_STEPS.length - 1 && (
                    <div
                      className={cn(
                        'w-0.5 h-12 my-1',
                        isComplete ? 'bg-blue-600' : 'bg-slate-200'
                      )}
                    />
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 pt-1">
                  <div
                    className={cn(
                      'font-semibold text-sm transition-colors',
                      isCurrent && 'text-blue-700',
                      isComplete && 'text-blue-600',
                      !isCurrent && !isComplete && 'text-slate-500'
                    )}
                  >
                    {step.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{step.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop: Horizontal progress */}
      <div className="hidden sm:block">
        <div className="flex items-center justify-between">
          {WIZARD_STEPS.map((step, index) => {
            const isComplete = step.number < currentStep;
            const isCurrent = step.number === currentStep;
            const isClickable = step.number < currentStep;

            return (
              <div key={step.number} className="flex items-center flex-1">
                {/* Step block */}
                <div className="flex flex-col items-center flex-1">
                  <button
                    onClick={() => isClickable && onStepClick?.(step.number)}
                    disabled={!isClickable}
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all mb-2',
                      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                      isComplete && 'bg-blue-600 text-white cursor-pointer hover:bg-blue-700 shadow-md',
                      isCurrent && 'bg-blue-600 text-white ring-4 ring-blue-200 shadow-lg scale-110',
                      !isComplete && !isCurrent && 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    )}
                  >
                    {isComplete ? <Check className="h-6 w-6" /> : step.number}
                  </button>

                  <div className="text-center">
                    <div
                      className={cn(
                        'font-semibold text-sm transition-colors',
                        isCurrent && 'text-blue-700',
                        isComplete && 'text-blue-600',
                        !isCurrent && !isComplete && 'text-slate-500'
                      )}
                    >
                      {step.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 hidden md:block">
                      {step.description}
                    </div>
                  </div>
                </div>

                {/* Connector line */}
                {index < WIZARD_STEPS.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5 w-full transition-colors -mt-14',
                      isComplete ? 'bg-blue-600' : 'bg-slate-200'
                    )}
                    style={{ marginLeft: '-1rem', marginRight: '-1rem' }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Current step indicator */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-sm">
            <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse" />
            <span className="text-blue-700 font-medium">
              Step {currentStep} of {WIZARD_STEPS.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
