/**
 * Standardized API Response Types and Utilities
 *
 * Purpose: Ensure consistent response format across all API routes
 * Usage: Import in API route handlers
 *
 * Created: Oct 23, 2025
 * Part of: Consistency Fixes Phase 1
 */

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string; // Optional error code for programmatic handling
};

/**
 * Create a successful API response
 * @param data - The data to return
 * @param message - Optional success message
 * @returns Standardized success response
 *
 * @example
 * ```typescript
 * return successResponse({ campaigns: [...] }, 'Campaigns loaded');
 * // Returns: { success: true, data: { campaigns: [...] }, message: 'Campaigns loaded' }
 * ```
 */
export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message }),
  };
}

/**
 * Create an error API response
 * @param error - Error message for the user
 * @param code - Optional error code (e.g., 'VALIDATION_ERROR', 'NOT_FOUND')
 * @returns Standardized error response
 *
 * @example
 * ```typescript
 * return errorResponse('Campaign not found', 'NOT_FOUND');
 * // Returns: { success: false, error: 'Campaign not found', code: 'NOT_FOUND' }
 * ```
 */
export function errorResponse(error: string, code?: string): ApiResponse {
  return {
    success: false,
    error,
    ...(code && { code }),
  };
}

/**
 * Check if a response is successful
 * @param response - The API response to check
 * @returns True if response indicates success
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/campaigns');
 * const json = await response.json();
 * if (isSuccessResponse(json)) {
 *   // Handle success
 * }
 * ```
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}

/**
 * Check if a response is an error
 * @param response - The API response to check
 * @returns True if response indicates error
 */
export function isErrorResponse(response: ApiResponse): response is ApiResponse & { success: false; error: string } {
  return response.success === false && response.error !== undefined;
}
