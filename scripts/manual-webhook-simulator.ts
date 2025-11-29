/**
 * Manual Webhook Simulator
 *
 * Use this script to manually process Stripe payments when webhooks
 * aren't delivered (development mode without Stripe CLI).
 *
 * Usage:
 *   npx tsx scripts/manual-webhook-simulator.ts <payment_intent_id>
 *
 * Example:
 *   npx tsx scripts/manual-webhook-simulator.ts pi_3SVljdFwuMff93IL0Qnosqgp
 */

import Stripe from 'stripe';
import { createServiceClient } from '../lib/supabase/server';
import {
  addCreditsToOrganization,
  getOrganizationFromCustomer,
  getBillingCycleFromInvoice,
} from '../lib/stripe/credits';

async function processPayment(paymentIntentId: string) {
  console.log('[Manual Webhook] Starting manual payment processing...');
  console.log('[Manual Webhook] Payment Intent:', paymentIntentId);

  // Initialize Stripe
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-11-17.clover',
  });

  try {
    // 1. Retrieve Payment Intent
    console.log('\n[Manual Webhook] Step 1: Retrieving payment intent...');
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    console.log('[Manual Webhook] Payment Status:', paymentIntent.status);
    console.log('[Manual Webhook] Amount:', `$${(paymentIntent.amount / 100).toFixed(2)}`);

    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Payment not successful. Status: ${paymentIntent.status}`);
    }

    // 2. Get Invoice from Payment Intent
    console.log('\n[Manual Webhook] Step 2: Retrieving invoice...');
    const invoiceId = (paymentIntent as any).invoice as string;

    if (!invoiceId) {
      throw new Error('No invoice associated with this payment intent');
    }

    const invoice = await stripe.invoices.retrieve(invoiceId) as any;
    console.log('[Manual Webhook] Invoice:', invoice.id);
    console.log('[Manual Webhook] Customer:', invoice.customer);
    console.log('[Manual Webhook] Subscription:', invoice.subscription);
    console.log('[Manual Webhook] Billing Reason:', invoice.billing_reason);

    // 3. Get Customer ID
    const customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id;

    if (!customerId) {
      throw new Error('No customer ID in invoice');
    }

    // 4. Get Organization
    console.log('\n[Manual Webhook] Step 3: Finding organization...');
    const organizationId = await getOrganizationFromCustomer(customerId);

    if (!organizationId) {
      throw new Error(`No organization found for customer: ${customerId}`);
    }

    console.log('[Manual Webhook] Organization ID:', organizationId);

    // 5. Get Subscription
    console.log('\n[Manual Webhook] Step 4: Retrieving subscription...');
    const subscriptionId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;

    if (!subscriptionId) {
      throw new Error('No subscription ID in invoice');
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    console.log('[Manual Webhook] Subscription Status:', subscription.status);

    // 6. Determine Billing Cycle
    console.log('\n[Manual Webhook] Step 5: Determining billing cycle...');
    const billingCycleCount = await getBillingCycleFromInvoice(invoice);
    console.log('[Manual Webhook] Billing Cycle: Month', billingCycleCount);
    console.log('[Manual Webhook] Credits to Grant:',
      billingCycleCount === 1 ? '$499.00' : '$99.00');

    // 7. Grant Credits
    console.log('\n[Manual Webhook] Step 6: Granting credits...');
    const creditResult = await addCreditsToOrganization(
      organizationId,
      invoice.amount_paid,
      billingCycleCount
    );

    if (!creditResult.success) {
      throw new Error(`Failed to grant credits: ${creditResult.error}`);
    }

    console.log('[Manual Webhook] ✅ Credits Granted:', `$${creditResult.creditsAdded?.toFixed(2)}`);
    console.log('[Manual Webhook] ✅ New Balance:', `$${creditResult.newBalance?.toFixed(2)}`);

    // 8. Update Billing Status
    console.log('\n[Manual Webhook] Step 7: Updating billing status...');
    const supabase = createServiceClient();

    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        billing_status: subscription.status,
        stripe_subscription_id: subscriptionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId);

    if (updateError) {
      console.error('[Manual Webhook] ⚠️  Failed to update billing status:', updateError);
    } else {
      console.log('[Manual Webhook] ✅ Billing Status Updated:', subscription.status);
    }

    // 9. Summary
    console.log('\n[Manual Webhook] ========================================');
    console.log('[Manual Webhook] ✅ PAYMENT PROCESSING COMPLETE');
    console.log('[Manual Webhook] ========================================');
    console.log('[Manual Webhook] Organization ID:', organizationId);
    console.log('[Manual Webhook] Subscription:', subscriptionId);
    console.log('[Manual Webhook] Status:', subscription.status);
    console.log('[Manual Webhook] Credits Added:', `$${creditResult.creditsAdded?.toFixed(2)}`);
    console.log('[Manual Webhook] Total Credits:', `$${creditResult.newBalance?.toFixed(2)}`);
    console.log('[Manual Webhook] ========================================\n');

  } catch (error) {
    console.error('\n[Manual Webhook] ❌ ERROR:', error);
    process.exit(1);
  }
}

// Main execution
const paymentIntentId = process.argv[2];

if (!paymentIntentId) {
  console.error('Usage: npx tsx scripts/manual-webhook-simulator.ts <payment_intent_id>');
  console.error('Example: npx tsx scripts/manual-webhook-simulator.ts pi_3SVljdFwuMff93IL0Qnosqgp');
  process.exit(1);
}

if (!paymentIntentId.startsWith('pi_')) {
  console.error('Error: Invalid payment intent ID. Must start with "pi_"');
  process.exit(1);
}

processPayment(paymentIntentId)
  .then(() => {
    console.log('[Manual Webhook] Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Manual Webhook] Script failed:', error);
    process.exit(1);
  });
