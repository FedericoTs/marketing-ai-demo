/**
 * Next.js API Response Wrapper Utilities
 *
 * Purpose: Simplify creating standardized responses in API routes
 * Usage: Import in app/api/**\/route.ts files
 *
 * Created: Oct 23, 2025
 * Part of: Consistency Fixes Phase 1
 */

import { NextResponse } from 'next/server';
import { ApiResponse } from './api-response';
import { trackError, type ErrorContext } from './error-tracking';

/**
 * Create a successful JSON response
 *
 * @param data - The data to return
 * @param message - Optional success message
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with standardized success format
 *
 * @example
 * ```typescript
 * // In app/api/campaigns/route.ts
 * export async function GET() {
 *   const campaigns = await getCampaigns();
 *   return apiSuccess(campaigns, 'Campaigns loaded successfully');
 * }
 * ```
 */
export function apiSuccess<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message }),
    },
    { status }
  );
}

/**
 * Create an error JSON response
 *
 * @param error - Error message for the user
 * @param status - HTTP status code (default: 500)
 * @param code - Optional error code for programmatic handling
 * @returns NextResponse with standardized error format
 *
 * @example
 * ```typescript
 * // In app/api/campaigns/[id]/route.ts
 * export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
 *   const campaign = await getCampaignById(params.id);
 *   if (!campaign) {
 *     return apiError('Campaign not found', 404, 'NOT_FOUND');
 *   }
 *   return apiSuccess(campaign);
 * }
 * ```
 */
export function apiError(
  error: string,
  status: number = 500,
  code?: string
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(code && { code }),
    },
    { status }
  );
}

/**
 * Handle errors in API routes with appropriate status codes
 *
 * Enhanced with error tracking (Phase 2)
 *
 * @param error - The error that occurred
 * @param context - Optional error context (route, userId, etc.)
 * @returns NextResponse with error details
 *
 * @example
 * ```typescript
 * export async function POST(req: NextRequest) {
 *   try {
 *     const data = await req.json();
 *     const result = await createCampaign(data);
 *     return apiSuccess(result);
 *   } catch (error) {
 *     return handleApiError(error, { route: '/api/campaigns' });
 *   }
 * }
 * ```
 */
export function handleApiError(
  error: unknown,
  context?: ErrorContext
): NextResponse<ApiResponse> {
  console.error('[API Error]', error);

  if (error instanceof Error) {
    // Determine severity based on error type
    const is4xx = error.message.includes('not found') ||
                  error.message.includes('validation') ||
                  error.message.includes('duplicate');
    const severity = is4xx ? 'warning' : 'error';

    // Track error with context
    trackError(error, severity, {
      ...context,
      apiRoute: true,
    });

    // Check for specific error types
    if (error.message.includes('not found')) {
      return apiError(error.message, 404, 'NOT_FOUND');
    }
    if (error.message.includes('validation')) {
      return apiError(error.message, 400, 'VALIDATION_ERROR');
    }
    if (error.message.includes('duplicate')) {
      return apiError(error.message, 409, 'DUPLICATE');
    }

    // Generic error
    return apiError(error.message, 500, 'INTERNAL_ERROR');
  }

  // Unknown error type - track as fatal
  trackError(new Error('Unknown error type'), 'fatal', {
    ...context,
    apiRoute: true,
    originalError: String(error),
  });

  return apiError('An unexpected error occurred', 500, 'UNKNOWN_ERROR');
}

/**
 * Common HTTP status codes for quick reference
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Common error codes for consistent handling
 */
export const ERROR_CODES = {
  // Client errors (4xx)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  DUPLICATE: 'DUPLICATE',
  CONFLICT: 'CONFLICT',

  // Server errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

/**
 * Validation error response helper
 *
 * @param message - Validation error message
 * @param fields - Optional field-level errors
 * @returns NextResponse with validation error
 */
export function validationError(
  message: string,
  fields?: Record<string, string>
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: ERROR_CODES.VALIDATION_ERROR,
      ...(fields && { fields }),
    },
    { status: HTTP_STATUS.BAD_REQUEST }
  );
}

/**
 * Not found error response helper
 *
 * @param resource - Name of the resource not found
 * @returns NextResponse with not found error
 */
export function notFoundError(resource: string = 'Resource'): NextResponse<ApiResponse> {
  return apiError(`${resource} not found`, HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
}

/**
 * Unauthorized error response helper
 *
 * @param message - Optional custom message
 * @returns NextResponse with unauthorized error
 */
export function unauthorizedError(message: string = 'Authentication required'): NextResponse<ApiResponse> {
  return apiError(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED);
}
