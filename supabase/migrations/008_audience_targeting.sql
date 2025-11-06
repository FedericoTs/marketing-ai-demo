-- Migration 008: Audience Targeting Tables (Data Axle Integration)
-- Stores saved audience filters and contact purchase history
-- Enables audience reuse across campaigns + performance tracking

-- ============================================================================
-- 1. AUDIENCE_FILTERS TABLE (Saved Audience Segments)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audience_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Audience Metadata
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[], -- Searchable tags: ['seniors', 'high-income', 'homeowners']

  -- Filter Criteria (Data Axle Filter DSL compatible)
  filters JSONB NOT NULL,
  -- Example structure:
  -- {
  --   "state": "CA",
  --   "ageMin": 65,
  --   "ageMax": 80,
  --   "homeowner": true,
  --   "incomeMin": 75000,
  --   "interests": ["golf", "travel"]
  -- }

  -- Count & Cost Data (Cached from Data Axle FREE count API)
  last_count INTEGER, -- Last known audience size
  last_count_updated_at TIMESTAMPTZ, -- When count was last fetched
  last_estimated_cost NUMERIC(12,2), -- Last estimated cost (count × $0.15)
  last_user_charge NUMERIC(12,2), -- Last user charge (count × $0.25)

  -- Performance Metrics (from campaigns using this audience)
  total_campaigns_using INTEGER DEFAULT 0, -- How many campaigns have used this
  total_contacts_purchased INTEGER DEFAULT 0, -- Total contacts bought with this filter
  avg_response_rate NUMERIC(5,2), -- Average response rate across campaigns
  avg_conversion_rate NUMERIC(5,2), -- Average conversion rate across campaigns
  last_used_at TIMESTAMPTZ, -- When this audience was last used in a campaign

  -- Visibility & Sharing
  is_public BOOLEAN DEFAULT false, -- Shared within organization vs private to creator

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete for audit trail
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audience_filters_org
  ON audience_filters(organization_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_audience_filters_creator
  ON audience_filters(created_by);

CREATE INDEX IF NOT EXISTS idx_audience_filters_tags
  ON audience_filters USING GIN (tags);

-- Full-text search on name and description
CREATE INDEX IF NOT EXISTS idx_audience_filters_search
  ON audience_filters USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- GIN index for JSONB filter queries
CREATE INDEX IF NOT EXISTS idx_audience_filters_filters
  ON audience_filters USING GIN (filters);

-- Performance tracking index (for recommendations)
CREATE INDEX IF NOT EXISTS idx_audience_filters_performance
  ON audience_filters(organization_id, avg_conversion_rate DESC NULLS LAST, total_campaigns_using DESC)
  WHERE deleted_at IS NULL;

-- Usage frequency index
CREATE INDEX IF NOT EXISTS idx_audience_filters_usage
  ON audience_filters(organization_id, last_used_at DESC NULLS LAST)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- 2. CONTACT_PURCHASES TABLE (Purchase History & Usage Tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS contact_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  purchased_by UUID NOT NULL REFERENCES auth.users(id),

  -- Link to saved audience (optional - can be ad-hoc purchase)
  audience_filter_id UUID REFERENCES audience_filters(id) ON DELETE SET NULL,

  -- Filter Criteria Used (snapshot at purchase time)
  filters JSONB NOT NULL, -- Same structure as audience_filters.filters

  -- Purchase Details
  contact_count INTEGER NOT NULL, -- Number of contacts purchased
  cost_per_contact NUMERIC(10,4) NOT NULL DEFAULT 0.15, -- Our cost from Data Axle
  total_cost NUMERIC(12,2) NOT NULL, -- cost_per_contact × contact_count
  user_charge_per_contact NUMERIC(10,4) NOT NULL DEFAULT 0.25, -- What we charge user
  total_user_charge NUMERIC(12,2) NOT NULL, -- user_charge_per_contact × contact_count
  margin NUMERIC(12,2) GENERATED ALWAYS AS (total_user_charge - total_cost) STORED, -- Profit

  -- Provider Information
  provider TEXT NOT NULL DEFAULT 'data_axle', -- data_axle, csv_upload, manual_entry
  provider_transaction_id TEXT, -- External transaction ID if available

  -- Campaign Association (optional - contacts can be purchased without immediate campaign)
  campaign_id UUID, -- Link to campaign if used immediately
  -- Note: campaign_id references campaign table not defined in this migration

  -- Contact Data (stored for compliance and audit)
  contact_data JSONB, -- Array of purchased contact objects from Data Axle
  -- Example: [{ "person_id": "123", "first_name": "John", "last_name": "Doe", "email": "...", ... }]
  contact_data_encrypted BOOLEAN DEFAULT false, -- Flag if PII is encrypted

  -- Purchase Status
  status TEXT DEFAULT 'completed', -- pending, processing, completed, failed, refunded
  error_message TEXT, -- If purchase failed
  refund_amount NUMERIC(12,2), -- If refunded
  refunded_at TIMESTAMPTZ,

  -- Timestamps
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_purchases_org
  ON contact_purchases(organization_id, purchased_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_purchases_user
  ON contact_purchases(purchased_by, purchased_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_purchases_audience
  ON contact_purchases(audience_filter_id, purchased_at DESC)
  WHERE audience_filter_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contact_purchases_campaign
  ON contact_purchases(campaign_id)
  WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contact_purchases_status
  ON contact_purchases(organization_id, status, purchased_at DESC);

-- GIN index for contact_data queries (if needed for advanced analytics)
CREATE INDEX IF NOT EXISTS idx_contact_purchases_data
  ON contact_purchases USING GIN (contact_data);

-- Cost analytics index
CREATE INDEX IF NOT EXISTS idx_contact_purchases_costs
  ON contact_purchases(organization_id, purchased_at DESC, total_cost, total_user_charge);

-- ============================================================================
-- 3. ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE audience_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_purchases ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: AUDIENCE_FILTERS
-- ============================================================================

-- Policy: Users can view their organization's audience filters
CREATE POLICY "Users can view organization audience filters"
  ON audience_filters FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can create audience filters in their organization
CREATE POLICY "Users can create audience filters"
  ON audience_filters FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can update their own audience filters
CREATE POLICY "Users can update own audience filters"
  ON audience_filters FOR UPDATE
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

-- Policy: Admins can update any audience filter in their org
CREATE POLICY "Admins can update organization audience filters"
  ON audience_filters FOR UPDATE
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

-- Policy: Owners can delete audience filters (soft delete)
CREATE POLICY "Owners can delete audience filters"
  ON audience_filters FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'owner'
    )
  );

-- ============================================================================
-- RLS POLICIES: CONTACT_PURCHASES
-- ============================================================================

-- Policy: Users can view their organization's contact purchases
CREATE POLICY "Users can view organization contact purchases"
  ON contact_purchases FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can create contact purchases in their organization
CREATE POLICY "Users can create contact purchases"
  ON contact_purchases FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Policy: Only system/admins can update contact purchases (for refunds/status changes)
CREATE POLICY "Admins can update contact purchases"
  ON contact_purchases FOR UPDATE
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

-- Policy: No one can delete contact purchases (audit trail requirement)
-- Purchases are permanent records for financial/legal compliance

-- ============================================================================
-- 4. TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================

-- Trigger to update updated_at timestamp on audience_filters
CREATE TRIGGER update_audience_filters_updated_at
  BEFORE UPDATE ON audience_filters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at timestamp on contact_purchases
CREATE TRIGGER update_contact_purchases_updated_at
  BEFORE UPDATE ON contact_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. HELPER FUNCTION FOR UPDATED_AT (if not already exists)
-- ============================================================================

-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE audience_filters IS 'Saved audience targeting segments with Data Axle filters';
COMMENT ON TABLE contact_purchases IS 'Contact purchase history and usage tracking for billing/analytics';

COMMENT ON COLUMN audience_filters.filters IS 'JSONB filter criteria matching Data Axle API format';
COMMENT ON COLUMN audience_filters.last_count IS 'Cached audience size from FREE Data Axle count API';
COMMENT ON COLUMN contact_purchases.margin IS 'Auto-calculated profit: (total_user_charge - total_cost)';
COMMENT ON COLUMN contact_purchases.contact_data IS 'Purchased contact records from Data Axle (may be encrypted)';

-- Migration complete!
-- Next steps:
-- 1. Create Supabase query functions in lib/database/audience-queries.ts
-- 2. Create API routes for /api/audience/count and /api/audience/save
-- 3. Wire up UI components to real API endpoints
