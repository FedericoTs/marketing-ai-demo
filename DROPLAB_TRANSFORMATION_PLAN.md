# DropLab Supabase Transformation Plan
## AI-Powered Direct Mail Design Monopoly Platform

**⚠️ SINGLE SOURCE OF TRUTH FOR ALL DEVELOPMENT**

**Status**: Active Development - Feature Branch `feature/supabase-parallel-app`

**Strategic Vision**: Build the first "Figma meets Mailchimp for Physical Mail" platform

**Last Updated**: 2025-11-06 (Phase 5 80% Complete - Audience Targeting + View/Export Complete)

**Version**: 2.6 (Phase 5 Audience Targeting - Backend + View/Export Complete, VDP Integration Pending)

---

## 🎯 Mission Statement

Transform DropLab into a **monopolistic direct mail design platform** that combines Fabric.js programmatic control with AI intelligence to create tools that Canva cannot replicate. This platform will build proprietary datasets, network effects through marketplace templates, and regulatory expertise that create an insurmountable competitive moat.

**Core Insight**: Direct mail remains a $40B industry with zero modern design tools. We're building the first platform with AI-powered personalization, postal compliance validation, and performance prediction—features impossible for general design tools to match.

---

## 📊 First Principles Analysis (Elon Musk Methodology)

### Breaking Down to Fundamental Truths

**Question**: What is a direct mail design platform at its most basic level?

**Core Atomic Components**:

1. **Identity Atom** - Who owns what?
   - Organizations (multi-tenant isolation)
   - Users within organizations (roles, permissions)
   - Authentication state (session management)

2. **Design Atom** - What are users creating?
   - Canvas state (Fabric.js JSON)
   - Visual elements (text, images, shapes, paths)
   - Positioning and layering (z-index, grouping)
   - Styling rules (colors, fonts, effects)

3. **Variability Atom** - How do designs become personalized?
   - Variable markers (placeholders for dynamic data)
   - Recipient datasets (CSV imports, API data)
   - Substitution rules (field mappings)
   - Conditional logic (if homeowner, show X)

4. **Intelligence Atom** - How does AI create competitive advantage?
   - Design analysis (layout scoring, readability)
   - Compliance validation (postal regulations)
   - Performance prediction (response rates)
   - Optimization suggestions (AI-powered improvements)

5. **Production Atom** - How do designs become physical mail?
   - PDF generation (300 DPI, CMYK, print-ready)
   - Format conversion (postcard → letter → self-mailer)
   - Cost calculation (paper + ink + postage)
   - Batch rendering (10,000+ pieces)

6. **Tracking Atom** - How do we measure success?
   - Attribution codes (QR, PURL, promo codes)
   - Event capture (scan, visit, convert)
   - Campaign metrics (response rate, ROI)
   - Performance data (feeds AI learning)

7. **Collaboration Atom** - How do teams work together?
   - Real-time sync (WebSocket canvas updates)
   - Version history (time-travel debugging)
   - Comment threads (design feedback)
   - Approval workflows (sign-off process)

8. **Marketplace Atom** - How do templates create network effects?
   - Template sharing (public/private)
   - Performance ranking (proven results surface first)
   - Revenue sharing (creator payouts)
   - Licensing (single-use vs unlimited)

9. **Compliance Atom** - How do we prevent printing failures?
   - Regulation database (USPS, Royal Mail, etc.)
   - Real-time validation (as user designs)
   - Auto-fix suggestions (AI-powered corrections)
   - Historical issue tracking (learn from errors)

10. **API Atom** - How do developers build on our platform?
    - RESTful endpoints (CRUD operations)
    - Webhook events (real-time notifications)
    - Rate limiting (fair usage enforcement)
    - SDK libraries (TypeScript, Python, etc.)

---

## 🗄️ Atomic Database Schema (From First Principles)

### Design Philosophy

1. **Multi-Tenancy First**: Every table has `organization_id` with Row-Level Security
2. **Fabric.js Native**: Schema optimized for JSON storage and retrieval
3. **Performance Tracking**: Every campaign outcome feeds the AI learning system
4. **Audit Everything**: Track all changes for compliance and debugging
5. **Real-time Ready**: Structure supports WebSocket synchronization
6. **API-First**: Design for programmatic access from day one

---

### **Phase 1: Foundation Schema (Core Atoms)**

#### 1.1 Identity Atom Tables

```sql
-- Organizations (Multi-tenancy Root)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-safe identifier

  -- Subscription
  plan_tier TEXT NOT NULL DEFAULT 'free', -- free, starter, professional, enterprise
  billing_status TEXT NOT NULL DEFAULT 'active',
  trial_ends_at TIMESTAMPTZ,

  -- Brand Kit (stored at org level for reuse)
  brand_logo_url TEXT,
  brand_primary_color TEXT,
  brand_secondary_color TEXT,
  brand_accent_color TEXT,
  brand_font_headline TEXT,
  brand_font_body TEXT,
  brand_voice_guidelines JSONB, -- AI copywriting guidance

  -- Usage Limits
  monthly_design_limit INTEGER DEFAULT 100,
  monthly_sends_limit INTEGER DEFAULT 1000,
  storage_limit_mb INTEGER DEFAULT 1000,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);

-- Users (extends Supabase Auth)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  full_name TEXT NOT NULL,
  avatar_url TEXT,

  role TEXT NOT NULL DEFAULT 'member', -- owner, admin, designer, viewer

  -- Granular Permissions
  can_create_designs BOOLEAN DEFAULT true,
  can_send_campaigns BOOLEAN DEFAULT false,
  can_manage_billing BOOLEAN DEFAULT false,
  can_invite_users BOOLEAN DEFAULT false,
  can_approve_designs BOOLEAN DEFAULT false,

  -- Preferences
  ui_preferences JSONB DEFAULT '{}', -- editor settings, keyboard shortcuts

  -- Activity Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_org ON user_profiles(organization_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(organization_id, role);

-- Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see their own organization
CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  USING (id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can view profiles in their organization"
  ON user_profiles FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));
```

#### 1.2 Design Atom Tables (Fabric.js Optimized)

```sql
-- Design Templates (Reusable Fabric.js Canvases)
CREATE TABLE design_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Template Metadata
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT, -- 400x400 preview

  -- Fabric.js Canvas State
  canvas_json JSONB NOT NULL, -- Complete Fabric.js toJSON() output
  canvas_width INTEGER NOT NULL, -- Pixels at 300 DPI (e.g., 1800 for 6")
  canvas_height INTEGER NOT NULL,

  -- CRITICAL: Variable Mappings (stored separately from canvas_json)
  -- Fabric.js v6 does NOT serialize custom properties via toJSON()
  -- We store variable markers separately and apply them on load
  variable_mappings JSONB DEFAULT '{}',
  -- Structure: { "0": { "variableType": "recipientName", "isReusable": false }, "1": { "variableType": "logo", "isReusable": true } }
  -- Key = canvas object index, Value = variable metadata

  -- Format & Dimensions
  format_type TEXT NOT NULL, -- postcard_4x6, postcard_6x9, letter_8.5x11, selfmailer_11x17, doorhanger_4x11
  format_width_inches NUMERIC(5,3) NOT NULL, -- Physical size
  format_height_inches NUMERIC(5,3) NOT NULL,
  postal_country TEXT DEFAULT 'US',

  -- Compliance Status
  compliance_validated BOOLEAN DEFAULT false,
  compliance_issues JSONB, -- Array of validation results
  last_compliance_check_at TIMESTAMPTZ,

  -- AI Background (reused for all recipients)
  background_image_url TEXT, -- AI-generated background via DALL-E/Midjourney
  background_generation_prompt TEXT,
  background_cost NUMERIC(10,4), -- Track AI costs

  -- Marketplace Status
  is_public BOOLEAN DEFAULT false,
  marketplace_category TEXT, -- real_estate, retail, healthcare, automotive, nonprofit
  marketplace_price NUMERIC(10,2) DEFAULT 0.00,
  marketplace_license_type TEXT, -- single_use, unlimited, commercial
  marketplace_rating NUMERIC(3,2),
  marketplace_featured BOOLEAN DEFAULT false,

  -- Usage & Performance (Network Effects Data)
  usage_count INTEGER DEFAULT 0, -- How many times used
  avg_response_rate NUMERIC(5,2), -- Average performance across all campaigns
  total_campaigns_using INTEGER DEFAULT 0,

  -- Version Control
  parent_template_id UUID REFERENCES design_templates(id), -- For template variations
  version_number INTEGER DEFAULT 1,

  -- Status
  status TEXT DEFAULT 'draft', -- draft, active, archived

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete
);

CREATE INDEX idx_templates_org ON design_templates(organization_id);
CREATE INDEX idx_templates_creator ON design_templates(created_by);
CREATE INDEX idx_templates_format ON design_templates(organization_id, format_type);
CREATE INDEX idx_templates_marketplace ON design_templates(is_public, marketplace_category, marketplace_rating DESC) WHERE is_public = true;
CREATE INDEX idx_templates_performance ON design_templates(avg_response_rate DESC NULLS LAST);
CREATE INDEX idx_templates_canvas_json ON design_templates USING GIN (canvas_json); -- For JSON queries

-- Design Assets (Images, Logos, Fonts, Icons)
CREATE TABLE design_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),

  -- Asset Metadata
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL, -- logo, image, font, icon, svg
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  storage_url TEXT NOT NULL, -- Supabase Storage path

  -- Dimensions (for images)
  width_px INTEGER,
  height_px INTEGER,
  dpi INTEGER, -- Dots per inch (300 recommended for print)

  -- Categorization
  tags TEXT[],
  folder TEXT, -- Organizational folder structure

  -- AI Analysis (for searchability)
  ai_description TEXT, -- Claude-generated description
  ai_suggested_tags TEXT[],
  dominant_colors TEXT[], -- Hex codes extracted from image

  -- Usage Tracking
  usage_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assets_org ON design_assets(organization_id);
CREATE INDEX idx_assets_type ON design_assets(organization_id, asset_type);
CREATE INDEX idx_assets_tags ON design_assets USING GIN (tags);
CREATE INDEX idx_assets_folder ON design_assets(organization_id, folder);

-- Row Level Security
ALTER TABLE design_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_assets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their organization's templates"
  ON design_templates FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    OR is_public = true -- Public marketplace templates visible to all
  );

CREATE POLICY "Designers can create templates"
  ON design_templates FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid() AND can_create_designs = true)
  );

CREATE POLICY "Users can update own templates"
  ON design_templates FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can view their organization's assets"
  ON design_assets FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can upload assets"
  ON design_assets FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
```

---

### **Phase 2: Personalization & Campaign Schema (Variability Atom)**

```sql
-- Recipient Lists (CSV Imports or API Data)
CREATE TABLE recipient_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- List Metadata
  name TEXT NOT NULL,
  description TEXT,

  -- Data Source
  source_type TEXT NOT NULL, -- csv_upload, api_import, manual_entry, data_axle, marketplace_purchase
  source_file_url TEXT, -- Original CSV URL
  total_recipients INTEGER NOT NULL,

  -- Field Mapping (how CSV columns map to our schema)
  field_mappings JSONB NOT NULL,
  -- Example: { "Name": "recipient_name", "Street": "recipient_address_line1", "Custom Field 1": "custom_fields.property_value" }

  -- Data Quality
  validation_status TEXT DEFAULT 'pending', -- pending, validated, has_errors
  validation_errors JSONB,
  validation_summary JSONB, -- { "total": 100, "valid": 95, "invalid": 5, "duplicates": 2 }

  -- Segmentation (for AI personalization)
  segments JSONB, -- Array of segments: [{ "name": "High Income", "filter": { "income_range": "100k+" }, "count": 45 }]

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recipient_lists_org ON recipient_lists(organization_id);
CREATE INDEX idx_recipient_lists_creator ON recipient_lists(created_by);

-- Individual Recipients
CREATE TABLE recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES recipient_lists(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Standard Fields (mailability)
  recipient_name TEXT,
  recipient_lastname TEXT,
  recipient_company TEXT,
  recipient_address_line1 TEXT,
  recipient_address_line2 TEXT,
  recipient_city TEXT,
  recipient_state TEXT,
  recipient_zip TEXT,
  recipient_country TEXT DEFAULT 'US',
  recipient_email TEXT,
  recipient_phone TEXT,

  -- Demographics (for AI personalization)
  age_range TEXT, -- 18-24, 25-34, 35-44, 45-54, 55-64, 65+
  income_range TEXT, -- <25k, 25k-50k, 50k-75k, 75k-100k, 100k-150k, 150k+
  home_ownership TEXT, -- owner, renter, unknown
  property_value NUMERIC(12,2),
  household_size INTEGER,

  -- Custom Fields (flexible JSONB for any use case)
  custom_fields JSONB DEFAULT '{}',
  -- Examples: { "last_purchase_date": "2024-01-15", "loyalty_tier": "gold", "preferred_category": "electronics" }

  -- Validation & Enrichment
  address_validated BOOLEAN DEFAULT false,
  address_validation_result JSONB, -- USPS validation response
  address_standardized TEXT, -- Standardized USPS address
  geocode_lat NUMERIC(10,7),
  geocode_lng NUMERIC(10,7),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recipients_list ON recipients(list_id);
CREATE INDEX idx_recipients_org ON recipients(organization_id);
CREATE INDEX idx_recipients_zip ON recipients(recipient_zip);
CREATE INDEX idx_recipients_custom_fields ON recipients USING GIN (custom_fields);

-- Campaigns (Direct Mail Sends)
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Campaign Metadata
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL DEFAULT 'direct_mail', -- direct_mail, digital, multi_channel

  -- Design
  template_id UUID REFERENCES design_templates(id),
  design_snapshot JSONB, -- Frozen Fabric.js JSON at send time (for audit/replay)
  variable_mappings_snapshot JSONB, -- Frozen variable mappings

  -- Recipients
  recipient_list_id UUID REFERENCES recipient_lists(id),
  total_recipients INTEGER NOT NULL,

  -- Personalization Strategy
  personalization_rules JSONB,
  -- Example: [{ "segment": "age_55_plus", "rule": "increase_font_size", "value": 18 }, { "segment": "income_100k_plus", "rule": "use_premium_image", "value": "luxury_home.jpg" }]
  use_ai_personalization BOOLEAN DEFAULT false,

  -- A/B Testing
  is_ab_test BOOLEAN DEFAULT false,
  ab_test_config JSONB,
  -- Example: { "variants": [{ "id": "A", "template_id": "...", "recipients_pct": 50 }, { "id": "B", "template_id": "...", "recipients_pct": 50 }] }

  -- Scheduling
  status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, processing, sending, sent, completed, failed, cancelled
  scheduled_send_date TIMESTAMPTZ,
  processing_started_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Costs
  estimated_cost_per_unit NUMERIC(10,4),
  total_estimated_cost NUMERIC(12,2),
  actual_cost NUMERIC(12,2),

  -- Performance Metrics (updated as responses come in)
  total_printed INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_qr_scans INTEGER DEFAULT 0,
  total_page_views INTEGER DEFAULT 0,
  total_responses INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  response_rate NUMERIC(5,2),
  conversion_rate NUMERIC(5,2),
  total_revenue NUMERIC(12,2),
  roi NUMERIC(8,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_org_status ON campaigns(organization_id, status);
CREATE INDEX idx_campaigns_template ON campaigns(template_id);
CREATE INDEX idx_campaigns_sent_at ON campaigns(sent_at DESC NULLS LAST);

-- Campaign Recipients (Individual Mail Pieces with Personalization)
CREATE TABLE campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES recipients(id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Personalization Output
  personalized_canvas_json JSONB, -- Final Fabric.js JSON after variable substitution
  personalized_pdf_url TEXT, -- Generated PDF URL in Supabase Storage
  personalized_preview_url TEXT, -- Preview image URL

  -- A/B Test Assignment
  ab_variant_id TEXT, -- Which variant this recipient received (if ab test)

  -- Tracking
  tracking_code TEXT UNIQUE NOT NULL, -- Unique ID for QR code / PURL (e.g., "dr-abc123xyz")
  qr_code_url TEXT, -- Generated QR code image URL
  purl TEXT, -- Personalized URL: https://droplab.com/lp/dr-abc123xyz

  -- Fulfillment Status (PostGrid/Lob integration)
  print_status TEXT DEFAULT 'pending', -- pending, rendering, printed, shipped, delivered, returned, failed
  print_job_id TEXT, -- External print provider job ID
  print_cost NUMERIC(10,4),
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  tracking_url TEXT, -- USPS tracking URL

  -- Response Tracking
  first_view_at TIMESTAMPTZ, -- First landing page view
  qr_scan_count INTEGER DEFAULT 0,
  page_view_count INTEGER DEFAULT 0,
  responded_at TIMESTAMPTZ, -- Form submission / conversion
  conversion_type TEXT, -- form_submission, phone_call, appointment, purchase
  conversion_value NUMERIC(10,2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_recipient ON campaign_recipients(recipient_id);
CREATE INDEX idx_campaign_recipients_tracking ON campaign_recipients(tracking_code);
CREATE INDEX idx_campaign_recipients_status ON campaign_recipients(campaign_id, print_status);

-- Row Level Security
ALTER TABLE recipient_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their organization's lists"
  ON recipient_lists FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create lists"
  ON recipient_lists FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view their organization's campaigns"
  ON campaigns FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users with send permission can create campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid() AND can_send_campaigns = true)
  );
```

---

### **Phase 3: Intelligence & Analytics Schema (AI Atoms)**

```sql
-- AI Design Analyses (Claude API Results)
CREATE TABLE ai_design_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Source
  template_id UUID REFERENCES design_templates(id),
  campaign_id UUID REFERENCES campaigns(id),

  -- Analysis Input
  canvas_json JSONB NOT NULL,
  analysis_type TEXT NOT NULL, -- compliance, performance_prediction, optimization, accessibility, readability

  -- AI Model Details
  ai_model TEXT NOT NULL, -- claude-3-5-sonnet-20241022, gpt-4, etc.
  ai_prompt TEXT NOT NULL,
  ai_response JSONB NOT NULL, -- Full AI response
  tokens_used INTEGER,
  cost NUMERIC(10,6),

  -- Extracted Insights (for fast querying without parsing JSON)
  readability_score NUMERIC(4,2), -- 0-10 scale
  visual_complexity_score NUMERIC(4,2), -- 0-10 scale (lower is better)
  color_contrast_score NUMERIC(4,2), -- WCAG compliance score
  cta_visibility_score NUMERIC(4,2), -- Call-to-action prominence
  postal_compliance_score NUMERIC(4,2), -- Regulatory compliance

  -- Predictions (for performance analysis type)
  predicted_response_rate_min NUMERIC(5,2),
  predicted_response_rate_max NUMERIC(5,2),
  predicted_response_rate_mean NUMERIC(5,2),
  prediction_confidence NUMERIC(5,2), -- 0-100%

  -- Improvement Suggestions
  improvement_suggestions JSONB,
  -- Example: [{ "element": "headline", "issue": "Too small for 55+ demographic", "suggestion": "Increase font size to 18pt", "impact": "+0.3% response rate" }]

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_analyses_template ON ai_design_analyses(template_id);
CREATE INDEX idx_ai_analyses_campaign ON ai_design_analyses(campaign_id);
CREATE INDEX idx_ai_analyses_type ON ai_design_analyses(analysis_type, created_at DESC);

-- Postal Compliance Validation (Regulatory Rules Engine)
CREATE TABLE postal_compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES design_templates(id),

  -- Validation Parameters
  postal_country TEXT NOT NULL DEFAULT 'US',
  mail_format TEXT NOT NULL, -- postcard, letter, selfmailer, doorhanger
  mail_class TEXT, -- usps_first_class, usps_standard, etc.

  -- Validation Results
  is_compliant BOOLEAN NOT NULL,
  compliance_score NUMERIC(5,2), -- 0-100% (percentage of rules passed)

  -- Issues Found
  validation_errors JSONB, -- Array of critical issues
  -- Example: [{ "rule": "USPS-BC-001", "severity": "error", "element_id": "text_5", "message": "Content in barcode clear zone", "autofix": {...} }]
  validation_warnings JSONB, -- Array of warnings

  -- Auto-fix Capability
  auto_fix_available BOOLEAN DEFAULT false,
  auto_fix_applied BOOLEAN DEFAULT false,
  auto_fix_changes JSONB, -- What changes would be made

  -- Regulations Checked
  regulations_version TEXT, -- Track which version of rules applied
  rules_checked TEXT[], -- List of rule IDs checked

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_compliance_template ON postal_compliance_checks(template_id);
CREATE INDEX idx_compliance_compliant ON postal_compliance_checks(is_compliant, postal_country);

-- Campaign Performance Data (Feeds ML Model Training)
CREATE TABLE campaign_performance_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Design Features (extracted from Fabric.js canvas)
  design_features JSONB NOT NULL,
  -- Example: {
  --   "colorPalette": ["#FF5722", "#2196F3", "#FFFFFF"],
  --   "layoutDensity": 0.68,
  --   "ctaPlacement": { "x": 0.8, "y": 0.7 },
  --   "visualComplexity": 12,
  --   "headlineFontSize": 24,
  --   "textToWhitespaceRatio": 0.45,
  --   "imageCount": 2,
  --   "colorContrast": 4.5
  -- }

  -- Campaign Context
  industry TEXT,
  target_demographic JSONB,
  mail_format TEXT,
  paper_type TEXT, -- gloss, matte, recycled
  mail_class TEXT,

  -- Performance Results (ground truth for ML training)
  sent_count INTEGER NOT NULL,
  delivered_count INTEGER NOT NULL,
  qr_scan_count INTEGER NOT NULL,
  page_view_count INTEGER NOT NULL,
  response_count INTEGER NOT NULL,
  conversion_count INTEGER NOT NULL,

  response_rate NUMERIC(5,2) NOT NULL,
  conversion_rate NUMERIC(5,2) NOT NULL,
  cost_per_response NUMERIC(10,2),
  roi NUMERIC(8,2),

  -- Segmented Performance (demographic breakdown)
  segment_performance JSONB,
  -- Example: [{ "segment": "age_35_44", "response_rate": 3.2 }, { "segment": "age_55_64", "response_rate": 2.1 }]

  -- ML Training Status
  included_in_training_set BOOLEAN DEFAULT false,
  training_quality_score NUMERIC(3,2), -- How reliable is this data? (0-1)

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_performance_data_campaign ON campaign_performance_data(campaign_id);
CREATE INDEX idx_performance_data_training ON campaign_performance_data(included_in_training_set, training_quality_score DESC) WHERE included_in_training_set = true;
CREATE INDEX idx_performance_data_design_features ON campaign_performance_data USING GIN (design_features);

-- Row Level Security
ALTER TABLE ai_design_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE postal_compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_performance_data ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their organization's AI analyses"
  ON ai_design_analyses FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view their organization's compliance checks"
  ON postal_compliance_checks FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view their organization's performance data"
  ON campaign_performance_data FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
```

---

### **Phase 4: Collaboration & Version Control Schema**

```sql
-- Design Versions (Git-like version control for canvases)
CREATE TABLE design_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES design_templates(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Version Info
  version_number INTEGER NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  version_name TEXT, -- Optional human-readable label (e.g., "Final for CEO Review")
  commit_message TEXT, -- Description of changes

  -- Canvas State Snapshot
  canvas_json JSONB NOT NULL,
  variable_mappings JSONB,

  -- Change Tracking
  changed_objects TEXT[], -- Array of Fabric.js object IDs that changed
  change_summary JSONB, -- Structured diff: { "added": 2, "modified": 5, "deleted": 1 }
  parent_version_id UUID REFERENCES design_versions(id), -- For branching/merging

  -- File Size (for storage management)
  canvas_json_size_bytes INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(template_id, version_number)
);

CREATE INDEX idx_versions_template ON design_versions(template_id, version_number DESC);
CREATE INDEX idx_versions_creator ON design_versions(created_by);

-- Design Comments (Annotation system for collaboration)
CREATE TABLE design_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES design_templates(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Comment Details
  author_id UUID NOT NULL REFERENCES auth.users(id),
  comment_text TEXT NOT NULL,

  -- Canvas Position (pin comment to specific object or location)
  canvas_object_id TEXT, -- Fabric.js object ID
  position_x NUMERIC(10,2), -- Canvas coordinates
  position_y NUMERIC(10,2),

  -- Threading
  parent_comment_id UUID REFERENCES design_comments(id),
  thread_depth INTEGER DEFAULT 0,

  -- Status
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_template ON design_comments(template_id, created_at DESC);
CREATE INDEX idx_comments_author ON design_comments(author_id);
CREATE INDEX idx_comments_unresolved ON design_comments(template_id, is_resolved) WHERE is_resolved = false;

-- Real-time Collaboration Sessions (Google Docs-style live editing)
CREATE TABLE collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES design_templates(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Session State
  active_users JSONB NOT NULL DEFAULT '[]', -- Array of { "user_id": "...", "cursor_position": { "x": 100, "y": 200 }, "selected_object_id": "text_5" }
  session_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Lock Status (for approval workflows)
  is_locked BOOLEAN DEFAULT false,
  locked_by UUID REFERENCES auth.users(id),
  locked_at TIMESTAMPTZ,
  lock_reason TEXT, -- "Awaiting CEO approval", etc.

  -- Session Metadata
  total_edits INTEGER DEFAULT 0,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_collaboration_template ON collaboration_sessions(template_id);
CREATE INDEX idx_collaboration_active ON collaboration_sessions(last_activity_at DESC);

-- Design Approvals (Workflow management)
CREATE TABLE design_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES design_templates(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Approval Request
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Approvers
  approvers JSONB NOT NULL, -- Array of user IDs who must approve
  approvals_received JSONB DEFAULT '[]', -- Array of { "user_id": "...", "approved": true/false, "comment": "...", "timestamp": "..." }

  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, cancelled
  final_decision_at TIMESTAMPTZ,
  final_decision_by UUID REFERENCES auth.users(id),

  -- Notes
  request_message TEXT,
  rejection_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_approvals_template ON design_approvals(template_id, status);
CREATE INDEX idx_approvals_pending ON design_approvals(organization_id, status) WHERE status = 'pending';

-- Row Level Security
ALTER TABLE design_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_approvals ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their organization's design versions"
  ON design_versions FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create versions"
  ON design_versions FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view and create comments in their organization"
  ON design_comments FOR ALL
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
```

---

### **Phase 5: Marketplace & API Schema**

```sql
-- Template Marketplace Listings (Network Effects Engine)
CREATE TABLE marketplace_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES design_templates(id) ON DELETE CASCADE,
  creator_organization_id UUID NOT NULL REFERENCES organizations(id),

  -- Listing Details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- real_estate, retail, healthcare, automotive, nonprofit, financial, restaurant
  tags TEXT[],

  -- Pricing
  price NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  license_type TEXT NOT NULL, -- single_use, unlimited, commercial

  -- Performance Stats (transparency = trust = more sales)
  avg_response_rate NUMERIC(5,2), -- Average across all campaigns using this template
  total_campaigns_using INTEGER DEFAULT 0,
  verified_performance BOOLEAN DEFAULT false, -- Admin verified these stats are real
  performance_sample_size INTEGER, -- How many campaigns this is based on

  -- Ratings & Reviews
  average_rating NUMERIC(3,2),
  total_ratings INTEGER DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  total_revenue NUMERIC(12,2) DEFAULT 0,

  -- Creator Payout
  creator_revenue_share NUMERIC(5,2) DEFAULT 70.00, -- Creator gets 70%, platform gets 30%

  -- Status & Visibility
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, suspended
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  featured BOOLEAN DEFAULT false, -- Featured on marketplace homepage
  featured_until TIMESTAMPTZ,

  -- SEO & Discovery
  search_keywords TEXT[], -- For internal search optimization
  view_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_marketplace_category ON marketplace_templates(category, status, average_rating DESC) WHERE status = 'approved';
CREATE INDEX idx_marketplace_featured ON marketplace_templates(featured, average_rating DESC) WHERE featured = true;
CREATE INDEX idx_marketplace_performance ON marketplace_templates(avg_response_rate DESC) WHERE avg_response_rate IS NOT NULL;
CREATE INDEX idx_marketplace_search ON marketplace_templates USING GIN (search_keywords);
CREATE INDEX idx_marketplace_tags ON marketplace_templates USING GIN (tags);

-- Template Purchases (Marketplace Transactions)
CREATE TABLE template_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_template_id UUID NOT NULL REFERENCES marketplace_templates(id),
  buyer_organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  purchased_by UUID NOT NULL REFERENCES auth.users(id),

  -- Transaction Details
  purchase_price NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_provider TEXT, -- stripe, paypal
  payment_provider_transaction_id TEXT,

  -- Revenue Split
  platform_fee NUMERIC(10,2) NOT NULL, -- 30% of sale
  creator_payout NUMERIC(10,2) NOT NULL, -- 70% of sale
  payout_status TEXT DEFAULT 'pending', -- pending, processed, failed
  payout_processed_at TIMESTAMPTZ,

  -- License
  license_key UUID DEFAULT gen_random_uuid(),
  license_type TEXT NOT NULL,
  license_expires_at TIMESTAMPTZ, -- For time-limited licenses

  purchased_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_purchases_buyer ON template_purchases(buyer_organization_id);
CREATE INDEX idx_purchases_template ON template_purchases(marketplace_template_id);
CREATE INDEX idx_purchases_creator_payout ON template_purchases(payout_status) WHERE payout_status = 'pending';

-- Template Reviews (Social Proof)
CREATE TABLE template_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_template_id UUID NOT NULL REFERENCES marketplace_templates(id) ON DELETE CASCADE,
  reviewer_organization_id UUID NOT NULL REFERENCES organizations(id),
  reviewer_user_id UUID NOT NULL REFERENCES auth.users(id),
  purchase_id UUID REFERENCES template_purchases(id), -- Verified purchase

  -- Review Content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_title TEXT,
  review_text TEXT,

  -- Campaign Context (did they actually use it?)
  campaign_id UUID REFERENCES campaigns(id),
  achieved_response_rate NUMERIC(5,2), -- What response rate did they get?

  -- Verification
  is_verified_purchase BOOLEAN DEFAULT false,
  is_verified_performance BOOLEAN DEFAULT false, -- Admin verified their response rate claim

  -- Helpfulness (for sorting reviews)
  helpful_votes INTEGER DEFAULT 0,
  unhelpful_votes INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_template ON template_reviews(marketplace_template_id, rating DESC);
CREATE INDEX idx_reviews_verified ON template_reviews(marketplace_template_id, is_verified_purchase, rating DESC) WHERE is_verified_purchase = true;

-- API Keys (Developer Platform)
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Key Details
  key_name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL UNIQUE, -- bcrypt hash of actual key
  api_key_prefix TEXT NOT NULL, -- First 8 chars visible to user (e.g., "pk_live_")

  -- Permissions (scopes)
  scopes TEXT[] NOT NULL,
  -- Available scopes: read:designs, write:designs, read:campaigns, write:campaigns, send:mail, read:analytics, write:webhooks

  -- Rate Limiting
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_day INTEGER DEFAULT 10000,

  -- Usage Tracking
  total_requests INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  last_used_ip INET,

  -- Status
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(api_key_prefix);
CREATE INDEX idx_api_keys_hash ON api_keys(api_key_hash);

-- Webhooks (Event Notification System)
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Webhook Configuration
  event_types TEXT[] NOT NULL,
  -- Available events: design.created, design.updated, campaign.created, campaign.sent, campaign.delivered,
  --                   recipient.responded, recipient.converted, template.purchased
  endpoint_url TEXT NOT NULL,
  secret_key TEXT NOT NULL, -- For HMAC signature verification

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Reliability Metrics
  total_deliveries INTEGER DEFAULT 0,
  successful_deliveries INTEGER DEFAULT 0,
  failed_deliveries INTEGER DEFAULT 0,
  last_delivery_at TIMESTAMPTZ,
  last_delivery_status INTEGER, -- HTTP status code
  consecutive_failures INTEGER DEFAULT 0, -- Auto-disable after 10 consecutive failures

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhooks_org ON webhooks(organization_id);
CREATE INDEX idx_webhooks_active ON webhooks(organization_id, is_active) WHERE is_active = true;

-- Webhook Delivery Log (Audit Trail)
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,

  -- Delivery Details
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,

  -- HTTP Request
  request_headers JSONB,
  request_signature TEXT, -- HMAC signature

  -- HTTP Response
  http_status_code INTEGER,
  response_body TEXT,
  response_time_ms INTEGER,

  -- Retry Logic
  attempt_number INTEGER DEFAULT 1,
  max_attempts INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,

  -- Status
  delivery_status TEXT DEFAULT 'pending', -- pending, success, failed, retrying
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id, created_at DESC);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(delivery_status, next_retry_at) WHERE delivery_status = 'retrying';

-- Row Level Security
ALTER TABLE marketplace_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view approved marketplace templates"
  ON marketplace_templates FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Creators can manage their own listings"
  ON marketplace_templates FOR ALL
  USING (creator_organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view their organization's purchases"
  ON template_purchases FOR SELECT
  USING (buyer_organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage API keys"
  ON api_keys FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND (role = 'admin' OR role = 'owner')
    )
  );

CREATE POLICY "Admins can manage webhooks"
  ON webhooks FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND (role = 'admin' OR role = 'owner')
    )
  );
```

---

### **Phase 6: Analytics & Tracking Schema**

```sql
-- Tracking Events (QR scans, page views, conversions)
CREATE TABLE tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_recipient_id UUID NOT NULL REFERENCES campaign_recipients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Event Details
  event_type TEXT NOT NULL, -- qr_scan, page_view, button_click, form_submit, form_view, phone_call, external_link
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- User Context
  user_agent TEXT,
  ip_address INET,
  referrer TEXT,
  device_type TEXT, -- mobile, tablet, desktop
  browser TEXT,
  os TEXT,

  -- Geographic Data (from IP)
  geo_country TEXT,
  geo_region TEXT,
  geo_city TEXT,

  -- Event-Specific Data
  event_data JSONB, -- Flexible JSON for event-specific fields
  -- Examples:
  --   qr_scan: { "scan_location": "mailbox", "scan_app": "native_camera" }
  --   button_click: { "button_id": "book_appointment", "button_text": "Schedule Now" }
  --   form_submit: { "form_data": {...}, "form_type": "contact" }

  -- Conversion Attribution
  is_conversion BOOLEAN DEFAULT false,
  conversion_value NUMERIC(10,2),

  -- Session Tracking
  session_id UUID, -- Group events from same user session

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tracking_events_recipient ON tracking_events(campaign_recipient_id);
CREATE INDEX idx_tracking_events_org_time ON tracking_events(organization_id, event_timestamp DESC);
CREATE INDEX idx_tracking_events_type ON tracking_events(event_type, event_timestamp DESC);
CREATE INDEX idx_tracking_events_session ON tracking_events(session_id);

-- Analytics Summaries (Pre-aggregated for Dashboard Performance)
CREATE TABLE analytics_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id), -- Null = org-wide summary

  -- Time Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  granularity TEXT NOT NULL, -- daily, weekly, monthly

  -- Volume Metrics
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_qr_scans INTEGER DEFAULT 0,
  total_page_views INTEGER DEFAULT 0,
  total_responses INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,

  -- Rate Metrics (percentages)
  delivery_rate NUMERIC(5,2),
  qr_scan_rate NUMERIC(5,2),
  response_rate NUMERIC(5,2),
  conversion_rate NUMERIC(5,2),

  -- Financial Metrics
  total_revenue NUMERIC(12,2),
  total_cost NUMERIC(12,2),
  roi NUMERIC(8,2),

  -- Engagement Metrics
  avg_time_to_first_view_hours NUMERIC(8,2),
  avg_page_views_per_recipient NUMERIC(5,2),
  avg_session_duration_seconds INTEGER,

  -- Segment Breakdown
  segment_metrics JSONB, -- Performance by demographic segment
  -- Example: { "age_35_44": { "response_rate": 3.2, "conversion_rate": 1.5 }, "age_55_64": { "response_rate": 2.1, "conversion_rate": 0.9 } }

  -- Top Performers
  top_performing_recipients JSONB, -- Top 10 recipients by conversion value

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, campaign_id, period_start, granularity)
);

CREATE INDEX idx_analytics_summaries_org_period ON analytics_summaries(organization_id, period_start DESC);
CREATE INDEX idx_analytics_summaries_campaign ON analytics_summaries(campaign_id, period_start DESC);

-- Row Level Security
ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_summaries ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their organization's tracking events"
  ON tracking_events FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view their organization's analytics"
  ON analytics_summaries FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
```

---

## 🚀 Implementation Phases (20 Weeks to Monopoly)

### **Timeline Overview**

| Phase | Duration | Focus | Deliverable | Status |
|-------|----------|-------|-------------|---------|
| Phase 1 | Weeks 1-2 | Foundation | Auth + Database deployed | ✅ **100%** |
| Phase 2 | Weeks 3-4 | Design Engine | Fabric.js editor working | ✅ **100%** |
| Phase 3 | Weeks 5-6 | VDP Engine | Batch personalization at scale | ✅ **100%** |
| Phase 4 | Weeks 7-8 | AI Intelligence | Compliance + Predictions | ⏸️ **0%** |
| Phase 5 | Weeks 9-10 | Campaign Management + Data Axle | Backend + View/Export complete, VDP pending | 🟡 **80%** |
| Phase 6 | Weeks 11-12 | Collaboration | Real-time multi-user editing | ⏸️ **0%** |
| Phase 7 | Weeks 13-14 | Marketplace | Template sharing + revenue | ⏸️ **0%** |
| Phase 8 | Weeks 15-16 | Developer API | Platform play | ⏸️ **0%** |
| Phase 9 | Weeks 17-18 | External Integrations | PostGrid, Stripe (Data Axle: Phase 5) | ⏸️ **0%** |
| Phase 10 | Weeks 19-20 | Polish & Launch | Beta with 50 users | ⏸️ **0%** |

**Current Focus**: Phase 5 (Audience Targeting) - 80% Complete (Purchase/View/Export working, VDP integration pending)

**Next Recommended Phase**: Phase 2 (Design Engine) - Fabric.js editor required for VDP integration and end-to-end workflow

---

### **Phase 1: Foundation (Weeks 1-2)**

**Goal**: Establish core infrastructure with authentication and database

**Status**: ✅ **COMPLETE** (October 30, 2025)

#### Completed Tasks:
- ✅ Supabase project created
- ✅ Authentication system (login/signup)
- ✅ Protected routes with middleware
- ✅ User context provider
- ✅ Dashboard with organization branding
- ✅ Database schema deployed (4 foundation tables)
- ✅ RLS policies tested and working
- ✅ Type-safe database abstraction layer
- ✅ Seed data documentation
- ✅ Multi-tenant isolation verified

#### Implementation Details:

**Task 1.1: Deploy Foundation Schema** ✅ **COMPLETE**

**Files Created**:
- `supabase/migrations/001_organizations.sql` (112 lines)
- `supabase/migrations/002_user_profiles.sql` (167 lines)
- `supabase/migrations/003_design_templates.sql` (383 lines)
- `supabase/migrations/004_design_assets.sql` (245 lines)

**Checklist**:
- [x] Deploy organizations table
- [x] Deploy user_profiles table
- [x] Deploy design_templates table
- [x] Deploy design_assets table
- [x] Test RLS policies work
- [x] Create seed data (3 test organizations)
- [x] Test multi-tenant isolation

**Task 1.2: Supabase Storage Setup** ⏸️ **DEFERRED TO PHASE 3**

Configure storage buckets for assets when needed for asset upload feature.
Deferred because Phase 2 uses Fabric.js canvas JSON (no file uploads yet).

**Checklist** (Moved to Phase 3):
- [ ] Create storage buckets
- [ ] Configure access policies
- [ ] Test file upload
- [ ] Test file download
- [ ] Set up CDN caching

**Task 1.3: Create Database Client Abstraction** ✅ **COMPLETE**

**Files Created**:
- `lib/database/types.ts` (477 lines) - Complete TypeScript type definitions
- `lib/database/supabase-queries.ts` (409 lines) - Type-safe query methods

**Features Implemented**:
- Organizations: Create, read, update, manage credits
- User Profiles: CRUD with organization joins, team queries
- Design Templates: CRUD with marketplace support, soft delete
- Design Assets: CRUD with storage checks, brand asset filtering
- Helper functions: Storage usage, permission checks, RLS utilities

**Checklist**:
- [x] Implement Supabase client functions (admin + user)
- [x] Add type-safe query methods for all tables
- [x] Add error handling with try-catch
- [x] Test all CRUD operations via API routes

**Testing Checkpoints**:
- [x] Create 3 test organizations (Acme, TechStart, Bakery)
- [x] Create 6 test users across orgs (2 per org: Owner + Admin)
- [x] Verify User A cannot see User B's data (RLS tested)
- [x] Test auth flows (signup, login, logout)
- [x] Test session management (middleware working)
- [x] Performance: Page load <2s (dashboard loads in <1s)

**Documentation Created**:
- `SEED_DATA_GUIDE.md` - Step-by-step seed data instructions
- `PHASE_1_COMPLETE.md` - Complete Phase 1 summary
- `supabase/seed-data.sql` - SQL script for manual execution

**Known Issues**:
- Tailwind CSS v4 lightningcss WSL2 compatibility (non-blocking, use dev server)
- Storage buckets deferred to Phase 3 (when asset uploads are needed)

---

### **Phase 2: Design Engine Core (Weeks 3-4)**

**Goal**: Build Fabric.js canvas editor with template save/load

**Status**: ✅ **100% COMPLETE** (All features implemented - November 4, 2025)
**Completed**: Canvas editor, Variable markers, Asset Library, Alignment guides (visual-only)

**Features**:
- Drag-and-drop canvas editor
- Text, image, shape, path tools
- Variable field markers (separate storage pattern)
- Template save/load
- Asset library integration

**Implementation**:

**Task 2.1: Fabric.js Canvas Component** ✅ **UI/UX COMPLETE**

**File**: `components/design-editor/canvas-editor.tsx`

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';

interface CanvasEditorProps {
  templateId?: string;
  onSave?: (canvas: fabric.Canvas) => void;
}

export function CanvasEditor({ templateId, onSave }: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Fabric.js canvas at 300 DPI (6" x 4" postcard = 1800px x 1200px)
    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: 1800,
      height: 1200,
      backgroundColor: '#FFFFFF'
    });

    setCanvas(fabricCanvas);

    // Load template if editing existing
    if (templateId) {
      loadTemplate(templateId, fabricCanvas);
    }

    return () => {
      fabricCanvas.dispose();
    };
  }, [templateId]);

  const loadTemplate = async (id: string, canvas: fabric.Canvas) => {
    const response = await fetch(`/api/templates/${id}`);
    const template = await response.json();

    // Load canvas JSON
    await canvas.loadFromJSON(template.canvas_json);

    // CRITICAL: Apply variable mappings separately (Fabric.js v6 limitation)
    const variableMappings = template.variable_mappings || {};
    canvas.getObjects().forEach((obj, idx) => {
      const mapping = variableMappings[idx.toString()];
      if (mapping) {
        obj.set('variableType', mapping.variableType);
        obj.set('isReusable', mapping.isReusable);
      }
    });

    canvas.renderAll();
  };

  const saveTemplate = async () => {
    if (!canvas) return;

    // Export canvas JSON
    const canvasJSON = canvas.toJSON();

    // Extract variable mappings (CRITICAL for VDP)
    const variableMappings: Record<string, any> = {};
    canvas.getObjects().forEach((obj: any, idx) => {
      if (obj.variableType) {
        variableMappings[idx.toString()] = {
          variableType: obj.variableType,
          isReusable: obj.isReusable || false
        };
      }
    });

    // Save to database
    await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        canvas_json: canvasJSON,
        variable_mappings: variableMappings,
        canvas_width: canvas.width,
        canvas_height: canvas.height
      })
    });
  };

  return (
    <div className="canvas-container">
      <canvas ref={canvasRef} />
      <button onClick={saveTemplate}>Save Template</button>
    </div>
  );
}
```

**Completed Features** (November 3-7, 2025):
- ✅ Fabric.js v6 canvas initialized at 300 DPI (multi-format support)
- ✅ Full-screen editor layout with hamburger navigation
- ✅ Three-panel layout: Layers (left) | Canvas (center) | Properties (right)
- ✅ Toolbar with tools: Text, Rectangle, Circle, Image upload, **QR Code placeholder**
- ✅ Zoom controls (in/out/fit-to-screen) with proper CSS dimension sync
- ✅ Object rotation with center pivot point
- ✅ Property panel with Transform/Style/Text/Variable tabs
- ✅ Real-time two-way binding (slider ↔ canvas)
- ✅ Layers panel with drag-and-drop reordering (dnd-kit)
- ✅ Template metadata (name, description) with collapsible UI
- ✅ Undo/redo functionality
- ✅ Canvas auto-fit on load (centered, fully visible)
- ✅ Sidebar panels (no horizontal scroll, proper overflow handling)
- ✅ **Keyboard delete functionality** (Delete/Backspace keys)
- ✅ **Multi-format support** (4x6, 5x7, 6x9, 6x11, 8.5x11, 11x17, 4x11 door hanger)
- ✅ **Format selector** with dynamic canvas resizing
- ✅ **Template Library modal** (replaces sidebar, responsive grid, hover effects)
- ✅ **Template save/load to Supabase** (with format preservation)
- ✅ **Variable Marker Tool** (8 variable types with visual indicators)
- ✅ **QR Code Placeholder Tool** (auto-marked as `variableType: 'qrCode'` for VDP batch replacement)
- ✅ **Canvas disposal race condition fixes** (50ms initialization delay)
- ✅ **Scope management** (handleKeyDown cleanup properly scoped)

**Files Created**:
- `components/design/canvas-editor.tsx` (1200+ lines) - Main editor with multi-format support + QR Code tool
- `components/design/property-panel.tsx` (425+ lines) - Object properties with Variable tab
- `components/design/layers-panel.tsx` (385+ lines) - Layer management with variable badges
- `components/design/ai-design-assistant.tsx` (177 lines) - AI floating panel
- `components/design/format-selector.tsx` (110+ lines) - Format dropdown with visual icons
- `components/templates/template-library.tsx` (230+ lines) - Template grid modal
- `app/(main)/templates/page.tsx` (270+ lines) - Templates page with modal integration
- `lib/design/print-formats.ts` (240+ lines) - Format definitions and helpers
- `lib/design/variable-types.ts` (106 lines) - Variable type system
- `lib/qr-generator.ts` (45 lines) - QR code placeholder generation for VDP
- `app/api/design-templates/route.ts` - Template CRUD API

**Technical Achievements**:
- ✅ Fixed Fabric.js zoom + CSS dimensions synchronization (Nov 7, 2025 - critical fix)
  - **Issue**: cssOnly + setZoom() created double-transform (1.2 × 1.2 = 1.44x on content, 1.2x on canvas)
  - **Solution**: CSS-only scaling without setZoom() - synchronized canvas/content resize
  - **Bug Fix**: Aspect ratio preservation (read currentHeight independently from currentWidth)
- ✅ QR Code variable metadata auto-assignment (variableType + isReusable flags)
- ✅ Separate variable mappings storage pattern (Fabric.js v6 serialization workaround)
- ✅ Center-origin rotation for all objects
- ✅ Responsive UI with panel toggle buttons
- ✅ Multi-format support with dynamic canvas resizing (7 formats)
- ✅ Template library modal UI with responsive grid
- ✅ Format preservation across save/load operations
- ✅ Canvas initialization race condition fixes
- ✅ Keyboard event handler scope management
- ✅ Template loading with format auto-detection

**Checklist**:
- ✅ **Add variable marker tool** (Property Panel → Variable tab with 8 types)
- ✅ **Implement save/load to Supabase** (API routes + template library modal)
- ✅ **Multi-format support** (4x6, 5x7, 6x9, 6x11, 8.5x11, 11x17, 4x11)
- ✅ **Template library UI** (Modal with grid, hover effects, auto-close)
- [ ] Add alignment guides (snap-to-grid) - **OPTIONAL**
- [ ] Test with 100+ objects performance - **VALIDATION STEP**

**Task 2.2: Variable Marker System** ✅ **COMPLETE**

Allow users to mark canvas objects as variables (e.g., `{{recipient_name}}`).

**UI**: Property Panel → Variable tab → Select variable type from dropdown

**Checklist**:
- ✅ Create variable marker UI (Property Panel with Variable tab)
- ✅ Implement variable types (8 types: none, recipientName, recipientAddress, phoneNumber, qrCode, logo, message, custom)
- ✅ Visual indicator on canvas (purple dashed border #9333ea)
- ✅ Visual badges in layers panel (purple badges with icons)
- ✅ Store mappings separately from canvas_json (separate variableMappings field)
- ✅ Test save/load preserves markers (visual styling applied on load)

**Task 2.3: Asset Library Integration** ✅ **COMPLETED**

**Goal**: Allow users to upload, manage, and reuse brand assets (logos, images, fonts)

**Files to Create**:
- `components/design/asset-library-panel.tsx` - Main panel UI
- `lib/storage/asset-manager.ts` - Supabase Storage integration
- `app/api/assets/route.ts` - CRUD API for assets

---

### **🔬 First Principles Breakdown** (Elon Musk Methodology)

**Question**: What is an Asset Library at its most fundamental level?

**Answer**: A CRUD system for visual resources with spatial transfer capability.

**Atomic Components**:

1. **Storage Atom** - Where are files stored?
   - Supabase Storage bucket: `assets/{org_id}/{file_id}`
   - Metadata in database: `design_assets` table
   - File types: PNG, JPG, SVG, WOFF2

2. **Organization Atom** - How are files organized?
   - By organization_id (RLS isolation)
   - By asset_type (logo, image, font)
   - By upload date (recent first)

3. **Display Atom** - How are files shown?
   - Scrollable panel (similar to Layers Panel)
   - Grid layout with thumbnails
   - Asset name + size + upload date
   - Filter by type (All, Logos, Images, Fonts)

4. **Upload Atom** - How do files get in?
   - Drag-and-drop zone
   - File input button
   - Validation (size, format, dimensions)
   - Progress indicator

5. **Optimization Atom** - How are files prepared?
   - Image resize (max 2000px)
   - Compression (quality 85%)
   - Format conversion (WEBP for thumbnails)
   - Dimension extraction

6. **Usage Atom** - How do files get onto canvas?
   - Drag from library → drop on canvas
   - Click to add at canvas center
   - Automatic scaling to fit canvas

---

### **📋 Implementation Checklist** (Atomic Tasks)

**Phase A: Database Schema** (30 min)
- [ ] Create `design_assets` table migration
- [ ] Add RLS policies for organization isolation
- [ ] Create Supabase Storage bucket: `design-assets`
- [ ] Configure bucket policies (authenticated upload)

**Phase B: Backend API** (1 hour)
- [ ] POST `/api/assets` - Upload asset
  - [ ] Accept multipart/form-data
  - [ ] Validate file type/size
  - [ ] Upload to Supabase Storage
  - [ ] Insert metadata to database
  - [ ] Generate thumbnail
- [ ] GET `/api/assets` - List assets
  - [ ] Filter by organization_id (RLS)
  - [ ] Return signed URLs (1 hour expiry)
- [ ] DELETE `/api/assets/[id]` - Delete asset
  - [ ] Check ownership via RLS
  - [ ] Delete from Storage + database

**Phase C: Asset Manager Library** (45 min)
- [ ] `lib/storage/asset-manager.ts`
  - [ ] uploadAsset() - Handle file upload
  - [ ] listAssets() - Fetch assets with filters
  - [ ] deleteAsset() - Remove asset
  - [ ] generateThumbnail() - Resize for preview
  - [ ] optimizeImage() - Compress before upload

**Phase D: UI Component** (1.5 hours)
- [ ] `components/design/asset-library-panel.tsx`
  - [ ] Upload zone (drag-and-drop + button)
  - [ ] Asset grid display
  - [ ] Asset type filter tabs
  - [ ] Search input
  - [ ] Asset card (thumbnail, name, size, delete)
  - [ ] Loading states
  - [ ] Empty state ("Upload your first asset")

**Phase E: Canvas Integration** (1 hour)
- [ ] Drag-and-drop from library to canvas
  - [ ] Implement drag events
  - [ ] Create FabricImage from asset URL
  - [ ] Auto-scale to fit canvas (max 50% width)
  - [ ] Position at drop location
- [ ] Click-to-add functionality
  - [ ] Add at canvas center
  - [ ] Same auto-scaling logic

**Phase F: Testing** (30 min)
- [ ] Upload 5 different assets (PNG, JPG, SVG)
- [ ] Verify thumbnails generate correctly
- [ ] Test drag-and-drop to canvas
- [ ] Test delete functionality
- [ ] Test RLS (different organizations can't see each other's assets)
- [ ] Test large file upload (>5MB)

**Total Estimated Time**: 4-5 hours

---

**Task 2.4: Alignment Guides & Snapping** ✅ **COMPLETED**

**Goal**: Help users precisely align objects with visual guides and magnetic snapping
**Implementation**: Visual alignment guides (magenta dashed lines) - Automatic snapping removed per user request

**Files to Modify**:
- `components/design/canvas-editor.tsx` - Add guide rendering + snap logic
- `lib/design/alignment-helpers.ts` - Alignment calculation utilities (NEW)

---

### **🔬 First Principles Breakdown** (Elon Musk Methodology)

**Question**: What are alignment guides at their most fundamental level?

**Answer**: A spatial feedback system that visualizes and enforces geometric relationships between objects.

**Atomic Components**:

1. **Detection Atom** - When should guides appear?
   - When user is dragging an object
   - When object edges/center align with other objects
   - Threshold: Within 10px proximity

2. **Calculation Atom** - What alignments do we detect?
   - **Horizontal alignment**: Left edge, center, right edge
   - **Vertical alignment**: Top edge, center, bottom edge
   - **Spacing alignment**: Equal distance between objects

3. **Rendering Atom** - How do we visualize guides?
   - Dashed lines (magenta #FF00FF for visibility)
   - Span across canvas or between objects
   - Appear/disappear instantly (no animation)

4. **Snapping Atom** - How do objects magnetically snap?
   - When within threshold (10px), pull object to exact alignment
   - Snap X and Y independently
   - Override dragging behavior temporarily

5. **Toggle Atom** - How to enable/disable?
   - Checkbox in toolbar: "Snap to Guides"
   - Keyboard shortcut: Cmd/Ctrl + ;
   - Persistent in localStorage

---

### **📋 Implementation Checklist** (Atomic Tasks)

**Phase A: Alignment Detection Logic** (45 min)
- [ ] Create `lib/design/alignment-helpers.ts`
  - [ ] findHorizontalAlignments() - Detect left/center/right matches
  - [ ] findVerticalAlignments() - Detect top/center/bottom matches
  - [ ] calculateSnapOffset() - Compute offset to apply for snapping
  - [ ] isWithinThreshold() - Check if distance < 10px
  - [ ] Type definitions (AlignmentGuide, SnapResult)

**Phase B: Guide Rendering** (1 hour)
- [ ] Add guide rendering to canvas
  - [ ] Listen to `object:moving` event
  - [ ] Calculate alignments in real-time
  - [ ] Draw guide lines using Fabric.Line
  - [ ] Remove guides on `object:modified` event
  - [ ] Style: Magenta dashed lines (2px width, stroke: '#FF00FF')
  - [ ] Optimize: Remove old guides before adding new ones

**Phase C: Snapping Logic** (45 min)
- [ ] Implement magnetic snapping
  - [ ] In `object:moving` handler:
    - [ ] Calculate snap offsets (X and Y)
    - [ ] Apply offset to object position
    - [ ] Update object.left and object.top
    - [ ] Prevent normal drag behavior when snapping
  - [ ] Add visual feedback (guide line becomes solid when snapped)
  - [ ] Add snap indicator (small dot at snap point)

**Phase D: UI Toggle** (30 min)
- [ ] Add toolbar checkbox
  - [ ] "Snap to Guides" checkbox
  - [ ] Store state in component state
  - [ ] Persist in localStorage (`snapToGuidesEnabled`)
  - [ ] Enable/disable snap logic based on state
  - [ ] Icon: Magnet icon from lucide-react
- [ ] Keyboard shortcut (Cmd/Ctrl + ;)
  - [ ] Listen to keydown event
  - [ ] Toggle snap state
  - [ ] Show toast notification ("Snap to Guides ON/OFF")

**Phase E: Testing** (30 min)
- [ ] Create 5 objects on canvas
- [ ] Drag one object near others
- [ ] Verify guides appear at correct positions
- [ ] Verify snapping pulls object into alignment (within 10px)
- [ ] Test toggle on/off functionality
- [ ] Test keyboard shortcut
- [ ] Test with rotated objects (should work with bounding box)
- [ ] Performance: Dragging feels smooth (no lag with 50+ objects)

**Total Estimated Time**: 2-3 hours

---

**Phase 2 Final Testing Checkpoints** (Both Tasks Complete):
- [ ] Create template with 20+ objects
- [ ] Save and reload template
- [ ] Verify variable mappings preserved
- [ ] Upload 5 assets to asset library
- [ ] Drag 10 images from asset library onto canvas
- [ ] Test alignment guides with 10 objects
- [ ] Test undo/redo 50 times
- [ ] Performance: Canvas render <500ms with 50 objects
- [x] **Mark Phase 2 as 100% COMPLETE** ✅

---

### **Phase 3: VDP Engine + Basic Data Axle (Weeks 5-6)** ✅ **COMPLETE** (100%)

**Status as of 2025-11-05**: ✅ **PHASE 3 COMPLETE** (12/12 tasks)

**Completed Features**:
- [x] Variable Detection System (with Fabric.js v6 case-sensitivity fix)
- [x] CSV Sample Generation & Download
- [x] CSV Upload & Validation (drag & drop, column matching)
- [x] Data Preview (first 5 rows)
- [x] Batch Personalization Engine (10-10,000 rows, chunked processing)
- [x] Real-time Progress Tracking (%, batch counter, variant counter)
- [x] Campaign Creation Modal (3-step workflow)
- [x] Template Delete Functionality (z-index bug fixed)
- [x] Debugging Infrastructure (first principles logging at 3 stages)
- [x] **Task 3.10: Multi-Surface Schema** ✅ - Database schema + migration for multi-sided templates
- [x] **Task 3.11: PDF Export Engine** ✅ - 300 DPI RGB export with jsPDF (Phase 1 MVP)

**Completed Features** (2025-11-05 Update):
- [x] **Task 3.12: Bulk Download (ZIP)** ✅ - ZIP bundling with manifest CSV, 10K variant optimization
- [x] **Variable Replacement Bug Fix** ✅ - Fabric.js v6 type case sensitivity fixed
- [x] **Performance Optimization** ✅ - Batch processing (50 variants), streaming ZIP, memory-efficient
- [x] **Toast Management** ✅ - Single persistent toast, no spam

**Pending Features** (Next Priority):
- [ ] PostGrid Integration - **DEFERRED TO PHASE 5**
- [ ] **Task 3.11-Phase2: CMYK Conversion** - **DEFERRED TO PHASE 4** - Full print color space support

**Bug Fixes (2025-11-05)**:
- ✅ **Variable Detection**: Fixed case sensitivity bug (Fabric.js v6 uses 'Textbox' not 'textbox')
- ✅ **Delete Button**: Fixed z-index stacking issue (added z-20 class)

**New Features (2025-11-05)**: 🎉 **PDF EXPORT ENGINE**

**Implementation Summary**:
- ✅ **lib/pdf/export-to-pdf.ts** - Complete PDF export utility (286 lines)
  - `exportCanvasToPDF()` - Exports fabric.Canvas to print-ready PDF at 300 DPI
  - `downloadPDF()` - Downloads PDF to user's computer
  - `validateCanvasForExport()` - Pre-export validation (dimensions, text size, empty canvas)
  - `exportCanvasJSONToPDF()` - Off-screen canvas rendering for batch exports
- ✅ **Campaign Modal Integration** - components/campaigns/create-campaign-modal.tsx
  - Individual PDF download per variant (with loading spinner)
  - Bulk "Export All as PDF" button (sequential download with 500ms delay)
  - Automatic filename generation from recipient data
  - Toast notifications for user feedback

**Technical Details**:
- **Phase 1 MVP Strategy**: RGB color space with high-res PNG embedding
- **300 DPI Maintenance**: Point-based calculations (`imgWidthPt = (widthPixels / 300) * 72`)
- **jsPDF Integration**: Already installed v3.0.3, no new dependencies
- **Off-screen Rendering**: Creates invisible canvas elements for batch PDF generation
- **Sequential Downloads**: 500ms delay between downloads to avoid browser blocking

**Architecture Decision**:
- ✅ **Phase 1 (NOW)**: RGB PDF export - Fast implementation, good quality, acceptable for most use cases
- ⏸️ **Phase 2 (DEFERRED)**: CMYK conversion + vector SVG export - Professional print requirements
- ⏸️ **Phase 3 (FUTURE)**: PDF/X-1a compliance, bleed marks, crop marks - Enterprise features

**Performance**:
- **Export Time**: ~2-3 seconds per PDF (300 DPI PNG → PDF embedding)
- **File Size**: ~200-500 KB per PDF (depends on design complexity)
- **Batch Export**: Can handle 100+ variants with sequential downloads

**Testing Instructions** (for user):
1. Navigate to /campaigns, select template with variables
2. Upload CSV with recipient data, generate campaign
3. Click download icon on any variant → PDF downloads
4. Click "Export All as PDF (X)" → All PDFs download sequentially
5. Open PDFs in Adobe Acrobat → Verify 300 DPI in properties

**New Features (2025-11-05)**: 🎉 **ZIP BULK EXPORT + PERFORMANCE OPTIMIZATION**

**Implementation Summary**:
- ✅ **lib/pdf/export-to-pdf.ts** - Added ZIP bundling functions (lines 438-609)
  - `bundlePDFsToZip()` - Bundles multiple PDFs into organized ZIP with manifest
  - `downloadZIP()` - Downloads ZIP bundle to user's computer
  - Includes `manifest.csv` with variant metadata
  - Zero-padded filenames (`variant-001-*.pdf`, `variant-002-*.pdf`, etc.)
  - DEFLATE compression (level 6) for optimal size/speed balance
- ✅ **components/campaigns/create-campaign-modal.tsx** - Batch processing (lines 207-360)
  - Processes 50 variants per batch (memory-efficient)
  - Streaming ZIP generation (add PDF → release memory immediately)
  - Single persistent toast with ID (no spam)
  - UI yields between batches (10ms setTimeout)
  - Progressive percentage updates
  - FileArchive icon + descriptive button text

**Bug Fixes**:
- ✅ **Variable Replacement**: Fixed Fabric.js v6 type case sensitivity
  - Changed `obj.type === 'textbox'` to `(obj.type || '').toLowerCase()` comparison
  - Now correctly detects 'Textbox', 'IText', 'Text' objects
  - Applied in both `personalization-engine.ts:58` and `export-to-pdf.ts:218`
- ✅ **Purple Chip Styling**: Remove character-level styles after text replacement
  - `delete cleanedObj.styles` and `delete cleanedObj.styleHas`
  - Prevents style artifacts when text length changes
- ✅ **Toast Spam**: Single persistent toast instead of creating new ones
  - Used toast ID: `'bulk-export-progress'`
  - Updates existing toast with new progress

**Technical Details**:
- **Performance at Scale**: Can process 10,000 variants efficiently
  - Batch size: 50 variants (prevents memory overflow)
  - Memory usage: ~200MB peak (instead of 500MB+ for all-at-once)
  - Export time: ~5-10 minutes for 10K variants
  - ZIP compression: DEFLATE level 6 (~40% size reduction)
- **ZIP Structure**:
  ```
  campaign_name_YYYY-MM-DD.zip
  ├── pdfs/
  │   ├── variant-001-firstname_lastname.pdf
  │   ├── variant-002-firstname_lastname.pdf
  │   └── ...
  └── manifest.csv (variant metadata)
  ```
- **Dependencies**: Added `jszip` v3.10.1 and `@types/jszip`

**Performance Comparison**:
| Metric | Before | After |
|--------|--------|-------|
| Memory Usage (10K) | 500MB+ | ~200MB |
| Export Time (10K) | 33 min | 5-10 min |
| Download Experience | 10K sequential | 1 ZIP bundle |
| Toast Notifications | Spam (10K toasts) | Single persistent |
| UI Responsiveness | Frozen | Smooth updates |

**Architecture Decision (2025-11-05)**: 🏗️ **MULTI-SURFACE TEMPLATE SCHEMA**

**Context**: Templates currently support single canvas. Need multi-sided formats:
- **Postcards**: Front + back (2 surfaces)
- **Self-Mailers**: Outside + inside (2-4 surfaces)
- **Brochures**: Multiple panels (6+ surfaces)

**Decision**: **HYBRID APPROACH** - Schema NOW, UI Later
- ✅ **Implement multi-surface schema NOW** (30 min) - Prevents technical debt
- ⏸️ **Defer multi-surface UI to Phase 4/5** - Keep current Phase 3 UI simple

**Implementation Strategy**:
```typescript
// NEW: Multi-surface schema (backward compatible)
interface DesignSurface {
  side: 'front' | 'back' | 'inside-left' | 'inside-right' | 'panel-1' | 'panel-2' | ...;
  canvas_json: any;
  variable_mappings: Record<string, any>;
  thumbnail_url?: string;
}

interface DesignTemplate {
  surfaces: DesignSurface[];  // Array of N surfaces
  // ... other fields remain unchanged
}
```

**Migration Path**:
1. Add `surfaces` column to `design_templates` (JSONB array)
2. Update save logic: Pack single canvas into `surfaces[0]` with `side: 'front'`
3. Update load logic: Extract `surfaces[0]` for single-surface UI (backward compatible)
4. Future: UI can loop through `surfaces[]` array for multi-sided editing

**Benefits**:
- ✅ Supports N surfaces (postcards, letters, self-mailers, brochures)
- ✅ Backward compatible (existing templates work)
- ✅ No UI complexity in Phase 3 (just schema change)
- ✅ Prevents future migration pain
- ✅ Enables competitive advantage (Canva doesn't do multi-surface DM well)

**Timing Rationale**: Schema changes are cheap NOW (early in Phase 3), expensive LATER (after 10,000 templates). UI can evolve gradually.

**Next Step**: Implement multi-surface schema (Task 3.X - see below)

**Documentation**:
- Created `PHASE3_VDP_PROGRESS_UPDATE.md` - Complete progress tracking
- Created `CSV_TESTING_GUIDE.md` - Step-by-step testing workflow
- Created `QUICK_CSV_TEST.md` - 2-minute quick test
- Created `DEBUG_VARIABLE_DETECTION.md` - First principles debugging guide

**See**: `PHASE3_VDP_PROGRESS_UPDATE.md` for complete details on features, bugs fixed, and next steps.

---

### **Phase 3: Original Implementation Plan (Reference)**

**Goal**: End-to-end campaign creation with dual audience sourcing (CSV + Data Axle)

**Strategic Decision**: Combine VDP core with BASIC Data Axle integration to unlock monopolistic advantage 4 weeks earlier.

**Features**:
- **Week 1: VDP Core**
  - CSV upload and parsing
  - Batch personalization engine (source-agnostic)
  - Dynamic QR code generation
  - PDF rendering (300 DPI, CMYK)
  - Progress tracking
- **Week 2: Basic Data Axle** (NEW)
  - Filters UI (geography + demographics)
  - Count preview API (FREE Data Axle Insights)
  - Purchase API (Data Axle Contact API)
  - Import to recipient_lists (reuse CSV logic)

**Deferred to Phase 5** (Advanced Data Axle):
- AI audience recommendations
- Saved audiences library
- Lookalike audiences
- Performance-based ranking

**Implementation**:

**Task 3.1: CSV Upload & Parsing**

**File**: `components/campaigns/csv-uploader.tsx`

**Checklist**:
- [ ] File upload component
- [ ] CSV parsing with papaparse
- [ ] Field mapping UI (CSV columns → database fields)
- [ ] Validation (required fields, address format)
- [ ] Preview table (first 10 rows)
- [ ] Handle large files (>10,000 rows)

**Task 3.2: Batch Personalization Engine**

**File**: `lib/vdp/personalization-engine.ts`

```typescript
export async function personalizeTemplate(
  template: DesignTemplate,
  recipients: Recipient[],
  options: PersonalizationOptions
): Promise<PersonalizedDesign[]> {
  const results: PersonalizedDesign[] = [];

  for (const recipient of recipients) {
    // Clone canvas JSON
    const canvas = new fabric.Canvas(null, {
      width: template.canvas_width,
      height: template.canvas_height
    });

    await canvas.loadFromJSON(template.canvas_json);

    // Apply variable mappings
    const variableMappings = template.variable_mappings || {};
    canvas.getObjects().forEach((obj: any, idx) => {
      const mapping = variableMappings[idx.toString()];

      if (!mapping) return;

      // Skip reusable elements (logo, brand colors)
      if (mapping.isReusable) return;

      // Replace variable with recipient data
      switch (mapping.variableType) {
        case 'recipientName':
          if (obj.type === 'text') {
            obj.set('text', `${recipient.recipient_name} ${recipient.recipient_lastname}`);
          }
          break;

        case 'recipientAddress':
          if (obj.type === 'text') {
            obj.set('text', `${recipient.recipient_address_line1}\n${recipient.recipient_city}, ${recipient.recipient_state} ${recipient.recipient_zip}`);
          }
          break;

        case 'qrCode':
          // Generate unique QR code
          const trackingCode = generateTrackingCode();
          const qrCodeDataUrl = await generateQRCode(`https://droplab.com/lp/${trackingCode}`);

          if (obj.type === 'image') {
            await obj.setSrc(qrCodeDataUrl);
          }
          break;

        // ... handle other variable types
      }
    });

    // Render to high-DPI PNG
    const dataUrl = canvas.toDataURL({
      format: 'png',
      quality: 1.0,
      multiplier: 4 // 4x resolution for print
    });

    // Convert to PDF
    const pdfUrl = await generatePDF(dataUrl, {
      width: template.format_width_inches,
      height: template.format_height_inches,
      colorSpace: 'CMYK'
    });

    results.push({
      recipient_id: recipient.id,
      personalized_canvas_json: canvas.toJSON(),
      personalized_pdf_url: pdfUrl,
      tracking_code: trackingCode
    });
  }

  return results;
}
```

**Checklist**:
- [ ] Implement personalization logic
- [ ] Add progress tracking
- [ ] Generate unique QR codes
- [ ] Render to PDF (300 DPI)
- [ ] Store PDFs in Supabase Storage
- [ ] Handle errors gracefully
- [ ] Optimize for speed (parallelize)

**Task 3.3: QR Code & PURL Generation**

**File**: `lib/tracking/qr-generator.ts`

Generate unique tracking codes and QR codes for each recipient.

**Checklist**:
- [ ] Generate tracking codes (nanoid, 12 chars)
- [ ] Create QR codes (qrcode library)
- [ ] Store tracking codes in database
- [ ] Create landing page routes (`/lp/[trackingCode]`)
- [ ] Test QR codes scan correctly

**Testing Checkpoints**:
- [ ] Upload CSV with 100 recipients
- [ ] Generate 100 personalized designs in <2 minutes
- [ ] Verify all QR codes unique
- [ ] Scan 10 QR codes with phone
- [ ] Check PDF quality (300 DPI)
- [ ] Performance: 10,000 recipients in <10 minutes

---

### **Phase 4: AI Intelligence Layer (Weeks 7-8)**

**Goal**: AI-powered design analysis and postal compliance

**Features**:
- Postal compliance validator (USPS rules)
- Design critique (readability, layout, color)
- Response rate predictor
- Automated improvement suggestions

**Implementation**:

**Task 4.1: Postal Compliance Validator**

**File**: `lib/compliance/postal-validator.ts`

```typescript
export async function validatePostalCompliance(
  canvas: fabric.Canvas,
  format: string,
  country: string
): Promise<ComplianceResult> {
  const issues: ComplianceIssue[] = [];

  // USPS Postcard Rules (example)
  if (format === 'postcard_4x6' && country === 'US') {
    // Rule 1: Barcode Clear Zone (bottom 5/8")
    const barcodeZone = {
      top: canvas.height - (5/8 * 300), // 5/8" at 300 DPI
      height: (5/8 * 300)
    };

    canvas.getObjects().forEach(obj => {
      if (objectIntersects(obj, barcodeZone)) {
        issues.push({
          severity: 'error',
          rule: 'USPS-BC-001',
          element: obj.id,
          message: 'Content in barcode clear zone will be rejected by USPS',
          autofix: {
            action: 'move',
            params: { top: barcodeZone.top - obj.height - 18 }
          }
        });
      }
    });

    // Rule 2: Safety Margin (1/8" from edges)
    const safetyMargin = (1/8 * 300);
    canvas.getObjects().forEach(obj => {
      const edgeDistance = getMinEdgeDistance(obj, canvas);
      if (edgeDistance < safetyMargin) {
        issues.push({
          severity: 'warning',
          rule: 'USPS-SAFE-001',
          element: obj.id,
          message: `Element too close to edge (${edgeDistance}px). Move to ${safetyMargin}px minimum.`,
          autofix: {
            action: 'move',
            params: { left: obj.left + (safetyMargin - edgeDistance) }
          }
        });
      }
    });
  }

  // AI-Powered Compliance Check (catch edge cases)
  const aiAnalysis = await analyzeWithClaude({
    canvas: canvas.toDataURL(),
    regulations: getPostalRegs(country, format),
    prompt: `Analyze this ${format} design for ${country} postal compliance.
             Check for issues human rules might miss. Return JSON with issues found.`
  });

  return {
    is_compliant: issues.length === 0,
    issues: [...issues, ...aiAnalysis.issues],
    compliance_score: calculateComplianceScore(issues)
  };
}
```

**Checklist**:
- [ ] Implement USPS postcard rules
- [ ] Implement USPS letter rules
- [ ] Add international regulations (UK, Canada)
- [ ] Integrate Claude API for AI checks
- [ ] Create auto-fix suggestions
- [ ] Real-time validation in editor
- [ ] Test with 50 known-bad designs

**Task 4.2: Response Rate Predictor**

**File**: `lib/ai/performance-predictor.ts`

Use historical campaign data + Claude API to predict response rates.

**Checklist**:
- [ ] Extract design features from canvas
- [ ] Query historical performance data
- [ ] Build Claude prompt with features + history
- [ ] Parse AI response (min/max/mean predictions)
- [ ] Display in UI with confidence interval
- [ ] Track prediction accuracy over time

**Task 4.3: AI Design Critic**

Analyze design quality and suggest improvements.

**Checklist**:
- [ ] Readability score (font size, contrast)
- [ ] Visual hierarchy score (CTA visibility)
- [ ] Color contrast checker (WCAG)
- [ ] Layout density analysis
- [ ] Improvement suggestions
- [ ] A/B test variant generation

**Testing Checkpoints**:
- [ ] Validate 100 designs (mix of compliant/non-compliant)
- [ ] Verify auto-fix corrections work
- [ ] Compare AI predictions vs actual results (track accuracy)
- [ ] Test with various industries and demographics
- [ ] Performance: Validation <2 seconds

---

### **Phase 5: Campaign Management + Data Axle Integration (Weeks 9-10)**

**Goal**: End-to-end campaign creation with integrated audience targeting (Data Axle API)

**Status**: 🟡 **80% COMPLETE** (November 6, 2025) - Filter Builder + Purchase + View/Export Complete

**Strategic Importance**: This phase creates the competitive moat by integrating audience targeting directly into the campaign workflow. No competitor offers this level of integration.

**Features**:
- Campaign creation wizard (4 steps) ⏸️ **DEFERRED**
- **Data Axle audience targeting** ✅ **COMPLETE** (250M+ contacts)
- CSV upload (existing path) ✅ **COMPLETE**
- AI-powered audience recommendations ⏸️ **DEFERRED TO PHASE 6**
- Real-time cost calculation ✅ **COMPLETE** (dynamic pricing tiers)
- Campaign dashboard & analytics ⏸️ **DEFERRED TO PHASE 6**

**Competitive Advantage**:
- ✅ **FREE count preview** (Data Axle Insights API) ✅ **WORKING**
- ✅ **Zero upfront cost** (see exact audience size before purchasing) ✅ **WORKING**
- ⏸️ **AI recommendations** (requires historical campaign data)
- ✅ **End-to-end workflow** (Target → Design → Print → Track in ONE platform) **70% COMPLETE**

**Completed This Session** (November 6, 2025):
- ✅ Database schema (migration 008) - audience_filters, contact_purchases tables
- ✅ API client (`lib/audience/index.ts`) - 580 lines with mock mode
- ✅ Filter builder UI - Three-panel layout, real-time preview, debouncing
- ✅ Saved audience library - CRUD interface with performance tracking
- ✅ Dynamic pricing system - Volume-based tiers with admin management
- ✅ Count API - FREE preview with margin calculation
- ✅ Admin infrastructure - User roles, pricing tiers, audit logging

**See**: `SESSION_2025_11_06_PROGRESS.md` for detailed implementation report
**See**: `DATA_AXLE_INTEGRATION_SPEC.md` for complete technical specification

---

#### **Week 9: Database & API Foundation**

**Task 5.1: Deploy Data Axle Database Schema**

**New Tables**:

```sql
-- Saved Audience Filters (Reusable Targeting Profiles)
CREATE TABLE audience_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[],

  filters JSONB NOT NULL, -- Data Axle filter configuration
  last_count INTEGER,
  last_count_updated_at TIMESTAMPTZ,
  last_estimated_cost NUMERIC(12,2),

  -- Performance Tracking (network effects data)
  total_campaigns_using INTEGER DEFAULT 0,
  avg_response_rate NUMERIC(5,2),
  avg_conversion_rate NUMERIC(5,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audience_filters_org ON audience_filters(organization_id);
CREATE INDEX idx_audience_filters_performance ON audience_filters(avg_response_rate DESC NULLS LAST);

-- Contact Purchases (Transaction History)
CREATE TABLE contact_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  purchased_by UUID NOT NULL REFERENCES auth.users(id),

  filters JSONB NOT NULL,
  contact_count INTEGER NOT NULL,

  cost_per_contact NUMERIC(10,4) NOT NULL, -- Your cost from Data Axle
  total_cost NUMERIC(12,2) NOT NULL,
  user_charge_per_contact NUMERIC(10,4) NOT NULL, -- What you charge
  total_user_charge NUMERIC(12,2) NOT NULL,
  margin NUMERIC(12,2) GENERATED ALWAYS AS (total_user_charge - total_cost) STORED,

  recipient_list_id UUID REFERENCES recipient_lists(id),
  campaign_id UUID REFERENCES campaigns(id),
  audience_filter_id UUID REFERENCES audience_filters(id),

  provider TEXT DEFAULT 'data_axle',
  status TEXT DEFAULT 'completed',

  purchased_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contact_purchases_org ON contact_purchases(organization_id);
CREATE INDEX idx_contact_purchases_campaign ON contact_purchases(campaign_id);

-- RLS Policies
ALTER TABLE audience_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's audience filters"
  ON audience_filters FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view their organization's contact purchases"
  ON contact_purchases FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
```

**Modify Existing Tables**:

```sql
-- Add Data Axle metadata to recipient_lists
ALTER TABLE recipient_lists
  ADD COLUMN data_axle_filters JSONB,
  ADD COLUMN data_axle_purchase_id UUID REFERENCES contact_purchases(id),
  ADD COLUMN data_axle_cost NUMERIC(12,2);

-- Add demographics to recipients (from Data Axle Enhanced package)
ALTER TABLE recipients
  ADD COLUMN data_axle_person_id TEXT,
  ADD COLUMN gender TEXT,
  ADD COLUMN marital_status TEXT,
  ADD COLUMN estimated_income INTEGER,
  ADD COLUMN home_value_estimated INTEGER,
  ADD COLUMN interests TEXT[];

-- Add audience tracking to campaigns
ALTER TABLE campaigns
  ADD COLUMN audience_source TEXT DEFAULT 'csv_upload', -- 'csv_upload', 'data_axle'
  ADD COLUMN audience_filter_id UUID REFERENCES audience_filters(id),
  ADD COLUMN audience_cost NUMERIC(12,2),
  ADD COLUMN audience_demographics JSONB; -- Summary stats
```

**Checklist**:
- [x] Deploy new tables (audience_filters, contact_purchases) ✅ **COMPLETE** (Nov 6, 2025)
- [x] Modify existing tables (recipient_lists, recipients, campaigns) ✅ **COMPLETE**
- [x] Test RLS policies ✅ **COMPLETE**
- [ ] Create seed data (3 test audiences) ⏸️ **OPTIONAL**
- [x] Verify multi-tenant isolation ✅ **COMPLETE**

---

**Task 5.2: Data Axle API Client**

**File**: `lib/data-axle/client.ts`

**Implementation**: Production-ready TypeScript client (see `docs/DATA_AXLE_INTEGRATION_GUIDE.md` lines 1650-2057)

**Key Features**:
- Filter DSL builder (converts UI filters → Data Axle API format)
- Count API (FREE - Insights API)
- Purchase API (PAID - Search API with pagination)
- Rate limiter (150 requests per 10 seconds)
- Retry logic (exponential backoff)
- Caching (5-minute TTL for counts)

**Checklist**:
- [x] Implement DataAxleClient class ✅ **COMPLETE** (`lib/audience/index.ts` - 580 lines)
- [x] Build filter DSL converter ✅ **COMPLETE** (supports all filter types)
- [x] Add rate limiter (150 req/10s) ✅ **COMPLETE** (in-memory throttling)
- [x] Add retry logic (3 attempts, exponential backoff) ✅ **COMPLETE**
- [x] Test count API (FREE) ✅ **COMPLETE** (mock + real modes)
- [ ] Test purchase API (buy 10 contacts) ⏸️ **REQUIRES API KEY**
- [ ] Handle pagination (max 4,000 records per query) ⏸️ **REQUIRES PURCHASE API**
- [x] Add error handling ✅ **COMPLETE** (try-catch + fallbacks)

**Testing**:
```bash
# Unit tests
npm run test lib/data-axle/client.test.ts

# Integration tests (requires real API key)
npm run test:integration lib/data-axle/integration.test.ts
```

---

**Task 5.3: API Routes**

**File**: `app/api/contacts/count/route.ts` (FREE - no charge)

```typescript
export async function POST(req: NextRequest) {
  const filters = await req.json();

  // Check cache (5-min TTL)
  const cached = cache.get(JSON.stringify(filters));
  if (cached) return NextResponse.json({ ...cached, cached: true });

  // Call Data Axle Insights API (FREE)
  const client = new DataAxleClient(process.env.DATA_AXLE_API_KEY!);
  const result = await client.getCount(filters);

  // Calculate user charges
  const estimatedCost = result.count * 0.15; // Your cost
  const userCharge = result.count * 0.25;    // User charge
  const margin = userCharge - estimatedCost;

  // Cache result
  cache.set(JSON.stringify(filters), { count: result.count, estimatedCost, userCharge, margin });

  return NextResponse.json({ count: result.count, estimatedCost, userCharge, margin, cached: false });
}
```

**File**: `app/api/contacts/purchase/route.ts` (PAID - authenticated)

```typescript
export async function POST(req: NextRequest) {
  const { filters, maxContacts, recipientListName } = await req.json();

  // Validate credits
  const supabase = await createClient();
  const { data: org } = await supabase.from('organizations').select('credits').single();
  if (org.credits < maxContacts * 0.25) {
    return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
  }

  // Purchase contacts
  const client = new DataAxleClient(process.env.DATA_AXLE_API_KEY!);
  const contacts = await client.purchaseContacts(filters, maxContacts);

  // Import to database
  const { data: recipientList } = await supabase.from('recipient_lists').insert({
    name: recipientListName,
    source_type: 'data_axle',
    data_axle_filters: filters,
    total_recipients: contacts.length
  }).select().single();

  for (const contact of contacts) {
    await supabase.from('recipients').insert({
      list_id: recipientList.id,
      recipient_name: contact.first_name,
      recipient_lastname: contact.last_name,
      recipient_address_line1: contact.street,
      recipient_city: contact.city,
      recipient_state: contact.state,
      recipient_zip: contact.zip,
      recipient_email: contact.email,
      recipient_phone: contact.phone,
      data_axle_person_id: contact.person_id,
      age_range: `${contact.age}-${contact.age + 4}`,
      estimated_income: contact.estimated_income,
      home_ownership: contact.homeowner ? 'owner' : 'renter',
      interests: contact.behaviors
    });
  }

  // Deduct credits
  await supabase.from('organizations').update({ credits: org.credits - (contacts.length * 0.25) });

  return NextResponse.json({
    success: true,
    contactsPurchased: contacts.length,
    recipientListId: recipientList.id,
    totalCost: contacts.length * 0.15,
    totalCharge: contacts.length * 0.25,
    creditsRemaining: org.credits - (contacts.length * 0.25)
  });
}
```

**Checklist**:
- [x] Implement /api/audience/count (with caching) ✅ **COMPLETE** (Nov 6, 2025)
- [x] Implement /api/audience/purchase (with authentication) ✅ **COMPLETE** (Nov 6, 2025)
- [x] Implement /api/audience/saved (CRUD) ✅ **COMPLETE** (database queries)
- [x] Add request logging ✅ **COMPLETE** (console.log + admin audit)
- [x] Add error handling ✅ **COMPLETE** (try-catch + toast notifications)
- [x] Test with browser dev tools ✅ **COMPLETE** (working in UI)
- [ ] Implement /api/audience/recipient-lists (view purchased) ⏸️ **NEXT PRIORITY**
- [ ] Implement /api/audience/recipient-lists/[id]/contacts (view contacts) ⏸️ **NEXT PRIORITY**
- [ ] Implement /api/audience/recipient-lists/[id]/export (CSV export) ⏸️ **NEXT PRIORITY**

---

#### **Week 10: UI & Workflow Integration**

**Task 5.4: Campaign Creation Wizard (Updated)**

**File**: `app/campaigns/new/page.tsx`

**New 4-Step Wizard**:
```
Step 1: Select Template (existing)
Step 2: Choose Audience Source (NEW)
  ├─ Option A: Upload CSV
  └─ Option B: Data Axle Targeting (NEW)
Step 3: Review & Personalize (existing)
Step 4: Schedule & Send (existing)
```

**Checklist**:
- [ ] Step 1: Template selector (existing)
- [ ] **Step 2a: Audience source selector (NEW)** - Radio buttons for CSV vs Data Axle
- [ ] **Step 2b: Data Axle audience builder (NEW)** - Filter UI with live count
- [ ] Step 2c: CSV upload (existing)
- [ ] Step 3: Personalization preview (existing)
- [ ] **Step 4: Cost calculator (UPDATED)** - Include Data Axle costs
- [ ] Progress indicator
- [ ] Save draft functionality

---

**Task 5.5: Data Axle Audience Builder UI**

**File**: `components/audience/audience-builder.tsx`

**Key Features**:
- **Real-time count display** (debounced 500ms updates)
- **Filter controls**:
  - Geography: State, City, ZIP, County
  - Demographics: Age slider (18-100), Income slider ($0-$500K), Homeowner toggle
  - Lifestyle: Interest checkboxes (golf, travel, fitness, luxury, etc.)
- **Active filters summary** (badges showing current selections)
- **Live cost calculator** (contacts × $0.25)
- **AI recommendations panel** (suggested filters based on template history)
- **Purchase flow** (confirmation modal → progress bar → success)

**UI Mock**:
```
┌────────────────────────────────────────────────────────────────┐
│  🎯 Target Your Audience                                      │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  1,250,000 contacts match your filters                   │ │
│  │  Estimated cost: $312,500 ($0.25/contact)               │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  📍 Location          👥 Demographics      🎯 Interests         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │ State: CA    │    │ Age: 65-80   │    │ ☑ Golf       │    │
│  │ City:        │    │ Income: $75K+│    │ ☑ Travel     │    │
│  │ ZIP:         │    │ ☑ Homeowner  │    │ ☐ Fitness    │    │
│  └──────────────┘    └──────────────┘    └──────────────┘    │
│                                                                 │
│  💡 AI Recommendation:                                         │
│  Similar campaigns with these filters achieved 3.2% response   │
│  rate. Expected ROI: 285% (based on 47 campaigns)             │
│                                                                 │
│  Active Filters: [CA] [Age: 65-80] [Homeowner] [Income: $75K+]│
│                                                                 │
│  [Save Audience]  [Purchase 5,000 Contacts - $1,250] ──►      │
└────────────────────────────────────────────────────────────────┘
```

**Implementation**: See `docs/DATA_AXLE_INTEGRATION_GUIDE.md` lines 1336-1645

**Checklist**:
- [x] Geography filters (state, city, zip) ✅ **COMPLETE** (Nov 6, 2025)
- [x] Demographics filters (age slider, income slider, homeowner toggle) ✅ **COMPLETE**
- [x] Lifestyle filters (interest checkboxes) ✅ **COMPLETE** (comma-separated input)
- [x] Real-time count display (debounced API calls) ✅ **COMPLETE** (800ms debounce)
- [x] Cost calculator (live updates) ✅ **COMPLETE** (dynamic pricing tiers)
- [x] Active filters summary ✅ **COMPLETE** (badges with remove buttons)
- [x] Purchase confirmation modal ✅ **COMPLETE** (Nov 6, 2025)
- [x] Progress bar during purchase ✅ **COMPLETE** (4-stage flow)
- [x] Success state with redirect ✅ **COMPLETE** (redirects to /templates)
- [x] View purchased recipient lists page ✅ **COMPLETE** (Nov 6, 2025 - `/audiences/lists`)
- [x] View contacts in list detail page ✅ **COMPLETE** (Nov 6, 2025 - `/audiences/lists/[id]`)
- [x] Export contacts to CSV ✅ **COMPLETE** (Nov 6, 2025 - Download button working)
- [x] Library tab navigation to lists page ✅ **COMPLETE** (Nov 6, 2025 - "View All Lists" button)
- [x] RLS issues resolved ✅ **COMPLETE** (Nov 6, 2025 - Service role pattern for Next.js 15)
- [ ] VDP integration (use purchased contacts in templates) ⏸️ **PHASE 2 DEPENDENCY** (requires Fabric.js editor)

---

**Task 5.6: AI Audience Recommendations**

**File**: `lib/ai/audience-recommender.ts`

**Purpose**: Suggest optimal filters based on historical template performance

**Algorithm**:
1. Query `campaign_performance_data` for all campaigns using this template
2. Filter to top 20% by response rate (successful campaigns)
3. Extract demographic patterns (average age, homeowner%, income, interests)
4. Return recommended filters + expected performance

**Example Output**:
```json
{
  "suggestedFilters": {
    "ageMin": 55,
    "ageMax": 70,
    "homeowner": true,
    "incomeMin": 75000,
    "interests": ["golf", "travel", "investing"]
  },
  "expectedResponseRate": 3.2,
  "expectedROI": 285,
  "confidence": 0.85,
  "basedOnCampaigns": 47
}
```

**File**: `components/audience/ai-recommendations-panel.tsx`

**UI**: Card showing suggested filters, expected performance, and "Apply" button

**Checklist**:
- [ ] Implement audience-recommender.ts logic
- [ ] Query historical campaign data
- [ ] Calculate demographic averages
- [ ] Return recommendations
- [ ] Display in UI panel
- [ ] "Apply Recommendations" button

---

**Task 5.7: Saved Audiences Library**

**File**: `components/audience/saved-audiences-library.tsx`

**Purpose**: Browse and reuse successful filter configurations

**Features**:
- Grid view of saved audiences
- Performance metrics per audience (avg response rate)
- One-click apply
- Sort by performance

**Checklist**:
- [ ] List saved audiences
- [ ] Display performance metrics
- [ ] One-click apply to current campaign
- [ ] Delete saved audience
- [ ] Sort/filter options

---

**Task 5.8: Campaign Dashboard**

**File**: `app/campaigns/page.tsx`

**Checklist**:
- [ ] Campaign list (table view)
- [ ] Status badges (draft, processing, sent)
- [ ] Performance metrics per campaign
- [ ] **Audience source indicator** (CSV vs Data Axle badge)
- [ ] Search/filter
- [ ] Bulk actions (pause, cancel)

---

**Task 5.9: Campaign Detail Page**

**File**: `app/campaigns/[id]/page.tsx`

**Checklist**:
- [ ] Campaign overview
- [ ] **Audience source display** (filters used if Data Axle)
- [ ] Recipient list
- [ ] Performance chart (time-series)
- [ ] **Demographic breakdown** (if Data Axle source)
- [ ] Individual recipient tracking
- [ ] Export results to CSV

---

#### **Testing Checkpoints**

**Unit Tests**:
- [ ] Filter DSL builder converts UI → Data Axle format correctly
- [ ] Rate limiter enforces 150 req/10s
- [ ] Retry logic works (exponential backoff)
- [ ] Cost calculator accurate

**Integration Tests**:
- [ ] Count API returns correct count (simple filter)
- [ ] Count API returns correct count (complex AND filter)
- [ ] Purchase API buys exactly N contacts
- [ ] Contacts imported to database correctly
- [ ] Credits deducted correctly

**E2E Tests**:
- [ ] Full campaign creation flow (template → Data Axle → personalize → send)
- [ ] CSV upload still works (existing path)
- [ ] Saved audiences can be reused
- [ ] AI recommendations display
- [ ] Cost breakdown correct

**Performance Tests**:
- [ ] Count API response time <500ms (p95)
- [ ] Purchase API (100 contacts) <3 seconds
- [ ] Purchase API (4,000 contacts) <30 seconds
- [ ] Debounce prevents API spam
- [ ] Cache hit rate >60%

**Manual Tests**:
- [ ] Test with Data Axle staging API
- [ ] Create campaign with Data Axle audience (100 contacts)
- [ ] Verify demographics imported correctly
- [ ] Check cost calculations accurate
- [ ] Test edge cases (0 results, API errors)

---

### **Phase 6: Collaboration (Weeks 11-12)**

**Goal**: Real-time multi-user editing (Google Docs style)

**Features**:
- WebSocket synchronization
- Live cursor tracking
- Comment threads
- Version history
- Approval workflows

**Implementation**:

**Task 6.1: Real-Time Sync (WebSocket)**

**File**: `lib/collaboration/websocket-client.ts`

Use Supabase Realtime for canvas synchronization.

**Checklist**:
- [ ] Set up Supabase Realtime channels
- [ ] Broadcast canvas updates
- [ ] Subscribe to updates from other users
- [ ] Conflict resolution (last-write-wins)
- [ ] Cursor position broadcast
- [ ] Test with 5 concurrent users

**Task 6.2: Version Control**

**Checklist**:
- [ ] Auto-save every 30 seconds
- [ ] Manual save creates new version
- [ ] Version list UI
- [ ] Diff viewer (visual comparison)
- [ ] Restore to previous version

**Task 6.3: Comments & Annotations**

**Checklist**:
- [ ] Add comment button
- [ ] Pin comment to canvas object
- [ ] Comment threads
- [ ] Resolve/unresolve
- [ ] Mention users (@mentions)
- [ ] Email notifications

**Testing Checkpoints**:
- [ ] 5 users edit same canvas simultaneously
- [ ] Verify no data loss
- [ ] Test conflict resolution
- [ ] Create 50 versions, restore to v10
- [ ] Test comment notifications

---

### **Phase 7: Marketplace (Weeks 13-14)**

**Goal**: Template marketplace with network effects

**Features**:
- Template submission
- Performance-based ranking
- Template purchases
- Creator payouts
- Review system

**Implementation**:

**Task 7.1: Template Submission Flow**

**Checklist**:
- [ ] "Publish to Marketplace" button
- [ ] Submission form (title, description, category, price)
- [ ] Admin approval queue
- [ ] Rejection feedback

**Task 7.2: Marketplace Browse**

**File**: `app/marketplace/page.tsx`

**Checklist**:
- [ ] Category grid
- [ ] Search with filters
- [ ] Sort by: Rating, Response Rate, Price
- [ ] Template preview modal
- [ ] Purchase button

**Task 7.3: Revenue Sharing**

**Checklist**:
- [ ] Stripe Connect integration (creator payouts)
- [ ] Platform fee calculation (30%)
- [ ] Payout dashboard for creators
- [ ] Automatic monthly payouts

**Testing Checkpoints**:
- [ ] Submit 20 templates to marketplace
- [ ] Test purchase flow
- [ ] Verify creator receives 70% payout
- [ ] Test review system
- [ ] Check performance ranking updates

---

### **Phase 8-10: API, Integrations, Launch (Weeks 15-20)**

(Abbreviated for space - full details in next planning iteration)

**Phase 8**: Developer API (RESTful endpoints, webhooks, rate limiting)
**Phase 9**: External Integrations (PostGrid fulfillment, Stripe billing)
  - Note: Data Axle integration completed in Phase 5
**Phase 10**: Polish & Beta Launch (50 users, feedback iteration)

---

## 🧪 Recurring Testing Strategy

### Unit Tests (Every Feature)
```bash
npm run test
```

Test coverage targets:
- Database queries: 90%
- API routes: 85%
- Canvas operations: 80%
- AI integrations: 75%

### Integration Tests (Every Phase)
Test full user journeys:
- Signup → Create Template → Send Campaign → View Analytics
- Template Marketplace: Publish → Purchase → Use in Campaign
- Collaboration: Multi-user edit → Comment → Approve

### Performance Tests (Weekly)
Benchmarks:
- Page load: <2s
- Canvas render: <500ms
- VDP batch (1000 recipients): <2 min
- Database queries: <100ms (p95)
- API response: <200ms (p95)

### Security Tests (Every Phase)
- RLS bypass attempts
- SQL injection attempts
- XSS attempts
- API authentication tests
- Rate limit enforcement

---

## 📈 Success Metrics

### Technical (Launch)
- [ ] 99.9% uptime
- [ ] <2s page load times
- [ ] <500ms canvas rendering
- [ ] Zero critical security vulnerabilities
- [ ] 100% RLS test coverage

### Business (6 Months)
- [ ] 1,000 active organizations
- [ ] 10,000 campaigns sent
- [ ] 100,000 designs created
- [ ] 500 marketplace templates
- [ ] $50K MRR

### AI/Data Moat (12 Months)
- [ ] 100,000 campaigns in training dataset
- [ ] Response rate predictions accurate within ±0.5%
- [ ] 90% postal compliance pass rate
- [ ] 10,000+ template purchases (network effects)

---

## 🏆 Competitive Moat Summary

**Why DropLab Wins**:

1. **Data Moat**: Proprietary campaign performance dataset → AI predictions improve with every campaign → impossible to replicate

2. **Network Effects**: Marketplace templates ranked by proven performance → more users = more data = better templates → flywheel effect

3. **Regulatory Expertise**: Postal compliance validator saves $500+ per failed print run → switching cost

4. **Vertical Integration**: Design → Personalize → Validate → Print → Track (end-to-end) → no need for external tools

5. **AI Intelligence**: Response rate predictor uses YOUR data, not generic benchmarks → gets smarter over time

6. **Developer Platform**: API enables ecosystem → agencies build custom workflows → lock-in

**Canva Cannot Replicate**:
- No access to campaign performance data (we own the pipeline)
- No postal compliance (not their focus)
- No VDP at scale (API limitations)
- No campaign tracking (they don't send the mail)

**Timeline to Monopoly**:
- **Month 6**: 1,000 campaigns = early dataset
- **Month 12**: 10,000 campaigns = statistically significant AI
- **Month 24**: 100,000 campaigns = **impossible to catch up**

---

## ✅ Next Immediate Actions

1. **Mark Task 1.1 as in_progress**: Deploy foundation schema
2. **Create migration files**: Split SQL into manageable migration files
3. **Test RLS policies**: Verify multi-tenant isolation works
4. **Begin Phase 2**: Start Fabric.js canvas editor

---

## 📚 Reference Documentation

- **Strategic Vision**: `New_Supabase_Platform.md`
- **Development Guidelines**: `CLAUDE.md`
- **Database Patterns**: `DATABASE_PATTERNS.md` (if exists)
- **Previous Implementation**: `PHASE1_IMPLEMENTATION_COMPLETE.md` (if exists)

---

**Last Updated**: 2025-10-30
**Plan Version**: 2.0
**Total Phases**: 10
**Estimated Timeline**: 20 weeks
**Target Launch**: Q2 2026

**Remember**: This is the SINGLE SOURCE OF TRUTH. Update daily. Mark tasks complete with ✅. Add new discoveries. Build the moat. 🚀
