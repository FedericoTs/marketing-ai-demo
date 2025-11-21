/**
 * Stripe Integration Verification Script
 *
 * Automated checks for Phase 9.2 Stripe billing integration
 * Run with: npx tsx scripts/verify-stripe-integration.ts
 */

import { getStripeClient } from '../lib/stripe/client';
import { createServiceClient } from '../lib/supabase/server';

interface VerificationResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

const results: VerificationResult[] = [];

function log(result: VerificationResult) {
  results.push(result);
  const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${result.check}: ${result.message}`);
  if (result.details) {
    console.log(`   Details:`, result.details);
  }
}

async function verifyEnvironmentVariables() {
  console.log('\n📋 Checking Environment Variables...\n');

  // Required variables
  const requiredVars = [
    'STRIPE_SECRET_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_PRICE_ID',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_APP_URL',
  ];

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      log({
        check: varName,
        status: 'PASS',
        message: `Configured (${value.substring(0, 10)}...)`,
      });
    } else {
      log({
        check: varName,
        status: 'FAIL',
        message: 'Not configured in .env.local',
      });
    }
  }
}

async function verifyStripeConnection() {
  console.log('\n🔌 Testing Stripe API Connection...\n');

  try {
    const stripe = getStripeClient();

    // Test API connection by fetching account info
    const account = await stripe.accounts.retrieve();

    log({
      check: 'Stripe API Connection',
      status: 'PASS',
      message: `Connected to Stripe account: ${account.business_profile?.name || account.id}`,
      details: {
        accountId: account.id,
        country: account.country,
        currency: account.default_currency,
      },
    });

    // Verify price exists
    const priceId = process.env.STRIPE_PRICE_ID;
    if (priceId) {
      try {
        const price = await stripe.prices.retrieve(priceId);
        log({
          check: 'Stripe Price Configuration',
          status: 'PASS',
          message: `Price found: $${(price.unit_amount! / 100).toFixed(2)}/${price.recurring?.interval}`,
          details: {
            priceId: price.id,
            amount: price.unit_amount,
            currency: price.currency,
            interval: price.recurring?.interval,
          },
        });
      } catch (error: any) {
        log({
          check: 'Stripe Price Configuration',
          status: 'FAIL',
          message: `Price ID not found: ${error.message}`,
        });
      }
    }

  } catch (error: any) {
    log({
      check: 'Stripe API Connection',
      status: 'FAIL',
      message: `Connection failed: ${error.message}`,
    });
  }
}

async function verifyDatabaseSchema() {
  console.log('\n💾 Checking Database Schema...\n');

  try {
    const supabase = createServiceClient();

    // Check organizations table has Stripe fields
    const { data: orgs, error } = await supabase
      .from('organizations')
      .select('id, name, stripe_customer_id, stripe_subscription_id, billing_status, credits')
      .limit(1);

    if (error) {
      log({
        check: 'Organizations Table Schema',
        status: 'FAIL',
        message: `Schema error: ${error.message}`,
      });
    } else {
      log({
        check: 'Organizations Table Schema',
        status: 'PASS',
        message: 'All Stripe fields present (stripe_customer_id, stripe_subscription_id, billing_status, credits)',
      });

      // Check for organizations with Stripe data
      const { data: stripeOrgs } = await supabase
        .from('organizations')
        .select('id, name, stripe_customer_id, billing_status')
        .not('stripe_customer_id', 'is', null);

      if (stripeOrgs && stripeOrgs.length > 0) {
        log({
          check: 'Stripe Customer Records',
          status: 'PASS',
          message: `Found ${stripeOrgs.length} organization(s) with Stripe customer IDs`,
          details: stripeOrgs.map((org) => ({
            name: org.name,
            customerId: org.stripe_customer_id,
            billingStatus: org.billing_status,
          })),
        });
      } else {
        log({
          check: 'Stripe Customer Records',
          status: 'WARN',
          message: 'No organizations with Stripe customers yet (expected before first signup)',
        });
      }
    }
  } catch (error: any) {
    log({
      check: 'Database Connection',
      status: 'FAIL',
      message: `Database error: ${error.message}`,
    });
  }
}

async function verifyAPIRoutes() {
  console.log('\n🛤️  Checking API Routes...\n');

  const routes = [
    '/api/stripe/create-customer',
    '/api/stripe/create-checkout-session',
    '/api/stripe/webhook',
    '/api/stripe/test-connection',
  ];

  // Just verify files exist
  const fs = require('fs');
  const path = require('path');

  for (const route of routes) {
    const filePath = path.join(
      process.cwd(),
      'app',
      route.replace(/^\/api\//, ''),
      'route.ts'
    );

    if (fs.existsSync(filePath)) {
      log({
        check: `API Route: ${route}`,
        status: 'PASS',
        message: 'File exists',
      });
    } else {
      log({
        check: `API Route: ${route}`,
        status: 'FAIL',
        message: 'File not found',
      });
    }
  }
}

async function verifyWebhookHandlers() {
  console.log('\n🪝 Checking Webhook Handlers...\n');

  const fs = require('fs');
  const path = require('path');

  const webhookFile = path.join(process.cwd(), 'app/api/stripe/webhook/route.ts');

  if (fs.existsSync(webhookFile)) {
    const content = fs.readFileSync(webhookFile, 'utf-8');

    // Check for required event handlers
    const eventHandlers = [
      { name: 'invoice.payment_succeeded', function: 'handlePaymentSucceeded' },
      { name: 'invoice.payment_failed', function: 'handlePaymentFailed' },
      { name: 'customer.subscription.created', function: 'handleSubscriptionCreated' },
      { name: 'customer.subscription.updated', function: 'handleSubscriptionUpdated' },
      { name: 'customer.subscription.deleted', function: 'handleSubscriptionDeleted' },
    ];

    for (const handler of eventHandlers) {
      if (content.includes(handler.function) && content.includes(`'${handler.name}'`)) {
        log({
          check: `Webhook Handler: ${handler.name}`,
          status: 'PASS',
          message: `${handler.function}() implemented`,
        });
      } else {
        log({
          check: `Webhook Handler: ${handler.name}`,
          status: 'FAIL',
          message: `${handler.function}() not found`,
        });
      }
    }

    // Check for signature verification
    if (content.includes('verifyWebhookSignature')) {
      log({
        check: 'Webhook Signature Verification',
        status: 'PASS',
        message: 'Signature verification implemented',
      });
    } else {
      log({
        check: 'Webhook Signature Verification',
        status: 'FAIL',
        message: 'No signature verification found',
      });
    }
  } else {
    log({
      check: 'Webhook Route File',
      status: 'FAIL',
      message: 'webhook/route.ts not found',
    });
  }
}

async function verifyCreditLogic() {
  console.log('\n💰 Checking Credit Allocation Logic...\n');

  const fs = require('fs');
  const path = require('path');

  const creditsFile = path.join(process.cwd(), 'lib/stripe/credits.ts');

  if (fs.existsSync(creditsFile)) {
    const content = fs.readFileSync(creditsFile, 'utf-8');

    // Check for billing cycle detection
    if (content.includes('getBillingCycleFromInvoice') && content.includes('billing_reason')) {
      log({
        check: 'Billing Cycle Detection',
        status: 'PASS',
        message: 'Using invoice.billing_reason for accurate cycle detection',
      });
    } else {
      log({
        check: 'Billing Cycle Detection',
        status: 'WARN',
        message: 'May be using deprecated getBillingCycleCount() method',
      });
    }

    // Check for credit allocation logic
    if (content.includes('subscription_create') && content.includes('subscription_cycle')) {
      log({
        check: 'Credit Allocation Logic',
        status: 'PASS',
        message: 'Month 1 vs Month 2+ logic present',
      });
    } else {
      log({
        check: 'Credit Allocation Logic',
        status: 'FAIL',
        message: 'Credit allocation logic not found',
      });
    }
  } else {
    log({
      check: 'Credits Module',
      status: 'FAIL',
      message: 'lib/stripe/credits.ts not found',
    });
  }
}

async function generateSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(80) + '\n');

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const warned = results.filter((r) => r.status === 'WARN').length;
  const total = results.length;

  console.log(`Total Checks: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warned}`);
  console.log('');

  if (failed === 0) {
    console.log('🎉 ALL CRITICAL CHECKS PASSED - Ready for manual testing!');
    console.log('');
    console.log('Next Steps:');
    console.log('1. Run: stripe listen --forward-to http://localhost:3000/api/stripe/webhook');
    console.log('2. Test signup flow with Stripe test card');
    console.log('3. Verify webhook events are received');
    console.log('4. Check credits are allocated correctly');
    console.log('');
    process.exit(0);
  } else {
    console.log('❌ CRITICAL ISSUES FOUND - Fix before manual testing');
    console.log('');
    console.log('Failed Checks:');
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => {
        console.log(`  - ${r.check}: ${r.message}`);
      });
    console.log('');
    process.exit(1);
  }
}

// Run all verification checks
async function main() {
  console.log('🔍 Stripe Integration Verification');
  console.log('Phase 9.2.8 - Pre-Testing Verification\n');

  await verifyEnvironmentVariables();
  await verifyStripeConnection();
  await verifyDatabaseSchema();
  await verifyAPIRoutes();
  await verifyWebhookHandlers();
  await verifyCreditLogic();
  await generateSummary();
}

main().catch((error) => {
  console.error('❌ Verification script failed:', error);
  process.exit(1);
});
