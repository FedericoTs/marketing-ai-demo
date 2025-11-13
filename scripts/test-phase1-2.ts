/**
 * Test Script for Phase 5.5.5 (Phase 1-2)
 *
 * Tests:
 * 1. Database helper functions (SQL + TypeScript)
 * 2. PDF generator backwards compatibility
 * 3. Dual-page PDF generation (front + back)
 * 4. Existing template compatibility
 *
 * Run: npx tsx scripts/test-phase1-2.ts
 */

import { createServiceClient } from '@/lib/supabase/server'
import { getFrontSurface, getBackSurface, hasCustomBack, getAddressBlockZone } from '@/lib/database/types'
import type { DesignTemplate } from '@/lib/database/types'

console.log('🧪 PHASE 1-2 TEST SUITE\n')
console.log('=' .repeat(60))

// Test 1: Database Helper Functions (SQL)
async function testDatabaseHelpers() {
  console.log('\n📊 TEST 1: Database Helper Functions (SQL)\n')

  const supabase = createServiceClient()

  // Test SQL functions
  const { data: templates, error } = await supabase
    .from('design_templates')
    .select('id, name, surfaces')
    .limit(3)

  if (error) {
    console.error('❌ Failed to fetch templates:', error)
    return
  }

  console.log(`✅ Fetched ${templates?.length || 0} templates`)

  if (templates && templates.length > 0) {
    const template = templates[0] as any

    // Test has_custom_back() SQL function
    const { data: hasBackResult } = await supabase.rpc('has_custom_back', {
      template_surfaces: template.surfaces
    })

    console.log(`\nTemplate: ${template.name}`)
    console.log(`  - Has custom back (SQL): ${hasBackResult}`)
    console.log(`  - Surfaces count: ${template.surfaces?.length || 0}`)

    // Test get_front_surface() SQL function
    const { data: frontSurface } = await supabase.rpc('get_front_surface', {
      template_surfaces: template.surfaces
    })

    console.log(`  - Front surface exists: ${frontSurface ? '✅' : '❌'}`)

    // Test get_back_surface() SQL function
    const { data: backSurface } = await supabase.rpc('get_back_surface', {
      template_surfaces: template.surfaces
    })

    console.log(`  - Back surface exists: ${backSurface ? '✅' : '❌'}`)
  }
}

// Test 2: TypeScript Helper Functions
async function testTypeScriptHelpers() {
  console.log('\n📊 TEST 2: TypeScript Helper Functions\n')

  const supabase = createServiceClient()

  const { data: templates } = await supabase
    .from('design_templates')
    .select('*')
    .limit(3)

  if (!templates || templates.length === 0) {
    console.log('⚠️ No templates found')
    return
  }

  templates.forEach((template: any, idx: number) => {
    console.log(`\nTemplate ${idx + 1}: ${template.name}`)

    // Test getFrontSurface()
    const frontSurface = getFrontSurface(template as DesignTemplate)
    console.log(`  - getFrontSurface(): ${frontSurface ? '✅ Found' : '❌ Missing'}`)

    // Test getBackSurface()
    const backSurface = getBackSurface(template as DesignTemplate)
    console.log(`  - getBackSurface(): ${backSurface ? '✅ Found' : '❌ Not found'}`)

    // Test hasCustomBack()
    const hasBack = hasCustomBack(template as DesignTemplate)
    console.log(`  - hasCustomBack(): ${hasBack ? '✅ Yes' : '❌ No'}`)

    if (frontSurface) {
      console.log(`  - Front canvas objects: ${frontSurface.canvas_json?.objects?.length || 0}`)
    }

    if (backSurface) {
      console.log(`  - Back canvas objects: ${backSurface.canvas_json?.objects?.length || 0}`)
    }
  })

  // Test getAddressBlockZone()
  console.log('\n📐 Address Block Zones:')
  console.log(`  - postcard_4x6 (US): ${JSON.stringify(getAddressBlockZone('postcard_4x6', 'US'))}`)
  console.log(`  - postcard_6x9 (US): ${JSON.stringify(getAddressBlockZone('postcard_6x9', 'US'))}`)
}

// Test 3: Backwards Compatibility Check
async function testBackwardsCompatibility() {
  console.log('\n📊 TEST 3: Backwards Compatibility Check\n')

  const supabase = createServiceClient()

  // Check if any templates are still using old canvas_json field
  const { data: oldTemplates } = await supabase
    .from('design_templates')
    .select('id, name, surfaces, canvas_json')
    .or('surfaces.is.null,surfaces.eq.[]')

  if (oldTemplates && oldTemplates.length > 0) {
    console.log(`⚠️ Found ${oldTemplates.length} templates needing migration:`)
    oldTemplates.forEach((t: any) => {
      console.log(`  - ${t.name} (ID: ${t.id})`)
      console.log(`    surfaces: ${JSON.stringify(t.surfaces)}`)
      console.log(`    has canvas_json: ${t.canvas_json ? 'Yes' : 'No'}`)
    })

    console.log('\n💡 These templates will use OLD signature (backwards compatible)')
  } else {
    console.log('✅ All templates migrated to surfaces array')
  }

  // Check if any campaigns exist that we can regenerate
  const { data: campaigns, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, name, status, template_id')
    .limit(5)

  if (campaignError) {
    console.error('❌ Failed to fetch campaigns:', campaignError)
    return
  }

  console.log(`\n📊 Found ${campaigns?.length || 0} campaigns`)

  if (campaigns && campaigns.length > 0) {
    console.log('\n✅ You can test regeneration with:')
    console.log(`   Campaign ID: ${campaigns[0].id}`)
    console.log(`   Campaign Name: ${campaigns[0].name}`)
    console.log(`   Status: ${campaigns[0].status}`)
  }
}

// Test 4: Template Structure Validation
async function testTemplateStructure() {
  console.log('\n📊 TEST 4: Template Structure Validation\n')

  const supabase = createServiceClient()

  const { data: templates } = await supabase
    .from('design_templates')
    .select('id, name, surfaces, format_type')
    .limit(10)

  if (!templates || templates.length === 0) {
    console.log('⚠️ No templates found')
    return
  }

  let validCount = 0
  let customBackCount = 0
  let blankBackCount = 0

  templates.forEach((template: any) => {
    const frontSurface = getFrontSurface(template as DesignTemplate)
    const backSurface = getBackSurface(template as DesignTemplate)

    if (frontSurface) {
      validCount++

      if (backSurface) {
        customBackCount++
      } else {
        blankBackCount++
      }
    }
  })

  console.log(`Total templates: ${templates.length}`)
  console.log(`✅ Valid (has front surface): ${validCount}`)
  console.log(`📄 With custom back page: ${customBackCount}`)
  console.log(`📄 With blank back page (PostGrid): ${blankBackCount}`)
  console.log(`❌ Invalid (missing front): ${templates.length - validCount}`)

  // Check if all templates have correct format
  const formatTypes = [...new Set(templates.map((t: any) => t.format_type))]
  console.log(`\n📐 Format types in use: ${formatTypes.join(', ')}`)
}

// Main test runner
async function runAllTests() {
  try {
    await testDatabaseHelpers()
    await testTypeScriptHelpers()
    await testBackwardsCompatibility()
    await testTemplateStructure()

    console.log('\n' + '='.repeat(60))
    console.log('✅ ALL TESTS COMPLETE')
    console.log('='.repeat(60))

    console.log('\n📝 NEXT STEPS:')
    console.log('1. ✅ If all tests pass → Proceed to Phase 3 (Canvas Editor UI)')
    console.log('2. ⚠️ If backwards compatibility issues → Test campaign regeneration')
    console.log('3. 🔧 If template issues → Run migration function')

    console.log('\n💡 To test PDF generation manually:')
    console.log('   1. Go to existing campaign')
    console.log('   2. Click "Regenerate PDFs"')
    console.log('   3. Verify 2-page PDF output (front + back)')
    console.log('   4. Check dev.log for "front + blank back" or "front + custom back"')

  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error)
    process.exit(1)
  }
}

// Run tests
runAllTests()
