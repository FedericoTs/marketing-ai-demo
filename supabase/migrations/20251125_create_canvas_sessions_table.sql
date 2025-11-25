-- Canvas Sessions Table for Editor State
-- Stores temporary session data for the Fabric.js canvas editor
-- Replaces SQLite canvas_sessions table

CREATE TABLE IF NOT EXISTS canvas_sessions (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  background_image TEXT NOT NULL,
  qr_code_data_url TEXT NOT NULL,
  tracking_id TEXT NOT NULL,
  landing_page_url TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_lastname TEXT NOT NULL,
  recipient_address TEXT DEFAULT '',
  recipient_city TEXT DEFAULT '',
  recipient_zip TEXT DEFAULT '',
  message TEXT NOT NULL,
  company_name TEXT NOT NULL,
  campaign_name TEXT,
  logo_url TEXT,
  primary_color TEXT,
  text_color TEXT,
  canvas_width INTEGER NOT NULL,
  canvas_height INTEGER NOT NULL,
  phone_number TEXT NOT NULL,
  dm_template_id UUID REFERENCES dm_templates(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by ID (primary use case)
CREATE INDEX IF NOT EXISTS idx_canvas_sessions_id ON canvas_sessions(id);

-- Index for organization filtering (for cleanup/admin)
CREATE INDEX IF NOT EXISTS idx_canvas_sessions_org ON canvas_sessions(organization_id);

-- Index for cleanup of old sessions
CREATE INDEX IF NOT EXISTS idx_canvas_sessions_created_at ON canvas_sessions(created_at);

-- Row Level Security
ALTER TABLE canvas_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access canvas sessions for their organization
CREATE POLICY "Users can manage canvas sessions for their organization"
  ON canvas_sessions
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Policy: Service role can access all canvas sessions (for API routes)
CREATE POLICY "Service role can access all canvas sessions"
  ON canvas_sessions
  FOR ALL
  TO service_role
  USING (true);

-- Add comment
COMMENT ON TABLE canvas_sessions IS 'Temporary session storage for Fabric.js canvas editor state';
