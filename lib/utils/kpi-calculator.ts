/**
 * Standardized KPI Calculation Utilities
 *
 * Purpose: Centralize all KPI formulas to ensure consistency across the platform
 * Key Principle: Store as decimals (0.0-1.0), format for display
 *
 * Created: Oct 23, 2025
 * Part of: Consistency Fixes Phase 1
 */

/**
 * Calculate conversion rate as a decimal
 * Formula: conversions / total_base
 *
 * @param conversions - Number of conversions
 * @param totalBase - Total base (recipients, visitors, etc.)
 * @returns Decimal between 0.0 and 1.0 (e.g., 0.156 = 15.6%)
 *
 * @example
 * ```typescript
 * const rate = calculateConversionRate(156, 1000);
 * // Returns: 0.156
 * formatPercentage(rate); // "15.6%"
 * ```
 */
export function calculateConversionRate(conversions: number, totalBase: number): number {
  if (totalBase === 0 || conversions < 0) return 0;
  const rate = conversions / totalBase;
  return Math.min(Math.max(rate, 0), 1); // Clamp between 0 and 1
}

/**
 * Calculate response rate (page views / recipients)
 * Same as conversion rate but with specific naming for clarity
 *
 * @param pageViews - Number of landing page views
 * @param totalRecipients - Total recipients who received the campaign
 * @returns Decimal between 0.0 and 1.0
 */
export function calculateResponseRate(pageViews: number, totalRecipients: number): number {
  return calculateConversionRate(pageViews, totalRecipients);
}

/**
 * Format a decimal value as a percentage string
 *
 * @param value - Decimal value (0.0 to 1.0)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 *
 * @example
 * ```typescript
 * formatPercentage(0.156);      // "15.6%"
 * formatPercentage(0.156, 2);   // "15.60%"
 * formatPercentage(0.156, 0);   // "16%"
 * ```
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  if (isNaN(value) || !isFinite(value)) return '0.0%';
  const percentage = value * 100;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Format duration in seconds to human-readable string
 *
 * @param seconds - Duration in seconds (can be null/undefined)
 * @returns Formatted string like "1m 23s" or "45s"
 *
 * @example
 * ```typescript
 * formatDuration(83);    // "1m 23s"
 * formatDuration(45);    // "45s"
 * formatDuration(0);     // "0s"
 * formatDuration(null);  // "0s"
 * ```
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds < 0) return '0s';

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

/**
 * Calculate average from an array of numbers
 *
 * @param values - Array of numbers
 * @returns Average value, or 0 if array is empty
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * Calculate ROI (Return on Investment)
 * Formula: (revenue - cost) / cost
 *
 * @param revenue - Total revenue generated
 * @param cost - Total cost invested
 * @returns ROI as decimal (e.g., 0.25 = 25% ROI)
 */
export function calculateROI(revenue: number, cost: number): number {
  if (cost === 0) return 0;
  return (revenue - cost) / cost;
}

/**
 * Format number as currency
 *
 * @param amount - Dollar amount
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string
 *
 * @example
 * ```typescript
 * formatCurrency(1234.56);   // "$1,234.56"
 * formatCurrency(1000, 0);   // "$1,000"
 * ```
 */
export function formatCurrency(amount: number, decimals: number = 2): string {
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
}

/**
 * Calculate cost per conversion
 *
 * @param totalCost - Total campaign cost
 * @param conversions - Number of conversions
 * @returns Cost per conversion, or 0 if no conversions
 */
export function calculateCostPerConversion(totalCost: number, conversions: number): number {
  if (conversions === 0) return 0;
  return totalCost / conversions;
}

/**
 * Round number to nearest multiple
 *
 * @param value - Value to round
 * @param multiple - Multiple to round to (e.g., 50, 100)
 * @returns Rounded value
 *
 * @example
 * ```typescript
 * roundToNearest(347, 50);  // 350
 * roundToNearest(220, 100); // 200
 * ```
 */
export function roundToNearest(value: number, multiple: number): number {
  return Math.round(value / multiple) * multiple;
}

/**
 * Clamp value between min and max
 *
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Format large numbers with K, M suffixes
 *
 * @param value - Number to format
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * formatLargeNumber(1234);      // "1.2K"
 * formatLargeNumber(1234567);   // "1.2M"
 * formatLargeNumber(500);       // "500"
 * ```
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}
