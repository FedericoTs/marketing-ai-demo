-- Migration 010: Add RLS policies and permissions for pricing_tiers and admin_audit_log
-- Created: 2025-11-06
-- Purpose: Enable admin-only access to pricing tiers via service role

-- ============================================================================
-- PART 1: Enable RLS (but allow service role to bypass)
-- ============================================================================

-- Enable RLS on pricing_tiers
ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;

-- Enable RLS on admin_audit_log
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: Grant service role full access (bypasses RLS)
-- ============================================================================

-- Service role needs full access to manage pricing tiers
GRANT ALL ON pricing_tiers TO service_role;
GRANT ALL ON admin_audit_log TO service_role;

-- Grant usage on sequences if they exist
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================================
-- PART 3: Authenticated users can READ active pricing tiers (for count API)
-- ============================================================================

-- Allow authenticated users to read active pricing tiers
-- This is needed for the audience count API to calculate costs
CREATE POLICY "Authenticated users can read active pricing tiers"
  ON pricing_tiers
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Allow public access to the pricing function (needed for audience count API)
-- This is safe because it only returns pricing info, not sensitive data
GRANT EXECUTE ON FUNCTION get_pricing_for_count(INTEGER) TO authenticated, anon;

-- ============================================================================
-- PART 4: Insert default pricing tiers (idempotent)
-- ============================================================================

-- Insert default tiers if they don't exist
INSERT INTO pricing_tiers (name, description, min_contacts, max_contacts, cost_per_contact, user_cost_per_contact, is_active)
VALUES
  ('Small Campaign', 'Best for testing and small targeted campaigns', 1, 10000, 0.20, 0.35, true),
  ('Medium Campaign', 'Ideal for regional campaigns and moderate outreach', 10001, 50000, 0.15, 0.25, true),
  ('Large Campaign', 'Perfect for national campaigns and large-scale outreach', 50001, 250000, 0.12, 0.20, true),
  ('Enterprise', 'Maximum value for enterprise-scale campaigns', 250001, NULL, 0.10, 0.18, true)
ON CONFLICT (min_contacts, max_contacts) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify pricing tiers exist
DO $$
DECLARE
  tier_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO tier_count FROM pricing_tiers;
  RAISE NOTICE 'Total pricing tiers in database: %', tier_count;

  IF tier_count < 4 THEN
    RAISE WARNING 'Expected at least 4 pricing tiers, found %', tier_count;
  END IF;
END $$;
