/**
 * Test Script: Stripe Customer Creation
 *
 * Tests the Stripe customer creation flow end-to-end
 */

import { createServiceClient } from '../lib/supabase/server';
import { createStripeCustomerForOrganization } from '../lib/stripe/customer';

async function testStripeCustomerCreation() {
  console.log('\n=== Testing Stripe Customer Creation ===\n');

  try {
    // Step 1: Get a test organization from database
    console.log('[1/4] Fetching test organization...');
    const supabase = createServiceClient();

    const { data: orgs, error: fetchError } = await supabase
      .from('organizations')
      .select('id, name, slug, stripe_customer_id')
      .limit(1);

    if (fetchError || !orgs || orgs.length === 0) {
      console.error('❌ No organizations found in database');
      console.error('   Please create a user account first via signup');
      return;
    }

    const org = orgs[0];
    console.log(`✅ Found organization: ${org.name} (${org.id})`);
    console.log(`   Current stripe_customer_id: ${org.stripe_customer_id || 'null'}`);

    // Step 2: Test customer creation
    console.log('\n[2/4] Creating Stripe customer...');
    const result = await createStripeCustomerForOrganization(org.id, {
      id: org.id,
      name: org.name,
      slug: org.slug,
      email: 'test@example.com'
    });

    if (result.skipped) {
      console.log('⚠️  Stripe not configured - customer creation skipped');
      return;
    }

    if (!result.success) {
      console.error(`❌ Failed to create customer: ${result.error}`);
      return;
    }

    console.log(`✅ Customer created: ${result.customerId}`);

    // Step 3: Verify database was updated
    console.log('\n[3/4] Verifying database update...');
    const { data: updatedOrg, error: verifyError } = await supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', org.id)
      .single();

    if (verifyError || !updatedOrg) {
      console.error('❌ Failed to verify database update');
      return;
    }

    console.log(`✅ Database updated: stripe_customer_id = ${updatedOrg.stripe_customer_id}`);

    // Step 4: Test idempotency
    console.log('\n[4/4] Testing idempotency (calling again)...');
    const result2 = await createStripeCustomerForOrganization(org.id, {
      id: org.id,
      name: org.name,
      slug: org.slug,
      email: 'test@example.com'
    });

    if (result2.success && result2.customerId === result.customerId) {
      console.log(`✅ Idempotency verified: returned same customer ID`);
    } else {
      console.error('❌ Idempotency failed: got different result');
      console.error(`   First call: ${result.customerId}`);
      console.error(`   Second call: ${result2.customerId}`);
    }

    console.log('\n=== ✅ All tests passed! ===\n');

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error);
  }
}

// Run the test
testStripeCustomerCreation();
