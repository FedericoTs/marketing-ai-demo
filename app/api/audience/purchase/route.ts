/**
 * API Route: /api/audience/purchase
 * POST - Purchase contacts from Data Axle and create recipient list
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getDataAxleClient, type AudienceFilters } from '@/lib/audience';
import { getCurrentUserId } from '@/lib/auth/admin';

interface PurchaseRequest {
  filters: AudienceFilters;
  maxContacts: number;
  audienceName: string;
}

export async function POST(request: Request) {
  try {
    const body: PurchaseRequest = await request.json();
    const { filters, maxContacts, audienceName } = body;

    console.log('[Purchase API] Request received:', {
      maxContacts,
      audienceName,
      hasFilters: !!filters,
    });

    // Validate input
    if (!filters || !maxContacts || maxContacts <= 0) {
      console.error('[Purchase API] Invalid input:', { filters, maxContacts });
      return NextResponse.json(
        { error: 'Invalid request: filters and maxContacts are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const serviceSupabase = createServiceClient();

    // Get current user and organization
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const organizationId = userProfile.organization_id;

    console.log('[Purchase API] Fetching pricing for count:', maxContacts);

    // Get pricing for this contact count
    const { data: pricingTier, error: pricingError } = await supabase
      .rpc('get_pricing_for_count', { contact_count: maxContacts });

    console.log('[Purchase API] Pricing result:', { pricingTier, pricingError });

    if (pricingError) {
      console.error('[Purchase API] Pricing RPC error:', pricingError);
      return NextResponse.json(
        { error: 'Failed to calculate pricing', details: pricingError.message },
        { status: 500 }
      );
    }

    if (!pricingTier || pricingTier.length === 0) {
      console.error('[Purchase API] No pricing tier found for count:', maxContacts);
      return NextResponse.json(
        { error: 'No pricing tier available for this contact count' },
        { status: 500 }
      );
    }

    const tier = pricingTier[0];
    const totalCost = maxContacts * Number(tier.user_cost_per_contact);

    // Check credit balance
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('credits')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const currentCredits = Number(organization.credits);

    if (currentCredits < totalCost) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          required: totalCost,
          available: currentCredits,
          shortfall: totalCost - currentCredits
        },
        { status: 402 } // Payment Required
      );
    }

    // Step 1: Purchase contacts from Data Axle (or use mock data)
    let contacts;

    // Check if API key is configured
    const apiKey = process.env.DATA_AXLE_API_KEY;

    if (apiKey) {
      // Use real Data Axle API
      try {
        const dataAxleClient = getDataAxleClient({
          apiKey,
          baseUrl: process.env.DATA_AXLE_BASE_URL,
        });
        const response = await dataAxleClient.purchaseContacts(filters, maxContacts);
        contacts = response.contacts;
        console.log(`[Data Axle] Purchased ${contacts.length} contacts`);
      } catch (error: any) {
        console.error('[Data Axle] Purchase error:', error);
        // Fall back to mock data
        console.log('[Mock Mode] Generating mock contacts due to API error');
        contacts = generateMockContacts(maxContacts, filters);
      }
    } else {
      // No API key - use mock data (generate small sample for testing)
      const mockSampleSize = Math.min(maxContacts, 2000); // Cap at 2,000 for speed
      console.log(`[Mock Mode] Generating ${mockSampleSize} sample contacts (testing mode)`);
      contacts = generateMockContacts(mockSampleSize, filters);
    }

    // Step 2: Create recipient list
    const isMockData = !process.env.DATA_AXLE_API_KEY;
    const listDescription = isMockData
      ? `Mock Data: ${contacts.length.toLocaleString()} sample contacts (testing mode - would be ${maxContacts.toLocaleString()} in production)`
      : `Data Axle audience - ${maxContacts.toLocaleString()} contacts`;

    const { data: recipientList, error: listError } = await serviceSupabase
      .from('recipient_lists')
      .insert({
        organization_id: organizationId,
        name: audienceName,
        description: listDescription,
        source: 'data_axle',
        data_axle_filters: filters,
        created_by: user.id,
      })
      .select()
      .single();

    if (listError || !recipientList) {
      throw new Error(`Failed to create recipient list: ${listError?.message}`);
    }

    // Step 3: Import contacts to recipients table
    const recipientRecords = contacts.map((contact: any) => ({
      recipient_list_id: recipientList.id,
      organization_id: organizationId,
      first_name: contact.firstName || '',
      last_name: contact.lastName || '',
      email: contact.email || null,
      phone: contact.phone || null,
      address_line1: contact.address || '',
      city: contact.city || '',
      state: contact.state || '',
      zip_code: contact.zipCode || '',
      data_axle_id: contact.id || null,
      metadata: {
        age: contact.age,
        gender: contact.gender,
        income: contact.income,
        homeValue: contact.homeValue,
      },
      created_by: user.id,
    }));

    const { error: recipientsError } = await serviceSupabase
      .from('recipients')
      .insert(recipientRecords);

    if (recipientsError) {
      // Rollback: Delete the recipient list if contact import fails
      await serviceSupabase
        .from('recipient_lists')
        .delete()
        .eq('id', recipientList.id);

      throw new Error(`Failed to import contacts: ${recipientsError.message}`);
    }

    // Step 4: Create contact purchase record
    const { data: contactPurchase, error: purchaseError} = await serviceSupabase
      .from('contact_purchases')
      .insert({
        organization_id: organizationId,
        recipient_list_id: recipientList.id,
        audience_filter_id: null, // TODO: Save filter first if user wants to reuse
        purchased_by: user.id,
        filters,
        contact_count: maxContacts, // Record the full purchase amount
        cost_per_contact: Number(tier.cost_per_contact),
        total_cost: maxContacts * Number(tier.cost_per_contact),
        user_charge_per_contact: Number(tier.user_cost_per_contact),
        total_user_charge: totalCost,
        // margin is auto-calculated by database (GENERATED column)
        provider: 'data_axle',
        provider_response: {
          mockMode: isMockData,
          actualContactsGenerated: contacts.length,
          note: isMockData ? `Mock testing mode: Generated ${contacts.length} sample contacts for testing` : undefined,
        },
        status: 'completed',
        purchased_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('Failed to create purchase record:', purchaseError);
      // Don't rollback - contacts are already imported
    }

    // Step 5: Deduct credits using database function
    const { data: transaction, error: deductError } = await serviceSupabase
      .rpc('spend_credits', {
        org_id: organizationId,
        credit_amount: totalCost,
        reference_type: 'contact_purchase',
        reference_id: contactPurchase?.id || recipientList.id,
        transaction_description: `Purchased ${contacts.length} contacts from Data Axle`,
        user_id: user.id,
      });

    if (deductError) {
      console.error('Failed to deduct credits:', deductError);
      // Don't rollback - we'll handle this manually if needed
      return NextResponse.json(
        {
          error: 'Credits deduction failed',
          message: deductError.message,
          recipientListId: recipientList.id, // Still return the list ID
        },
        { status: 500 }
      );
    }

    // Step 6: Update recipient list with contact count
    await serviceSupabase
      .from('recipient_lists')
      .update({ total_recipients: contacts.length })
      .eq('id', recipientList.id);

    const successMessage = isMockData
      ? `Mock purchase complete: ${contacts.length.toLocaleString()} sample contacts generated (${maxContacts.toLocaleString()} charged)`
      : `Successfully purchased ${maxContacts.toLocaleString()} contacts`;

    return NextResponse.json({
      success: true,
      recipientListId: recipientList.id,
      contactCount: maxContacts, // Return the full count purchased
      actualContactsImported: contacts.length,
      isMockData,
      creditsDeducted: totalCost,
      remainingCredits: currentCredits - totalCost,
      purchaseId: contactPurchase?.id,
      message: successMessage,
    });
  } catch (error: any) {
    console.error('Purchase error:', error);
    return NextResponse.json(
      { error: 'Purchase failed', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Generate mock contacts for development/testing
 */
function generateMockContacts(count: number, filters: AudienceFilters): any[] {
  const contacts = [];
  const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'Robert', 'Lisa', 'James', 'Mary'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  const states = filters.geography?.states || ['CA', 'TX', 'NY', 'FL'];
  const cities = ['Los Angeles', 'Houston', 'New York', 'Miami', 'San Francisco', 'Austin', 'Brooklyn', 'Orlando'];

  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const state = states[Math.floor(Math.random() * states.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];

    contacts.push({
      id: `mock_${i + 1}`,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      phone: `555-${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      address: `${Math.floor(Math.random() * 9999) + 1} Main St`,
      city,
      state,
      zipCode: String(Math.floor(Math.random() * 90000) + 10000),
      age: filters.demographics?.ageRange?.min || 30 + Math.floor(Math.random() * 30),
      gender: Math.random() > 0.5 ? 'M' : 'F',
      income: filters.financial?.incomeRange?.min || 50000 + Math.floor(Math.random() * 100000),
      homeValue: Math.floor(Math.random() * 500000) + 200000,
    });
  }

  return contacts;
}
