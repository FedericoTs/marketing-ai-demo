-- Migration 001: Organizations Table (Multi-Tenancy Root)
-- This is the foundation table that all other tables reference
-- Every organization is completely isolated via Row-Level Security

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-safe identifier (e.g., 'acme-corp')

  -- Subscription & Billing
  plan_tier TEXT NOT NULL DEFAULT 'free', -- free, starter, professional, enterprise
  billing_status TEXT NOT NULL DEFAULT 'active', -- active, past_due, cancelled, trialing
  trial_ends_at TIMESTAMPTZ,
  stripe_customer_id TEXT UNIQUE, -- For Stripe integration (Phase 9)
  stripe_subscription_id TEXT,

  -- Brand Kit (stored at org level for reuse across all templates)
  brand_logo_url TEXT,
  brand_primary_color TEXT DEFAULT '#3B82F6', -- Blue
  brand_secondary_color TEXT DEFAULT '#8B5CF6', -- Purple
  brand_accent_color TEXT DEFAULT '#F59E0B', -- Orange
  brand_font_headline TEXT DEFAULT 'Inter',
  brand_font_body TEXT DEFAULT 'Inter',
  brand_voice_guidelines JSONB DEFAULT '{}'::jsonb, -- AI copywriting guidance

  -- Usage Limits (enforced by application logic)
  monthly_design_limit INTEGER DEFAULT 100,
  monthly_sends_limit INTEGER DEFAULT 1000,
  storage_limit_mb INTEGER DEFAULT 1000,

  -- Credits for Data Axle contact purchases (Phase 5)
  credits NUMERIC(12,2) DEFAULT 0.00,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_plan_tier ON organizations(plan_tier);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer ON organizations(stripe_customer_id);

-- Enable Row-Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own organization
-- This prevents User A from seeing User B's organization data
CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- RLS Policy: Owners and admins can update their organization
CREATE POLICY "Owners and admins can update their organization"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Updated_at trigger function (reusable across all tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE organizations IS 'Multi-tenant organization root. All other tables reference this via organization_id with RLS policies.';
COMMENT ON COLUMN organizations.slug IS 'URL-safe identifier for organization (e.g., acme-corp). Used in URLs and subdomains.';
COMMENT ON COLUMN organizations.brand_voice_guidelines IS 'JSONB object with AI copywriting guidelines: { "tone": "professional", "keywords": ["quality", "innovation"], "avoid": ["cheap"] }';
COMMENT ON COLUMN organizations.credits IS 'Prepaid credits for Data Axle contact purchases. $1 credit = 1 contact at $0.25/contact wholesale.';
-- Migration 002: User Profiles Table (Extends Supabase Auth)
-- Links Supabase Auth users to organizations with roles and permissions
-- One user can only belong to ONE organization (enforced at application level)

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- User Information
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  job_title TEXT,
  department TEXT,

  -- Role-Based Access Control (RBAC)
  role TEXT NOT NULL DEFAULT 'member', -- owner, admin, designer, viewer

  -- Granular Permissions (boolean flags for fine-grained control)
  can_create_designs BOOLEAN DEFAULT true,
  can_send_campaigns BOOLEAN DEFAULT false,
  can_manage_billing BOOLEAN DEFAULT false,
  can_invite_users BOOLEAN DEFAULT false,
  can_approve_designs BOOLEAN DEFAULT false,
  can_manage_templates BOOLEAN DEFAULT true,
  can_access_analytics BOOLEAN DEFAULT true,

  -- User Preferences
  ui_preferences JSONB DEFAULT '{}'::jsonb,
  -- Example: { "theme": "dark", "editor_shortcuts": { "save": "ctrl+s" }, "default_canvas_size": "postcard_6x4" }

  notification_preferences JSONB DEFAULT '{
    "email_campaign_complete": true,
    "email_campaign_failed": true,
    "email_low_credits": true,
    "in_app_notifications": true
  }'::jsonb,

  -- Activity Tracking
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_org ON user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(organization_id, role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_active ON user_profiles(last_active_at DESC);

-- Enable Row-Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view profiles in their organization
CREATE POLICY "Users can view profiles in their organization"
  ON user_profiles FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- RLS Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- RLS Policy: Owners and admins can update other users in their org
CREATE POLICY "Owners and admins can update users in their organization"
  ON user_profiles FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- RLS Policy: Only organization owners can delete users
CREATE POLICY "Owners can delete users in their organization"
  ON user_profiles FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'owner'
    )
  );

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create user_profile when auth.users is created
-- This ensures every authenticated user has a profile
-- Note: Organization assignment happens at signup via application logic
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- This will be called from application code after organization is created
  -- We don't auto-create here because we need organization_id first
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
-- Note: Disabled for now - we'll handle user_profile creation in signup flow
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION handle_new_user();

-- Helper function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
  user_id UUID,
  permission_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  has_permission BOOLEAN;
BEGIN
  EXECUTE format(
    'SELECT %I FROM user_profiles WHERE id = $1',
    permission_name
  ) INTO has_permission USING user_id;

  RETURN COALESCE(has_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's organization
CREATE OR REPLACE FUNCTION get_user_organization(user_id UUID)
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT organization_id INTO org_id
  FROM user_profiles
  WHERE id = user_id;

  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE user_profiles IS 'Extends auth.users with organization membership and role-based permissions. One user = one organization.';
COMMENT ON COLUMN user_profiles.role IS 'Primary role: owner (full access), admin (most access), designer (create/edit), viewer (read-only)';
COMMENT ON COLUMN user_profiles.ui_preferences IS 'JSONB object with UI preferences: theme, shortcuts, default sizes, etc.';
COMMENT ON COLUMN user_profiles.notification_preferences IS 'JSONB object controlling email and in-app notification settings.';

-- Permission roles reference guide
COMMENT ON COLUMN user_profiles.can_create_designs IS 'Permission to create new design templates';
COMMENT ON COLUMN user_profiles.can_send_campaigns IS 'Permission to send campaigns (expensive operation)';
COMMENT ON COLUMN user_profiles.can_manage_billing IS 'Permission to update billing, credits, subscriptions';
COMMENT ON COLUMN user_profiles.can_invite_users IS 'Permission to invite new team members';
COMMENT ON COLUMN user_profiles.can_approve_designs IS 'Permission to approve designs for sending';
-- Migration 003: Design Templates Table (Fabric.js Canvas Storage)
-- Stores reusable direct mail design templates with variable data printing (VDP) support
-- Critical: Variable mappings stored SEPARATELY from canvas_json (Fabric.js v6 limitation)

-- Create design_templates table
CREATE TABLE IF NOT EXISTS design_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Template Metadata
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT, -- 400x400 preview image (Supabase Storage)
  tags TEXT[] DEFAULT ARRAY[]::TEXT[], -- Searchable tags: ['real-estate', 'postcard', 'modern']

  -- Fabric.js Canvas State (Complete canvas JSON from toJSON())
  canvas_json JSONB NOT NULL,
  canvas_width INTEGER NOT NULL, -- Pixels at 300 DPI (e.g., 1800 for 6" width)
  canvas_height INTEGER NOT NULL,

  -- CRITICAL: Variable Mappings (Stored Separately)
  -- Fabric.js v6 does NOT serialize custom properties via toJSON()
  -- We store variable markers separately and apply them on load
  -- Structure: { "0": { "variableType": "recipientName", "isReusable": false }, "1": { "variableType": "logo", "isReusable": true } }
  -- Key = canvas object index (0, 1, 2, ...), Value = variable metadata
  variable_mappings JSONB DEFAULT '{}'::jsonb,

  -- Format & Physical Dimensions
  format_type TEXT NOT NULL DEFAULT 'postcard_4x6',
  -- Options: postcard_4x6, postcard_6x9, postcard_6x11, letter_8.5x11, selfmailer_11x17, doorhanger_4x11
  format_width_inches NUMERIC(5,3) NOT NULL DEFAULT 6.000, -- Physical print width
  format_height_inches NUMERIC(5,3) NOT NULL DEFAULT 4.000, -- Physical print height
  postal_country TEXT DEFAULT 'US', -- US, CA, UK, AU

  -- Postal Compliance (Phase 4)
  compliance_validated BOOLEAN DEFAULT false,
  compliance_issues JSONB DEFAULT '[]'::jsonb,
  -- Example: [{ "type": "address_block_missing", "severity": "error", "message": "..." }, { "type": "barcode_clearance", "severity": "warning" }]
  last_compliance_check_at TIMESTAMPTZ,

  -- AI-Generated Background (Reused for all recipients - cost optimization)
  background_image_url TEXT, -- AI-generated background via DALL-E
  background_generation_prompt TEXT,
  background_cost NUMERIC(10,4) DEFAULT 0.0000, -- Track AI generation cost ($0.04-0.08 per image)

  -- Template Marketplace (Phase 7)
  is_public BOOLEAN DEFAULT false, -- Public in marketplace vs private to organization
  marketplace_category TEXT, -- real_estate, retail, healthcare, automotive, nonprofit, generic
  marketplace_subcategory TEXT, -- open_house, sale_announcement, new_listing
  marketplace_price NUMERIC(10,2) DEFAULT 0.00, -- Price for others to purchase ($0 = free)
  marketplace_license_type TEXT DEFAULT 'single_use', -- single_use, unlimited, commercial
  marketplace_rating NUMERIC(3,2), -- Average rating 1.00-5.00
  marketplace_total_ratings INTEGER DEFAULT 0,
  marketplace_featured BOOLEAN DEFAULT false, -- Featured in marketplace

  -- Network Effects Data (Performance tracking feeds AI recommendations)
  usage_count INTEGER DEFAULT 0, -- How many campaigns have used this template
  total_campaigns_using INTEGER DEFAULT 0,
  avg_response_rate NUMERIC(5,2), -- Average response rate across all campaigns using this template
  avg_conversion_rate NUMERIC(5,2), -- Average conversion rate
  total_recipients_reached INTEGER DEFAULT 0, -- Total mail pieces sent using this template

  -- Version Control (for template variations)
  parent_template_id UUID REFERENCES design_templates(id) ON DELETE SET NULL,
  version_number INTEGER DEFAULT 1,
  is_latest_version BOOLEAN DEFAULT true,

  -- Status & Lifecycle
  status TEXT DEFAULT 'draft', -- draft, active, archived, deleted
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete for audit trail
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_templates_org ON design_templates(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_templates_creator ON design_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_templates_format ON design_templates(organization_id, format_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_templates_status ON design_templates(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_templates_tags ON design_templates USING GIN (tags);

-- Marketplace indexes (for public templates)
CREATE INDEX IF NOT EXISTS idx_templates_marketplace
  ON design_templates(is_public, marketplace_category, marketplace_rating DESC)
  WHERE is_public = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_templates_marketplace_featured
  ON design_templates(marketplace_featured, marketplace_rating DESC)
  WHERE is_public = true AND marketplace_featured = true AND deleted_at IS NULL;

-- Performance tracking index (for AI recommendations)
CREATE INDEX IF NOT EXISTS idx_templates_performance
  ON design_templates(avg_response_rate DESC NULLS LAST, avg_conversion_rate DESC NULLS LAST)
  WHERE deleted_at IS NULL;

-- Full-text search index on template content
CREATE INDEX IF NOT EXISTS idx_templates_search
  ON design_templates USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- GIN index for JSONB queries on canvas_json
CREATE INDEX IF NOT EXISTS idx_templates_canvas_json ON design_templates USING GIN (canvas_json);

-- GIN index for variable_mappings
CREATE INDEX IF NOT EXISTS idx_templates_variable_mappings ON design_templates USING GIN (variable_mappings);

-- Enable Row-Level Security
ALTER TABLE design_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their organization's templates + public marketplace templates
CREATE POLICY "Users can view accessible templates"
  ON design_templates FOR SELECT
  USING (
    (
      -- Own organization's templates
      organization_id IN (
        SELECT organization_id
        FROM user_profiles
        WHERE id = auth.uid()
      )
    )
    OR
    (
      -- Public marketplace templates
      is_public = true AND status = 'active' AND deleted_at IS NULL
    )
  );

-- RLS Policy: Designers can create templates in their organization
CREATE POLICY "Designers can create templates"
  ON design_templates FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
      AND can_create_designs = true
    )
  );

-- RLS Policy: Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON design_templates FOR UPDATE
  USING (
    created_by = auth.uid()
    AND organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    AND organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- RLS Policy: Admins can update any template in their org
CREATE POLICY "Admins can update organization templates"
  ON design_templates FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- RLS Policy: Owners can delete templates (soft delete)
CREATE POLICY "Owners can delete templates"
  ON design_templates FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'owner'
    )
  );

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_design_templates_updated_at
  BEFORE UPDATE ON design_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to increment template usage count when used in campaign
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE design_templates
  SET
    usage_count = usage_count + 1,
    total_campaigns_using = total_campaigns_using + 1,
    updated_at = NOW()
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update template performance metrics (called when campaign completes)
CREATE OR REPLACE FUNCTION update_template_performance(
  template_id UUID,
  new_response_rate NUMERIC,
  new_conversion_rate NUMERIC,
  recipients_count INTEGER
)
RETURNS VOID AS $$
DECLARE
  current_avg_response NUMERIC;
  current_avg_conversion NUMERIC;
  current_total_recipients INTEGER;
BEGIN
  -- Get current values
  SELECT
    COALESCE(avg_response_rate, 0),
    COALESCE(avg_conversion_rate, 0),
    COALESCE(total_recipients_reached, 0)
  INTO
    current_avg_response,
    current_avg_conversion,
    current_total_recipients
  FROM design_templates
  WHERE id = template_id;

  -- Calculate weighted average (more recipients = more weight)
  UPDATE design_templates
  SET
    avg_response_rate = (
      (current_avg_response * current_total_recipients + new_response_rate * recipients_count) /
      (current_total_recipients + recipients_count)
    ),
    avg_conversion_rate = (
      (current_avg_conversion * current_total_recipients + new_conversion_rate * recipients_count) /
      (current_total_recipients + recipients_count)
    ),
    total_recipients_reached = current_total_recipients + recipients_count,
    updated_at = NOW()
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE design_templates IS 'Reusable Fabric.js design templates with VDP support. Variable mappings stored separately from canvas_json (Fabric.js v6 limitation).';
COMMENT ON COLUMN design_templates.canvas_json IS 'Complete Fabric.js canvas state from toJSON(). Contains all objects, layers, positions, styles.';
COMMENT ON COLUMN design_templates.variable_mappings IS 'Separate storage for variable markers. Structure: {"objectIndex": {"variableType": "name", "isReusable": false}}';
COMMENT ON COLUMN design_templates.format_type IS 'Physical mail format: postcard_4x6, postcard_6x9, letter_8.5x11, selfmailer_11x17, doorhanger_4x11';
COMMENT ON COLUMN design_templates.compliance_issues IS 'Array of validation issues: [{"type": "address_block_missing", "severity": "error", "message": "..."}]';
COMMENT ON COLUMN design_templates.background_image_url IS 'AI-generated background image (DALL-E). Reused for all recipients to save cost.';
COMMENT ON COLUMN design_templates.avg_response_rate IS 'Network effects: Average response rate across all campaigns. Feeds AI recommendations.';
-- Migration 004: Design Assets Table (Images, Logos, Fonts, Icons)
-- Stores all uploaded and AI-generated assets used in design templates
-- Integrated with Supabase Storage for file hosting

-- Create design_assets table
CREATE TABLE IF NOT EXISTS design_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),

  -- Asset Metadata
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL, -- logo, image, font, icon, svg, background
  mime_type TEXT NOT NULL, -- image/png, image/jpeg, image/svg+xml, font/woff2, etc.
  file_size_bytes INTEGER NOT NULL,
  storage_url TEXT NOT NULL, -- Supabase Storage path: 'design-assets/{org_id}/{asset_id}.png'

  -- Image Dimensions (for images/photos)
  width_px INTEGER,
  height_px INTEGER,
  dpi INTEGER, -- Dots per inch (300 recommended for print quality)
  aspect_ratio NUMERIC(10,4), -- width/height for quick filtering

  -- Categorization & Organization
  tags TEXT[] DEFAULT ARRAY[]::TEXT[], -- Searchable tags: ['company-logo', 'header', 'blue']
  folder TEXT DEFAULT 'uncategorized', -- Folder path for organization: 'logos', 'backgrounds/real-estate'
  is_brand_asset BOOLEAN DEFAULT false, -- True for company logo, brand colors, etc.

  -- AI Analysis (for searchability and auto-tagging)
  ai_description TEXT, -- Claude-generated description: "Modern blue minimalist logo with geometric shapes"
  ai_suggested_tags TEXT[], -- AI-suggested tags for better search
  dominant_colors TEXT[], -- Hex codes extracted from image: ['#3B82F6', '#8B5CF6']
  ai_category TEXT, -- AI-detected category: 'logo', 'photo', 'illustration', 'texture'

  -- Usage Tracking
  usage_count INTEGER DEFAULT 0, -- How many templates use this asset
  last_used_at TIMESTAMPTZ,

  -- Source & Attribution
  source_type TEXT DEFAULT 'upload', -- upload, ai_generated, stock, url_import
  source_url TEXT, -- Original URL if imported
  ai_generation_prompt TEXT, -- DALL-E prompt if AI-generated
  ai_generation_cost NUMERIC(10,4), -- Cost if AI-generated

  -- License & Rights
  license_type TEXT DEFAULT 'owned', -- owned, stock, creative_commons, royalty_free
  license_details JSONB,
  copyright_holder TEXT,

  -- Status
  status TEXT DEFAULT 'active', -- active, archived, deleted
  archived_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assets_org ON design_assets(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assets_uploader ON design_assets(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_assets_type ON design_assets(organization_id, asset_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assets_folder ON design_assets(organization_id, folder) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assets_brand ON design_assets(organization_id, is_brand_asset) WHERE is_brand_asset = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assets_tags ON design_assets USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_assets_ai_tags ON design_assets USING GIN (ai_suggested_tags);
CREATE INDEX IF NOT EXISTS idx_assets_dominant_colors ON design_assets USING GIN (dominant_colors);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_assets_search
  ON design_assets USING GIN (
    to_tsvector('english',
      name || ' ' ||
      COALESCE(ai_description, '') || ' ' ||
      COALESCE(array_to_string(tags, ' '), '')
    )
  );

-- Enable Row-Level Security
ALTER TABLE design_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their organization's assets
CREATE POLICY "Users can view their organization's assets"
  ON design_assets FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- RLS Policy: Users can upload assets to their organization
CREATE POLICY "Users can upload assets"
  ON design_assets FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- RLS Policy: Users can update their own assets
CREATE POLICY "Users can update own assets"
  ON design_assets FOR UPDATE
  USING (
    uploaded_by = auth.uid()
    AND organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    uploaded_by = auth.uid()
    AND organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- RLS Policy: Admins can update any asset in their org
CREATE POLICY "Admins can update organization assets"
  ON design_assets FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- RLS Policy: Users can delete their own assets
CREATE POLICY "Users can delete own assets"
  ON design_assets FOR DELETE
  USING (
    uploaded_by = auth.uid()
    AND organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_design_assets_updated_at
  BEFORE UPDATE ON design_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to increment asset usage count
CREATE OR REPLACE FUNCTION increment_asset_usage(asset_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE design_assets
  SET
    usage_count = usage_count + 1,
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE id = asset_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate storage usage for an organization
CREATE OR REPLACE FUNCTION get_organization_storage_usage(org_id UUID)
RETURNS BIGINT AS $$
DECLARE
  total_bytes BIGINT;
BEGIN
  SELECT COALESCE(SUM(file_size_bytes), 0)
  INTO total_bytes
  FROM design_assets
  WHERE organization_id = org_id
  AND deleted_at IS NULL;

  RETURN total_bytes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get storage usage in MB
CREATE OR REPLACE FUNCTION get_organization_storage_mb(org_id UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN ROUND(get_organization_storage_usage(org_id)::NUMERIC / 1024 / 1024, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if organization is within storage limit
CREATE OR REPLACE FUNCTION check_storage_limit(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_mb NUMERIC;
  limit_mb INTEGER;
BEGIN
  -- Get current usage
  current_mb := get_organization_storage_mb(org_id);

  -- Get limit from organization
  SELECT storage_limit_mb INTO limit_mb
  FROM organizations
  WHERE id = org_id;

  RETURN current_mb < limit_mb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE design_assets IS 'All uploaded and AI-generated assets (images, logos, fonts, icons) used in design templates. Integrated with Supabase Storage.';
COMMENT ON COLUMN design_assets.storage_url IS 'Supabase Storage path. Format: design-assets/{org_id}/{asset_id}.{ext}';
COMMENT ON COLUMN design_assets.dpi IS 'Dots per inch. 300 DPI recommended for print quality. 72 DPI for web.';
COMMENT ON COLUMN design_assets.ai_description IS 'Claude-generated description for better searchability and accessibility.';
COMMENT ON COLUMN design_assets.dominant_colors IS 'Array of hex color codes extracted from image. Used for color-based search and palette matching.';
COMMENT ON COLUMN design_assets.usage_count IS 'Number of templates using this asset. Helps identify popular assets and safe-to-delete candidates.';
COMMENT ON COLUMN design_assets.is_brand_asset IS 'Flag for company logo, brand colors, official fonts. These are protected and highlighted in asset library.';
