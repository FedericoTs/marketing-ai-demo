-- ============================================================================
-- Migration 028: Blank Company Profile for New Users
-- Created: 2025-11-21
-- Purpose: Remove default brand kit values so new users start with a blank slate
-- Impact: New organizations will have NULL brand colors/fonts instead of defaults
-- ============================================================================

-- Remove default brand kit values (colors, fonts)
-- This ensures new users see blank fields in settings page ready to be filled
ALTER TABLE organizations
  ALTER COLUMN brand_primary_color DROP DEFAULT,
  ALTER COLUMN brand_secondary_color DROP DEFAULT,
  ALTER COLUMN brand_accent_color DROP DEFAULT,
  ALTER COLUMN brand_font_headline DROP DEFAULT,
  ALTER COLUMN brand_font_body DROP DEFAULT;

-- Also remove brand_logo_url default if it exists
ALTER TABLE organizations
  ALTER COLUMN brand_logo_url DROP DEFAULT;

-- Keep these operational defaults (billing and limits)
-- - plan_tier DEFAULT 'free'
-- - billing_status DEFAULT 'active'
-- - monthly_design_limit DEFAULT 100
-- - monthly_sends_limit DEFAULT 1000
-- - storage_limit_mb DEFAULT 1000
-- - credits DEFAULT 0.00 (or 25000 from migration 013)
-- - brand_voice_guidelines DEFAULT '{}'::jsonb

COMMENT ON COLUMN organizations.brand_primary_color IS 'Primary brand color (hex). NULL = not set yet.';
COMMENT ON COLUMN organizations.brand_secondary_color IS 'Secondary brand color (hex). NULL = not set yet.';
COMMENT ON COLUMN organizations.brand_accent_color IS 'Accent brand color (hex). NULL = not set yet.';
COMMENT ON COLUMN organizations.brand_font_headline IS 'Brand headline font name. NULL = not set yet.';
COMMENT ON COLUMN organizations.brand_font_body IS 'Brand body font name. NULL = not set yet.';
COMMENT ON COLUMN organizations.brand_logo_url IS 'Brand logo URL. NULL = not uploaded yet.';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 028 applied successfully';
  RAISE NOTICE 'ℹ️  Brand kit fields now default to NULL for new organizations';
  RAISE NOTICE 'ℹ️  Existing organizations retain their current values';
  RAISE NOTICE 'ℹ️  New users will see blank company profile ready to be filled';
END $$;
