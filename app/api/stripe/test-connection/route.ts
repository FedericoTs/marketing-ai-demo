/**
 * Stripe Connection Test Endpoint
 *
 * Tests Stripe API configuration and connectivity.
 * Use this endpoint to verify Stripe is properly configured.
 *
 * Phase 9.2.1 - Stripe Integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { isStripeConfigured, testStripeConnection, getStripePublishableKey } from '@/lib/stripe/client';

export async function GET(request: NextRequest) {
  try {
    console.log('[Stripe Test] Testing Stripe configuration...');

    // Check if Stripe is configured
    const isConfigured = isStripeConfigured();
    const publishableKey = getStripePublishableKey();

    if (!isConfigured) {
      return NextResponse.json(
        {
          success: false,
          configured: false,
          message: 'Stripe is not configured. Please add API keys to .env.local',
          instructions: 'Get your keys from: https://dashboard.stripe.com/test/apikeys',
        },
        { status: 200 } // Not an error, just not configured yet
      );
    }

    // Test connection
    console.log('[Stripe Test] API keys found, testing connection...');
    const testResult = await testStripeConnection();

    if (testResult.success) {
      console.log('[Stripe Test] ✅ Connection successful');
      return NextResponse.json({
        success: true,
        configured: true,
        message: 'Stripe is properly configured and connected',
        publishableKey: publishableKey ? `${publishableKey.slice(0, 12)}...` : null,
      });
    } else {
      console.error('[Stripe Test] ❌ Connection failed:', testResult.error);
      return NextResponse.json(
        {
          success: false,
          configured: true,
          message: 'Stripe is configured but connection failed',
          error: testResult.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Stripe Test] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Unexpected error testing Stripe connection',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
