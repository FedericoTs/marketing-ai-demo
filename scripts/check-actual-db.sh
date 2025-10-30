#!/bin/bash

# Load environment variables
source .env.local

echo "🔍 Checking Supabase Database Tables..."
echo ""
echo "📍 Project URL: $NEXT_PUBLIC_SUPABASE_URL"
echo ""

# Try to access the organizations table
echo "1️⃣ Testing access to 'organizations' table..."
RESPONSE=$(curl -s "https://egccqmlhzqiirovstpal.supabase.co/rest/v1/organizations?select=*&limit=1" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY")

if echo "$RESPONSE" | grep -q "Could not find"; then
  echo "❌ Table 'organizations' NOT FOUND in PostgREST"
  echo "   Error: $RESPONSE"
elif echo "$RESPONSE" | grep -q "error"; then
  echo "⚠️  Access issue: $RESPONSE"
else
  echo "✅ Table 'organizations' accessible"
  echo "   Response: $RESPONSE"
fi

echo ""
echo "2️⃣ Testing access to 'user_profiles' table..."
RESPONSE=$(curl -s "https://egccqmlhzqiirovstpal.supabase.co/rest/v1/user_profiles?select=*&limit=1" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY")

if echo "$RESPONSE" | grep -q "Could not find"; then
  echo "❌ Table 'user_profiles' NOT FOUND in PostgREST"
  echo "   Error: $RESPONSE"
elif echo "$RESPONSE" | grep -q "error"; then
  echo "⚠️  Access issue: $RESPONSE"
else
  echo "✅ Table 'user_profiles' accessible"
  echo "   Response: $RESPONSE"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔍 DIAGNOSIS:"
echo ""

if echo "$RESPONSE" | grep -q "Could not find"; then
  echo "❌ MIGRATIONS NOT APPLIED TO SUPABASE!"
  echo ""
  echo "The tables do NOT exist in your remote Supabase database."
  echo "You need to apply the migrations manually."
  echo ""
  echo "📋 SOLUTION:"
  echo "1. Open: https://supabase.com/dashboard/project/egccqmlhzqiirovstpal/sql/new"
  echo "2. Copy ALL content from: supabase/all_migrations_combined.sql"
  echo "3. Paste into SQL Editor"
  echo "4. Click 'RUN' button"
  echo ""
else
  echo "✅ Tables exist but PostgREST cache needs reload"
  echo ""
  echo "📋 SOLUTION:"
  echo "1. Open: https://supabase.com/dashboard/project/egccqmlhzqiirovstpal/settings/api"
  echo "2. Scroll to 'Schema' section"
  echo "3. Click 'Reload schema' button"
  echo ""
fi
