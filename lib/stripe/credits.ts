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
 * Credit allocation logic:
 * - Month 1 (first payment): Grant full payment amount (100% of $499 = $499)
 * - Month 2+ (recurring): Grant capped amount ($99)
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
    // Month 1: 100% of payment ($499.00)
    // Month 2+: Capped at $99.00
    const MAX_RECURRING_CREDITS = 9900; // $99.00 in cents
    let creditsToAdd: number;

    if (billingCycleCount === 1) {
      // First month: Grant full amount
      creditsToAdd = amountPaid; // $499.00
      console.log(
        `[Credits] Month 1 payment: Granting full amount $${(creditsToAdd / 100).toFixed(2)}`
      );
    } else {
      // Recurring months: Cap at $99
      creditsToAdd = Math.min(amountPaid, MAX_RECURRING_CREDITS);
      console.log(
        `[Credits] Month ${billingCycleCount} payment: Granting capped amount $${(
          creditsToAdd / 100
        ).toFixed(2)}`
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
 * Get billing cycle count from subscription
 *
 * Note: This is a simplified implementation. In production, you would:
 * 1. Track billing cycle count in database
 * 2. Or use Stripe metadata to store cycle count
 * 3. Or count invoice.payment_succeeded events for this subscription
 *
 * For now, we'll use a simple approach:
 * - Check if this is the first invoice (subscription just created)
 * - If subscription_id exists and no prior credits granted, it's Month 1
 * - Otherwise, it's Month 2+
 *
 * @param subscriptionId - Stripe subscription ID
 * @param organizationId - Organization ID
 * @returns Billing cycle count (1 = first month, 2+ = recurring)
 */
export async function getBillingCycleCount(
  subscriptionId: string,
  organizationId: string
): Promise<number> {
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

    // Simple heuristic: If credits are still at default ($100 free credits),
    // this is likely the first payment
    const currentCredits = parseFloat(org.credits || '0');

    if (currentCredits <= 100) {
      // Still at or below free credits → First payment
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
