-- Migration 013: Increase free trial credits to $25,000
-- Created: 2025-11-06
-- Purpose: Give users more credits to test purchase functionality

-- Update default value for new organizations
ALTER TABLE organizations
ALTER COLUMN credits SET DEFAULT 25000.00;

-- Update existing organizations to $25,000 (if they haven't spent any credits yet)
UPDATE organizations
SET credits = 25000.00
WHERE total_credits_spent = 0 AND credits < 25000.00;

-- Verification
DO $$
DECLARE
  org_count INTEGER;
  min_credits NUMERIC;
  max_credits NUMERIC;
  avg_credits NUMERIC;
BEGIN
  SELECT
    COUNT(*),
    MIN(credits),
    MAX(credits),
    AVG(credits)
  INTO org_count, min_credits, max_credits, avg_credits
  FROM organizations;

  RAISE NOTICE '=== Credit Balance Summary ===';
  RAISE NOTICE 'Total organizations: %', org_count;
  RAISE NOTICE 'Minimum credits: $%', min_credits;
  RAISE NOTICE 'Maximum credits: $%', max_credits;
  RAISE NOTICE 'Average credits: $%', ROUND(avg_credits, 2);
  RAISE NOTICE '=============================';
END $$;
