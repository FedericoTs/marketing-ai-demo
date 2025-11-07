-- ============================================================================
-- Fix recipient_lists RLS policies
-- Add fallback policy to allow users to see lists they created
-- ============================================================================

-- Add policy: Users can view recipient lists they created
CREATE POLICY "Users can view recipient lists they created"
  ON recipient_lists FOR SELECT
  USING (created_by = auth.uid());

-- Add policy: Users can view recipients from lists they created
CREATE POLICY "Users can view recipients from lists they created"
  ON recipients FOR SELECT
  USING (
    recipient_list_id IN (
      SELECT id FROM recipient_lists WHERE created_by = auth.uid()
    )
  );
