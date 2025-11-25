/**
 * Error Tracking Utility
 *
 * Lightweight error tracking with optional external service integration
 * Phase 2 - Error Monitoring Setup
 *
 * Features:
 * - Zero external dependencies
 * - Feature-flagged via environment variables
 * - Graceful degradation (console.error fallback)
 * - Extensible to Sentry, LogRocket, etc.
 * - Type-safe error context
 */

/**
 * Error severity levels (matches Sentry/industry standards)
 */
export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

/**
 * Error context for additional debugging information
 */
export interface ErrorContext {
  [key: string]: any;
  userId?: string;
  organizationId?: string;
  url?: string;
  component?: string;
  action?: string;
  timestamp?: string;
}

/**
 * Error tracking configuration
 */
interface ErrorTrackingConfig {
  enabled: boolean;
  environment: string;
  logToConsole: boolean;
  sampleRate: number; // 0.0 to 1.0 (1.0 = 100% of errors tracked)
}

/**
 * Get error tracking configuration from environment
 */
function getConfig(): ErrorTrackingConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    // Enabled by default in production, always in development
    enabled: process.env.NEXT_PUBLIC_ERROR_TRACKING_ENABLED !== 'false',
    environment: process.env.NODE_ENV || 'development',
    // Log to console in development, optional in production
    logToConsole: isDevelopment || process.env.NEXT_PUBLIC_ERROR_LOG_CONSOLE === 'true',
    // Sample 100% in dev, configurable in production (default 100%)
    sampleRate: isProduction
      ? parseFloat(process.env.NEXT_PUBLIC_ERROR_SAMPLE_RATE || '1.0')
      : 1.0,
  };
}

/**
 * Check if error should be tracked based on sample rate
 */
function shouldTrackError(sampleRate: number): boolean {
  if (sampleRate >= 1.0) return true;
  if (sampleRate <= 0.0) return false;
  return Math.random() < sampleRate;
}

/**
 * Format error for logging
 */
function formatError(error: Error, context?: ErrorContext): string {
  const lines: string[] = [];

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push(`🚨 ERROR: ${error.message}`);
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (context) {
    lines.push('\n📋 Context:');
    Object.entries(context).forEach(([key, value]) => {
      lines.push(`  ${key}: ${JSON.stringify(value)}`);
    });
  }

  if (error.stack) {
    lines.push('\n📍 Stack Trace:');
    lines.push(error.stack);
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return lines.join('\n');
}

/**
 * Track an error with optional context
 *
 * @param error - Error object or error message
 * @param severity - Error severity level (default: 'error')
 * @param context - Additional context for debugging
 *
 * @example
 * ```typescript
 * try {
 *   await fetchData();
 * } catch (error) {
 *   trackError(error, 'error', {
 *     component: 'DataFetcher',
 *     action: 'fetchData',
 *     userId: user.id
 *   });
 * }
 * ```
 */
export function trackError(
  error: Error | string,
  severity: ErrorSeverity = 'error',
  context?: ErrorContext
): void {
  const config = getConfig();

  // Check if tracking is enabled
  if (!config.enabled) {
    return;
  }

  // Check sample rate
  if (!shouldTrackError(config.sampleRate)) {
    return;
  }

  // Convert string to Error object
  const errorObj = typeof error === 'string' ? new Error(error) : error;

  // Add timestamp to context
  const enrichedContext: ErrorContext = {
    ...context,
    timestamp: new Date().toISOString(),
    environment: config.environment,
    severity,
  };

  // Log to console if enabled
  if (config.logToConsole) {
    const formatted = formatError(errorObj, enrichedContext);

    switch (severity) {
      case 'fatal':
      case 'error':
        console.error(formatted);
        break;
      case 'warning':
        console.warn(formatted);
        break;
      case 'info':
      case 'debug':
        console.log(formatted);
        break;
    }
  }

  // TODO: Add external service integration here (Sentry, LogRocket, etc.)
  // Example:
  // if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  //   Sentry.captureException(errorObj, {
  //     level: severity,
  //     contexts: { custom: enrichedContext }
  //   });
  // }
}

/**
 * Track a handled exception (non-critical error)
 *
 * @param error - Error object or message
 * @param context - Additional context
 */
export function trackWarning(error: Error | string, context?: ErrorContext): void {
  trackError(error, 'warning', context);
}

/**
 * Track an informational message (not an error)
 *
 * @param message - Info message
 * @param context - Additional context
 */
export function trackInfo(message: string, context?: ErrorContext): void {
  trackError(new Error(message), 'info', context);
}

/**
 * Track a fatal error (application-breaking)
 *
 * @param error - Error object or message
 * @param context - Additional context
 */
export function trackFatal(error: Error | string, context?: ErrorContext): void {
  trackError(error, 'fatal', context);
}

/**
 * Wrap an async function with error tracking
 *
 * @param fn - Async function to wrap
 * @param context - Base context to include with all errors
 * @returns Wrapped function with automatic error tracking
 *
 * @example
 * ```typescript
 * const safeFetch = withErrorTracking(
 *   async (url: string) => {
 *     const res = await fetch(url);
 *     return res.json();
 *   },
 *   { component: 'DataFetcher' }
 * );
 *
 * // Errors are automatically tracked
 * const data = await safeFetch('/api/data');
 * ```
 */
export function withErrorTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: ErrorContext
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      trackError(error as Error, 'error', context);
      throw error; // Re-throw to preserve original behavior
    }
  }) as T;
}

/**
 * Create a scoped error tracker with predefined context
 *
 * Useful for tracking errors in a specific component or module
 *
 * @param defaultContext - Default context to include with all errors
 * @returns Scoped error tracking functions
 *
 * @example
 * ```typescript
 * // In a component
 * const errorTracker = createErrorTracker({
 *   component: 'CampaignDashboard',
 *   userId: user.id
 * });
 *
 * try {
 *   await loadCampaigns();
 * } catch (error) {
 *   errorTracker.error(error, { action: 'loadCampaigns' });
 * }
 * ```
 */
export function createErrorTracker(defaultContext?: ErrorContext) {
  return {
    error: (error: Error | string, context?: ErrorContext) =>
      trackError(error, 'error', { ...defaultContext, ...context }),
    warning: (error: Error | string, context?: ErrorContext) =>
      trackWarning(error, { ...defaultContext, ...context }),
    info: (message: string, context?: ErrorContext) =>
      trackInfo(message, { ...defaultContext, ...context }),
    fatal: (error: Error | string, context?: ErrorContext) =>
      trackFatal(error, { ...defaultContext, ...context }),
  };
}

/**
 * Track page view for analytics
 * (Can be extended to Google Analytics, Mixpanel, etc.)
 *
 * @param url - Page URL
 * @param context - Additional context
 */
export function trackPageView(url: string, context?: ErrorContext): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`📄 Page View: ${url}`, context);
  }

  // TODO: Add analytics service integration here
  // Example:
  // if (process.env.NEXT_PUBLIC_GA_ID) {
  //   gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
  //     page_path: url,
  //     ...context
  //   });
  // }
}
