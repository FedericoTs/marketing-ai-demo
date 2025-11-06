import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egccqmlhzqiirovstpal.supabase.co';
const supabaseServiceKey = '***REMOVED***';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testInsert() {
  console.log('🧪 TESTING INSERT AFTER RLS FIX\n');
  console.log('================================================\n');

  const testTemplate = {
    organization_id: '47660215-d828-4bbe-9664-57bca613b661',
    created_by: '05ff7f19-e978-4e33-84f1-44fe6b8e6d71',
    name: 'Test Template - Verification',
    canvas_json: { version: '1.0', objects: [] },
    canvas_width: 1800,
    canvas_height: 1200,
    variable_mappings: {},
    format_type: 'postcard_4x6',
    format_width_inches: 6.0,
    format_height_inches: 4.0,
  };

  console.log('Attempting to INSERT template...');
  const { data, error } = await supabase
    .from('design_templates')
    .insert(testTemplate)
    .select();

  if (error) {
    console.log('\n❌ INSERT FAILED');
    console.log('Error:', error.message);
    console.log('Code:', error.code);
    console.log('\n⚠️  The RLS policies may not have been updated.');
    console.log('Please verify you ran the SQL script in Supabase Dashboard.\n');
    process.exit(1);
  }

  console.log('\n✅ INSERT SUCCEEDED!');
  console.log('Template ID:', data[0].id);
  console.log('Name:', data[0].name);

  // Clean up
  console.log('\nCleaning up test template...');
  await supabase.from('design_templates').delete().eq('id', data[0].id);
  console.log('✅ Cleanup done\n');

  console.log('================================================');
  console.log('🎉 SUCCESS! Template saving will now work!');
  console.log('================================================');
  console.log('\nNext steps:');
  console.log('1. Clear browser localStorage: localStorage.clear()');
  console.log('2. Refresh browser (Ctrl+F5)');
  console.log('3. Save a template');
  console.log('4. It should save to the database!\n');
}

testInsert().catch(console.error);
