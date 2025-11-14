-- Migration 021: Analytics Investment Tracking
-- Purpose: Add cost tracking columns to campaigns table for financial analytics
-- Date: 2025-11-14
-- Phase: 5.7 - Advanced DM Analytics

-- ============================================================================
-- CAMPAIGN COST TRACKING
-- ============================================================================

-- Add cost tracking columns to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cost_design NUMERIC(10,2) DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cost_print NUMERIC(10,2) DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cost_postage NUMERIC(10,2) DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cost_data_axle NUMERIC(10,2) DEFAULT 0;

-- Add computed total cost column (auto-calculates sum of all costs)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cost_total NUMERIC(10,2) GENERATED ALWAYS AS (
  COALESCE(cost_design, 0) + COALESCE(cost_print, 0) +
  COALESCE(cost_postage, 0) + COALESCE(cost_data_axle, 0)
) STORED;

-- Add budget tracking column
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS budget NUMERIC(10,2);

-- NOTE: NO ROI column added per user request (no sales data at launch)
-- Future: Add when revenue attribution is available

-- Add indexes for analytics performance queries
CREATE INDEX IF NOT EXISTS idx_campaigns_cost_total
  ON campaigns(cost_total) WHERE cost_total IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_budget
  ON campaigns(budget) WHERE budget IS NOT NULL;

-- ============================================================================
-- EVENTS TABLE ENHANCEMENTS (for temporal analytics)
-- ============================================================================

-- Add indexes for geographic and temporal analytics
CREATE INDEX IF NOT EXISTS idx_events_campaign_created
  ON events(campaign_id, created_at);

CREATE INDEX IF NOT EXISTS idx_events_type_created
  ON events(event_type, created_at);

-- ============================================================================
-- CONVERSIONS TABLE ENHANCEMENTS (for demographic analytics)
-- ============================================================================

-- Add indexes for conversion analysis
CREATE INDEX IF NOT EXISTS idx_conversions_campaign_created
  ON conversions(campaign_id, created_at);

CREATE INDEX IF NOT EXISTS idx_conversions_type_created
  ON conversions(conversion_type, created_at);

-- ============================================================================
-- CAMPAIGN RECIPIENTS TABLE ENHANCEMENTS (for analytics joins)
-- ============================================================================

-- Add indexes for joining campaign_recipients with recipients for geographic data
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign
  ON campaign_recipients(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_recipient_id
  ON campaign_recipients(recipient_id);

-- ============================================================================
-- RECIPIENTS TABLE ENHANCEMENTS (for regional analytics)
-- ============================================================================

-- Add indexes for geographic performance analysis (data is in recipients table)
CREATE INDEX IF NOT EXISTS idx_recipients_state
  ON recipients(state) WHERE state IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recipients_zip_code
  ON recipients(zip_code) WHERE zip_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recipients_city
  ON recipients(city) WHERE city IS NOT NULL;

-- ============================================================================
-- ANALYTICS HELPER FUNCTION
-- ============================================================================

-- Function to calculate cost per metric (piece, scan, conversion)
CREATE OR REPLACE FUNCTION calculate_campaign_cost_metrics(p_campaign_id UUID)
RETURNS TABLE (
  total_cost NUMERIC,
  cost_per_piece NUMERIC,
  cost_per_scan NUMERIC,
  cost_per_conversion NUMERIC,
  budget_remaining NUMERIC,
  budget_utilization_percent NUMERIC
) AS $$
DECLARE
  v_total_cost NUMERIC;
  v_total_recipients INTEGER;
  v_total_scans INTEGER;
  v_total_conversions INTEGER;
  v_budget NUMERIC;
BEGIN
  -- Get campaign data
  SELECT
    c.cost_total,
    c.total_recipients,
    c.budget
  INTO v_total_cost, v_total_recipients, v_budget
  FROM campaigns c
  WHERE c.id = p_campaign_id;

  -- Count QR scans
  SELECT COUNT(*) INTO v_total_scans
  FROM events
  WHERE campaign_id = p_campaign_id
    AND event_type = 'qr_scan';

  -- Count conversions
  SELECT COUNT(*) INTO v_total_conversions
  FROM conversions
  WHERE campaign_id = p_campaign_id;

  -- Calculate metrics
  RETURN QUERY SELECT
    v_total_cost,
    CASE WHEN v_total_recipients > 0
      THEN v_total_cost / v_total_recipients
      ELSE NULL
    END AS cost_per_piece,
    CASE WHEN v_total_scans > 0
      THEN v_total_cost / v_total_scans
      ELSE NULL
    END AS cost_per_scan,
    CASE WHEN v_total_conversions > 0
      THEN v_total_cost / v_total_conversions
      ELSE NULL
    END AS cost_per_conversion,
    CASE WHEN v_budget IS NOT NULL
      THEN v_budget - v_total_cost
      ELSE NULL
    END AS budget_remaining,
    CASE WHEN v_budget IS NOT NULL AND v_budget > 0
      THEN (v_total_cost / v_budget) * 100
      ELSE NULL
    END AS budget_utilization_percent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION calculate_campaign_cost_metrics(UUID) TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN campaigns.cost_design IS 'Cost of design/creative work for this campaign';
COMMENT ON COLUMN campaigns.cost_print IS 'Cost of printing physical direct mail pieces';
COMMENT ON COLUMN campaigns.cost_postage IS 'Cost of postage/mailing';
COMMENT ON COLUMN campaigns.cost_data_axle IS 'Cost of Data Axle audience data';
COMMENT ON COLUMN campaigns.cost_total IS 'Computed total of all campaign costs (auto-calculated)';
COMMENT ON COLUMN campaigns.budget IS 'Budget allocated for this campaign';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
