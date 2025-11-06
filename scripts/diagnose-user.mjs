import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egccqmlhzqiirovstpal.supabase.co';
const supabaseServiceKey = '***REMOVED***';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function diagnoseUser() {
  console.log('🔍 Diagnosing user account for federicosciuca@gmail.com\n');

  try {
    // Step 1: Check auth.users
    console.log('📋 Step 1: Checking auth.users table...');
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('❌ Failed to list users:', usersError.message);
      return;
    }

    const targetUser = users.find(u => u.email === 'federicosciuca@gmail.com');

    if (!targetUser) {
      console.error('❌ User federicosciuca@gmail.com NOT FOUND in auth.users');
      console.log('\n📝 Found users:');
      users.forEach(u => console.log(`   - ${u.email} (${u.id})`));
      return;
    }

    console.log('✅ User found in auth.users');
    console.log(`   ID: ${targetUser.id}`);
    console.log(`   Email: ${targetUser.email}`);
    console.log(`   Created: ${targetUser.created_at}`);
    console.log('');

    // Step 2: Check user_profiles
    console.log('📋 Step 2: Checking user_profiles table...');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', targetUser.id)
      .single();

    if (profileError) {
      console.error('❌ User profile NOT FOUND');
      console.error(`   Error: ${profileError.message}`);
      console.error(`   Code: ${profileError.code}`);
      console.log('');
      console.log('🔧 Creating user profile now...');

      // Get or create organization
      let orgId;
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', 'test-organization')
        .single();

      if (org) {
        orgId = org.id;
        console.log(`✅ Using existing organization: ${orgId}`);
      } else {
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
          return;
        }
        orgId = newOrg.id;
        console.log(`✅ Created new organization: ${orgId}`);
      }

      // Create user profile
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          id: targetUser.id,
          organization_id: orgId,
          full_name: 'Federico Sciuca',
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

      if (createError) {
        console.error('❌ Failed to create user profile:', createError.message);
        console.error(`   Code: ${createError.code}`);
        console.error(`   Details:`, createError.details);
        return;
      }

      console.log('✅ User profile created successfully!');
      console.log(`   User ID: ${newProfile.id}`);
      console.log(`   Organization ID: ${newProfile.organization_id}`);
      console.log(`   Role: ${newProfile.role}`);
    } else {
      console.log('✅ User profile found');
      console.log(`   User ID: ${profile.id}`);
      console.log(`   Organization ID: ${profile.organization_id}`);
      console.log(`   Full Name: ${profile.full_name}`);
      console.log(`   Role: ${profile.role}`);
      console.log('');

      // Step 3: Check organization
      console.log('📋 Step 3: Checking organization...');
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();

      if (orgError) {
        console.error('❌ Organization NOT FOUND');
        console.error(`   Error: ${orgError.message}`);
      } else {
        console.log('✅ Organization found');
        console.log(`   ID: ${org.id}`);
        console.log(`   Name: ${org.name}`);
        console.log(`   Slug: ${org.slug}`);
        console.log(`   Plan: ${org.plan_tier}`);
      }
    }

    console.log('');
    console.log('🎉 Diagnosis complete!');
    console.log('');
    console.log('✅ Next steps:');
    console.log('   1. Refresh your browser page');
    console.log('   2. Try saving a template again');
    console.log('   3. Template should now save to database!');

  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
  }
}

diagnoseUser();
