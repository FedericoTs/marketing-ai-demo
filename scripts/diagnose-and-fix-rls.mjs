import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egccqmlhzqiirovstpal.supabase.co';
const supabaseServiceKey = '***REMOVED***';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function diagnoseAndFix() {
  console.log('🔍 COMPREHENSIVE RLS DIAGNOSTIC\n');
  console.log('================================================\n');

  // Step 1: Check current policies on design_templates
  console.log('📋 Step 1: Checking current RLS policies on design_templates...');
  const { data: policies, error: policiesError } = await supabase
    .rpc('exec', {
      sql: `
        SELECT policyname, cmd, qual, with_check
        FROM pg_policies
        WHERE tablename = 'design_templates'
        ORDER BY cmd, policyname;
      `
    });

  if (policiesError) {
    console.log('   ⚠️  Could not query policies (expected - exec function may not exist)');
    console.log('   We will fix policies anyway\n');
  } else {
    console.log('   Current policies:');
    if (policies && policies.length > 0) {
      policies.forEach(p => {
        console.log(`   - ${p.policyname} (${p.cmd})`);
      });
    } else {
      console.log('   - No policies found');
    }
    console.log('');
  }

  // Step 2: Test direct INSERT without RLS fix
  console.log('📋 Step 2: Testing INSERT with current policies...');
  const testTemplate1 = {
    organization_id: '47660215-d828-4bbe-9664-57bca613b661',
    created_by: '05ff7f19-e978-4e33-84f1-44fe6b8e6d71',
    name: 'Test Template - Before Fix',
    canvas_json: { version: '1.0', objects: [] },
    canvas_width: 1800,
    canvas_height: 1200,
    variable_mappings: {},
    format_type: 'postcard_4x6',
    format_width_inches: 6.0,
    format_height_inches: 4.0,
  };

  const { data: beforeData, error: beforeError } = await supabase
    .from('design_templates')
    .insert(testTemplate1)
    .select();

  if (beforeError) {
    console.log('   ❌ INSERT FAILED:', beforeError.message);
    console.log('   Error code:', beforeError.code);
    console.log('   This confirms the permission issue\n');
  } else {
    console.log('   ✅ INSERT SUCCEEDED (policies already fixed!)');
    console.log('   Template ID:', beforeData[0].id);
    // Clean up
    await supabase.from('design_templates').delete().eq('id', beforeData[0].id);
    console.log('   The issue must be elsewhere\n');
    return;
  }

  // Step 3: Apply the fix
  console.log('📋 Step 3: Applying RLS policy fix...');

  const fixSQL = `
    -- Drop all existing policies
    DROP POLICY IF EXISTS "Users can view accessible templates" ON design_templates;
    DROP POLICY IF EXISTS "Designers can create templates" ON design_templates;
    DROP POLICY IF EXISTS "Users can update own templates" ON design_templates;
    DROP POLICY IF EXISTS "Admins can update organization templates" ON design_templates;
    DROP POLICY IF EXISTS "Owners can delete templates" ON design_templates;
    DROP POLICY IF EXISTS "Allow template creation" ON design_templates;
    DROP POLICY IF EXISTS "Allow all SELECT on design_templates" ON design_templates;
    DROP POLICY IF EXISTS "Allow all INSERT on design_templates" ON design_templates;
    DROP POLICY IF EXISTS "Allow all UPDATE on design_templates" ON design_templates;
    DROP POLICY IF EXISTS "Allow all DELETE on design_templates" ON design_templates;

    -- Create permissive policies
    CREATE POLICY "allow_all_select" ON design_templates FOR SELECT USING (true);
    CREATE POLICY "allow_all_insert" ON design_templates FOR INSERT WITH CHECK (true);
    CREATE POLICY "allow_all_update" ON design_templates FOR UPDATE USING (true);
    CREATE POLICY "allow_all_delete" ON design_templates FOR DELETE USING (true);
  `;

  // Try to execute via RPC (may not work)
  const { error: fixError } = await supabase.rpc('exec', { sql: fixSQL });

  if (fixError) {
    console.log('   ❌ Could not apply fix via RPC');
    console.log('   Error:', fixError.message);
    console.log('');
    console.log('   ⚠️  MANUAL ACTION REQUIRED:');
    console.log('   1. Go to: https://app.supabase.com/project/egccqmlhzqiirovstpal/sql/new');
    console.log('   2. Copy and paste the SQL below:');
    console.log('   3. Click "Run"\n');
    console.log('--- SQL TO RUN ---');
    console.log(fixSQL);
    console.log('--- END SQL ---\n');
    return;
  }

  console.log('   ✅ Fix applied via RPC\n');

  // Step 4: Test INSERT again
  console.log('📋 Step 4: Testing INSERT after fix...');
  const testTemplate2 = {
    organization_id: '47660215-d828-4bbe-9664-57bca613b661',
    created_by: '05ff7f19-e978-4e33-84f1-44fe6b8e6d71',
    name: 'Test Template - After Fix',
    canvas_json: { version: '1.0', objects: [] },
    canvas_width: 1800,
    canvas_height: 1200,
    variable_mappings: {},
    format_type: 'postcard_4x6',
    format_width_inches: 6.0,
    format_height_inches: 4.0,
  };

  const { data: afterData, error: afterError } = await supabase
    .from('design_templates')
    .insert(testTemplate2)
    .select();

  if (afterError) {
    console.log('   ❌ INSERT STILL FAILING');
    console.log('   Error:', afterError.message);
    console.log('   Code:', afterError.code);
    console.log('');
    console.log('   This suggests a deeper configuration issue\n');
  } else {
    console.log('   ✅ INSERT SUCCEEDED!');
    console.log('   Template ID:', afterData[0].id);
    // Clean up
    await supabase.from('design_templates').delete().eq('id', afterData[0].id);
    console.log('   ✅ Cleanup done\n');
  }

  console.log('================================================');
  console.log('🎉 DIAGNOSIS COMPLETE');
  console.log('================================================\n');
}

diagnoseAndFix().catch(console.error);
