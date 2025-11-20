-- Create elevenlabs_calls table for passive call tracking
-- This table stores call data from ElevenLabs webhooks (Option 1: Passive tracking only)
-- No self-serve call initiate - users contact company directly for setup

CREATE TABLE IF NOT EXISTS elevenlabs_calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  elevenlabs_call_id TEXT NOT NULL UNIQUE,
  agent_id TEXT,
  phone_number TEXT,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES recipients(id) ON DELETE SET NULL,
  call_status TEXT DEFAULT 'unknown',
  call_duration_seconds INTEGER,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  call_successful BOOLEAN DEFAULT FALSE,
  appointment_booked BOOLEAN DEFAULT FALSE,
  conversion_value NUMERIC(10,2),
  transcript TEXT,
  summary TEXT,
  sentiment TEXT,
  intent_detected TEXT,
  raw_data JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_elevenlabs_calls_org ON elevenlabs_calls(organization_id);
CREATE INDEX idx_elevenlabs_calls_campaign ON elevenlabs_calls(campaign_id);
CREATE INDEX idx_elevenlabs_calls_recipient ON elevenlabs_calls(recipient_id);
CREATE INDEX idx_elevenlabs_calls_phone ON elevenlabs_calls(phone_number);
CREATE INDEX idx_elevenlabs_calls_start_time ON elevenlabs_calls(start_time);
CREATE INDEX idx_elevenlabs_calls_status ON elevenlabs_calls(call_status);

-- Enable RLS
ALTER TABLE elevenlabs_calls ENABLE ROW LEVEL SECURITY;

-- Users can view calls from their organization
CREATE POLICY "Users can view own organization calls"
  ON elevenlabs_calls FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER set_elevenlabs_calls_updated_at
  BEFORE UPDATE ON elevenlabs_calls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comment on table
COMMENT ON TABLE elevenlabs_calls IS 'Tracks inbound/outbound calls from ElevenLabs ConvAI via webhooks. Passive tracking only - no self-serve call initiate (users contact company directly).';
COMMENT ON COLUMN elevenlabs_calls.elevenlabs_call_id IS 'Unique conversation ID from ElevenLabs API';
COMMENT ON COLUMN elevenlabs_calls.call_status IS 'Status: success, failure, or unknown';
COMMENT ON COLUMN elevenlabs_calls.raw_data IS 'Full API response from ElevenLabs for debugging';
