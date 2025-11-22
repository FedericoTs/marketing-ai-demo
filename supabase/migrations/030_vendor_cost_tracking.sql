/**
 * Migration 030: Vendor Cost Tracking System
 *
 * Tracks costs owed to external vendors (Data Axle, PostGrid).
 * Enables DropLab to monitor margins and automate vendor payments.
 *
 * Phase 9.2.16 - One-Time Credit Purchase System
 */

-- Create vendor_costs table
CREATE TABLE IF NOT EXISTS vendor_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL CHECK (vendor_name IN ('data_axle', 'postgrid')),
  service_type TEXT NOT NULL, -- 'contacts', 'printing', 'postage', etc.

  -- Cost tracking
  cost_amount NUMERIC(12, 2) NOT NULL, -- What DropLab owes to vendor (in dollars)
  credits_charged NUMERIC(12, 2) NOT NULL, -- What user was charged (in credits/dollars)
  margin_amount NUMERIC(12, 2) GENERATED ALWAYS AS (credits_charged - cost_amount) STORED,
  margin_percentage NUMERIC(5, 2) GENERATED ALWAYS AS (
    CASE
      WHEN credits_charged > 0 THEN ((credits_charged - cost_amount) / credits_charged * 100)
      ELSE 0
    END
  ) STORED,

  -- Transaction references
  transaction_id TEXT, -- External vendor transaction ID
  internal_reference_id UUID, -- Links to audience_purchases, print_jobs, etc.
  internal_reference_type TEXT, -- 'audience_purchase', 'print_job', etc.

  -- Payment status
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'disputed')),
  paid_at TIMESTAMPTZ,
  payment_method TEXT, -- 'prepaid_wallet', 'invoice', 'credit_card'

  -- Metadata
  quantity INTEGER, -- Number of contacts, postcards, etc.
  unit_cost NUMERIC(12, 2), -- Cost per unit
  metadata JSONB DEFAULT '{}', -- Additional vendor-specific data

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE vendor_costs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Admin-only access by default)
-- Regular users should NOT see vendor costs (competitive information)
-- Only service role and admin users can view

CREATE POLICY "Service role can view all vendor costs"
  ON vendor_costs
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert vendor costs"
  ON vendor_costs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update vendor costs"
  ON vendor_costs
  FOR UPDATE
  TO service_role
  USING (true);

-- Create indexes for performance
CREATE INDEX idx_vendor_costs_organization ON vendor_costs(organization_id);
CREATE INDEX idx_vendor_costs_vendor ON vendor_costs(vendor_name);
CREATE INDEX idx_vendor_costs_payment_status ON vendor_costs(payment_status);
CREATE INDEX idx_vendor_costs_created ON vendor_costs(created_at DESC);
CREATE INDEX idx_vendor_costs_reference ON vendor_costs(internal_reference_type, internal_reference_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_vendor_costs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_vendor_costs_updated_at
  BEFORE UPDATE ON vendor_costs
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_costs_updated_at();

-- Add comment
COMMENT ON TABLE vendor_costs IS 'Tracks costs owed to external vendors (Data Axle, PostGrid) for margin analysis and payment automation';
