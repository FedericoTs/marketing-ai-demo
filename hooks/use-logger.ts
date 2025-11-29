/**
 * Logging Hook
 *
 * React hook for component-scoped logging
 * Phase 3 - Logging Utility
 */

'use client';

import { useMemo, useCallback } from 'react';
import { createLogger, type LogContext, Logger } from '@/lib/utils/logger';

/**
 * Hook for component-scoped logging
 *
 * @param componentName - Name of the component using the hook
 * @param defaultContext - Default context to include with all logs
 * @returns Logger instance with component context
 *
 * @example
 * ```tsx
 * function CampaignDashboard() {
 *   const logger = useLogger('CampaignDashboard', {
 *     userId: user.id
 *   });
 *
 *   useEffect(() => {
 *     logger.info('Component mounted');
 *
 *     return () => {
 *       logger.debug('Component unmounting');
 *     };
 *   }, []);
 *
 *   const handleLoadCampaigns = async () => {
 *     logger.debug('Loading campaigns...');
 *
 *     const data = await logger.time('fetchCampaigns', async () => {
 *       return await fetch('/api/campaigns');
 *     });
 *
 *     logger.info('Campaigns loaded', { count: data.length });
 *   };
 *
 *   return (...);
 * }
 * ```
 */
export function useLogger(
  componentName: string,
  defaultContext?: LogContext
): Logger {
  // Create logger with component namespace
  const baseLogger = useMemo(
    () => createLogger(componentName),
    [componentName]
  );

  // Create child logger with default context if provided
  const logger = useMemo(() => {
    if (defaultContext) {
      return baseLogger.child(defaultContext);
    }
    return baseLogger;
  }, [baseLogger, defaultContext]);

  return logger;
}

/**
 * Hook for logging component lifecycle events
 *
 * Automatically logs mount, update, and unmount events
 *
 * @param componentName - Name of the component
 * @param context - Optional context to include
 *
 * @example
 * ```tsx
 * function MyComponent({ userId }: Props) {
 *   useComponentLogger('MyComponent', { userId });
 *
 *   return (...);
 * }
 * ```
 */
export function useComponentLogger(
  componentName: string,
  context?: LogContext
): void {
  const logger = useLogger(componentName, context);

  // Log mount
  useMemo(() => {
    logger.debug('Component mounted', context);
    return () => {
      // Log unmount
      logger.debug('Component unmounting', context);
    };
  }, [logger, context]);
}

/**
 * Hook for measuring render performance
 *
 * Logs slow renders (>16ms) in development
 *
 * @param componentName - Name of the component
 * @param threshold - Threshold in ms for "slow" renders (default: 16ms)
 *
 * @example
 * ```tsx
 * function ExpensiveComponent() {
 *   useRenderLogger('ExpensiveComponent', 50); // Log if render > 50ms
 *
 *   return (...);
 * }
 * ```
 */
export function useRenderLogger(
  componentName: string,
  threshold: number = 16
): void {
  const logger = useLogger(componentName);

  useMemo(() => {
    const start = performance.now();

    // This will run after render
    queueMicrotask(() => {
      const duration = Math.round(performance.now() - start);

      if (duration > threshold) {
        logger.warn('Slow render detected', {
          renderDuration: `${duration}ms`,
          renderThreshold: `${threshold}ms`,
        });
      } else {
        logger.debug('Render complete', {
          renderDuration: `${duration}ms`,
        });
      }
    });
  }, [logger, threshold]);
}

/**
 * Hook for logging API calls
 *
 * Returns a logger instance configured for API logging
 *
 * @param apiName - Name of the API endpoint
 * @returns Logger instance for API calls
 *
 * @example
 * ```tsx
 * function useAPI() {
 *   const logger = useAPILogger('campaigns');
 *
 *   const fetchCampaigns = async () => {
 *     return await logger.time('GET /api/campaigns', async () => {
 *       const res = await fetch('/api/campaigns');
 *       if (!res.ok) {
 *         logger.error('API request failed', {
 *           status: res.status,
 *           statusText: res.statusText
 *         });
 *         throw new Error(`HTTP ${res.status}`);
 *       }
 *       return res.json();
 *     });
 *   };
 *
 *   return { fetchCampaigns };
 * }
 * ```
 */
export function useAPILogger(apiName: string): Logger {
  return useLogger(`API:${apiName}`);
}

/**
 * Hook for logging user interactions
 *
 * @param componentName - Component name
 * @param userId - User ID for context
 * @returns Logger instance for user interactions
 *
 * @example
 * ```tsx
 * function InteractiveComponent({ userId }: Props) {
 *   const logger = useInteractionLogger('InteractiveComponent', userId);
 *
 *   const handleClick = (buttonName: string) => {
 *     logger.info('Button clicked', { buttonName });
 *   };
 *
 *   const handleFormSubmit = (formData: FormData) => {
 *     logger.info('Form submitted', {
 *       fields: Object.keys(formData)
 *     });
 *   };
 *
 *   return (...);
 * }
 * ```
 */
export function useInteractionLogger(
  componentName: string,
  userId?: string
): Logger {
  return useLogger(componentName, {
    userId,
    type: 'interaction',
  });
}
