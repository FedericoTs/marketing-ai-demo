/**
 * Stripe Credits Management
 *
 * Functions for allocating and managing credits based on
 * Stripe subscription payments.
 *
 * Phase 9.2.3 - Credit Allocation Logic
 */

import { createServiceClient } from '@/lib/supabase/server';

export interface CreditAllocationResult {
  success: boolean;
  creditsAdded?: number;
  newBalance?: number;
  error?: string;
}

/**
 * Add credits to an organization based on subscription payment
 *
 * BILLING MODEL (Updated Nov 29, 2025):
 * - Subscription: $499/month (consistent pricing)
 * - Month 1 (first payment): Grant full payment amount ($499 = 499 credits)
 * - Month 2+ (recurring): Grant $99 in credits, $400 is platform access fee
 *
 * This ensures:
 * - Month 1: User gets maximum credits to try the platform
 * - Month 2+: $400 covers platform costs, $99 for mailing credits
 *
 * @param organizationId - UUID of the organization
 * @param amountPaid - Amount paid in cents (e.g., 49900 for $499)
 * @param billingCycleCount - Which billing cycle (1 = first month, 2+ = recurring)
 * @returns Result with credits added and new balance
 */
export async function addCreditsToOrganization(
  organizationId: string,
  amountPaid: number,
  billingCycleCount: number
): Promise<CreditAllocationResult> {
  try {
    const supabase = createServiceClient();

    // CREDIT ALLOCATION LOGIC
    // billingCycleCount = 0: One-time credit purchase → 100% of payment
    // billingCycleCount = 1: Month 1 subscription → 100% of payment ($499 = 499 credits)
    // billingCycleCount = 2+: Recurring subscription → $99 credits + $400 platform fee
    const MAX_RECURRING_CREDITS = 9900; // $99.00 in cents
    let creditsToAdd: number;

    if (billingCycleCount === 0) {
      // One-time credit purchase: Grant full amount (1:1 dollar to credit)
      creditsToAdd = amountPaid;
      console.log(
        `[Credits] One-Time Purchase: $${(amountPaid / 100).toFixed(2)} → $${(creditsToAdd / 100).toFixed(2)} credits (100%)`
      );
    } else if (billingCycleCount === 1) {
      // First month subscription: Grant full amount ($499 = 499 credits)
      creditsToAdd = amountPaid;
      console.log(
        `[Credits] Month 1 (Welcome Bonus): $${(amountPaid / 100).toFixed(2)} payment → $${(creditsToAdd / 100).toFixed(2)} credits (100%)`
      );
    } else {
      // Recurring months: $499 payment = $99 credits + $400 platform fee
      creditsToAdd = Math.min(amountPaid, MAX_RECURRING_CREDITS);
      const platformFee = (amountPaid - creditsToAdd) / 100;
      console.log(
        `[Credits] Month ${billingCycleCount}: $${(amountPaid / 100).toFixed(2)} payment → $${(creditsToAdd / 100).toFixed(2)} credits + $${platformFee.toFixed(2)} platform fee`
      );
    }

    // Convert cents to decimal format for database (49900 cents → 499.00)
    const creditsDecimal = creditsToAdd / 100;

    // Fetch current credits
    const { data: org, error: fetchError } = await supabase
      .from('organizations')
      .select('id, name, credits')
      .eq('id', organizationId)
      .single();

    if (fetchError || !org) {
      console.error('[Credits] Organization not found:', organizationId);
      return {
        success: false,
        error: 'Organization not found',
      };
    }

    const currentCredits = parseFloat(org.credits || '0');
    const newBalance = currentCredits + creditsDecimal;

    console.log(
      `[Credits] ${org.name}: $${currentCredits.toFixed(2)} + $${creditsDecimal.toFixed(
        2
      )} = $${newBalance.toFixed(2)}`
    );

    // Update credits in database
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        credits: newBalance.toFixed(2),
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId);

    if (updateError) {
      console.error('[Credits] Failed to update credits:', updateError);
      return {
        success: false,
        error: 'Failed to update credits in database',
      };
    }

    console.log(`[Credits] ✅ Successfully added $${creditsDecimal.toFixed(2)} credits to ${org.name}`);

    return {
      success: true,
      creditsAdded: creditsDecimal,
      newBalance: newBalance,
    };
  } catch (error) {
    console.error('[Credits] Error adding credits:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get organization ID from Stripe customer ID
 *
 * @param customerId - Stripe customer ID (cus_xxx)
 * @returns Organization ID or null if not found
 */
export async function getOrganizationFromCustomer(customerId: string): Promise<string | null> {
  try {
    const supabase = createServiceClient();

    const { data: org, error } = await supabase
      .from('organizations')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (error || !org) {
      console.error('[Credits] Organization not found for customer:', customerId);
      return null;
    }

    return org.id;
  } catch (error) {
    console.error('[Credits] Error fetching organization:', error);
    return null;
  }
}

/**
 * Get billing cycle count from Stripe invoice
 *
 * Uses Stripe's billing_reason to accurately determine if this is the first payment
 * or a recurring payment, regardless of current credit balance.
 *
 * Billing reasons:
 * - 'subscription_create' → First payment (Month 1)
 * - 'subscription_cycle' → Recurring payment (Month 2+)
 * - 'subscription_update' → Plan change (treat as recurring)
 *
 * @param invoice - Stripe invoice object
 * @returns Billing cycle count (1 = first month, 2+ = recurring)
 */
export async function getBillingCycleFromInvoice(invoice: any): Promise<number> {
  try {
    const billingReason = invoice.billing_reason;

    if (billingReason === 'subscription_create') {
      // First payment for new subscription
      console.log('[Credits] First payment detected (subscription_create)');
      return 1;
    } else if (
      billingReason === 'subscription_cycle' ||
      billingReason === 'subscription_update'
    ) {
      // Recurring payment or plan change
      console.log(`[Credits] Recurring payment detected (${billingReason})`);
      return 2;
    } else {
      // Unknown billing reason - log and default to recurring (safer to give less credits)
      console.warn(`[Credits] Unknown billing_reason: ${billingReason}, defaulting to recurring`);
      return 2;
    }
  } catch (error) {
    console.error('[Credits] Error determining billing cycle from invoice:', error);
    return 2; // Default to recurring on error (safer to give less credits)
  }
}

/**
 * Get billing cycle count from subscription (DEPRECATED)
 *
 * @deprecated Use getBillingCycleFromInvoice() instead for accurate cycle detection
 *
 * This function is kept for backward compatibility but should not be used.
 * It uses a flawed heuristic based on credit balance which can give incorrect results.
 *
 * @param subscriptionId - Stripe subscription ID
 * @param organizationId - Organization ID
 * @returns Billing cycle count (1 = first month, 2+ = recurring)
 */
export async function getBillingCycleCount(
  subscriptionId: string,
  organizationId: string
): Promise<number> {
  console.warn(
    '[Credits] getBillingCycleCount() is deprecated. Use getBillingCycleFromInvoice() instead.'
  );

  try {
    const supabase = createServiceClient();

    // Check if organization has ever received credits from this subscription
    // This is simplified - in production, you'd store payment history
    const { data: org } = await supabase
      .from('organizations')
      .select('credits, created_at')
      .eq('id', organizationId)
      .single();

    if (!org) {
      return 1; // Default to first month if org not found
    }

    // Simple heuristic: If credits are still at default ($0-$100 range),
    // this is likely the first payment
    const currentCredits = parseFloat(org.credits || '0');

    if (currentCredits <= 100) {
      // Still at or below initial credits → First payment
      return 1;
    } else {
      // Has received credits before → Recurring payment
      // Note: This is simplified. Production would track payment history.
      return 2;
    }
  } catch (error) {
    console.error('[Credits] Error determining billing cycle:', error);
    return 1; // Default to first month on error (safer to give more credits)
  }
}
