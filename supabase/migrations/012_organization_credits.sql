-- Migration 012: Add credits system for audience purchases
-- Created: 2025-11-06
-- Purpose: Enable organizations to purchase and track contact credits

-- ============================================================================
-- PART 1: Add credits column to organizations
-- ============================================================================

-- Add credits column with default free trial credits
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS credits NUMERIC(12,2) DEFAULT 1000.00 NOT NULL;

-- Add credits tracking columns
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS total_credits_purchased NUMERIC(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_credits_spent NUMERIC(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS last_credit_purchase_at TIMESTAMPTZ;

-- Add constraint: credits cannot be negative
ALTER TABLE organizations
ADD CONSTRAINT credits_non_negative CHECK (credits >= 0);

-- Create index for credit lookups
CREATE INDEX IF NOT EXISTS idx_organizations_credits ON organizations(credits);

-- ============================================================================
-- PART 2: Create credit transaction log
-- ============================================================================

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Transaction details
  transaction_type TEXT NOT NULL, -- 'purchase', 'spend', 'refund', 'bonus'
  amount NUMERIC(12,2) NOT NULL,
  balance_before NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,

  -- Reference to what caused this transaction
  reference_type TEXT, -- 'contact_purchase', 'stripe_payment', 'admin_adjustment'
  reference_id UUID,

  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_transactions_org ON credit_transactions(organization_id, created_at DESC);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(transaction_type);

-- ============================================================================
-- PART 3: Enable RLS on credit_transactions
-- ============================================================================

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's credit transactions"
  ON credit_transactions FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

-- ============================================================================
-- PART 4: Function to add credits
-- ============================================================================

CREATE OR REPLACE FUNCTION add_credits(
  org_id UUID,
  credit_amount NUMERIC,
  transaction_type TEXT,
  transaction_description TEXT,
  user_id UUID DEFAULT NULL
)
RETURNS credit_transactions AS $$
DECLARE
  current_balance NUMERIC;
  new_balance NUMERIC;
  new_transaction credit_transactions;
BEGIN
  -- Get current balance
  SELECT credits INTO current_balance
  FROM organizations
  WHERE id = org_id
  FOR UPDATE; -- Lock row for update

  -- Calculate new balance
  new_balance := current_balance + credit_amount;

  -- Update organization credits
  UPDATE organizations
  SET
    credits = new_balance,
    total_credits_purchased = CASE
      WHEN transaction_type = 'purchase' THEN total_credits_purchased + credit_amount
      ELSE total_credits_purchased
    END,
    last_credit_purchase_at = CASE
      WHEN transaction_type = 'purchase' THEN NOW()
      ELSE last_credit_purchase_at
    END,
    updated_at = NOW()
  WHERE id = org_id;

  -- Create transaction record
  INSERT INTO credit_transactions (
    organization_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    description,
    created_by
  ) VALUES (
    org_id,
    transaction_type,
    credit_amount,
    current_balance,
    new_balance,
    transaction_description,
    user_id
  ) RETURNING * INTO new_transaction;

  RETURN new_transaction;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 5: Function to spend credits
-- ============================================================================

CREATE OR REPLACE FUNCTION spend_credits(
  org_id UUID,
  credit_amount NUMERIC,
  reference_type TEXT,
  reference_id UUID,
  transaction_description TEXT,
  user_id UUID DEFAULT NULL
)
RETURNS credit_transactions AS $$
DECLARE
  current_balance NUMERIC;
  new_balance NUMERIC;
  new_transaction credit_transactions;
BEGIN
  -- Get current balance
  SELECT credits INTO current_balance
  FROM organizations
  WHERE id = org_id
  FOR UPDATE;

  -- Check sufficient credits
  IF current_balance < credit_amount THEN
    RAISE EXCEPTION 'Insufficient credits. Current balance: %, Required: %', current_balance, credit_amount;
  END IF;

  -- Calculate new balance
  new_balance := current_balance - credit_amount;

  -- Update organization credits
  UPDATE organizations
  SET
    credits = new_balance,
    total_credits_spent = total_credits_spent + credit_amount,
    updated_at = NOW()
  WHERE id = org_id;

  -- Create transaction record
  INSERT INTO credit_transactions (
    organization_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    reference_type,
    reference_id,
    description,
    created_by
  ) VALUES (
    org_id,
    'spend',
    -credit_amount,
    current_balance,
    new_balance,
    reference_type,
    reference_id,
    transaction_description,
    user_id
  ) RETURNING * INTO new_transaction;

  RETURN new_transaction;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 6: Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION add_credits TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION spend_credits TO authenticated, service_role;

-- ============================================================================
-- PART 7: Seed existing organizations with trial credits
-- ============================================================================

-- Give all existing organizations 1000 free trial credits
UPDATE organizations
SET credits = 1000.00
WHERE credits IS NULL OR credits = 0;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  org_count INTEGER;
  total_credits NUMERIC;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(credits), 0)
  INTO org_count, total_credits
  FROM organizations;

  RAISE NOTICE 'Organizations with credits: %', org_count;
  RAISE NOTICE 'Total credits in system: $%', total_credits;
END $$;
