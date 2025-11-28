-- Add Onboarding Tour Columns to user_profiles
-- Tracks user progress through the onboarding tour

-- Add columns for onboarding tour tracking
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_current_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_skipped BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tour_version TEXT DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS tour_completed_at TIMESTAMP WITH TIME ZONE;

-- Create index for querying users who haven't completed onboarding
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding
ON user_profiles(onboarding_completed, tour_version);

-- Add comment
COMMENT ON COLUMN user_profiles.onboarding_completed IS 'Whether user has completed the onboarding tour';
COMMENT ON COLUMN user_profiles.onboarding_current_step IS 'Current step in the onboarding tour (0-based index)';
COMMENT ON COLUMN user_profiles.onboarding_skipped IS 'Whether user skipped the onboarding tour';
COMMENT ON COLUMN user_profiles.tour_version IS 'Version of tour user has seen (allows re-showing on updates)';
COMMENT ON COLUMN user_profiles.tour_completed_at IS 'Timestamp when tour was completed';
