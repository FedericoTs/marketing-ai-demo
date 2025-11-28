'use client';

import React, { createContext, useContext } from 'react';
import type { TourStep } from './tour-types';

type TourContextType = {
  isActive: boolean;
  currentStepIndex: number;
  currentStep: TourStep | null;
  totalSteps: number;
  canGoBack: boolean;
  canGoNext: boolean;
  start: () => void;
  next: () => Promise<void>;
  back: () => void;
  skip: () => Promise<void>;
  complete: () => Promise<void>;
  navigate: (url: string) => void;
  handleAction: (action: string, url?: string) => void;
  reset: () => Promise<void>;
};

const TourContext = createContext<TourContextType | null>(null);

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within TourProvider');
  }
  return context;
}

export const TourProvider = TourContext.Provider;
