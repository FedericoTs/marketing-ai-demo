/**
 * Tour Type Definitions
 *
 * DO NOT EDIT - These are reference types for tour configuration
 */

export type TourStepType = 'modal' | 'spotlight';
export type TourPlacement = 'top' | 'right' | 'bottom' | 'left' | 'center';
export type TourAction = 'next' | 'back' | 'skip' | 'complete' | 'navigate';

export interface TourButton {
  text: string;
  action: TourAction;
  url?: string;                   // Used with action: 'navigate'
}

export interface TourStep {
  id: string;
  type: TourStepType;
  title: string;
  content: string;
  target?: string;                // CSS selector (required for spotlight)
  placement?: TourPlacement;      // Tooltip position
  primaryButton: TourButton;
  secondaryButton?: TourButton;
  showConfetti?: boolean;         // Show celebration animation
}

export interface TourConfig {
  enabled: boolean;
  version: string;
  showProgress: boolean;
  allowSkip: boolean;
  allowBack: boolean;
  autoStartForNewUsers: boolean;
  triggerOnFirstLogin: boolean;
  steps: TourStep[];
  variants?: {
    [key: string]: {
      enabled: boolean;
      steps: string[];            // Array of step IDs
    };
  };
}

export interface TourState {
  isActive: boolean;
  currentStepIndex: number;
  currentStep: TourStep | null;
  totalSteps: number;
  canGoBack: boolean;
  canGoNext: boolean;
}

export interface TourProgress {
  completed: boolean;
  currentStep: number;
  skipped: boolean;
  version: string;
  completedAt?: string;
}
