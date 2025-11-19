/**
 * Seed Analytics Data Script
 *
 * Populates the Supabase database with realistic demo data for analytics:
 * - Campaign costs (design, print, postage)
 * - Events (QR scans, page views) with timestamps
 * - Conversions (form submissions, appointments) with timestamps
 * - Complete campaign journey timeline
 */

import { createServiceClient } from '../lib/supabase/server';

async function seedAnalyticsData() {
  const supabase = createServiceClient();

  console.log('🌱 Starting analytics data seeding...\n');

  // Get all campaigns
  const { data: campaigns, error: campaignsError } = await supabase
    .from('campaigns')
    .select('id, name, total_recipients, created_at, status')
    .order('created_at', { ascending: false })
    .limit(5);

  if (campaignsError || !campaigns || campaigns.length === 0) {
    console.error('❌ Error fetching campaigns:', campaignsError);
    return;
  }

  console.log(`✅ Found ${campaigns.length} campaigns\n`);

  for (const campaign of campaigns) {
    console.log(`📊 Processing campaign: ${campaign.name} (${campaign.total_recipients} recipients)`);

    // Check if this campaign already has analytics data (idempotent)
    const { count: existingEvents } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaign.id);

    if (existingEvents && existingEvents > 0) {
      console.log(`  ⏭️  Skipping - already has ${existingEvents} events (run cleanup script to reset)\n`);
      continue;
    }

    const recipientCount = campaign.total_recipients || 5;

    // ============================================================================
    // STEP 1: Add realistic campaign costs
    // ============================================================================

    const costDesign = 50.00; // Flat design fee
    const costPrintPerPiece = 0.85; // $0.85 per postcard
    const costPostagePerPiece = 0.56; // $0.56 USPS first-class postcard rate
    const costDataAxlePerPiece = 0.10; // $0.10 per contact from Data Axle

    const costPrint = costPrintPerPiece * recipientCount;
    const costPostage = costPostagePerPiece * recipientCount;
    const costDataAxle = costDataAxlePerPiece * recipientCount;
    const costTotal = costDesign + costPrint + costPostage + costDataAxle;

    const { error: updateCostError } = await supabase
      .from('campaigns')
      .update({
        cost_design: costDesign,
        cost_print: costPrint,
        cost_postage: costPostage,
        cost_data_axle: costDataAxle,
        // cost_total is GENERATED ALWAYS - don't update it directly
        sent_at: new Date(new Date(campaign.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString(), // 1 day after creation
      })
      .eq('id', campaign.id);

    if (updateCostError) {
      console.error(`  ❌ Error updating costs:`, updateCostError.message);
      continue;
    }

    console.log(`  ✅ Updated costs: $${costTotal.toFixed(2)} total ($${(costTotal / recipientCount).toFixed(2)} per piece)`);

    // ============================================================================
    // STEP 2: Get campaign recipients
    // ============================================================================

    const { data: recipients, error: recipientsError } = await supabase
      .from('campaign_recipients')
      .select('id, created_at')
      .eq('campaign_id', campaign.id);

    if (recipientsError || !recipients || recipients.length === 0) {
      console.log(`  ⚠️  No recipients found, skipping events/conversions`);
      continue;
    }

    console.log(`  ✅ Found ${recipients.length} recipients`);

    // ============================================================================
    // STEP 2.5: Update campaign_recipients.created_at to match campaign sent_at
    // This is critical for timing metrics (time from mail sent to first view)
    // ============================================================================

    const campaignCreatedAt = new Date(campaign.created_at);
    const campaignSentAt = new Date(campaignCreatedAt.getTime() + 24 * 60 * 60 * 1000); // 1 day later

    console.log(`  🔧 Updating recipient timestamps to match sent_at: ${campaignSentAt.toISOString()}`);

    for (const recipient of recipients) {
      await supabase
        .from('campaign_recipients')
        .update({ created_at: campaignSentAt.toISOString() })
        .eq('id', recipient.id);
    }

    // ============================================================================
    // STEP 3: Create events timeline (QR scans → Page views)
    // ============================================================================

    // Simulate 60% QR scan rate (industry average: 2-5%, but this is demo data)
    const numScans = Math.floor(recipients.length * 0.6);
    const scannedRecipients = recipients.slice(0, numScans);

    let eventsCreated = 0;
    let conversionsCreated = 0;

    for (let i = 0; i < scannedRecipients.length; i++) {
      const recipient = scannedRecipients[i];

      // QR scan happens 2-10 days after campaign sent
      const daysAfterSent = 2 + Math.floor(Math.random() * 8);
      const hoursOffset = Math.floor(Math.random() * 24);
      const minutesOffset = Math.floor(Math.random() * 60);

      const qrScanTime = new Date(
        campaignSentAt.getTime() +
        (daysAfterSent * 24 * 60 * 60 * 1000) +
        (hoursOffset * 60 * 60 * 1000) +
        (minutesOffset * 60 * 1000)
      );

      // Create QR scan event
      const { error: qrScanError } = await supabase
        .from('events')
        .insert({
          campaign_id: campaign.id,
          recipient_id: recipient.id,
          tracking_code: `track_${recipient.id}`,
          event_type: 'qr_scan',
          created_at: qrScanTime.toISOString(),
        });

      if (!qrScanError) {
        eventsCreated++;

        // Page view happens 1-30 seconds after QR scan
        const pageViewTime = new Date(qrScanTime.getTime() + (1000 + Math.floor(Math.random() * 29000)));

        const { error: pageViewError } = await supabase
          .from('events')
          .insert({
            campaign_id: campaign.id,
            recipient_id: recipient.id,
            tracking_code: `track_${recipient.id}`,
            event_type: 'page_view',
            created_at: pageViewTime.toISOString(),
          });

        if (!pageViewError) {
          eventsCreated++;

          // ============================================================================
          // STEP 4: Create conversions (deterministic: first 2 scanners per campaign convert)
          // ============================================================================

          const willConvert = i < 2; // First 2 scanners always convert for demo data

          if (willConvert) {
            // Conversion happens 30 seconds to 5 minutes after page view
            const conversionTime = new Date(
              pageViewTime.getTime() +
              (30000 + Math.floor(Math.random() * 270000)) // 30s - 5min
            );

            // 70% appointment bookings, 30% form submissions for realistic data
            const conversionType = Math.random() < 0.7 ? 'appointment' : 'form_submit';

            const { error: conversionError } = await supabase
              .from('conversions')
              .insert({
                campaign_id: campaign.id,
                recipient_id: recipient.id,
                tracking_code: `track_${recipient.id}`,
                conversion_type: conversionType,
                created_at: conversionTime.toISOString(),
              });

            if (!conversionError) {
              conversionsCreated++;
            }
          }
        }
      }
    }

    console.log(`  ✅ Created ${eventsCreated} events (${numScans} QR scans, ${numScans} page views)`);
    console.log(`  ✅ Created ${conversionsCreated} conversions`);

    // ============================================================================
    // STEP 5: Create ElevenLabs call data (parallel phone channel)
    // ============================================================================

    // Get organization_id for this campaign
    const { data: campaignOrg } = await supabase
      .from('campaigns')
      .select('organization_id')
      .eq('id', campaign.id)
      .single();

    if (!campaignOrg) {
      console.log(`  ⚠️  Could not find organization for campaign, skipping calls`);
      continue;
    }

    // Simulate 20% of recipients calling directly (parallel to QR scans)
    const numCalls = Math.floor(recipients.length * 0.2);
    const callRecipients = recipients.slice(numScans, numScans + numCalls); // Different recipients from QR scanners

    let callsCreated = 0;

    for (let i = 0; i < callRecipients.length; i++) {
      const recipient = callRecipients[i];

      // Call happens 1-7 days after campaign sent
      const daysAfterSent = 1 + Math.floor(Math.random() * 6);
      const hoursOffset = Math.floor(Math.random() * 24);
      const minutesOffset = Math.floor(Math.random() * 60);

      const callStartTime = new Date(
        campaignSentAt.getTime() +
        (daysAfterSent * 24 * 60 * 60 * 1000) +
        (hoursOffset * 60 * 60 * 1000) +
        (minutesOffset * 60 * 1000)
      );

      // Call duration: 2-8 minutes
      const callDurationSeconds = 120 + Math.floor(Math.random() * 360);
      const callEndTime = new Date(callStartTime.getTime() + (callDurationSeconds * 1000));

      // 60% of calls are successful, 40% book appointments
      const callSuccessful = Math.random() < 0.6;
      const appointmentBooked = callSuccessful && Math.random() < 0.4;

      // Use raw SQL to bypass RLS issues with service client
      const insertSql = `
        INSERT INTO elevenlabs_calls (
          organization_id, campaign_id, recipient_id, elevenlabs_call_id,
          agent_id, phone_number, call_status, call_duration_seconds,
          start_time, end_time, call_successful, appointment_booked,
          conversion_value, transcript, summary, sentiment, intent_detected, synced_at
        ) VALUES (
          '${campaignOrg.organization_id}',
          '${campaign.id}',
          '${recipient.id}',
          'el_call_${campaign.id}_${recipient.id}_${i}',
          'agent_default',
          '+1234567890',
          'completed',
          ${callDurationSeconds},
          '${callStartTime.toISOString()}',
          '${callEndTime.toISOString()}',
          ${callSuccessful},
          ${appointmentBooked},
          ${appointmentBooked ? 150.00 : 'NULL'},
          'Sample call transcript',
          '${callSuccessful ? 'Customer interested in services' : 'No answer'}',
          '${callSuccessful ? 'positive' : 'neutral'}',
          '${appointmentBooked ? 'book_appointment' : 'inquiry'}',
          '${new Date().toISOString()}'
        )
      `;

      const { error: callError } = await supabase.rpc('exec_sql', { sql: insertSql });

      if (!callError) {
        callsCreated++;
      } else {
        console.error(`  ❌ Error creating call:`, callError.message);
      }
    }

    console.log(`  ✅ Created ${callsCreated} ElevenLabs calls (attempted ${callRecipients.length})\n`);
  }

  console.log('✨ Analytics data seeding complete!\n');
  console.log('📈 Summary:');
  console.log(`   - Campaigns updated with realistic costs`);
  console.log(`   - Campaign recipients timestamps synced to sent_at dates`);
  console.log(`   - Events created with recipient_id and proper timestamps`);
  console.log(`   - Conversions created with recipient_id and proper timestamps`);
  console.log(`   - ElevenLabs calls created with parallel phone channel`);
  console.log(`   - Complete multi-channel campaign journey timeline established\n`);
}

// Run the seeding script
seedAnalyticsData()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
