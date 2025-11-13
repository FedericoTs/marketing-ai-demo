/**
 * Cleanup Test Data
 * Removes test campaigns and related data from database
 */

import { createServiceClient } from '@/lib/supabase/server'

async function cleanupTestData() {
  const supabase = createServiceClient()

  console.log('🧹 Starting cleanup of test data...\n')

  try {
    // 1. Get all test campaigns (name contains "Test" or "Debug" or "Final")
    console.log('📋 Finding test campaigns...')
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, name')
      .or('name.ilike.%Test%,name.ilike.%Debug%,name.ilike.%Final%')

    if (campaignsError) {
      console.error('❌ Error fetching campaigns:', campaignsError)
      return
    }

    console.log(`✅ Found ${campaigns?.length || 0} test campaigns\n`)

    if (!campaigns || campaigns.length === 0) {
      console.log('✨ No test campaigns to clean up!')
      return
    }

    const campaignIds = campaigns.map(c => c.id)
    console.log('🗑️  Deleting related data for campaigns:')
    campaigns.forEach(c => console.log(`   - ${c.name} (${c.id})`))
    console.log()

    // 2. Delete campaign_recipients
    console.log('🗑️  Deleting campaign_recipients...')
    const { error: recipientsError } = await supabase
      .from('campaign_recipients')
      .delete()
      .in('campaign_id', campaignIds)

    if (recipientsError) {
      console.error('❌ Error deleting campaign_recipients:', recipientsError)
    } else {
      console.log('   ✅ campaign_recipients deleted')
    }

    // 3. Delete landing_pages
    console.log('🗑️  Deleting landing_pages...')
    const { error: landingError } = await supabase
      .from('landing_pages')
      .delete()
      .in('campaign_id', campaignIds)

    if (landingError) {
      console.error('❌ Error deleting landing_pages:', landingError)
    } else {
      console.log('   ✅ landing_pages deleted')
    }

    // 4. Delete PDFs from storage
    console.log('🗑️  Deleting PDFs from storage...')
    for (const campaignId of campaignIds) {
      const { data: files, error: listError } = await supabase
        .storage
        .from('personalized-pdfs')
        .list(campaignId)

      if (listError) {
        console.error(`   ❌ Error listing PDFs for ${campaignId}:`, listError)
        continue
      }

      if (files && files.length > 0) {
        const filePaths = files.map(f => `${campaignId}/${f.name}`)
        const { error: deleteError } = await supabase
          .storage
          .from('personalized-pdfs')
          .remove(filePaths)

        if (deleteError) {
          console.error(`   ❌ Error deleting PDFs for ${campaignId}:`, deleteError)
        } else {
          console.log(`   ✅ Deleted ${files.length} PDFs for campaign ${campaignId}`)
        }
      }
    }

    // 5. Delete campaigns
    console.log('🗑️  Deleting campaigns...')
    const { error: deleteCampaignsError } = await supabase
      .from('campaigns')
      .delete()
      .in('id', campaignIds)

    if (deleteCampaignsError) {
      console.error('❌ Error deleting campaigns:', deleteCampaignsError)
    } else {
      console.log('   ✅ campaigns deleted')
    }

    // 6. Delete test templates
    console.log('\n🗑️  Deleting test templates...')
    const { data: templates, error: templatesError } = await supabase
      .from('design_templates')
      .delete()
      .or('name.ilike.%Test%,name.ilike.%Debug%,name.ilike.%Final%')
      .select('id, name')

    if (templatesError) {
      console.error('❌ Error deleting templates:', templatesError)
    } else {
      console.log(`   ✅ Deleted ${templates?.length || 0} test templates`)
      templates?.forEach(t => console.log(`      - ${t.name}`))
    }

    console.log('\n✨ Cleanup complete!')

  } catch (error) {
    console.error('❌ Fatal error during cleanup:', error)
  }
}

// Run cleanup
cleanupTestData()
  .then(() => {
    console.log('\n✅ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
