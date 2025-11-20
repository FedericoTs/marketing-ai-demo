/**
 * Database Test Script
 * Run with: npx tsx lib/database/test-db.ts
 */

import { getDatabase, closeDatabase } from "./connection";
import {
  createCampaign,
  createRecipient,
  trackEvent,
  trackConversion,
  getCampaignAnalytics,
  getRecipientJourney,
  getAllCampaigns,
} from "./tracking-queries";

async function testDatabase() {
  console.log("\n🧪 Starting database tests...\n");

  try {
    // Test 1: Initialize database
    console.log("Test 1: Database initialization");
    const db = createServiceClient();
    console.log("✅ Database initialized successfully\n");

    // Test 2: Create campaign
    console.log("Test 2: Create campaign");
    const campaign = createCampaign({
      name: "Summer Hearing Aid Promotion",
      message: "Get 50% off your first hearing aid consultation!",
      companyName: "HearWell Clinics",
    });
    console.log("✅ Campaign created:", campaign.id);
    console.log(`   Name: ${campaign.name}\n`);

    // Test 3: Create recipient
    console.log("Test 3: Create recipient");
    const recipient = createRecipient({
      campaignId: campaign.id,
      name: "John",
      lastname: "Doe",
      address: "123 Main St",
      city: "New York",
      zip: "10001",
      email: "john.doe@example.com",
      phone: "+1234567890",
    });
    console.log("✅ Recipient created:", recipient.tracking_id);
    console.log(`   Name: ${recipient.name} ${recipient.lastname}\n`);

    // Test 4: Track events
    console.log("Test 4: Track events");
    trackEvent({
      trackingId: recipient.tracking_id,
      eventType: "qr_scan",
      eventData: { source: "direct_mail" },
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0...",
    });
    console.log("✅ Event tracked: qr_scan");

    trackEvent({
      trackingId: recipient.tracking_id,
      eventType: "page_view",
      eventData: { page: "/lp/" + recipient.tracking_id },
    });
    console.log("✅ Event tracked: page_view");

    trackEvent({
      trackingId: recipient.tracking_id,
      eventType: "form_view",
    });
    console.log("✅ Event tracked: form_view\n");

    // Test 5: Track conversion
    console.log("Test 5: Track conversion");
    const conversion = trackConversion({
      trackingId: recipient.tracking_id,
      conversionType: "appointment_booked",
      conversionData: {
        date: "2024-07-15",
        time: "10:00 AM",
        type: "Hearing Test",
      },
    });
    console.log("✅ Conversion tracked:", conversion.conversion_type, "\n");

    // Test 6: Get recipient journey
    console.log("Test 6: Get recipient journey");
    const journey = getRecipientJourney(recipient.tracking_id);
    if (journey) {
      console.log("✅ Recipient journey retrieved:");
      console.log(`   Recipient: ${journey.recipient.name} ${journey.recipient.lastname}`);
      console.log(`   Events: ${journey.events.length}`);
      console.log(`   Conversions: ${journey.conversions.length}`);
      console.log(`   Page Views: ${journey.pageViews}`);
      console.log(`   Has Converted: ${journey.hasConverted}\n`);
    }

    // Test 7: Get campaign analytics
    console.log("Test 7: Get campaign analytics");
    const analytics = getCampaignAnalytics(campaign.id);
    if (analytics) {
      console.log("✅ Campaign analytics retrieved:");
      console.log(`   Campaign: ${analytics.campaign.name}`);
      console.log(`   Total Recipients: ${analytics.totalRecipients}`);
      console.log(`   Total Page Views: ${analytics.totalPageViews}`);
      console.log(`   Unique Visitors: ${analytics.uniqueVisitors}`);
      console.log(`   Total Conversions: ${analytics.totalConversions}`);
      console.log(`   Conversion Rate: ${analytics.conversionRate}%\n`);
    }

    // Test 8: Get all campaigns
    console.log("Test 8: Get all campaigns");
    const campaigns = getAllCampaigns();
    console.log(`✅ Retrieved ${campaigns.length} campaign(s)\n`);

    console.log("🎉 All tests passed successfully!\n");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  } finally {
    // Clean up
    closeDatabase();
    console.log("🔒 Database connection closed\n");
  }
}

// Run tests
testDatabase();
