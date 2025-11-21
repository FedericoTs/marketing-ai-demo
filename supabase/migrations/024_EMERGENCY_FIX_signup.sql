-- ============================================================================
-- EMERGENCY FIX: Set Default Values for Missing Columns
-- This allows signup to work immediately without changing the trigger function
-- ============================================================================

-- Set default values for monthly limits columns
ALTER TABLE organizations
ALTER COLUMN monthly_design_limit SET DEFAULT 0;

ALTER TABLE organizations
ALTER COLUMN monthly_sends_limit SET DEFAULT 0;

-- Update existing organizations that might have NULL values
UPDATE organizations
SET monthly_design_limit = 0
WHERE monthly_design_limit IS NULL;

UPDATE organizations
SET monthly_sends_limit = 0
WHERE monthly_sends_limit IS NULL;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ EMERGENCY FIX applied!';
  RAISE NOTICE 'ℹ️  Signup should now work - defaults set for monthly limits';
  RAISE NOTICE 'ℹ️  New organizations will automatically get:';
  RAISE NOTICE '   - monthly_design_limit = 0 (default)';
  RAISE NOTICE '   - monthly_sends_limit = 0 (default)';
  RAISE NOTICE '   - credits = 0.00 (from trigger)';
  RAISE NOTICE '   - billing_status = incomplete (from trigger)';
END $$;
