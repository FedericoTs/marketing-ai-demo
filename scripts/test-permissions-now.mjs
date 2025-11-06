import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egccqmlhzqiirovstpal.supabase.co';
const supabaseAnonKey = '***REMOVED***';

// Test with anon client (simulating browser)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testPermissions() {
  console.log('🧪 Testing SELECT permissions for authenticated role\n');
  console.log('================================================\n');

  // Test 1: Try SELECT on design_templates
  console.log('📋 Test 1: SELECT from design_templates...');
  const { data: templates, error: templatesError } = await supabase
    .from('design_templates')
    .select('*')
    .limit(1);

  if (templatesError) {
    console.log('   ❌ FAILED:', templatesError.message);
    console.log('   Code:', templatesError.code);
  } else {
    console.log('   ✅ SUCCESS! Found', templates?.length || 0, 'template(s)');
  }
  console.log('');

  // Test 2: Try SELECT on user_profiles
  console.log('📋 Test 2: SELECT from user_profiles...');
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('*')
    .limit(1);

  if (profilesError) {
    console.log('   ❌ FAILED:', profilesError.message);
    console.log('   Code:', profilesError.code);
  } else {
    console.log('   ✅ SUCCESS! Found', profiles?.length || 0, 'profile(s)');
  }
  console.log('');

  // Test 3: Try SELECT on organizations
  console.log('📋 Test 3: SELECT from organizations...');
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('*')
    .limit(1);

  if (orgsError) {
    console.log('   ❌ FAILED:', orgsError.message);
    console.log('   Code:', orgsError.code);
  } else {
    console.log('   ✅ SUCCESS! Found', orgs?.length || 0, 'organization(s)');
  }
  console.log('');

  console.log('================================================');

  if (templatesError || profilesError || orgsError) {
    console.log('❌ PERMISSIONS NOT YET FIXED');
    console.log('');
    console.log('Please run this SQL in Supabase SQL Editor:');
    console.log('');
    console.log('GRANT SELECT ON TABLE design_templates TO authenticated;');
    console.log('GRANT SELECT ON TABLE user_profiles TO authenticated;');
    console.log('GRANT SELECT ON TABLE organizations TO authenticated;');
    console.log('GRANT SELECT ON TABLE design_assets TO authenticated;');
  } else {
    console.log('✅ ALL PERMISSIONS WORKING!');
    console.log('Template library should now load successfully.');
  }
  console.log('================================================\n');
}

testPermissions().catch(console.error);
