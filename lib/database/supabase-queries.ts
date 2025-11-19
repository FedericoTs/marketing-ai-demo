/**
 * Supabase Database Query Abstraction Layer
 * Type-safe methods for all database operations
 * Uses Row-Level Security (RLS) policies for multi-tenant isolation
 */

import { createClient } from '@supabase/supabase-js';
import type {
  Organization,
  OrganizationInsert,
  OrganizationUpdate,
  UserProfile,
  UserProfileInsert,
  UserProfileUpdate,
  DesignTemplate,
  DesignTemplateInsert,
  DesignAsset,
  DesignAssetInsert,
  Database
} from './types';

// ============================================================================
// CLIENT CREATION
// ============================================================================

/**
 * Create Supabase client with service role (admin access, bypasses RLS)
 * USE WITH CAUTION - Only for server-side admin operations
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

/**
 * Create Supabase client with anon key (user access, respects RLS)
 * Use for all user-facing operations
 */
export function createUserClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ============================================================================
// ORGANIZATIONS
// ============================================================================

export async function createOrganization(data: OrganizationInsert) {
  const supabase = createAdminClient();

  const { data: org, error } = await supabase
    .from('organizations')
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(`Failed to create organization: ${error.message}`);
  return org as Organization;
}

export async function getOrganizationById(id: string) {
  const supabase = createUserClient();

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get organization: ${error.message}`);
  }

  return data as Organization | null;
}

export async function getOrganizationBySlug(slug: string) {
  const supabase = createUserClient();

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get organization by slug: ${error.message}`);
  }

  return data as Organization | null;
}

export async function updateOrganization(id: string, updates: OrganizationUpdate) {
  const supabase = createUserClient();

  const { data, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update organization: ${error.message}`);
  return data as Organization;
}

export async function updateOrganizationCredits(id: string, amount: number, operation: 'add' | 'subtract') {
  const supabase = createAdminClient();

  // Get current credits
  const { data: org } = await supabase
    .from('organizations')
    .select('credits')
    .eq('id', id)
    .single();

  if (!org) throw new Error('Organization not found');

  const newCredits = operation === 'add'
    ? Number(org.credits) + amount
    : Number(org.credits) - amount;

  if (newCredits < 0) throw new Error('Insufficient credits');

  const { data, error } = await supabase
    .from('organizations')
    .update({ credits: newCredits })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update credits: ${error.message}`);
  return data as Organization;
}

// ============================================================================
// USER PROFILES
// ============================================================================

export async function createUserProfile(data: UserProfileInsert) {
  const supabase = createAdminClient();

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(`Failed to create user profile: ${error.message}`);
  return profile as UserProfile;
}

export async function getUserProfileById(userId: string) {
  const supabase = createUserClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get user profile: ${error.message}`);
  }

  return data as UserProfile | null;
}

export async function getUserProfileWithOrganization(userId: string) {
  const supabase = createUserClient();

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError) {
    throw new Error(`Failed to get user profile: ${profileError.message}`);
  }

  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', profile.organization_id)
    .single();

  if (orgError) {
    throw new Error(`Failed to get organization: ${orgError.message}`);
  }

  return {
    profile: profile as UserProfile,
    organization: organization as Organization
  };
}

export async function getOrganizationUsers(organizationId: string) {
  const supabase = createUserClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to get organization users: ${error.message}`);
  return data as UserProfile[];
}

export async function updateUserProfile(userId: string, updates: UserProfileUpdate) {
  const supabase = createUserClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update user profile: ${error.message}`);
  return data as UserProfile;
}

export async function updateUserLastActive(userId: string) {
  const supabase = createUserClient();

  const { error } = await supabase
    .from('user_profiles')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw new Error(`Failed to update last active: ${error.message}`);
}

// ============================================================================
// TEAM MANAGEMENT (Approval Workflow)
// ============================================================================

/**
 * Get pending users for an organization
 * Note: Uses admin client to bypass RLS - authorization happens in API route
 */
export async function getPendingUsers(organizationId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('approval_status', 'pending')
    .order('approval_requested_at', { ascending: false });

  if (error) throw new Error(`Failed to get pending users: ${error.message}`);
  return data as UserProfile[];
}

/**
 * Get all users with their email addresses (joins with auth.users)
 * Requires owner/admin role via RLS
 */
export async function getOrganizationUsersWithEmail(organizationId: string) {
  const supabase = createAdminClient();

  // Use admin client to access auth.users table
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (profileError) throw new Error(`Failed to get users: ${profileError.message}`);

  // Get emails from auth.users
  const userIds = profiles.map((p: UserProfile) => p.id);
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) throw new Error(`Failed to get user emails: ${authError.message}`);

  // Combine profile data with emails
  const usersWithEmail = profiles.map((profile: UserProfile) => {
    const authUser = authUsers.users.find((u) => u.id === profile.id);
    return {
      ...profile,
      email: authUser?.email || 'Unknown'
    };
  });

  return usersWithEmail;
}

/**
 * Approve a pending user (sets status to approved, sets role to member by default)
 * Note: Uses admin client to bypass RLS - authorization happens in API route
 */
export async function approveUser(
  userId: string,
  approvedById: string,
  role: 'member' | 'owner' = 'member'
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      approval_status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: approvedById,
      role,
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to approve user: ${error.message}`);
  return data as UserProfile;
}

/**
 * Reject a pending user (sets status to rejected)
 * Note: Uses admin client to bypass RLS - authorization happens in API route
 */
export async function rejectUser(userId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      approval_status: 'rejected',
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to reject user: ${error.message}`);
  return data as UserProfile;
}

/**
 * Update user role (simplified - just Owner vs Member)
 * Note: Uses admin client to bypass RLS - authorization happens in API route
 */
export async function updateUserRole(
  userId: string,
  newRole: 'owner' | 'member'
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .update({ role: newRole })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update user role: ${error.message}`);
  return data as UserProfile;
}

/**
 * Update specific user permissions (granular control)
 * Note: Uses admin client to bypass RLS - authorization happens in API route
 */
export async function updateUserPermissions(
  userId: string,
  permissions: Partial<Pick<UserProfile,
    'can_create_designs' |
    'can_send_campaigns' |
    'can_manage_billing' |
    'can_invite_users' |
    'can_approve_designs' |
    'can_manage_templates' |
    'can_access_analytics' |
    'can_access_api'
  >>
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .update(permissions)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update user permissions: ${error.message}`);
  return data as UserProfile;
}

// ============================================================================
// DESIGN TEMPLATES
// ============================================================================

export async function createTemplate(data: DesignTemplateInsert) {
  const supabase = createUserClient();

  const { data: template, error } = await supabase
    .from('design_templates')
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(`Failed to create template: ${error.message}`);
  return template as DesignTemplate;
}

export async function getTemplateById(id: string) {
  const supabase = createUserClient();

  const { data, error } = await supabase
    .from('design_templates')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get template: ${error.message}`);
  }

  return data as DesignTemplate | null;
}

export async function getOrganizationTemplates(organizationId: string, status?: string) {
  // Use admin client for API routes (bypasses RLS, but we filter by organization_id)
  const supabase = createAdminClient();

  let query = supabase
    .from('design_templates')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to get templates: ${error.message}`);
  return data as DesignTemplate[];
}

export async function getPublicMarketplaceTemplates(category?: string, limit: number = 20) {
  const supabase = createUserClient();

  let query = supabase
    .from('design_templates')
    .select('*')
    .eq('is_public', true)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('marketplace_rating', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (category) {
    query = query.eq('marketplace_category', category);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to get marketplace templates: ${error.message}`);
  return data as DesignTemplate[];
}

export async function updateTemplate(id: string, updates: Partial<DesignTemplateInsert>) {
  const supabase = createUserClient();

  const { data, error } = await supabase
    .from('design_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update template: ${error.message}`);
  return data as DesignTemplate;
}

export async function softDeleteTemplate(id: string) {
  const supabase = createUserClient();

  const { data, error } = await supabase
    .from('design_templates')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'deleted'
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to delete template: ${error.message}`);
  return data as DesignTemplate;
}

// ============================================================================
// DESIGN ASSETS
// ============================================================================

export async function createAsset(data: DesignAssetInsert) {
  const supabase = createUserClient();

  const { data: asset, error } = await supabase
    .from('design_assets')
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(`Failed to create asset: ${error.message}`);
  return asset as DesignAsset;
}

export async function getAssetById(id: string) {
  const supabase = createUserClient();

  const { data, error } = await supabase
    .from('design_assets')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get asset: ${error.message}`);
  }

  return data as DesignAsset | null;
}

export async function getOrganizationAssets(organizationId: string, assetType?: string) {
  const supabase = createUserClient();

  let query = supabase
    .from('design_assets')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (assetType) {
    query = query.eq('asset_type', assetType);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to get assets: ${error.message}`);
  return data as DesignAsset[];
}

export async function getOrganizationBrandAssets(organizationId: string) {
  const supabase = createUserClient();

  const { data, error } = await supabase
    .from('design_assets')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_brand_asset', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to get brand assets: ${error.message}`);
  return data as DesignAsset[];
}

export async function softDeleteAsset(id: string) {
  const supabase = createUserClient();

  const { data, error } = await supabase
    .from('design_assets')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'deleted'
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to delete asset: ${error.message}`);
  return data as DesignAsset;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if organization has enough storage space
 */
export async function checkStorageLimit(organizationId: string, newFileSize: number): Promise<boolean> {
  const supabase = createAdminClient();

  // Call database function
  const { data, error } = await supabase.rpc('check_storage_limit', {
    org_id: organizationId
  });

  if (error) {
    console.error('Storage check error:', error);
    return false;
  }

  return data as boolean;
}

/**
 * Get organization's current storage usage in MB
 */
export async function getOrganizationStorageUsage(organizationId: string): Promise<number> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('get_organization_storage_mb', {
    org_id: organizationId
  });

  if (error) {
    console.error('Storage usage error:', error);
    return 0;
  }

  return data as number;
}
