import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egccqmlhzqiirovstpal.supabase.co';
const supabaseServiceKey = '***REMOVED***';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

async function deepDiagnostic() {
  console.log('🔬 DEEP DIAGNOSTIC - Checking table permissions\n');
  console.log('================================================\n');

  // Check 1: RLS enabled?
  console.log('📋 Check 1: Is RLS enabled on design_templates?');
  try {
    const { data, error } = await supabase
      .from('design_templates')
      .select('count')
      .limit(0);

    console.log('   Query result:', data !== null ? 'Success' : 'Failed');
    if (error) {
      console.log('   Error:', error.message);
    }
  } catch (e) {
    console.log('   Exception:', e.message);
  }
  console.log('');

  // Check 2: Can we SELECT?
  console.log('📋 Check 2: Can service role SELECT from design_templates?');
  try {
    const { data, error } = await supabase
      .from('design_templates')
      .select('*')
      .limit(1);

    if (error) {
      console.log('   ❌ SELECT FAILED:', error.message);
      console.log('   Code:', error.code);
    } else {
      console.log('   ✅ SELECT works');
      console.log('   Found', data?.length || 0, 'rows');
    }
  } catch (e) {
    console.log('   ❌ Exception:', e.message);
  }
  console.log('');

  // Check 3: Direct table permissions
  console.log('📋 Check 3: Testing with bypassed RLS (if possible)');
  console.log('   Note: Service role should be able to bypass RLS\n');

  // Check 4: Try a minimal INSERT
  console.log('📋 Check 4: Attempting minimal INSERT...');
  const minimalData = {
    organization_id: '47660215-d828-4bbe-9664-57bca613b661',
    created_by: '05ff7f19-e978-4e33-84f1-44fe6b8e6d71',
    name: 'Minimal Test',
    canvas_json: {},
    canvas_width: 1800,
    canvas_height: 1200,
    format_type: 'postcard_4x6',
    format_width_inches: 6.0,
    format_height_inches: 4.0,
  };

  try {
    const { data, error } = await supabase
      .from('design_templates')
      .insert(minimalData)
      .select();

    if (error) {
      console.log('   ❌ INSERT FAILED:', error.message);
      console.log('   Code:', error.code);
      console.log('   Details:', error.details);
      console.log('   Hint:', error.hint);
    } else {
      console.log('   ✅ INSERT SUCCEEDED!');
      console.log('   ID:', data[0].id);
      // Cleanup
      await supabase.from('design_templates').delete().eq('id', data[0].id);
    }
  } catch (e) {
    console.log('   ❌ Exception:', e.message);
  }
  console.log('');

  console.log('================================================');
  console.log('📊 ANALYSIS');
  console.log('================================================\n');
  console.log('The error "permission denied for table" suggests:');
  console.log('');
  console.log('Option 1: RLS is configured incorrectly');
  console.log('Option 2: Table-level GRANTs are missing for service role');
  console.log('Option 3: Supabase project settings need adjustment');
  console.log('');
  console.log('RECOMMENDED FIX:');
  console.log('Run this SQL to completely disable RLS (for testing):');
  console.log('');
  console.log('ALTER TABLE design_templates DISABLE ROW LEVEL SECURITY;');
  console.log('');
  console.log('If that works, we know it\'s an RLS policy issue.');
  console.log('If it still fails, it\'s a table-level permission issue.');
  console.log('');
}

deepDiagnostic().catch(console.error);
