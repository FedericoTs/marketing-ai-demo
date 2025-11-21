/**
 * Stripe Client Configuration
 *
 * Server-side Stripe SDK client for subscription management,
 * customer creation, and payment processing.
 *
 * Phase 9.2.1 - Stripe Integration
 */

import Stripe from 'stripe';

/**
 * Lazy-initialized Stripe client (only created when needed)
 */
let stripeInstance: Stripe | null = null;

/**
 * Get Stripe client instance
 * Creates client on first use, throws error if API key not configured
 */
export function getStripeClient(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey || secretKey.includes('YOUR_SECRET_KEY_HERE')) {
      throw new Error(
        'Stripe is not configured. Please add STRIPE_SECRET_KEY to .env.local\n' +
        'Get your key from: https://dashboard.stripe.com/test/apikeys'
      );
    }

    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2024-11-20.acacia', // Latest stable API version
      typescript: true,
      appInfo: {
        name: 'DropLab Platform',
        version: '1.0.0',
      },
    });
  }

  return stripeInstance;
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  return !!(secretKey && !secretKey.includes('YOUR_SECRET_KEY_HERE'));
}

/**
 * Get Stripe publishable key for client-side Elements
 * @returns Publishable key for Stripe.js or null if not configured
 */
export function getStripePublishableKey(): string | null {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!key || key.includes('YOUR_PUBLISHABLE_KEY_HERE')) {
    return null;
  }

  return key;
}

/**
 * Test Stripe connection
 * @returns Object with success status and error message if applicable
 */
export async function testStripeConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isStripeConfigured()) {
      return {
        success: false,
        error: 'Stripe is not configured. Please add API keys to .env.local',
      };
    }

    const stripe = getStripeClient();

    // Simple API call to verify credentials
    await stripe.customers.list({ limit: 1 });

    return { success: true };
  } catch (error) {
    console.error('Stripe connection test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
