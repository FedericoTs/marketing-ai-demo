-- Idempotent migrations - Safe to run multiple times
-- This version uses IF NOT EXISTS and DROP POLICY IF EXISTS

-- Migration 001: Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan_tier TEXT NOT NULL DEFAULT 'free',
  billing_status TEXT NOT NULL DEFAULT 'active',
  trial_ends_at TIMESTAMPTZ,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  brand_logo_url TEXT,
  brand_primary_color TEXT DEFAULT '#3B82F6',
  brand_secondary_color TEXT DEFAULT '#8B5CF6',
  brand_accent_color TEXT DEFAULT '#F59E0B',
  brand_font_headline TEXT DEFAULT 'Inter',
  brand_font_body TEXT DEFAULT 'Inter',
  brand_voice_guidelines JSONB DEFAULT '{}'::jsonb,
  monthly_design_limit INTEGER DEFAULT 100,
  monthly_sends_limit INTEGER DEFAULT 1000,
  storage_limit_mb INTEGER DEFAULT 1000,
  credits NUMERIC(12,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_plan_tier ON organizations(plan_tier);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer ON organizations(stripe_customer_id);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Owners and admins can update their organization" ON organizations;

CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

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

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migration 002: User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  job_title TEXT,
  department TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  can_create_designs BOOLEAN DEFAULT true,
  can_send_campaigns BOOLEAN DEFAULT false,
  can_manage_billing BOOLEAN DEFAULT false,
  can_invite_users BOOLEAN DEFAULT false,
  can_approve_designs BOOLEAN DEFAULT false,
  can_manage_templates BOOLEAN DEFAULT true,
  can_access_analytics BOOLEAN DEFAULT true,
  ui_preferences JSONB DEFAULT '{}'::jsonb,
  notification_preferences JSONB DEFAULT '{
    "email_campaign_complete": true,
    "email_campaign_failed": true,
    "email_low_credits": true,
    "in_app_notifications": true
  }'::jsonb,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_org ON user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(organization_id, role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_active ON user_profiles(last_active_at DESC);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view profiles in their organization" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Owners and admins can update users in their organization" ON user_profiles;
DROP POLICY IF EXISTS "Owners can delete users in their organization" ON user_profiles;

CREATE POLICY "Users can view profiles in their organization"
  ON user_profiles FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

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

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Helper functions
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

-- Migration 003: Design Templates Table
CREATE TABLE IF NOT EXISTS design_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  canvas_json JSONB NOT NULL,
  canvas_width INTEGER NOT NULL,
  canvas_height INTEGER NOT NULL,
  variable_mappings JSONB DEFAULT '{}'::jsonb,
  format_type TEXT NOT NULL DEFAULT 'postcard_4x6',
  format_width_inches NUMERIC(5,3) NOT NULL DEFAULT 6.000,
  format_height_inches NUMERIC(5,3) NOT NULL DEFAULT 4.000,
  postal_country TEXT DEFAULT 'US',
  compliance_validated BOOLEAN DEFAULT false,
  compliance_issues JSONB DEFAULT '[]'::jsonb,
  last_compliance_check_at TIMESTAMPTZ,
  background_image_url TEXT,
  background_generation_prompt TEXT,
  background_cost NUMERIC(10,4) DEFAULT 0.0000,
  is_public BOOLEAN DEFAULT false,
  marketplace_category TEXT,
  marketplace_subcategory TEXT,
  marketplace_price NUMERIC(10,2) DEFAULT 0.00,
  marketplace_license_type TEXT DEFAULT 'single_use',
  marketplace_rating NUMERIC(3,2),
  marketplace_total_ratings INTEGER DEFAULT 0,
  marketplace_featured BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  total_campaigns_using INTEGER DEFAULT 0,
  avg_response_rate NUMERIC(5,2),
  avg_conversion_rate NUMERIC(5,2),
  total_recipients_reached INTEGER DEFAULT 0,
  parent_template_id UUID REFERENCES design_templates(id) ON DELETE SET NULL,
  version_number INTEGER DEFAULT 1,
  is_latest_version BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_templates_org ON design_templates(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_templates_creator ON design_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_templates_format ON design_templates(organization_id, format_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_templates_status ON design_templates(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_templates_tags ON design_templates USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_templates_marketplace ON design_templates(is_public, marketplace_category, marketplace_rating DESC) WHERE is_public = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_templates_marketplace_featured ON design_templates(marketplace_featured, marketplace_rating DESC) WHERE is_public = true AND marketplace_featured = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_templates_performance ON design_templates(avg_response_rate DESC NULLS LAST, avg_conversion_rate DESC NULLS LAST) WHERE deleted_at IS NULL;
-- Full-text search index removed (immutability constraint). Use application-level search.
CREATE INDEX IF NOT EXISTS idx_templates_canvas_json ON design_templates USING GIN (canvas_json);
CREATE INDEX IF NOT EXISTS idx_templates_variable_mappings ON design_templates USING GIN (variable_mappings);

ALTER TABLE design_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view accessible templates" ON design_templates;
DROP POLICY IF EXISTS "Designers can create templates" ON design_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON design_templates;
DROP POLICY IF EXISTS "Admins can update organization templates" ON design_templates;
DROP POLICY IF EXISTS "Owners can delete templates" ON design_templates;

CREATE POLICY "Users can view accessible templates"
  ON design_templates FOR SELECT
  USING (
    (
      organization_id IN (
        SELECT organization_id
        FROM user_profiles
        WHERE id = auth.uid()
      )
    )
    OR
    (
      is_public = true AND status = 'active' AND deleted_at IS NULL
    )
  );

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

DROP TRIGGER IF EXISTS update_design_templates_updated_at ON design_templates;
CREATE TRIGGER update_design_templates_updated_at
  BEFORE UPDATE ON design_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

-- Migration 004: Design Assets Table
CREATE TABLE IF NOT EXISTS design_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  storage_url TEXT NOT NULL,
  width_px INTEGER,
  height_px INTEGER,
  dpi INTEGER,
  aspect_ratio NUMERIC(10,4),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  folder TEXT DEFAULT 'uncategorized',
  is_brand_asset BOOLEAN DEFAULT false,
  ai_description TEXT,
  ai_suggested_tags TEXT[],
  dominant_colors TEXT[],
  ai_category TEXT,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  source_type TEXT DEFAULT 'upload',
  source_url TEXT,
  ai_generation_prompt TEXT,
  ai_generation_cost NUMERIC(10,4),
  license_type TEXT DEFAULT 'owned',
  license_details JSONB,
  copyright_holder TEXT,
  status TEXT DEFAULT 'active',
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_assets_org ON design_assets(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assets_uploader ON design_assets(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_assets_type ON design_assets(organization_id, asset_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assets_folder ON design_assets(organization_id, folder) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assets_brand ON design_assets(organization_id, is_brand_asset) WHERE is_brand_asset = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assets_tags ON design_assets USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_assets_ai_tags ON design_assets USING GIN (ai_suggested_tags);
CREATE INDEX IF NOT EXISTS idx_assets_dominant_colors ON design_assets USING GIN (dominant_colors);
-- Full-text search index removed (immutability constraint). Use application-level search.

ALTER TABLE design_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's assets" ON design_assets;
DROP POLICY IF EXISTS "Users can upload assets" ON design_assets;
DROP POLICY IF EXISTS "Users can update own assets" ON design_assets;
DROP POLICY IF EXISTS "Admins can update organization assets" ON design_assets;
DROP POLICY IF EXISTS "Users can delete own assets" ON design_assets;

CREATE POLICY "Users can view their organization's assets"
  ON design_assets FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can upload assets"
  ON design_assets FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

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

DROP TRIGGER IF EXISTS update_design_assets_updated_at ON design_assets;
CREATE TRIGGER update_design_assets_updated_at
  BEFORE UPDATE ON design_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

CREATE OR REPLACE FUNCTION get_organization_storage_mb(org_id UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN ROUND(get_organization_storage_usage(org_id)::NUMERIC / 1024 / 1024, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_storage_limit(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_mb NUMERIC;
  limit_mb INTEGER;
BEGIN
  current_mb := get_organization_storage_mb(org_id);
  SELECT storage_limit_mb INTO limit_mb
  FROM organizations
  WHERE id = org_id;
  RETURN current_mb < limit_mb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
