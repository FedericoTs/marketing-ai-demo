/**
 * Server-Side Billing Middleware
 *
 * Provides billing status validation for API routes to prevent
 * unpaid users from bypassing frontend feature gates.
 *
 * Usage:
 * ```typescript
 * const billingCheck = await validateBillingAccess(supabase, user.id, 'campaigns');
 * if (!billingCheck.hasAccess) {
 *   return NextResponse.json(
 *     { error: billingCheck.error },
 *     { status: 402 }
 *   );
 * }
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Organization } from '@/lib/database/types';

export type FeatureName = 'campaigns' | 'templates' | 'analytics' | 'team' | 'audiences';

export interface BillingCheckResult {
  hasAccess: boolean;
  error?: string;
  organization?: Organization;
  billingStatus?: Organization['billing_status'];
}

/**
 * Validate if a user has billing access to a specific feature
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to check
 * @param feature - Feature being accessed
 * @returns BillingCheckResult with access status
 */
export async function validateBillingAccess(
  supabase: SupabaseClient,
  userId: string,
  feature: FeatureName
): Promise<BillingCheckResult> {
  try {
    // 1. Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return {
        hasAccess: false,
        error: 'Organization not found',
      };
    }

    // 2. Get organization billing status
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, billing_status, credits')
      .eq('id', profile.organization_id)
      .single();

    if (orgError || !organization) {
      return {
        hasAccess: false,
        error: 'Organization billing info not found',
      };
    }

    const org = organization as Organization;

    // 3. Apply feature-specific billing rules
    const billingStatus = org.billing_status;
    const credits = org.credits || 0;

    // Rule 1: Incomplete billing → lock campaigns, templates, audiences
    if (billingStatus === 'incomplete') {
      if (['campaigns', 'templates', 'audiences'].includes(feature)) {
        return {
          hasAccess: false,
          error: 'Payment required. Complete your subscription to access this feature.',
          organization: org,
          billingStatus,
        };
      }
    }

    // Rule 2: Cancelled subscription → lock everything
    if (billingStatus === 'cancelled') {
      return {
        hasAccess: false,
        error: 'Your subscription has been cancelled. Please reactivate to continue.',
        organization: org,
        billingStatus,
      };
    }

    // Rule 3: Past due → lock campaign sending only
    if (billingStatus === 'past_due') {
      if (feature === 'campaigns') {
        return {
          hasAccess: false,
          error: 'Your payment is past due. Update your payment method to send campaigns.',
          organization: org,
          billingStatus,
        };
      }
    }

    // Rule 4: No credits → lock campaign sending (even if billing is active)
    if (credits <= 0 && feature === 'campaigns') {
      return {
        hasAccess: false,
        error: 'Insufficient credits. Add more credits to send campaigns.',
        organization: org,
        billingStatus,
      };
    }

    // Access granted
    return {
      hasAccess: true,
      organization: org,
      billingStatus,
    };
  } catch (error) {
    console.error('[Billing Middleware] Error checking billing access:', error);
    return {
      hasAccess: false,
      error: 'Failed to verify billing status',
    };
  }
}
