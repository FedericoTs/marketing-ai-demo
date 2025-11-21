/**
 * Stripe Customer Management
 *
 * Functions for creating and managing Stripe customers
 * tied to DropLab organizations.
 *
 * Phase 9.2.2 - Customer Creation
 */

import { getStripeClient, isStripeConfigured } from './client';
import { createServiceClient } from '@/lib/supabase/server';
import { createSubscriptionForCustomer } from './subscription';

export interface OrganizationData {
  id: string;
  name: string;
  email?: string;
  slug?: string;
}

export interface CreateCustomerResult {
  success: boolean;
  customerId?: string;
  error?: string;
  skipped?: boolean; // True if Stripe not configured
}

/**
 * Create Stripe customer for an organization
 *
 * This function is idempotent - it will:
 * 1. Check if customer already exists (stripe_customer_id set)
 * 2. If exists, return existing customer ID
 * 3. If not exists, create new customer and update database
 *
 * @param organizationId - UUID of the organization
 * @param organizationData - Organization details for customer metadata
 * @returns Result object with success status and customer ID or error
 */
export async function createStripeCustomerForOrganization(
  organizationId: string,
  organizationData?: OrganizationData
): Promise<CreateCustomerResult> {
  try {
    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      console.log('[Stripe Customer] Stripe not configured, skipping customer creation');
      return {
        success: false,
        skipped: true,
        error: 'Stripe is not configured',
      };
    }

    const supabase = createServiceClient();

    // STEP 1: Check if organization exists and get details
    const { data: org, error: fetchError } = await supabase
      .from('organizations')
      .select('id, name, slug, stripe_customer_id')
      .eq('id', organizationId)
      .single();

    if (fetchError || !org) {
      console.error('[Stripe Customer] Organization not found:', organizationId);
      return {
        success: false,
        error: 'Organization not found',
      };
    }

    // STEP 2: Check if customer already exists (idempotent check)
    if (org.stripe_customer_id) {
      console.log(
        `[Stripe Customer] Customer already exists for org ${org.name}: ${org.stripe_customer_id}`
      );
      return {
        success: true,
        customerId: org.stripe_customer_id,
      };
    }

    // STEP 3: Create Stripe customer
    const stripe = getStripeClient();

    const orgName = organizationData?.name || org.name;
    const orgEmail = organizationData?.email;
    const orgSlug = organizationData?.slug || org.slug;

    console.log(`[Stripe Customer] Creating customer for organization: ${orgName}`);

    const customer = await stripe.customers.create({
      name: orgName,
      email: orgEmail, // Optional - may be undefined for personal workspaces
      metadata: {
        organization_id: organizationId,
        organization_slug: orgSlug || '',
        platform: 'droplab',
        environment: process.env.NODE_ENV || 'development',
      },
      description: `DropLab Organization: ${orgName}`,
    });

    console.log(`[Stripe Customer] Created customer ${customer.id} for ${orgName}`);

    // STEP 4: Store customer ID in database
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        stripe_customer_id: customer.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId);

    if (updateError) {
      console.error('[Stripe Customer] Failed to update organization with customer ID:', updateError);
      // Customer was created in Stripe but failed to save to DB
      // This is recoverable - we can update the DB later
      return {
        success: false,
        customerId: customer.id,
        error: 'Created customer but failed to update database',
      };
    }

    console.log(`[Stripe Customer] ✅ Successfully linked customer ${customer.id} to org ${organizationId}`);

    // PHASE 9.2.3: Create subscription (non-blocking - doesn't fail customer creation)
    // This runs after customer is successfully created and stored
    try {
      const subscriptionResult = await createSubscriptionForCustomer(customer.id, organizationId);

      if (subscriptionResult.skipped) {
        console.log('[Stripe Customer] Subscription creation skipped (not configured)');
      } else if (subscriptionResult.success) {
        console.log(`[Stripe Customer] ✅ Subscription created: ${subscriptionResult.subscriptionId}`);
      } else {
        console.warn(`[Stripe Customer] ⚠️  Subscription creation failed: ${subscriptionResult.error}`);
        // Don't fail customer creation - subscription can be created later
      }
    } catch (subscriptionError) {
      // Catch any unexpected errors to prevent breaking customer creation
      console.warn('[Stripe Customer] ⚠️  Subscription creation error:', subscriptionError);
      // Continue - customer is still created successfully
    }

    return {
      success: true,
      customerId: customer.id,
    };
  } catch (error) {
    console.error('[Stripe Customer] Error creating customer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get or create Stripe customer for an organization
 *
 * Convenience function that gets existing customer or creates new one.
 * Use this when you need a customer ID and don't care if it's new or existing.
 *
 * @param organizationId - UUID of the organization
 * @returns Customer ID or null if failed
 */
export async function getOrCreateStripeCustomer(organizationId: string): Promise<string | null> {
  const result = await createStripeCustomerForOrganization(organizationId);

  if (result.success && result.customerId) {
    return result.customerId;
  }

  return null;
}
