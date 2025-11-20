#!/bin/bash
# Script to replace SQLite imports with Supabase versions
# This fixes the 14 files importing deleted SQLite database files

echo "🔧 Fixing SQLite imports across codebase..."

# Replace call-tracking-queries imports with Supabase version
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "./node_modules/*" -exec sed -i \
  "s|from '@/lib/database/call-tracking-queries'|from '@/lib/database/call-tracking-supabase-queries'|g" {} +

# Replace connection.ts imports (should use createServiceClient instead)
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "./node_modules/*" -exec sed -i \
  "s|from '@/lib/database/connection'|from '@/lib/supabase/server'|g" {} +

# Replace getDatabase() calls with createServiceClient()
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "./node_modules/*" -exec sed -i \
  "s|getDatabase()|createServiceClient()|g" {} +

# Update function names (SQLite → Supabase versions)
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "./node_modules/*" -exec sed -i \
  "s|upsertElevenLabsCall|upsertElevenLabsCallSupabase|g" {} +

find . -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "./node_modules/*" -exec sed -i \
  "s|attributeCallToCampaign|attributeCallToCampaignSupabase|g" {} +

echo "✅ Import replacements complete!"
echo ""
echo "⚠️  MANUAL FIXES REQUIRED:"
echo "   1. Update webhook to handle organization_id (can be NULL initially)"
echo "   2. Make async calls await (Supabase functions are async)"
echo "   3. Handle Promise return types instead of direct values"
echo ""
echo "📋 Files affected:"
grep -l "call-tracking-supabase-queries" --include="*.ts" --include="*.tsx" -r . 2>/dev/null | grep -v node_modules | head -20
