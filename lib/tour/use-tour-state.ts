'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getActiveTourSteps, getTourVersion, tourConfig } from './tour-config';
import type { TourStep, TourState, TourProgress } from './tour-types';

export function useTourState() {
  const router = useRouter();
  const [state, setState] = useState<TourState>({
    isActive: false,
    currentStepIndex: 0,
    currentStep: null,
    totalSteps: 0,
    canGoBack: false,
    canGoNext: true,
  });

  const steps = getActiveTourSteps();

  const start = useCallback(() => {
    console.log('[Tour] start() called, steps:', steps.length);
    if (steps.length === 0) {
      console.log('[Tour] No steps available, cannot start tour');
      return;
    }

    console.log('[Tour] Setting isActive to true, first step:', steps[0]);
    setState({
      isActive: true,
      currentStepIndex: 0,
      currentStep: steps[0],
      totalSteps: steps.length,
      canGoBack: false,
      canGoNext: true,
    });
  }, [steps]);

  const next = useCallback(async () => {
    const nextIndex = state.currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setState({
        isActive: true,
        currentStepIndex: nextIndex,
        currentStep: steps[nextIndex],
        totalSteps: steps.length,
        canGoBack: true,
        canGoNext: nextIndex < steps.length - 1,
      });

      await fetch('/api/tour/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepId: steps[nextIndex].id,
          action: 'next',
        }),
      });
    }
  }, [state.currentStepIndex, steps]);

  const back = useCallback(() => {
    if (state.currentStepIndex > 0) {
      const prevIndex = state.currentStepIndex - 1;
      setState({
        isActive: true,
        currentStepIndex: prevIndex,
        currentStep: steps[prevIndex],
        totalSteps: steps.length,
        canGoBack: prevIndex > 0,
        canGoNext: true,
      });
    }
  }, [state.currentStepIndex, steps]);

  const skip = useCallback(async () => {
    setState({
      isActive: false,
      currentStepIndex: 0,
      currentStep: null,
      totalSteps: 0,
      canGoBack: false,
      canGoNext: false,
    });

    await fetch('/api/tour/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stepId: state.currentStep?.id,
        action: 'skip',
      }),
    });
  }, [state.currentStep]);

  const complete = useCallback(async () => {
    setState({
      isActive: false,
      currentStepIndex: 0,
      currentStep: null,
      totalSteps: 0,
      canGoBack: false,
      canGoNext: false,
    });

    await fetch('/api/tour/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stepId: state.currentStep?.id,
        action: 'complete',
      }),
    });
  }, [state.currentStep]);

  const navigate = useCallback((url: string) => {
    router.push(url);
  }, [router]);

  const handleAction = useCallback((action: string, url?: string) => {
    switch (action) {
      case 'next':
        next();
        break;
      case 'back':
        back();
        break;
      case 'skip':
        skip();
        break;
      case 'complete':
        complete();
        break;
      case 'navigate':
        if (url) navigate(url);
        break;
    }
  }, [next, back, skip, complete, navigate]);

  const reset = useCallback(async () => {
    setState({
      isActive: false,
      currentStepIndex: 0,
      currentStep: null,
      totalSteps: 0,
      canGoBack: false,
      canGoNext: true,
    });

    await fetch('/api/tour/reset', {
      method: 'POST',
    });
  }, []);

  return {
    isActive: state.isActive,
    currentStepIndex: state.currentStepIndex,
    currentStep: state.currentStep,
    totalSteps: state.totalSteps,
    canGoBack: state.canGoBack,
    canGoNext: state.canGoNext,
    showProgress: tourConfig.showProgress,
    start,
    next,
    back,
    skip,
    complete,
    navigate,
    handleAction,
    reset,
  };
}

export async function shouldShowTour(): Promise<boolean> {
  try {
    // Add timestamp to bust cache
    const response = await fetch(`/api/tour/progress?_t=${Date.now()}`);
    if (!response.ok) {
      console.log('[Tour] API request failed:', response.status);
      return false;
    }

    const data: TourProgress = await response.json();
    console.log('[Tour] User progress:', data);
    console.log('[Tour] Current config version:', getTourVersion());

    if (data.completed) {
      console.log('[Tour] Already completed');
      return false;
    }

    if (data.skipped) {
      console.log('[Tour] User skipped tour');
      return false;
    }

    const currentVersion = getTourVersion();
    if (data.version !== '0.0' && data.version === currentVersion) {
      console.log('[Tour] User already saw this version');
      return false;
    }

    console.log('[Tour] Should show tour: YES');
    return true;
  } catch (error) {
    console.error('[Tour] Failed to check tour status:', error);
    return false;
  }
}
