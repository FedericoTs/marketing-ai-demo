-- ============================================================================
-- Migration 019: Campaign Management Schema
-- ============================================================================
-- Purpose: Migrate campaigns from SQLite to Supabase for multi-tenant isolation
-- Date: 2025-11-06
-- Blocks: Phase 4 (Analytics), Phase 6 (Collaboration)
-- ============================================================================

-- ============================================================================
-- 1. CAMPAIGNS TABLE
-- ============================================================================
-- Core campaign entity linking templates, recipient lists, and tracking

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

  -- Campaign Identity
  name TEXT NOT NULL,
  description TEXT,

  -- Template & Audience Links
  template_id UUID REFERENCES design_templates(id) ON DELETE SET NULL,
  recipient_list_id UUID REFERENCES recipient_lists(id) ON DELETE SET NULL,

  -- Design Snapshots (frozen at campaign creation)
  design_snapshot JSONB NOT NULL, -- Frozen Fabric.js canvas state
  variable_mappings_snapshot JSONB NOT NULL, -- Variable field mappings at send time

  -- Campaign Stats
  total_recipients INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'completed', 'failed')),

  -- Schedule & Timing
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_campaigns_organization ON campaigns(organization_id);
CREATE INDEX idx_campaigns_created_by ON campaigns(created_by);
CREATE INDEX idx_campaigns_template ON campaigns(template_id);
CREATE INDEX idx_campaigns_recipient_list ON campaigns(recipient_list_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at DESC);

-- Updated_at trigger
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE campaigns IS 'Direct mail campaigns with template and audience tracking';
COMMENT ON COLUMN campaigns.design_snapshot IS 'Frozen Fabric.js canvas JSON at campaign creation time';
COMMENT ON COLUMN campaigns.variable_mappings_snapshot IS 'Variable field mappings frozen at campaign creation';

-- ============================================================================
-- 2. CAMPAIGN_RECIPIENTS TABLE
-- ============================================================================
-- Join table linking campaigns to individual recipients with personalized content

CREATE TABLE IF NOT EXISTS campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,

  -- Personalized Content
  personalized_canvas_json JSONB NOT NULL, -- Individual Fabric.js canvas with recipient data
  tracking_code TEXT UNIQUE NOT NULL, -- Unique tracking identifier for QR codes/URLs

  -- Generated Assets
  qr_code_url TEXT, -- URL to generated QR code image
  personalized_pdf_url TEXT, -- URL to final PDF for printing
  landing_page_url TEXT, -- Personalized landing page URL

  -- Delivery Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'sent', 'delivered', 'failed')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  -- Error Tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_recipient ON campaign_recipients(recipient_id);
CREATE INDEX idx_campaign_recipients_tracking_code ON campaign_recipients(tracking_code);
CREATE INDEX idx_campaign_recipients_status ON campaign_recipients(status);

-- Unique constraint: one recipient per campaign
CREATE UNIQUE INDEX idx_campaign_recipients_unique ON campaign_recipients(campaign_id, recipient_id);

-- Updated_at trigger
CREATE TRIGGER update_campaign_recipients_updated_at
  BEFORE UPDATE ON campaign_recipients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE campaign_recipients IS 'Personalized campaign content for each recipient';
COMMENT ON COLUMN campaign_recipients.tracking_code IS 'Unique code for QR tracking and analytics attribution';
COMMENT ON COLUMN campaign_recipients.personalized_canvas_json IS 'Fabric.js canvas with recipient-specific variable substitution';

-- ============================================================================
-- 3. EVENTS TABLE
-- ============================================================================
-- Tracking all user interactions (QR scans, page views, clicks)

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Campaign Attribution
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  tracking_code TEXT NOT NULL, -- Links to campaign_recipients.tracking_code

  -- Event Details
  event_type TEXT NOT NULL CHECK (event_type IN ('qr_scan', 'page_view', 'button_click', 'form_view', 'form_submit', 'email_open', 'email_click')),
  event_data JSONB, -- Additional event-specific data

  -- Session Context
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,

  -- Geolocation (optional)
  country_code TEXT,
  region TEXT,
  city TEXT,

  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX idx_events_campaign ON events(campaign_id);
CREATE INDEX idx_events_tracking_code ON events(tracking_code);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_created_at ON events(created_at DESC);
CREATE INDEX idx_events_campaign_type ON events(campaign_id, event_type); -- Composite for analytics

COMMENT ON TABLE events IS 'User interaction tracking for campaign analytics';
COMMENT ON COLUMN events.event_type IS 'Type of interaction: qr_scan, page_view, button_click, form_submit, etc.';
COMMENT ON COLUMN events.event_data IS 'Additional event context (button ID, form fields, etc.)';

-- ============================================================================
-- 4. CONVERSIONS TABLE
-- ============================================================================
-- High-value conversion events (appointments, purchases, form submissions)

CREATE TABLE IF NOT EXISTS conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Campaign Attribution
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  tracking_code TEXT NOT NULL, -- Links to campaign_recipients.tracking_code

  -- Conversion Details
  conversion_type TEXT NOT NULL CHECK (conversion_type IN ('form_submit', 'appointment', 'purchase', 'call', 'custom')),
  conversion_value NUMERIC(12,2), -- Monetary value if applicable
  conversion_data JSONB, -- Structured conversion details (form fields, appointment time, etc.)

  -- Attribution Context
  event_id UUID REFERENCES events(id), -- Original event that led to conversion
  session_id TEXT, -- Session tracking for multi-touch attribution

  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for ROI analytics
CREATE INDEX idx_conversions_campaign ON conversions(campaign_id);
CREATE INDEX idx_conversions_tracking_code ON conversions(tracking_code);
CREATE INDEX idx_conversions_type ON conversions(conversion_type);
CREATE INDEX idx_conversions_created_at ON conversions(created_at DESC);
CREATE INDEX idx_conversions_value ON conversions(conversion_value) WHERE conversion_value IS NOT NULL;

COMMENT ON TABLE conversions IS 'High-value conversion events for ROI tracking';
COMMENT ON COLUMN conversions.conversion_type IS 'Type of conversion: form_submit, appointment, purchase, call, custom';
COMMENT ON COLUMN conversions.conversion_value IS 'Monetary value for ROI calculations';
COMMENT ON COLUMN conversions.conversion_data IS 'Structured conversion details (appointment time, form fields, purchase items)';

-- ============================================================================
-- 5. LANDING_PAGES TABLE (from SQLite)
-- ============================================================================
-- Dynamic landing page configurations for campaign tracking

CREATE TABLE IF NOT EXISTS landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  tracking_code TEXT UNIQUE NOT NULL, -- Links to campaign_recipients.tracking_code

  -- Landing Page Configuration
  template_type TEXT DEFAULT 'default' CHECK (template_type IN ('default', 'appointment', 'questionnaire', 'product', 'contact', 'custom')),
  page_config JSONB NOT NULL, -- Template-specific configuration (colors, logo, form fields)

  -- Personalization
  recipient_data JSONB, -- Pre-filled form data from recipient info

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_landing_pages_campaign ON landing_pages(campaign_id);
CREATE INDEX idx_landing_pages_tracking_code ON landing_pages(tracking_code);
CREATE INDEX idx_landing_pages_template_type ON landing_pages(template_type);

-- Updated_at trigger
CREATE TRIGGER update_landing_pages_updated_at
  BEFORE UPDATE ON landing_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE landing_pages IS 'Dynamic landing page configurations for personalized tracking pages';
COMMENT ON COLUMN landing_pages.page_config IS 'Template-specific configuration (colors, logo URL, form fields, CTA text)';
COMMENT ON COLUMN landing_pages.recipient_data IS 'Pre-filled data for forms (name, address, etc.)';

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6.1 CAMPAIGNS RLS POLICIES
-- ============================================================================

-- SELECT: Users can view campaigns in their organization
CREATE POLICY "Users can view campaigns in their organization"
  ON campaigns FOR SELECT
  USING (organization_id = get_user_organization_id());

-- INSERT: Users can create campaigns in their organization
CREATE POLICY "Users can create campaigns in their organization"
  ON campaigns FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

-- UPDATE: Users can update campaigns in their organization
CREATE POLICY "Users can update campaigns in their organization"
  ON campaigns FOR UPDATE
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

-- DELETE: Users can delete campaigns in their organization
CREATE POLICY "Users can delete campaigns in their organization"
  ON campaigns FOR DELETE
  USING (organization_id = get_user_organization_id());

-- ============================================================================
-- 6.2 CAMPAIGN_RECIPIENTS RLS POLICIES
-- ============================================================================

-- SELECT: Users can view campaign recipients via campaign's organization
CREATE POLICY "Users can view campaign recipients in their organization"
  ON campaign_recipients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_recipients.campaign_id
      AND campaigns.organization_id = get_user_organization_id()
    )
  );

-- INSERT: Users can create campaign recipients via campaign's organization
CREATE POLICY "Users can create campaign recipients in their organization"
  ON campaign_recipients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_recipients.campaign_id
      AND campaigns.organization_id = get_user_organization_id()
    )
  );

-- UPDATE: Users can update campaign recipients via campaign's organization
CREATE POLICY "Users can update campaign recipients in their organization"
  ON campaign_recipients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_recipients.campaign_id
      AND campaigns.organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_recipients.campaign_id
      AND campaigns.organization_id = get_user_organization_id()
    )
  );

-- DELETE: Users can delete campaign recipients via campaign's organization
CREATE POLICY "Users can delete campaign recipients in their organization"
  ON campaign_recipients FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_recipients.campaign_id
      AND campaigns.organization_id = get_user_organization_id()
    )
  );

-- ============================================================================
-- 6.3 EVENTS RLS POLICIES (READ-ONLY for users, PUBLIC INSERT for tracking)
-- ============================================================================

-- SELECT: Users can view events for their organization's campaigns
CREATE POLICY "Users can view events for their campaigns"
  ON events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = events.campaign_id
      AND campaigns.organization_id = get_user_organization_id()
    )
  );

-- INSERT: Allow public tracking endpoint to insert events (anon key)
CREATE POLICY "Allow public event tracking"
  ON events FOR INSERT
  WITH CHECK (true); -- Validated by API endpoint logic

-- No UPDATE/DELETE for events (append-only for audit trail)

-- ============================================================================
-- 6.4 CONVERSIONS RLS POLICIES (Similar to events)
-- ============================================================================

-- SELECT: Users can view conversions for their organization's campaigns
CREATE POLICY "Users can view conversions for their campaigns"
  ON conversions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = conversions.campaign_id
      AND campaigns.organization_id = get_user_organization_id()
    )
  );

-- INSERT: Allow public tracking endpoint to insert conversions
CREATE POLICY "Allow public conversion tracking"
  ON conversions FOR INSERT
  WITH CHECK (true); -- Validated by API endpoint logic

-- No UPDATE/DELETE for conversions (append-only for audit trail)

-- ============================================================================
-- 6.5 LANDING_PAGES RLS POLICIES
-- ============================================================================

-- SELECT: Public read access for landing page rendering
CREATE POLICY "Allow public landing page access"
  ON landing_pages FOR SELECT
  USING (is_active = true);

-- INSERT: Users can create landing pages via campaign's organization
CREATE POLICY "Users can create landing pages in their organization"
  ON landing_pages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = landing_pages.campaign_id
      AND campaigns.organization_id = get_user_organization_id()
    )
  );

-- UPDATE: Users can update landing pages via campaign's organization
CREATE POLICY "Users can update landing pages in their organization"
  ON landing_pages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = landing_pages.campaign_id
      AND campaigns.organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = landing_pages.campaign_id
      AND campaigns.organization_id = get_user_organization_id()
    )
  );

-- DELETE: Users can delete landing pages via campaign's organization
CREATE POLICY "Users can delete landing pages in their organization"
  ON landing_pages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = landing_pages.campaign_id
      AND campaigns.organization_id = get_user_organization_id()
    )
  );

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to get campaign analytics summary
CREATE OR REPLACE FUNCTION get_campaign_analytics(campaign_uuid UUID)
RETURNS TABLE (
  total_recipients BIGINT,
  total_events BIGINT,
  total_conversions BIGINT,
  qr_scans BIGINT,
  page_views BIGINT,
  conversion_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = campaign_uuid),
    (SELECT COUNT(*) FROM events WHERE campaign_id = campaign_uuid),
    (SELECT COUNT(*) FROM conversions WHERE campaign_id = campaign_uuid),
    (SELECT COUNT(*) FROM events WHERE campaign_id = campaign_uuid AND event_type = 'qr_scan'),
    (SELECT COUNT(*) FROM events WHERE campaign_id = campaign_uuid AND event_type = 'page_view'),
    CASE
      WHEN (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = campaign_uuid) > 0
      THEN (SELECT COUNT(*) FROM conversions WHERE campaign_id = campaign_uuid)::NUMERIC /
           (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = campaign_uuid)::NUMERIC * 100
      ELSE 0
    END;
END;
$$;

COMMENT ON FUNCTION get_campaign_analytics IS 'Returns analytics summary for a specific campaign';

-- ============================================================================
-- 8. SAMPLE DATA (for testing)
-- ============================================================================

-- Note: Actual campaign data will be migrated from SQLite using migration script
-- This section is reserved for future test data if needed

-- ============================================================================
-- END OF MIGRATION 019
-- ============================================================================
