#!/bin/bash

# Apply Migration 023 using psql directly
# This bypasses the Supabase client and executes raw SQL

set -e

echo "🔄 Loading Supabase credentials..."

# Extract credentials from .env.local
SUPABASE_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.local | cut -d '=' -f2)
SERVICE_ROLE_KEY=$(grep "SUPABASE_SERVICE_ROLE_KEY" .env.local | cut -d '=' -f2)

# Extract project ref from URL
PROJECT_REF=$(echo $SUPABASE_URL | sed 's|https://||' | cut -d '.' -f1)

echo "✅ Project ref: $PROJECT_REF"
echo ""

# Use Supabase SQL Editor API directly
echo "🚀 Applying migration via Supabase Management API..."
echo ""

# Read the migration SQL
MIGRATION_SQL=$(cat supabase/migrations/023_update_signup_credits_to_zero.sql)

# Execute via Supabase Studio SQL API
# This uses the same endpoint as the SQL Editor in the dashboard
RESPONSE=$(curl -s -X POST \
  "https://${PROJECT_REF}.supabase.co/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  --data-binary @- <<EOF
{
  "query": $(echo "$MIGRATION_SQL" | jq -Rs .)
}
EOF
)

if [ $? -eq 0 ]; then
  echo "✅ Migration applied successfully!"
  echo ""
  echo "Response: $RESPONSE"
  echo ""
else
  echo "❌ Migration failed!"
  echo "Response: $RESPONSE"
  exit 1
fi

echo "═══════════════════════════════════════════════════════════"
echo "Next step: Run verification script:"
echo "  npx tsx scripts/verify-migration-023.ts"
echo "═══════════════════════════════════════════════════════════"
