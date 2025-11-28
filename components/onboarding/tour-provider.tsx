'use client';

import { useEffect, useState, useRef } from 'react';
import { OnboardingTour } from './onboarding-tour';
import { TourProvider, useTour } from '@/lib/tour/tour-context';
import { useTourState, shouldShowTour } from '@/lib/tour/use-tour-state';
import { isTourEnabled } from '@/lib/tour/tour-config';

function TourProviderInner({ children }: { children: React.ReactNode }) {
  const tour = useTour();
  const [checked, setChecked] = useState(false);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple tour starts (React StrictMode + hot reload)
    if (hasStartedRef.current) {
      console.log('[TourProvider] Already checked tour, skipping');
      return;
    }

    const checkAndStartTour = async () => {
      console.log('[TourProvider] Checking tour status...');

      if (!isTourEnabled()) {
        console.log('[TourProvider] Tour is disabled in config');
        setChecked(true);
        hasStartedRef.current = true;
        return;
      }

      console.log('[TourProvider] Tour is enabled, checking if user should see it...');
      const should = await shouldShowTour();
      setChecked(true);
      hasStartedRef.current = true;

      console.log('[TourProvider] Should show tour?', should);

      if (should) {
        console.log('[TourProvider] Starting tour in 1 second...');
        setTimeout(() => {
          console.log('[TourProvider] Calling tour.start()');
          tour.start();
        }, 1000);
      } else {
        console.log('[TourProvider] Not showing tour');
      }
    };

    checkAndStartTour();
  }, [tour]);

  if (!checked) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <OnboardingTour />
    </>
  );
}

export function TourProviderWrapper({ children }: { children: React.ReactNode }) {
  const tourState = useTourState();

  return (
    <TourProvider value={tourState}>
      <TourProviderInner>{children}</TourProviderInner>
    </TourProvider>
  );
}
