/**
 * Database TypeScript Types
 * Auto-generated types for Supabase PostgreSQL schema
 * Ensures type safety across all database operations
 */

// ============================================================================
// ORGANIZATIONS TABLE
// ============================================================================

export interface Organization {
  id: string; // UUID
  name: string;
  slug: string; // URL-safe identifier

  // Subscription & Billing
  plan_tier: 'free' | 'starter' | 'professional' | 'enterprise';
  billing_status: 'active' | 'past_due' | 'cancelled' | 'trialing';
  trial_ends_at: string | null; // TIMESTAMPTZ
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;

  // Brand Kit
  brand_logo_url: string | null;
  brand_primary_color: string; // Default: '#3B82F6'
  brand_secondary_color: string; // Default: '#8B5CF6'
  brand_accent_color: string; // Default: '#F59E0B'
  brand_font_headline: string; // Default: 'Inter'
  brand_font_body: string; // Default: 'Inter'
  brand_voice_guidelines: Record<string, any>; // JSONB

  // Usage Limits
  monthly_design_limit: number; // Default: 100
  monthly_sends_limit: number; // Default: 1000
  storage_limit_mb: number; // Default: 1000

  // Credits (Data Axle)
  credits: number; // NUMERIC(12,2) Default: 0.00

  // Timestamps
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
}

export interface OrganizationInsert {
  name: string;
  slug: string;
  plan_tier?: 'free' | 'starter' | 'professional' | 'enterprise';
  billing_status?: 'active' | 'past_due' | 'cancelled' | 'trialing';
  trial_ends_at?: string | null;
  brand_primary_color?: string;
  brand_secondary_color?: string;
  brand_accent_color?: string;
  brand_font_headline?: string;
  brand_font_body?: string;
  brand_voice_guidelines?: Record<string, any>;
  monthly_design_limit?: number;
  monthly_sends_limit?: number;
  storage_limit_mb?: number;
  credits?: number;
}

export interface OrganizationUpdate {
  name?: string;
  slug?: string;
  plan_tier?: 'free' | 'starter' | 'professional' | 'enterprise';
  billing_status?: 'active' | 'past_due' | 'cancelled' | 'trialing';
  trial_ends_at?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  brand_logo_url?: string | null;
  brand_primary_color?: string;
  brand_secondary_color?: string;
  brand_accent_color?: string;
  brand_font_headline?: string;
  brand_font_body?: string;
  brand_voice_guidelines?: Record<string, any>;
  monthly_design_limit?: number;
  monthly_sends_limit?: number;
  storage_limit_mb?: number;
  credits?: number;
}

// ============================================================================
// USER_PROFILES TABLE
// ============================================================================

export interface UserProfile {
  id: string; // UUID - References auth.users(id)
  organization_id: string; // UUID - References organizations(id)

  // User Information
  full_name: string;
  avatar_url: string | null;
  job_title: string | null;
  department: string | null;

  // Role-Based Access Control
  role: 'owner' | 'admin' | 'designer' | 'viewer';

  // Granular Permissions
  can_create_designs: boolean; // Default: true
  can_send_campaigns: boolean; // Default: false
  can_manage_billing: boolean; // Default: false
  can_invite_users: boolean; // Default: false
  can_approve_designs: boolean; // Default: false
  can_manage_templates: boolean; // Default: true
  can_access_analytics: boolean; // Default: true

  // Preferences
  ui_preferences: Record<string, any>; // JSONB
  notification_preferences: {
    email_campaign_complete?: boolean;
    email_campaign_failed?: boolean;
    email_low_credits?: boolean;
    in_app_notifications?: boolean;
  };

  // Activity
  last_active_at: string; // TIMESTAMPTZ
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
}

export interface UserProfileInsert {
  id: string; // Must match auth.users.id
  organization_id: string;
  full_name: string;
  avatar_url?: string | null;
  job_title?: string | null;
  department?: string | null;
  role?: 'owner' | 'admin' | 'designer' | 'viewer';
  can_create_designs?: boolean;
  can_send_campaigns?: boolean;
  can_manage_billing?: boolean;
  can_invite_users?: boolean;
  can_approve_designs?: boolean;
  can_manage_templates?: boolean;
  can_access_analytics?: boolean;
  ui_preferences?: Record<string, any>;
  notification_preferences?: Record<string, any>;
}

export interface UserProfileUpdate {
  full_name?: string;
  avatar_url?: string | null;
  job_title?: string | null;
  department?: string | null;
  role?: 'owner' | 'admin' | 'designer' | 'viewer';
  can_create_designs?: boolean;
  can_send_campaigns?: boolean;
  can_manage_billing?: boolean;
  can_invite_users?: boolean;
  can_approve_designs?: boolean;
  can_manage_templates?: boolean;
  can_access_analytics?: boolean;
  ui_preferences?: Record<string, any>;
  notification_preferences?: Record<string, any>;
  last_active_at?: string;
}

// ============================================================================
// DESIGN_TEMPLATES TABLE
// ============================================================================

/**
 * Multi-Surface Architecture
 * Enables templates with multiple sides/panels (postcards, self-mailers, brochures)
 */
export type SurfaceType =
  | 'front'
  | 'back'
  | 'inside-left'
  | 'inside-right'
  | 'panel-1'
  | 'panel-2'
  | 'panel-3'
  | 'panel-4'
  | 'panel-5'
  | 'panel-6';

export interface DesignSurface {
  side: SurfaceType;
  canvas_json: Record<string, any>; // Fabric.js toJSON() output for this surface
  variable_mappings?: Record<string, {
    variableType: string;
    isReusable: boolean;
  }>;
  thumbnail_url?: string | null;
}

export interface DesignTemplate {
  id: string; // UUID
  organization_id: string; // UUID
  created_by: string; // UUID - auth.users.id

  // Metadata
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  tags: string[]; // TEXT[]

  // Fabric.js Canvas
  canvas_json: Record<string, any>; // JSONB - Fabric.js toJSON() output
  canvas_width: number; // Pixels at 300 DPI
  canvas_height: number; // Pixels at 300 DPI

  // Variable Mappings (CRITICAL - stored separately)
  variable_mappings: Record<string, {
    variableType: string;
    isReusable: boolean;
  }>; // JSONB

  // Multi-Surface Support (NEW - 2025-11-05)
  surfaces: DesignSurface[]; // JSONB array - supports N surfaces (front, back, panels)

  // Format & Dimensions
  format_type: 'postcard_4x6' | 'postcard_6x9' | 'postcard_6x11' | 'letter_8.5x11' | 'selfmailer_11x17' | 'doorhanger_4x11';
  format_width_inches: number; // NUMERIC(5,3)
  format_height_inches: number; // NUMERIC(5,3)
  postal_country: string; // Default: 'US'

  // Compliance
  compliance_validated: boolean;
  compliance_issues: any[]; // JSONB
  last_compliance_check_at: string | null;

  // AI Background
  background_image_url: string | null;
  background_generation_prompt: string | null;
  background_cost: number; // NUMERIC(10,4)

  // Marketplace
  is_public: boolean;
  marketplace_category: string | null;
  marketplace_subcategory: string | null;
  marketplace_price: number; // NUMERIC(10,2)
  marketplace_license_type: 'single_use' | 'unlimited' | 'commercial';
  marketplace_rating: number | null; // NUMERIC(3,2)
  marketplace_total_ratings: number;
  marketplace_featured: boolean;

  // Performance (Network Effects)
  usage_count: number;
  total_campaigns_using: number;
  avg_response_rate: number | null; // NUMERIC(5,2)
  avg_conversion_rate: number | null; // NUMERIC(5,2)
  total_recipients_reached: number;

  // Version Control
  parent_template_id: string | null; // UUID
  version_number: number;
  is_latest_version: boolean;

  // Status
  status: 'draft' | 'active' | 'archived' | 'deleted';
  published_at: string | null;
  archived_at: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DesignTemplateInsert {
  organization_id: string;
  created_by: string;
  name: string;
  description?: string | null;
  thumbnail_url?: string | null;
  tags?: string[];
  canvas_json: Record<string, any>;
  canvas_width: number;
  canvas_height: number;
  variable_mappings?: Record<string, any>;
  surfaces?: DesignSurface[]; // Optional - will be auto-generated from canvas_json if not provided
  format_type: string;
  format_width_inches: number;
  format_height_inches: number;
  postal_country?: string;
  background_image_url?: string | null;
  background_generation_prompt?: string | null;
  background_cost?: number;
  is_public?: boolean;
  marketplace_category?: string | null;
  marketplace_price?: number;
  marketplace_license_type?: string;
  status?: 'draft' | 'active' | 'archived';
}

// ============================================================================
// DESIGN_ASSETS TABLE
// ============================================================================

export interface DesignAsset {
  id: string; // UUID
  organization_id: string; // UUID
  uploaded_by: string; // UUID

  // Metadata
  name: string;
  asset_type: 'logo' | 'image' | 'font' | 'icon' | 'svg' | 'background';
  mime_type: string;
  file_size_bytes: number;
  storage_url: string; // Supabase Storage path

  // Image Dimensions
  width_px: number | null;
  height_px: number | null;
  dpi: number | null;
  aspect_ratio: number | null;

  // Categorization
  tags: string[];
  folder: string; // Default: 'uncategorized'
  is_brand_asset: boolean;

  // AI Analysis
  ai_description: string | null;
  ai_suggested_tags: string[] | null;
  dominant_colors: string[] | null; // Hex codes
  ai_category: string | null;

  // Usage
  usage_count: number;
  last_used_at: string | null;

  // Source
  source_type: 'upload' | 'ai_generated' | 'stock' | 'url_import';
  source_url: string | null;
  ai_generation_prompt: string | null;
  ai_generation_cost: number | null;

  // License
  license_type: 'owned' | 'stock' | 'creative_commons' | 'royalty_free';
  license_details: Record<string, any> | null;
  copyright_holder: string | null;

  // Status
  status: 'active' | 'archived' | 'deleted';
  archived_at: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DesignAssetInsert {
  organization_id: string;
  uploaded_by: string;
  name: string;
  asset_type: 'logo' | 'image' | 'font' | 'icon' | 'svg' | 'background';
  mime_type: string;
  file_size_bytes: number;
  storage_url: string;
  width_px?: number | null;
  height_px?: number | null;
  dpi?: number | null;
  tags?: string[];
  folder?: string;
  is_brand_asset?: boolean;
  source_type?: 'upload' | 'ai_generated' | 'stock' | 'url_import';
  source_url?: string | null;
  ai_generation_prompt?: string | null;
  license_type?: 'owned' | 'stock' | 'creative_commons' | 'royalty_free';
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: OrganizationInsert;
        Update: OrganizationUpdate;
      };
      user_profiles: {
        Row: UserProfile;
        Insert: UserProfileInsert;
        Update: UserProfileUpdate;
      };
      design_templates: {
        Row: DesignTemplate;
        Insert: DesignTemplateInsert;
        Update: Partial<DesignTemplateInsert>;
      };
      design_assets: {
        Row: DesignAsset;
        Insert: DesignAssetInsert;
        Update: Partial<DesignAssetInsert>;
      };
    };
  };
};

// ============================================================================
// RECIPIENT_LISTS TABLE
// ============================================================================

export interface RecipientList {
  id: string; // UUID
  organization_id: string; // UUID
  created_by: string; // UUID

  // Metadata
  name: string;
  description: string | null;
  source: 'manual' | 'csv' | 'data_axle' | 'api';

  // Data Axle Integration
  data_axle_filters: Record<string, any> | null; // JSONB

  // Statistics
  total_recipients: number;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface RecipientListInsert {
  organization_id: string;
  created_by: string;
  name: string;
  description?: string | null;
  source?: 'manual' | 'csv' | 'data_axle' | 'api';
  data_axle_filters?: Record<string, any> | null;
  total_recipients?: number;
}

// ============================================================================
// RECIPIENTS TABLE
// ============================================================================

export interface Recipient {
  id: string; // UUID
  recipient_list_id: string; // UUID
  organization_id: string; // UUID
  created_by: string; // UUID

  // Contact Information
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;

  // Mailing Address
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip_code: string;
  country: string; // Default: 'US'

  // Data Axle Integration
  data_axle_id: string | null;

  // Additional Data
  metadata: Record<string, any>; // JSONB - flexible custom fields

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface RecipientInsert {
  recipient_list_id: string;
  organization_id: string;
  created_by: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  zip_code: string;
  country?: string;
  data_axle_id?: string | null;
  metadata?: Record<string, any>;
}

// ============================================================================
// CAMPAIGNS TABLE
// ============================================================================

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'completed' | 'failed';

export interface Campaign {
  id: string; // UUID
  organization_id: string; // UUID
  created_by: string; // UUID

  // Campaign Identity
  name: string;
  description: string | null;

  // Template & Audience Links
  template_id: string | null; // UUID
  recipient_list_id: string | null; // UUID

  // Design Snapshots (frozen at campaign creation)
  design_snapshot: Record<string, any>; // JSONB - Frozen Fabric.js canvas state
  variable_mappings_snapshot: Record<string, any>; // JSONB - Variable field mappings at send time

  // Campaign Stats
  total_recipients: number;
  status: CampaignStatus;

  // Schedule & Timing
  scheduled_at: string | null; // TIMESTAMPTZ
  sent_at: string | null; // TIMESTAMPTZ
  completed_at: string | null; // TIMESTAMPTZ

  // Timestamps
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
}

export interface CampaignInsert {
  organization_id: string;
  created_by: string;
  name: string;
  description?: string | null;
  template_id?: string | null;
  recipient_list_id?: string | null;
  design_snapshot: Record<string, any>;
  variable_mappings_snapshot: Record<string, any>;
  total_recipients?: number;
  status?: CampaignStatus;
  scheduled_at?: string | null;
}

export interface CampaignUpdate {
  name?: string;
  description?: string | null;
  status?: CampaignStatus;
  scheduled_at?: string | null;
  sent_at?: string | null;
  completed_at?: string | null;
}

// ============================================================================
// CAMPAIGN_RECIPIENTS TABLE
// ============================================================================

export type CampaignRecipientStatus = 'pending' | 'generated' | 'sent' | 'delivered' | 'failed';

export interface CampaignRecipient {
  id: string; // UUID
  campaign_id: string; // UUID
  recipient_id: string; // UUID

  // Personalized Content
  personalized_canvas_json: Record<string, any>; // JSONB - Individual Fabric.js canvas with recipient data
  tracking_code: string; // Unique tracking identifier for QR codes/URLs

  // Generated Assets
  qr_code_url: string | null;
  personalized_pdf_url: string | null;
  landing_page_url: string | null;

  // Delivery Status
  status: CampaignRecipientStatus;
  sent_at: string | null; // TIMESTAMPTZ
  delivered_at: string | null; // TIMESTAMPTZ

  // Error Tracking
  error_message: string | null;
  retry_count: number;

  // Timestamps
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
}

export interface CampaignRecipientInsert {
  campaign_id: string;
  recipient_id: string;
  personalized_canvas_json: Record<string, any>;
  tracking_code: string;
  qr_code_url?: string | null;
  personalized_pdf_url?: string | null;
  landing_page_url?: string | null;
  status?: CampaignRecipientStatus;
}

// ============================================================================
// CAMPAIGN WIZARD STATE (UI Types)
// ============================================================================

export interface VariableMapping {
  templateVariable: string; // e.g., "recipientName", "qrCode"
  recipientField: string; // e.g., "first_name", "tracking_code"
  variableType: string; // e.g., "recipientName", "qrCode"
  isReusable: boolean;
}

export interface CampaignWizardState {
  // Step 1: Template Selection
  selectedTemplate: DesignTemplate | null;

  // Step 2: Audience Selection
  selectedRecipientList: RecipientList | null;
  audienceSource: 'data_axle' | 'csv' | null;

  // Step 3: Variable Mapping
  variableMappings: VariableMapping[];

  // Step 4: Review & Launch
  campaignName: string;
  campaignDescription: string;

  // Current step (1-4)
  currentStep: number;
}

// ============================================================================
// LANDING_PAGES TABLE
// ============================================================================

export type LandingPageTemplateType =
  | 'default'
  | 'appointment'
  | 'questionnaire'
  | 'product'
  | 'contact'
  | 'custom';

export interface LandingPageConfig {
  // Branding
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  background_color?: string;

  // Content
  headline?: string;
  subheadline?: string;
  cta_text?: string;
  cta_url?: string;
  image_url?: string;

  // Form Fields (for templates with forms)
  form_fields?: Array<{
    name: string;
    type: 'text' | 'email' | 'phone' | 'select' | 'textarea';
    label: string;
    required: boolean;
    options?: string[]; // for select fields
  }>;

  // Tracking
  google_analytics_id?: string;
  facebook_pixel_id?: string;

  // Advanced
  custom_css?: string;
  custom_js?: string;
  redirect_after_submit?: string;
}

export interface LandingPageRecipientData {
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  email?: string;
  phone?: string;
  [key: string]: any; // Custom fields
}

export interface LandingPage {
  id: string; // UUID
  campaign_id: string; // UUID
  tracking_code: string; // Unique tracking identifier

  // Template & Configuration
  template_type: LandingPageTemplateType;
  page_config: LandingPageConfig; // JSONB

  // Personalization
  recipient_data: LandingPageRecipientData | null; // JSONB

  // Status
  is_active: boolean;

  // Timestamps
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
}

export interface LandingPageInsert {
  campaign_id: string;
  tracking_code: string;
  template_type?: LandingPageTemplateType;
  page_config: LandingPageConfig;
  recipient_data?: LandingPageRecipientData | null;
  is_active?: boolean;
}

export interface LandingPageUpdate {
  template_type?: LandingPageTemplateType;
  page_config?: LandingPageConfig;
  recipient_data?: LandingPageRecipientData | null;
  is_active?: boolean;
}

// Generic query result types
export type QueryResult<T> = {
  data: T | null;
  error: Error | null;
};

export type QueryArrayResult<T> = {
  data: T[] | null;
  error: Error | null;
  count?: number | null;
};
