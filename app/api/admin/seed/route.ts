/**
 * Seed Data API Route
 * Creates test organizations and users for development/testing
 *
 * POST /api/admin/seed - Create seed data
 * DELETE /api/admin/seed - Clear all seed data
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createOrganization,
  createUserProfile,
  createAdminClient
} from '@/lib/database/supabase-queries';
import { requireAdmin } from '@/lib/auth/admin';

// Seed data configuration
const SEED_DATA = {
  organizations: [
    {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      plan_tier: 'enterprise' as const,
      billing_status: 'active' as const,
      brand_primary_color: '#FF0000',
      brand_secondary_color: '#000000',
      brand_accent_color: '#FFCC00',
      brand_font_headline: 'Roboto',
      brand_font_body: 'Open Sans',
      monthly_design_limit: 1000,
      monthly_sends_limit: 100000,
      storage_limit_mb: 10000,
      credits: 1000.00
    },
    {
      name: 'TechStart Inc',
      slug: 'techstart',
      plan_tier: 'professional' as const,
      billing_status: 'active' as const,
      brand_primary_color: '#3B82F6',
      brand_secondary_color: '#8B5CF6',
      brand_accent_color: '#F59E0B',
      monthly_design_limit: 500,
      monthly_sends_limit: 10000,
      storage_limit_mb: 5000,
      credits: 500.00
    },
    {
      name: 'Local Bakery',
      slug: 'local-bakery',
      plan_tier: 'free' as const,
      billing_status: 'trialing' as const,
      brand_primary_color: '#FFA07A',
      brand_secondary_color: '#8B4513',
      brand_accent_color: '#FFD700',
      monthly_design_limit: 100,
      monthly_sends_limit: 1000,
      storage_limit_mb: 1000,
      credits: 50.00
    }
  ]
};

export async function POST(req: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin();
  } catch (error: any) {
    const isForbidden = error.message?.includes('FORBIDDEN');
    return NextResponse.json(
      { error: error.message || 'Authentication required' },
      { status: isForbidden ? 403 : 401 }
    );
  }

  try {
    const supabase = createAdminClient();
    const results = {
      organizations: [] as any[],
      users: [] as any[],
      errors: [] as string[]
    };

    // Create organizations
    for (const orgData of SEED_DATA.organizations) {
      try {
        // Check if organization already exists
        const { data: existing } = await supabase
          .from('organizations')
          .select('id, name, slug')
          .eq('slug', orgData.slug)
          .single() as { data: { id: string; name: string; slug: string } | null };

        if (existing) {
          results.organizations.push({
            id: existing.id,
            name: existing.name,
            slug: existing.slug,
            status: 'already_exists'
          });
          console.log(`Organization ${orgData.name} already exists`);
          continue;
        }

        // Create organization
        const org = await createOrganization(orgData);
        results.organizations.push({
          ...org,
          status: 'created'
        });

        console.log(`✅ Created organization: ${org.name} (${org.id})`);

        // Create test users for this organization
        const userRoles: Array<'owner' | 'admin' | 'designer' | 'viewer'> = ['owner', 'admin'];

        for (const role of userRoles) {
          try {
            // Create auth user first
            const email = `${role}@${orgData.slug}.test`;
            const password = 'Test123456!';

            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
              email,
              password,
              email_confirm: true,
              user_metadata: {
                full_name: `${orgData.name} ${role.charAt(0).toUpperCase() + role.slice(1)}`
              }
            });

            if (authError) {
              // User might already exist
              if (authError.message.includes('already registered')) {
                // Get existing user
                const { data: existingUser } = await supabase.auth.admin.listUsers();
                const user = existingUser?.users.find(u => u.email === email);

                if (user) {
                  results.users.push({
                    id: user.id,
                    email,
                    organization: org.name,
                    role,
                    status: 'already_exists'
                  });
                  console.log(`User ${email} already exists`);
                  continue;
                }
              }

              throw authError;
            }

            const user = authData.user;

            // Create user profile
            const profile = await createUserProfile({
              id: user.id,
              organization_id: org.id,
              full_name: `${orgData.name} ${role.charAt(0).toUpperCase() + role.slice(1)}`,
              role,
              can_create_designs: true,
              can_send_campaigns: role === 'owner' || role === 'admin',
              can_manage_billing: role === 'owner',
              can_invite_users: role === 'owner' || role === 'admin',
              can_approve_designs: role === 'owner' || role === 'admin',
              can_manage_templates: true,
              can_access_analytics: true
            });

            results.users.push({
              id: user.id,
              email,
              organization: org.name,
              role,
              status: 'created'
            });

            console.log(`✅ Created user: ${email} as ${role} in ${org.name}`);
          } catch (userError: any) {
            const errorMsg = `Failed to create ${role} user for ${org.name}: ${userError.message}`;
            results.errors.push(errorMsg);
            console.error(errorMsg);
          }
        }

      } catch (orgError: any) {
        const errorMsg = `Failed to create organization ${orgData.name}: ${orgError.message}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return NextResponse.json({
      success: results.errors.length === 0,
      message: `Seed data created. Organizations: ${results.organizations.length}, Users: ${results.users.length}`,
      data: results,
      credentials: {
        note: 'Use these credentials to log in',
        users: [
          { email: 'owner@acme-corp.test', password: 'Test123456!', organization: 'Acme Corporation', role: 'owner' },
          { email: 'admin@acme-corp.test', password: 'Test123456!', organization: 'Acme Corporation', role: 'admin' },
          { email: 'owner@techstart.test', password: 'Test123456!', organization: 'TechStart Inc', role: 'owner' },
          { email: 'admin@techstart.test', password: 'Test123456!', organization: 'TechStart Inc', role: 'admin' },
          { email: 'owner@local-bakery.test', password: 'Test123456!', organization: 'Local Bakery', role: 'owner' },
          { email: 'admin@local-bakery.test', password: 'Test123456!', organization: 'Local Bakery', role: 'admin' }
        ]
      }
    });

  } catch (error: any) {
    console.error('Seed data error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    // Require admin authentication
    await requireAdmin();
  } catch (error: any) {
    const isForbidden = error.message?.includes('FORBIDDEN');
    return NextResponse.json(
      { error: error.message || 'Authentication required' },
      { status: isForbidden ? 403 : 401 }
    );
  }

  try {
    const supabase = createAdminClient();

    // Get all test organizations
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, slug')
      .in('slug', ['acme-corp', 'techstart', 'local-bakery']) as { data: { id: string; slug: string }[] | null };

    if (!orgs || orgs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No seed data found to delete'
      });
    }

    // Get all test users
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id')
      .in('organization_id', orgs.map(o => o.id)) as { data: { id: string }[] | null };

    // Delete auth users
    if (profiles) {
      for (const profile of profiles) {
        try {
          await supabase.auth.admin.deleteUser(profile.id);
        } catch (error) {
          console.error(`Failed to delete auth user ${profile.id}:`, error);
        }
      }
    }

    // Delete user profiles (will cascade delete due to FK)
    await supabase
      .from('user_profiles')
      .delete()
      .in('organization_id', orgs.map(o => o.id));

    // Delete organizations (will cascade delete templates and assets)
    await supabase
      .from('organizations')
      .delete()
      .in('id', orgs.map(o => o.id));

    return NextResponse.json({
      success: true,
      message: `Deleted ${orgs.length} organizations and ${profiles?.length || 0} users`,
      deleted: {
        organizations: orgs.length,
        users: profiles?.length || 0
      }
    });

  } catch (error: any) {
    console.error('Delete seed data error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    usage: {
      POST: 'Create seed data (3 organizations, 6 users)',
      DELETE: 'Delete all seed data'
    },
    organizations: SEED_DATA.organizations.map(o => ({
      name: o.name,
      slug: o.slug,
      plan_tier: o.plan_tier
    })),
    test_credentials: {
      note: 'After POST /api/admin/seed, use these to login',
      users: [
        'owner@acme-corp.test / Test123456!',
        'admin@acme-corp.test / Test123456!',
        'owner@techstart.test / Test123456!',
        'admin@techstart.test / Test123456!',
        'owner@local-bakery.test / Test123456!',
        'admin@local-bakery.test / Test123456!'
      ]
    }
  });
}
