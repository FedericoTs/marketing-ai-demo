-- =====================================================
-- Migration 009: Pricing Tiers & Admin Dashboard
-- =====================================================
-- Created: 2025-11-06
-- Description: Dynamic pricing configuration for audience targeting
--              with admin-only access control
-- Dependencies: Migration 008 (audience_targeting.sql)
-- =====================================================

-- =====================================================
-- 1. PRICING TIERS TABLE
-- =====================================================
-- Stores configurable pricing based on volume tiers
-- Admin can set different prices for different contact ranges

CREATE TABLE IF NOT EXISTS pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Volume Range
  min_contacts INTEGER NOT NULL,
  max_contacts INTEGER, -- NULL means infinity (e.g., 100,000+)

  -- Pricing
  cost_per_contact NUMERIC(10,4) NOT NULL, -- What we pay Data Axle (e.g., $0.15)
  user_cost_per_contact NUMERIC(10,4) NOT NULL, -- What we charge users (e.g., $0.25)

  -- Metadata
  name TEXT, -- Optional: "Small Campaign", "Enterprise", etc.
  description TEXT, -- Optional: Tier description
  is_active BOOLEAN DEFAULT true, -- Allow disabling tiers without deletion

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT valid_range CHECK (max_contacts IS NULL OR max_contacts > min_contacts),
  CONSTRAINT valid_pricing CHECK (
    cost_per_contact >= 0 AND
    user_cost_per_contact >= 0 AND
    user_cost_per_contact >= cost_per_contact -- Ensure we make a margin
  ),
  CONSTRAINT unique_tier_range UNIQUE (min_contacts, max_contacts)
);

-- =====================================================
-- 2. INDEXES
-- =====================================================

CREATE INDEX idx_pricing_tiers_active
  ON pricing_tiers(is_active)
  WHERE is_active = true;

CREATE INDEX idx_pricing_tiers_range
  ON pricing_tiers(min_contacts, max_contacts)
  WHERE is_active = true;

-- =====================================================
-- 3. RLS POLICIES (Admin-Only Access)
-- =====================================================

ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;

-- Admin users can do everything
-- Note: Admin check is done via application logic (federicosciuca@gmail.com)
-- For now, we'll allow authenticated users to READ, but restrict writes to service role

CREATE POLICY "Anyone can view active pricing tiers"
  ON pricing_tiers FOR SELECT
  USING (is_active = true);

-- Only service role or admin can modify
-- (Application will check if user is federicosciuca@gmail.com before calling API)
CREATE POLICY "Only service role can insert pricing tiers"
  ON pricing_tiers FOR INSERT
  WITH CHECK (false); -- No direct inserts, only via API with admin check

CREATE POLICY "Only service role can update pricing tiers"
  ON pricing_tiers FOR UPDATE
  USING (false); -- No direct updates, only via API with admin check

CREATE POLICY "Only service role can delete pricing tiers"
  ON pricing_tiers FOR DELETE
  USING (false); -- No direct deletes, only via API with admin check

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Function to get pricing for a specific contact count
-- Returns the applicable tier based on volume
CREATE OR REPLACE FUNCTION get_pricing_for_count(contact_count INTEGER)
RETURNS TABLE (
  tier_id UUID,
  cost_per_contact NUMERIC,
  user_cost_per_contact NUMERIC,
  min_contacts INTEGER,
  max_contacts INTEGER,
  tier_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pt.id,
    pt.cost_per_contact,
    pt.user_cost_per_contact,
    pt.min_contacts,
    pt.max_contacts,
    pt.name
  FROM pricing_tiers pt
  WHERE
    pt.is_active = true
    AND contact_count >= pt.min_contacts
    AND (pt.max_contacts IS NULL OR contact_count <= pt.max_contacts)
  ORDER BY pt.min_contacts DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to validate tier ranges don't overlap
CREATE OR REPLACE FUNCTION validate_pricing_tier_ranges()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for overlapping ranges
  IF EXISTS (
    SELECT 1 FROM pricing_tiers
    WHERE
      id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND is_active = true
      AND (
        -- New tier's min is within existing tier's range
        (NEW.min_contacts >= min_contacts AND NEW.min_contacts <= COALESCE(max_contacts, 999999999))
        OR
        -- New tier's max is within existing tier's range
        (COALESCE(NEW.max_contacts, 999999999) >= min_contacts AND COALESCE(NEW.max_contacts, 999999999) <= COALESCE(max_contacts, 999999999))
        OR
        -- New tier completely contains existing tier
        (NEW.min_contacts <= min_contacts AND COALESCE(NEW.max_contacts, 999999999) >= COALESCE(max_contacts, 999999999))
      )
  ) THEN
    RAISE EXCEPTION 'Pricing tier range overlaps with existing tier';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_pricing_tier_ranges_trigger
  BEFORE INSERT OR UPDATE ON pricing_tiers
  FOR EACH ROW
  EXECUTE FUNCTION validate_pricing_tier_ranges();

-- =====================================================
-- 5. SEED DEFAULT PRICING TIERS
-- =====================================================
-- Pre-populate with standard volume-based pricing

INSERT INTO pricing_tiers (name, description, min_contacts, max_contacts, cost_per_contact, user_cost_per_contact, is_active)
VALUES
  (
    'Small Campaign',
    'Best for testing and small targeted campaigns',
    1,
    10000,
    0.20,  -- $0.20 per contact (higher cost for small volumes)
    0.35,  -- $0.35 per contact (charge to user)
    true
  ),
  (
    'Medium Campaign',
    'Ideal for regional campaigns and moderate outreach',
    10001,
    50000,
    0.15,  -- $0.15 per contact (standard cost)
    0.25,  -- $0.25 per contact (charge to user)
    true
  ),
  (
    'Large Campaign',
    'Perfect for national campaigns and large-scale outreach',
    50001,
    250000,
    0.12,  -- $0.12 per contact (volume discount)
    0.20,  -- $0.20 per contact (charge to user)
    true
  ),
  (
    'Enterprise',
    'Maximum value for enterprise-scale campaigns',
    250001,
    NULL,  -- NULL = unlimited
    0.10,  -- $0.10 per contact (best pricing)
    0.18,  -- $0.18 per contact (charge to user)
    true
  )
ON CONFLICT (min_contacts, max_contacts) DO NOTHING;

-- =====================================================
-- 6. UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_pricing_tier_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pricing_tier_timestamp
  BEFORE UPDATE ON pricing_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_pricing_tier_timestamp();

-- =====================================================
-- 7. ADMIN AUDIT LOG (Optional - for future)
-- =====================================================
-- Track all admin actions for security and compliance

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL, -- Email of admin who performed action
  action TEXT NOT NULL, -- "create_tier", "update_tier", "delete_tier", etc.
  resource_type TEXT NOT NULL, -- "pricing_tier", "user", etc.
  resource_id UUID, -- ID of affected resource
  details JSONB, -- Full details of the change
  ip_address TEXT, -- IP address of admin
  user_agent TEXT, -- Browser/device info
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_log_admin
  ON admin_audit_log(admin_email);

CREATE INDEX idx_admin_audit_log_created
  ON admin_audit_log(created_at DESC);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify migration success:

-- Check pricing tiers
-- SELECT * FROM pricing_tiers ORDER BY min_contacts;

-- Test pricing function
-- SELECT * FROM get_pricing_for_count(5000);   -- Should return "Small Campaign"
-- SELECT * FROM get_pricing_for_count(25000);  -- Should return "Medium Campaign"
-- SELECT * FROM get_pricing_for_count(100000); -- Should return "Large Campaign"
-- SELECT * FROM get_pricing_for_count(500000); -- Should return "Enterprise"

-- =====================================================
-- END OF MIGRATION 009
-- =====================================================
