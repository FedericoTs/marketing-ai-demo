/**
 * Error Tracking Hook
 *
 * React hook for client-side error tracking
 * Phase 2 - Error Monitoring Setup
 */

'use client';

import { useCallback, useMemo } from 'react';
import {
  trackError,
  trackWarning,
  trackInfo,
  trackFatal,
  createErrorTracker,
  type ErrorContext,
  type ErrorSeverity,
} from '@/lib/utils/error-tracking';

/**
 * Hook for error tracking with component context
 *
 * @param componentName - Name of the component using the hook
 * @param defaultContext - Default context to include with all errors
 * @returns Error tracking functions
 *
 * @example
 * ```tsx
 * function CampaignDashboard() {
 *   const { trackError, trackWarning } = useErrorTracker('CampaignDashboard', {
 *     userId: user.id
 *   });
 *
 *   const handleLoadCampaigns = async () => {
 *     try {
 *       await loadCampaigns();
 *     } catch (error) {
 *       trackError(error, { action: 'loadCampaigns' });
 *       // Handle error...
 *     }
 *   };
 *
 *   return (...);
 * }
 * ```
 */
export function useErrorTracker(componentName: string, defaultContext?: ErrorContext) {
  // Create base context with component name
  const baseContext = useMemo(
    () => ({
      component: componentName,
      ...defaultContext,
    }),
    [componentName, defaultContext]
  );

  // Create scoped error tracker
  const errorTracker = useMemo(
    () => createErrorTracker(baseContext),
    [baseContext]
  );

  // Memoized tracking functions
  const trackErrorFn = useCallback(
    (error: Error | string, context?: ErrorContext) => {
      errorTracker.error(error, context);
    },
    [errorTracker]
  );

  const trackWarningFn = useCallback(
    (error: Error | string, context?: ErrorContext) => {
      errorTracker.warning(error, context);
    },
    [errorTracker]
  );

  const trackInfoFn = useCallback(
    (message: string, context?: ErrorContext) => {
      errorTracker.info(message, context);
    },
    [errorTracker]
  );

  const trackFatalFn = useCallback(
    (error: Error | string, context?: ErrorContext) => {
      errorTracker.fatal(error, context);
    },
    [errorTracker]
  );

  return {
    trackError: trackErrorFn,
    trackWarning: trackWarningFn,
    trackInfo: trackInfoFn,
    trackFatal: trackFatalFn,
  };
}

/**
 * Hook for wrapping async functions with automatic error tracking
 *
 * @param componentName - Name of the component
 * @param defaultContext - Default context
 * @returns Function wrapper with error tracking
 *
 * @example
 * ```tsx
 * function DataFetcher() {
 *   const wrapWithTracking = useAsyncErrorTracking('DataFetcher');
 *
 *   const fetchData = wrapWithTracking(
 *     async (url: string) => {
 *       const res = await fetch(url);
 *       return res.json();
 *     },
 *     { action: 'fetchData' }
 *   );
 *
 *   // Errors are automatically tracked
 *   const data = await fetchData('/api/campaigns');
 * }
 * ```
 */
export function useAsyncErrorTracking(
  componentName: string,
  defaultContext?: ErrorContext
) {
  const baseContext = useMemo(
    () => ({
      component: componentName,
      ...defaultContext,
    }),
    [componentName, defaultContext]
  );

  return useCallback(
    <T extends (...args: any[]) => Promise<any>>(
      fn: T,
      context?: ErrorContext
    ): T => {
      return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
        try {
          return await fn(...args);
        } catch (error) {
          trackError(error as Error, 'error', {
            ...baseContext,
            ...context,
          });
          throw error; // Re-throw to preserve original behavior
        }
      }) as T;
    },
    [baseContext]
  );
}

/**
 * Hook for tracking fetch errors with automatic retry logic
 *
 * @param componentName - Component name
 * @param maxRetries - Maximum number of retries (default: 3)
 * @returns Fetch function with retry and error tracking
 *
 * @example
 * ```tsx
 * function APIClient() {
 *   const fetchWithRetry = useRetryableFetch('APIClient', 3);
 *
 *   const data = await fetchWithRetry('/api/campaigns', {
 *     method: 'GET'
 *   });
 * }
 * ```
 */
export function useRetryableFetch(
  componentName: string,
  maxRetries: number = 3
) {
  const { trackError, trackWarning } = useErrorTracker(componentName);

  return useCallback(
    async (url: string, options?: RequestInit, retryCount: number = 0): Promise<Response> => {
      try {
        const response = await fetch(url, options);

        // If response is not ok, throw error
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        const isLastRetry = retryCount >= maxRetries - 1;

        // Track error
        if (isLastRetry) {
          trackError(error as Error, {
            action: 'fetch',
            url,
            retryCount,
            maxRetries,
          });
        } else {
          trackWarning(error as Error, {
            action: 'fetch_retry',
            url,
            retryCount,
            maxRetries,
          });
        }

        // Retry if not last attempt
        if (!isLastRetry) {
          // Exponential backoff: 1s, 2s, 4s, etc.
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          return useRetryableFetch(componentName, maxRetries)(url, options, retryCount + 1);
        }

        // Re-throw if max retries exceeded
        throw error;
      }
    },
    [componentName, maxRetries, trackError, trackWarning]
  );
}

/**
 * Hook for tracking navigation errors (useful with Next.js router)
 *
 * @param componentName - Component name
 * @returns Router error tracking utilities
 *
 * @example
 * ```tsx
 * function Navigation() {
 *   const { trackNavigationError } = useRouterErrorTracking('Navigation');
 *   const router = useRouter();
 *
 *   const handleNavigate = async (path: string) => {
 *     try {
 *       await router.push(path);
 *     } catch (error) {
 *       trackNavigationError(error, path);
 *     }
 *   };
 * }
 * ```
 */
export function useRouterErrorTracking(componentName: string) {
  const { trackError } = useErrorTracker(componentName);

  const trackNavigationError = useCallback(
    (error: Error, path: string, context?: ErrorContext) => {
      trackError(error, {
        action: 'navigation',
        path,
        ...context,
      });
    },
    [trackError]
  );

  return { trackNavigationError };
}
