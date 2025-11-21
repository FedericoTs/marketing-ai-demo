/**
 * useBillingStatus Hook
 *
 * Provides billing status information and feature access control
 * based on organization's payment status.
 *
 * Usage:
 * ```tsx
 * const { isFeatureLocked, billingStatus, requiresPayment } = useBillingStatus();
 *
 * if (isFeatureLocked('campaigns')) {
 *   return <UpgradePrompt />;
 * }
 * ```
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Organization } from '@/lib/database/types';

export type FeatureName = 'campaigns' | 'templates' | 'analytics' | 'team' | 'audiences';

export interface BillingStatusInfo {
  organization: Organization | null;
  billingStatus: Organization['billing_status'] | null;
  credits: number;
  isLoading: boolean;
  error: Error | null;

  // Feature access checks
  requiresPayment: boolean; // True if billing_status is 'incomplete'
  isPastDue: boolean; // True if billing_status is 'past_due'
  isActive: boolean; // True if billing_status is 'active' or 'trialing'
  hasCredits: boolean; // True if credits > 0

  // Feature gating
  isFeatureLocked: (feature: FeatureName) => boolean;
  getUpgradeMessage: (feature: FeatureName) => string;

  // Refresh function
  refresh: () => Promise<void>;
}

export function useBillingStatus(): BillingStatusInfo {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadBillingStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Not authenticated');
      }

      // Get user profile to find organization
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      // Get organization with billing info
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();

      if (orgError) {
        throw orgError;
      }

      setOrganization(org as Organization);
    } catch (err) {
      console.error('[useBillingStatus] Error loading billing status:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBillingStatus();
  }, []);

  // Derived values
  const billingStatus = organization?.billing_status || null;
  const credits = organization?.credits || 0;
  const requiresPayment = billingStatus === 'incomplete';
  const isPastDue = billingStatus === 'past_due';
  const isActive = billingStatus === 'active' || billingStatus === 'trialing';
  const hasCredits = credits > 0;

  /**
   * Check if a feature is locked due to billing status
   *
   * Locking rules:
   * - 'incomplete' status → All paid features locked (campaigns, templates)
   * - 'past_due' status → Campaign sending locked, viewing allowed
   * - 'cancelled' status → All features locked
   * - credits <= 0 → Campaign sending locked (can't afford to send)
   */
  const isFeatureLocked = (feature: FeatureName): boolean => {
    if (!organization) {
      return true; // Lock everything if no org data
    }

    // Incomplete billing → lock everything except viewing
    if (requiresPayment) {
      return ['campaigns', 'templates', 'audiences'].includes(feature);
    }

    // Cancelled subscription → lock everything
    if (billingStatus === 'cancelled') {
      return true;
    }

    // Past due → lock campaign sending only
    if (isPastDue) {
      return feature === 'campaigns';
    }

    // No credits → lock campaign sending (can't afford to send)
    if (!hasCredits && feature === 'campaigns') {
      return true;
    }

    return false; // Feature is unlocked
  };

  /**
   * Get contextual upgrade message for locked feature
   */
  const getUpgradeMessage = (feature: FeatureName): string => {
    if (requiresPayment) {
      return 'Complete payment to unlock this feature';
    }

    if (billingStatus === 'cancelled') {
      return 'Your subscription has been cancelled. Reactivate to continue.';
    }

    if (isPastDue) {
      return 'Your payment is past due. Update your payment method to continue.';
    }

    if (!hasCredits && feature === 'campaigns') {
      return 'Insufficient credits. Add more credits to send campaigns.';
    }

    return 'Upgrade your plan to access this feature';
  };

  return {
    organization,
    billingStatus,
    credits,
    isLoading,
    error,
    requiresPayment,
    isPastDue,
    isActive,
    hasCredits,
    isFeatureLocked,
    getUpgradeMessage,
    refresh: loadBillingStatus,
  };
}
