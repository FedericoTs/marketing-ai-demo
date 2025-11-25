/**
 * Credit Calculation Utilities
 *
 * Pure functions for credit allocation calculations.
 * Extracted from lib/stripe/credits.ts for testability.
 *
 * Phase 1.2 - Testing Infrastructure
 */

/**
 * Calculate credits to allocate based on payment amount and billing cycle
 *
 * Business Logic:
 * - Month 1 (first payment): Grant 100% of payment amount
 * - Month 2+ (recurring): Grant capped amount ($99 max)
 *
 * @param amountPaid - Amount paid in cents (e.g., 49900 for $499.00)
 * @param billingCycleCount - Which billing cycle (1 = first month, 2+ = recurring)
 * @returns Credits to add in cents
 *
 * @example
 * ```typescript
 * calculateCreditsToAllocate(49900, 1);  // Returns: 49900 ($499.00 - first month)
 * calculateCreditsToAllocate(49900, 2);  // Returns: 9900 ($99.00 - recurring)
 * calculateCreditsToAllocate(5000, 2);   // Returns: 5000 ($50.00 - below cap)
 * ```
 */
export function calculateCreditsToAllocate(
  amountPaid: number,
  billingCycleCount: number
): number {
  const MAX_RECURRING_CREDITS = 9900; // $99.00 in cents

  if (billingCycleCount === 1) {
    // First month: Grant full amount
    return amountPaid;
  } else {
    // Recurring months: Cap at $99
    return Math.min(amountPaid, MAX_RECURRING_CREDITS);
  }
}

/**
 * Convert cents to decimal dollars
 *
 * @param cents - Amount in cents (e.g., 49900)
 * @returns Decimal dollars (e.g., 499.00)
 *
 * @example
 * ```typescript
 * centsToDecimal(49900);  // Returns: 499.00
 * centsToDecimal(9900);   // Returns: 99.00
 * centsToDecimal(150);    // Returns: 1.50
 * ```
 */
export function centsToDecimal(cents: number): number {
  return cents / 100;
}

/**
 * Convert decimal dollars to cents
 *
 * @param decimal - Amount in dollars (e.g., 499.00)
 * @returns Amount in cents (e.g., 49900)
 *
 * @example
 * ```typescript
 * decimalToCents(499.00);  // Returns: 49900
 * decimalToCents(99.00);   // Returns: 9900
 * decimalToCents(1.50);    // Returns: 150
 * ```
 */
export function decimalToCents(decimal: number): number {
  return Math.round(decimal * 100);
}

/**
 * Calculate new credit balance after adding credits
 *
 * @param currentBalance - Current balance in decimal format (e.g., 100.50)
 * @param creditsToAdd - Credits to add in decimal format (e.g., 499.00)
 * @returns New balance in decimal format
 *
 * @example
 * ```typescript
 * calculateNewBalance(100.50, 499.00);  // Returns: 599.50
 * calculateNewBalance(0, 499.00);       // Returns: 499.00
 * calculateNewBalance(50.25, 99.00);    // Returns: 149.25
 * ```
 */
export function calculateNewBalance(
  currentBalance: number,
  creditsToAdd: number
): number {
  return currentBalance + creditsToAdd;
}

/**
 * Determine if billing cycle is first month based on billing reason
 *
 * Stripe billing_reason values:
 * - 'subscription_create' → First payment (Month 1)
 * - 'subscription_cycle' → Recurring payment (Month 2+)
 * - 'subscription_update' → Plan change (treat as recurring)
 * - Unknown → Default to recurring (safer to give less credits)
 *
 * @param billingReason - Stripe invoice billing_reason
 * @returns Billing cycle count (1 = first month, 2 = recurring)
 *
 * @example
 * ```typescript
 * getBillingCycleFromReason('subscription_create');  // Returns: 1
 * getBillingCycleFromReason('subscription_cycle');   // Returns: 2
 * getBillingCycleFromReason('subscription_update');  // Returns: 2
 * getBillingCycleFromReason('unknown_reason');       // Returns: 2
 * ```
 */
export function getBillingCycleFromReason(billingReason: string): number {
  if (billingReason === 'subscription_create') {
    return 1; // First payment
  } else {
    return 2; // Recurring or unknown (safer to give less credits)
  }
}
