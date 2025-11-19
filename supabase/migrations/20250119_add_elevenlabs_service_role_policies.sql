-- Add service_role policies for elevenlabs_calls table
-- Service role should have full access for API routes that manually filter by organization_id

-- Allow service_role to SELECT all records
CREATE POLICY "Service role can view all calls"
  ON elevenlabs_calls FOR SELECT
  TO service_role
  USING (true);

-- Allow service_role to INSERT all records
CREATE POLICY "Service role can insert calls"
  ON elevenlabs_calls FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow service_role to UPDATE all records
CREATE POLICY "Service role can update calls"
  ON elevenlabs_calls FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow service_role to DELETE all records
CREATE POLICY "Service role can delete calls"
  ON elevenlabs_calls FOR DELETE
  TO service_role
  USING (true);
