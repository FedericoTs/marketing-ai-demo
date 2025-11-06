-- Migration 015: Create recipient_lists and recipients tables
-- Created: 2025-11-06
-- Purpose: Missing tables for contact/recipient management
-- These tables store recipient lists (from CSV uploads or Data Axle purchases)

-- ============================================================================
-- 1. RECIPIENT_LISTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS recipient_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- List Metadata
  name TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'manual', -- 'csv', 'data_axle', 'manual', 'api'

  -- Data Axle Integration
  data_axle_filters JSONB, -- Filters used if purchased from Data Axle

  -- Statistics
  total_recipients INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recipient_lists_org ON recipient_lists(organization_id);
CREATE INDEX IF NOT EXISTS idx_recipient_lists_created_by ON recipient_lists(created_by);
CREATE INDEX IF NOT EXISTS idx_recipient_lists_source ON recipient_lists(source);

-- ============================================================================
-- 2. RECIPIENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_list_id UUID NOT NULL REFERENCES recipient_lists(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Contact Information
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,

  -- Mailing Address
  address_line1 TEXT NOT NULL DEFAULT '',
  address_line2 TEXT,
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  zip_code TEXT NOT NULL DEFAULT '',
  country TEXT DEFAULT 'US',

  -- Data Axle Integration
  data_axle_id TEXT, -- Original ID from Data Axle if purchased

  -- Additional Data
  metadata JSONB DEFAULT '{}', -- Flexible storage for custom fields (age, income, etc.)

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recipients_list ON recipients(recipient_list_id);
CREATE INDEX IF NOT EXISTS idx_recipients_org ON recipients(organization_id);
CREATE INDEX IF NOT EXISTS idx_recipients_email ON recipients(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recipients_data_axle ON recipients(data_axle_id) WHERE data_axle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recipients_metadata ON recipients USING GIN (metadata);

-- ============================================================================
-- 3. ROW-LEVEL SECURITY
-- ============================================================================

ALTER TABLE recipient_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;

-- recipient_lists policies
CREATE POLICY "Users can view their organization's recipient lists"
  ON recipient_lists FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create recipient lists in their organization"
  ON recipient_lists FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their organization's recipient lists"
  ON recipient_lists FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete their organization's recipient lists"
  ON recipient_lists FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

-- recipients policies
CREATE POLICY "Users can view their organization's recipients"
  ON recipients FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create recipients in their organization"
  ON recipients FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their organization's recipients"
  ON recipients FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete their organization's recipients"
  ON recipients FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

-- ============================================================================
-- 4. GRANT PERMISSIONS TO SERVICE ROLE
-- ============================================================================

-- Service role needs full access for batch operations
GRANT ALL ON recipient_lists TO service_role;
GRANT ALL ON recipients TO service_role;

-- ============================================================================
-- 5. UPDATE CONTACT_PURCHASES FOREIGN KEY
-- ============================================================================

-- Add foreign key constraint that was missing
ALTER TABLE contact_purchases
ADD CONSTRAINT contact_purchases_recipient_list_id_fkey
FOREIGN KEY (recipient_list_id)
REFERENCES recipient_lists(id)
ON DELETE SET NULL;

-- ============================================================================
-- 6. UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_recipient_list_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_recipient_lists_updated_at
  BEFORE UPDATE ON recipient_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_recipient_list_timestamp();

CREATE OR REPLACE FUNCTION update_recipient_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_recipients_updated_at
  BEFORE UPDATE ON recipients
  FOR EACH ROW
  EXECUTE FUNCTION update_recipient_timestamp();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ recipient_lists table created';
  RAISE NOTICE '✅ recipients table created';
  RAISE NOTICE '✅ RLS policies enabled';
  RAISE NOTICE '✅ Foreign key constraint added to contact_purchases';
  RAISE NOTICE '✅ Service role permissions granted';
END $$;
