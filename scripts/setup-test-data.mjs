import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egccqmlhzqiirovstpal.supabase.co';
const supabaseServiceKey = '***REMOVED***';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupTestData() {
  console.log('🚀 Setting up test data for DropLab platform...\n');

  try {
    // Step 1: Check if test organization exists
    console.log('📋 Step 1: Checking for test organization...');
    const { data: existingOrg, error: orgCheckError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', 'test-organization')
      .single();

    let orgId;

    if (existingOrg) {
      console.log('✅ Test organization already exists:', existingOrg.name);
      console.log('   ID:', existingOrg.id);
      orgId = existingOrg.id;
    } else {
      console.log('📝 Creating test organization...');
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: 'Test Organization',
          slug: 'test-organization',
          plan_tier: 'professional',
          billing_status: 'active',
        })
        .select()
        .single();

      if (orgError) {
        console.error('❌ Failed to create organization:', orgError.message);
        throw orgError;
      }

      console.log('✅ Test organization created:', newOrg.name);
      console.log('   ID:', newOrg.id);
      orgId = newOrg.id;
    }

    console.log('');

    // Step 2: Get current authenticated user or create instructions
    console.log('📋 Step 2: Checking for authenticated users...');
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('❌ Failed to list users:', usersError.message);
    }

    if (!users || users.length === 0) {
      console.log('⚠️  No users found in auth.users table.');
      console.log('');
      console.log('📝 To complete setup, please:');
      console.log('   1. Sign up for an account in the application');
      console.log('   2. After signup, run this script again to link your user to the test organization');
      console.log('');
      console.log('💡 Or manually create a user profile in Supabase Dashboard:');
      console.log('   - Go to Authentication → Users → Add User');
      console.log('   - After creating user, add a record to user_profiles table');
      console.log('   - Set organization_id to:', orgId);
      return;
    }

    console.log(`✅ Found ${users.length} user(s) in auth.users`);
    const firstUser = users[0];
    console.log('   First user ID:', firstUser.id);
    console.log('   Email:', firstUser.email);
    console.log('');

    // Step 3: Check if user profile exists
    console.log('📋 Step 3: Checking user profile...');
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('user_profiles')
      .select('id, organization_id, full_name, role')
      .eq('id', firstUser.id)
      .single();

    if (existingProfile) {
      console.log('✅ User profile already exists:', existingProfile.full_name);
      console.log('   Organization ID:', existingProfile.organization_id);
      console.log('   Role:', existingProfile.role);
    } else {
      console.log('📝 Creating user profile...');
      const { data: newProfile, error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: firstUser.id,
          organization_id: orgId,
          full_name: firstUser.email?.split('@')[0] || 'Test User',
          role: 'owner',
          can_create_designs: true,
          can_send_campaigns: true,
          can_manage_billing: true,
          can_invite_users: true,
          can_approve_designs: true,
          can_manage_templates: true,
          can_access_analytics: true,
        })
        .select()
        .single();

      if (profileError) {
        console.error('❌ Failed to create user profile:', profileError.message);
        console.error('   Code:', profileError.code);
        console.error('   Details:', profileError.details);
        throw profileError;
      }

      console.log('✅ User profile created:', newProfile.full_name);
      console.log('   Organization ID:', newProfile.organization_id);
      console.log('   Role:', newProfile.role);
    }

    console.log('');
    console.log('🎉 Test data setup complete!');
    console.log('');
    console.log('📝 Summary:');
    console.log(`   Organization: Test Organization (${orgId})`);
    console.log(`   User: ${firstUser.email} (${firstUser.id})`);
    console.log('');
    console.log('✅ You can now:');
    console.log('   1. Sign in to the application with your user account');
    console.log('   2. Create and save design templates');
    console.log('   3. Templates will be saved to the database (not localStorage)');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupTestData();
