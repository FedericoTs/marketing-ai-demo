-- Migration 029: Demo System Tables
-- Phase 9.2.15 - Interactive Demo System
-- Creates tables for demo postcard submissions and analytics tracking

-- ============================================================================
-- DEMO SUBMISSIONS TABLE
-- ============================================================================
-- Stores demo postcard requests submitted via the marketing landing page
CREATE TABLE IF NOT EXISTS demo_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  demo_code TEXT UNIQUE NOT NULL, -- nanoid(10) for unique tracking
  postcard_image_url TEXT, -- URL to generated postcard image in Supabase Storage
  created_at TIMESTAMPTZ DEFAULT NOW(),
  email_sent_at TIMESTAMPTZ, -- When email was successfully sent
  email_opened BOOLEAN DEFAULT FALSE, -- Tracking pixel detected
  qr_scanned BOOLEAN DEFAULT FALSE, -- Whether QR code was scanned

  -- Metadata
  user_agent TEXT, -- Browser/device info
  ip_address TEXT, -- For analytics (anonymized in production)

  -- Constraints
  CONSTRAINT demo_submissions_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_demo_submissions_demo_code ON demo_submissions(demo_code);
CREATE INDEX IF NOT EXISTS idx_demo_submissions_email ON demo_submissions(email);
CREATE INDEX IF NOT EXISTS idx_demo_submissions_created_at ON demo_submissions(created_at DESC);

-- ============================================================================
-- DEMO EVENTS TABLE
-- ============================================================================
-- Tracks all user interactions with demo landing pages for analytics
CREATE TABLE IF NOT EXISTS demo_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_code TEXT NOT NULL REFERENCES demo_submissions(demo_code) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'qr_scan', 'page_view', 'cta_click', 'form_submit'
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Event metadata
  user_agent TEXT,
  ip_address TEXT,
  referrer TEXT, -- HTTP referrer

  -- Event-specific data (stored as JSONB for flexibility)
  event_data JSONB DEFAULT '{}'::JSONB,

  -- Constraints
  CONSTRAINT demo_events_valid_type CHECK (
    event_type IN ('qr_scan', 'page_view', 'cta_click', 'form_submit', 'email_open')
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_demo_events_demo_code ON demo_events(demo_code);
CREATE INDEX IF NOT EXISTS idx_demo_events_event_type ON demo_events(event_type);
CREATE INDEX IF NOT EXISTS idx_demo_events_created_at ON demo_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_events_demo_code_type ON demo_events(demo_code, event_type);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Demo tables are PUBLIC (no authentication required)
-- However, we enable RLS for future granular control

ALTER TABLE demo_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_events ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read demo submissions (for analytics)
CREATE POLICY "Public read access to demo submissions"
  ON demo_submissions
  FOR SELECT
  USING (true);

-- Policy: Anyone can insert demo submissions (marketing form)
CREATE POLICY "Public insert access to demo submissions"
  ON demo_submissions
  FOR INSERT
  WITH CHECK (true);

-- Policy: Anyone can read demo events (for analytics)
CREATE POLICY "Public read access to demo events"
  ON demo_events
  FOR SELECT
  USING (true);

-- Policy: Anyone can insert demo events (tracking)
CREATE POLICY "Public insert access to demo events"
  ON demo_events
  FOR INSERT
  WITH CHECK (true);

-- Policy: Service role can update demo submissions (email sent status)
CREATE POLICY "Service role can update demo submissions"
  ON demo_submissions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE demo_submissions IS 'Stores demo postcard requests from marketing landing page';
COMMENT ON COLUMN demo_submissions.demo_code IS 'Unique tracking code (nanoid) embedded in QR code';
COMMENT ON COLUMN demo_submissions.postcard_image_url IS 'URL to generated postcard image in Supabase Storage';
COMMENT ON COLUMN demo_submissions.email_opened IS 'Detected via tracking pixel in email';
COMMENT ON COLUMN demo_submissions.qr_scanned IS 'Updated when user visits /demo/[code]';

COMMENT ON TABLE demo_events IS 'Tracks all user interactions with demo landing pages';
COMMENT ON COLUMN demo_events.event_type IS 'Type of event: qr_scan, page_view, cta_click, form_submit, email_open';
COMMENT ON COLUMN demo_events.event_data IS 'Flexible JSONB field for event-specific metadata';
