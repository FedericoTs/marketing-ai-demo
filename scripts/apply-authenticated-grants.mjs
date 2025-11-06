import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egccqmlhzqiirovstpal.supabase.co';
const supabaseServiceKey = '***REMOVED***';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyGrants() {
  console.log('🔧 Applying GRANT permissions to authenticated role\n');
  console.log('================================================\n');

  const grantSQL = `
    -- Grant SELECT permissions to authenticated role
    GRANT SELECT ON TABLE design_templates TO authenticated;
    GRANT SELECT ON TABLE organizations TO authenticated;
    GRANT SELECT ON TABLE user_profiles TO authenticated;
    GRANT SELECT ON TABLE design_assets TO authenticated;

    -- Grant INSERT permissions (for creating templates/assets)
    GRANT INSERT ON TABLE design_templates TO authenticated;
    GRANT INSERT ON TABLE design_assets TO authenticated;

    -- Grant UPDATE permissions (for editing)
    GRANT UPDATE ON TABLE design_templates TO authenticated;
    GRANT UPDATE ON TABLE user_profiles TO authenticated;
    GRANT UPDATE ON TABLE organizations TO authenticated;

    -- Grant DELETE permissions (for deleting templates/assets)
    GRANT DELETE ON TABLE design_templates TO authenticated;
    GRANT DELETE ON TABLE design_assets TO authenticated;
  `;

  console.log('📋 Executing GRANT SQL...\n');

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: grantSQL });

    if (error) {
      console.log('❌ Failed to execute SQL via RPC');
      console.log('Error:', error.message);
      console.log('');
      console.log('This is expected - Supabase doesn\'t expose exec_sql RPC by default.');
      console.log('');
      console.log('✨ SOLUTION: Copy and paste this SQL directly in Supabase SQL Editor:');
      console.log('https://app.supabase.com/project/egccqmlhzqiirovstpal/sql/new');
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(grantSQL);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } else {
      console.log('✅ GRANTs applied successfully!');
      console.log('');
      console.log('Permissions granted:');
      console.log('  - SELECT on all tables');
      console.log('  - INSERT on design_templates, design_assets');
      console.log('  - UPDATE on design_templates, user_profiles, organizations');
      console.log('  - DELETE on design_templates, design_assets');
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
    console.log('');
    console.log('✨ MANUAL FIX REQUIRED:');
    console.log('');
    console.log('1. Open Supabase SQL Editor:');
    console.log('   https://app.supabase.com/project/egccqmlhzqiirovstpal/sql/new');
    console.log('');
    console.log('2. Copy and paste this SQL:');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(grantSQL);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('3. Click "Run"');
    console.log('');
    console.log('4. Refresh your browser page to test template loading');
  }

  console.log('');
  console.log('================================================\n');
}

applyGrants().catch(console.error);
