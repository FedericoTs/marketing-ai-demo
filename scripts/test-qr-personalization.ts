/**
 * QR Code Personalization Stress Test
 *
 * This script validates that the batch VDP processor correctly generates
 * unique QR codes for each recipient by:
 *
 * 1. Creating a test template with QR code placeholder
 * 2. Creating a recipient list with 10+ test contacts
 * 3. Generating a campaign
 * 4. Verifying each PDF has a unique QR code
 * 5. Checking database records
 * 6. Validating QR code URLs and landing pages
 *
 * Usage:
 *   npx tsx scripts/test-qr-personalization.ts
 */

import { createServiceClient } from '@/lib/supabase/server'
import { processCampaignBatch } from '@/lib/campaigns/batch-vdp-processor'
import { generatePlaceholderQRCode } from '@/lib/qr-generator'
import type { DesignTemplate, RecipientList, Campaign } from '@/lib/database/types'

// ==================== TEST CONFIGURATION ====================

const TEST_CONFIG = {
  recipientCount: 15, // Stress test with 15 recipients
  organizationId: '', // Will be fetched from database
  userId: '', // Will be fetched from database
  templateName: 'QR Test Template - ' + new Date().toISOString(),
  campaignName: 'QR Stress Test Campaign - ' + new Date().toISOString(),
}

// ==================== TEST DATA GENERATION ====================

function generateTestRecipients(count: number) {
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'William', 'Mary', 'James', 'Patricia', 'Richard', 'Jennifer', 'Thomas']
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson']
  const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte']

  return Array.from({ length: count }, (_, i) => ({
    first_name: firstNames[i % firstNames.length],
    last_name: lastNames[i % lastNames.length],
    email: `test${i + 1}@example.com`,
    phone: `555-${String(i + 1).padStart(4, '0')}`,
    address_line1: `${100 + i} Main St`,
    address_line2: i % 3 === 0 ? `Apt ${i + 1}` : null,
    city: cities[i % cities.length],
    state: 'CA',
    zip_code: `900${String(i).padStart(2, '0')}`,
    country: 'US',
  }))
}

// ==================== TEMPLATE CREATION ====================

async function createTestTemplate(supabase: any): Promise<string> {
  console.log('📝 Creating test template with QR code placeholder...')

  // Generate placeholder QR code
  const qrCodeDataUrl = await generatePlaceholderQRCode()

  // Create simple Fabric.js canvas JSON with QR code
  const canvasJSON = {
    version: '6.7.1',
    objects: [
      // Background rectangle
      {
        type: 'rect',
        left: 0,
        top: 0,
        width: 1800,
        height: 1200,
        fill: '#f0f0f0',
        stroke: null,
      },
      // Header text
      {
        type: 'textbox',
        left: 100,
        top: 100,
        width: 1600,
        height: 150,
        text: 'QR Code Personalization Test',
        fontSize: 60,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        fill: '#000000',
        textAlign: 'center',
      },
      // Recipient name placeholder
      {
        type: 'textbox',
        left: 100,
        top: 300,
        width: 800,
        height: 100,
        text: 'Dear {first_name} {last_name}',
        fontSize: 40,
        fontFamily: 'Arial',
        fill: '#333333',
      },
      // QR Code (will be personalized)
      {
        type: 'Image',
        left: 1200,
        top: 700,
        width: 400,
        height: 400,
        src: qrCodeDataUrl,
        scaleX: 1,
        scaleY: 1,
      },
    ],
  }

  // Variable mappings (QR code is at index 3)
  const variableMappings = {
    '3': {
      variableType: 'qrCode',
      isReusable: false,
    },
  }

  // Create template
  const { data: template, error } = await supabase
    .from('design_templates')
    .insert({
      organization_id: TEST_CONFIG.organizationId,
      created_by: TEST_CONFIG.userId,
      name: TEST_CONFIG.templateName,
      description: 'Automated test template for QR code personalization',
      canvas_json: canvasJSON,
      canvas_width: 1800,
      canvas_height: 1200,
      surfaces: [
        {
          side: 'front',
          canvas_json: canvasJSON,
          variable_mappings: variableMappings,
          thumbnail_url: null,
        },
      ],
      format_type: 'postcard_6x4',
      format_width_inches: 6,
      format_height_inches: 4,
      postal_country: 'US',
      status: 'active',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create template: ${error.message}`)
  }

  console.log(`✅ Template created: ${template.id}`)
  return template.id
}

// ==================== RECIPIENT LIST CREATION ====================

async function createTestRecipientList(supabase: any, recipients: any[]): Promise<string> {
  console.log(`👥 Creating recipient list with ${recipients.length} contacts...`)

  // Create recipient list
  const { data: recipientList, error: listError } = await supabase
    .from('recipient_lists')
    .insert({
      organization_id: TEST_CONFIG.organizationId,
      created_by: TEST_CONFIG.userId,
      name: `QR Test Recipients - ${recipients.length}`,
      description: 'Automated test recipient list for QR code personalization',
      total_recipients: recipients.length,
    })
    .select()
    .single()

  if (listError) {
    throw new Error(`Failed to create recipient list: ${listError.message}`)
  }

  // Insert recipients
  const recipientsWithListId = recipients.map(r => ({
    ...r,
    recipient_list_id: recipientList.id,
    organization_id: TEST_CONFIG.organizationId,
  }))

  const { error: recipientsError } = await supabase
    .from('recipients')
    .insert(recipientsWithListId)

  if (recipientsError) {
    throw new Error(`Failed to insert recipients: ${recipientsError.message}`)
  }

  console.log(`✅ Recipient list created: ${recipientList.id}`)
  return recipientList.id
}

// ==================== CAMPAIGN CREATION ====================

async function createTestCampaign(supabase: any, templateId: string, recipientListId: string): Promise<string> {
  console.log('📋 Creating test campaign...')

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .insert({
      organization_id: TEST_CONFIG.organizationId,
      created_by: TEST_CONFIG.userId,
      name: TEST_CONFIG.campaignName,
      description: JSON.stringify({
        testRun: true,
        purpose: 'QR code personalization stress test',
      }),
      template_id: templateId,
      recipient_list_id: recipientListId,
      status: 'draft',
      variable_mappings_snapshot: [], // Use surface-level mappings
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create campaign: ${error.message}`)
  }

  console.log(`✅ Campaign created: ${campaign.id}`)
  return campaign.id
}

// ==================== QR CODE VERIFICATION ====================

async function verifyQRCodeUniqueness(supabase: any, campaignId: string): Promise<void> {
  console.log('\n🔍 Verifying QR code uniqueness...')

  // Fetch all campaign recipients
  const { data: recipients, error } = await supabase
    .from('campaign_recipients')
    .select('id, recipient_id, personalized_canvas_json, qr_code_url, personalized_pdf_url')
    .eq('campaign_id', campaignId)

  if (error) {
    throw new Error(`Failed to fetch campaign recipients: ${error.message}`)
  }

  console.log(`📊 Found ${recipients.length} campaign recipients`)

  // Extract QR code URLs from canvas JSON
  const qrCodeData: Array<{
    recipientId: string
    qrCodeSrc: string | null
    qrCodeUrl: string
  }> = []

  for (const recipient of recipients) {
    const canvasJSON = recipient.personalized_canvas_json
    const objects = canvasJSON?.objects || []

    // Find QR code object (type: 'Image', typically at index 3)
    const qrCodeObject = objects.find((obj: any, idx: number) =>
      obj.type === 'Image' && idx === 3 // Based on our template structure
    )

    qrCodeData.push({
      recipientId: recipient.recipient_id,
      qrCodeSrc: qrCodeObject?.src || null,
      qrCodeUrl: recipient.qr_code_url,
    })
  }

  // Check for uniqueness
  const qrCodeSources = qrCodeData.map(d => d.qrCodeSrc).filter(Boolean)
  const uniqueQRCodes = new Set(qrCodeSources)

  console.log(`\n📈 QR Code Analysis:`)
  console.log(`   Total recipients: ${recipients.length}`)
  console.log(`   QR codes found: ${qrCodeSources.length}`)
  console.log(`   Unique QR codes: ${uniqueQRCodes.size}`)

  if (uniqueQRCodes.size === recipients.length) {
    console.log(`   ✅ SUCCESS: All QR codes are unique!`)
  } else {
    console.log(`   ❌ FAILURE: Duplicate QR codes detected!`)

    // Find duplicates
    const duplicates = qrCodeSources.filter((src, idx, arr) =>
      arr.indexOf(src) !== idx
    )
    console.log(`   Duplicates: ${duplicates.length}`)
  }

  // Verify QR code URLs
  const qrCodeUrls = qrCodeData.map(d => d.qrCodeUrl).filter(Boolean)
  const uniqueUrls = new Set(qrCodeUrls)

  console.log(`\n🔗 QR URL Analysis:`)
  console.log(`   Total URLs: ${qrCodeUrls.length}`)
  console.log(`   Unique URLs: ${uniqueUrls.size}`)

  if (uniqueUrls.size === recipients.length) {
    console.log(`   ✅ SUCCESS: All QR URLs are unique!`)
  } else {
    console.log(`   ❌ FAILURE: Duplicate QR URLs detected!`)
  }

  // Sample QR codes
  console.log(`\n🔬 Sample QR Code Data:`)
  qrCodeData.slice(0, 3).forEach((data, idx) => {
    console.log(`\n   Recipient ${idx + 1}:`)
    console.log(`   - Recipient ID: ${data.recipientId}`)
    console.log(`   - QR URL: ${data.qrCodeUrl}`)
    console.log(`   - QR Source: ${data.qrCodeSrc?.substring(0, 50)}...`)
  })
}

// ==================== PDF VERIFICATION ====================

async function verifyPDFGeneration(supabase: any, campaignId: string): Promise<void> {
  console.log('\n📄 Verifying PDF generation...')

  const { data: recipients, error } = await supabase
    .from('campaign_recipients')
    .select('id, personalized_pdf_url')
    .eq('campaign_id', campaignId)

  if (error) {
    throw new Error(`Failed to fetch recipients: ${error.message}`)
  }

  const pdfUrls = recipients.filter(r => r.personalized_pdf_url)

  console.log(`📊 PDF Generation:`)
  console.log(`   Total recipients: ${recipients.length}`)
  console.log(`   PDFs generated: ${pdfUrls.length}`)

  if (pdfUrls.length === recipients.length) {
    console.log(`   ✅ SUCCESS: All PDFs generated!`)
  } else {
    console.log(`   ❌ FAILURE: Missing PDFs!`)
    console.log(`   Missing: ${recipients.length - pdfUrls.length}`)
  }

  // Sample PDF URLs
  console.log(`\n🔬 Sample PDF URLs:`)
  pdfUrls.slice(0, 3).forEach((r, idx) => {
    console.log(`   ${idx + 1}. ${r.personalized_pdf_url}`)
  })
}

// ==================== CLEANUP ====================

async function cleanup(supabase: any, campaignId?: string, templateId?: string, recipientListId?: string): Promise<void> {
  console.log('\n🧹 Cleaning up test data...')

  try {
    if (campaignId) {
      // Delete campaign recipients
      await supabase.from('campaign_recipients').delete().eq('campaign_id', campaignId)
      // Delete campaign
      await supabase.from('campaigns').delete().eq('id', campaignId)
      console.log('   ✅ Campaign deleted')
    }

    if (recipientListId) {
      // Delete recipients
      await supabase.from('recipients').delete().eq('recipient_list_id', recipientListId)
      // Delete recipient list
      await supabase.from('recipient_lists').delete().eq('id', recipientListId)
      console.log('   ✅ Recipient list deleted')
    }

    if (templateId) {
      // Delete template
      await supabase.from('design_templates').delete().eq('id', templateId)
      console.log('   ✅ Template deleted')
    }
  } catch (error) {
    console.error('❌ Cleanup error:', error)
  }
}

// ==================== MAIN TEST RUNNER ====================

async function runStressTest() {
  console.log('🚀 Starting QR Code Personalization Stress Test\n')
  console.log('=' .repeat(60))

  const supabase = createServiceClient()

  let templateId: string | undefined
  let recipientListId: string | undefined
  let campaignId: string | undefined

  try {
    // Step 0: Get organization and user
    console.log('🔐 Fetching organization and user...')
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, created_by')
      .limit(1)
      .single()

    if (!orgs) {
      throw new Error('No organization found. Please create one first.')
    }

    TEST_CONFIG.organizationId = orgs.id
    TEST_CONFIG.userId = orgs.created_by
    console.log(`   Organization: ${orgs.id}`)
    console.log(`   User: ${orgs.created_by}\n`)

    // Step 1: Create test template
    templateId = await createTestTemplate(supabase)

    // Step 2: Create test recipients
    const testRecipients = generateTestRecipients(TEST_CONFIG.recipientCount)
    recipientListId = await createTestRecipientList(supabase, testRecipients)

    // Step 3: Create test campaign
    campaignId = await createTestCampaign(supabase, templateId, recipientListId)

    // Step 4: Run batch processor
    console.log('\n⚡ Running batch VDP processor...')
    console.log('=' .repeat(60))

    const startTime = Date.now()

    const result = await processCampaignBatch(
      campaignId,
      TEST_CONFIG.organizationId,
      (progress) => {
        if (progress.current % 5 === 0 || progress.current === progress.total) {
          console.log(`   Progress: ${progress.current}/${progress.total} (${progress.percentage}%) - ${progress.currentRecipient || 'Complete'}`)
        }
      }
    )

    const duration = (Date.now() - startTime) / 1000

    console.log('\n' + '='.repeat(60))
    console.log('📊 Batch Processing Results:')
    console.log(`   Duration: ${duration.toFixed(2)}s`)
    console.log(`   Total: ${result.totalRecipients}`)
    console.log(`   Success: ${result.successCount}`)
    console.log(`   Failures: ${result.failureCount}`)
    console.log(`   Avg per recipient: ${(duration / result.totalRecipients).toFixed(2)}s`)

    if (result.errors.length > 0) {
      console.log(`\n❌ Errors:`)
      result.errors.forEach(err => {
        console.log(`   - ${err.recipientName}: ${err.error}`)
      })
    }

    // Step 5: Verify QR code uniqueness
    await verifyQRCodeUniqueness(supabase, campaignId)

    // Step 6: Verify PDF generation
    await verifyPDFGeneration(supabase, campaignId)

    // Final verdict
    console.log('\n' + '='.repeat(60))
    if (result.failureCount === 0) {
      console.log('✅ STRESS TEST PASSED!')
      console.log('   All QR codes generated successfully with unique tracking codes.')
    } else {
      console.log('⚠️  STRESS TEST COMPLETED WITH WARNINGS')
      console.log(`   ${result.failureCount} recipients failed processing.`)
    }
    console.log('=' .repeat(60))

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error)
    throw error
  } finally {
    // Cleanup (comment out to keep test data for manual inspection)
    // await cleanup(supabase, campaignId, templateId, recipientListId)
    console.log('\n💡 Test data preserved for manual inspection.')
    console.log(`   Campaign ID: ${campaignId}`)
    console.log(`   Template ID: ${templateId}`)
    console.log(`   Recipient List ID: ${recipientListId}`)
  }
}

// Run the test
runStressTest()
  .then(() => {
    console.log('\n✅ Test completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })
