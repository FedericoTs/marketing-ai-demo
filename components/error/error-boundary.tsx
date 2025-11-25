/**
 * Error Boundary Component
 *
 * Catches React rendering errors and displays fallback UI
 * Automatically tracks errors using error tracking utility
 *
 * Phase 2 - Error Monitoring Setup
 */

'use client';

import React, { Component, ReactNode } from 'react';
import { trackError } from '@/lib/utils/error-tracking';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  componentName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary to catch React errors
 *
 * @example
 * ```tsx
 * <ErrorBoundary componentName="CampaignDashboard">
 *   <CampaignDashboard />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Track error with context
    trackError(error, 'error', {
      component: this.props.componentName || 'ErrorBoundary',
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <DefaultErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
          componentName={this.props.componentName}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default error fallback UI
 */
function DefaultErrorFallback({
  error,
  onReset,
  componentName,
}: {
  error: Error | null;
  onReset: () => void;
  componentName?: string;
}) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="flex min-h-[400px] w-full flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-8">
      <div className="mx-auto max-w-md text-center">
        {/* Error Icon */}
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <svg
              className="h-8 w-8 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Error Title */}
        <h2 className="mb-2 text-xl font-semibold text-foreground">
          Something went wrong
        </h2>

        {/* Error Message (Development only) */}
        {isDevelopment && error && (
          <div className="mb-4">
            <p className="mb-2 text-sm text-muted-foreground">
              {componentName && `Component: ${componentName}`}
            </p>
            <div className="rounded-md bg-destructive/10 p-3 text-left">
              <code className="text-xs text-destructive">
                {error.message}
              </code>
            </div>
          </div>
        )}

        {/* User-friendly message (Production) */}
        {!isDevelopment && (
          <p className="mb-6 text-sm text-muted-foreground">
            We encountered an unexpected error. Please try again or contact support if the
            problem persists.
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={onReset} variant="default">
            Try Again
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
          >
            Reload Page
          </Button>
        </div>

        {/* Stack Trace (Development only) */}
        {isDevelopment && error?.stack && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
              View Stack Trace
            </summary>
            <pre className="mt-2 overflow-auto rounded-md bg-muted p-3 text-xs">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

/**
 * Lightweight error boundary for small components
 * Shows minimal fallback UI
 */
export function CompactErrorBoundary({
  children,
  componentName,
}: {
  children: ReactNode;
  componentName?: string;
}) {
  return (
    <ErrorBoundary
      componentName={componentName}
      fallback={
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm text-muted-foreground">
            Failed to load {componentName || 'component'}
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
