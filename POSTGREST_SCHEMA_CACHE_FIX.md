# PostgREST Schema Cache Issue - Fix Guide

## Problem

When creating new tables via Supabase migrations, PostgREST's schema cache may not immediately recognize them, causing errors like:

```
Could not find the table 'public.organizations' in the schema cache
```

## Why This Happens

- Supabase uses PostgREST to provide the REST API over PostgreSQL
- PostgREST caches the database schema for performance
- When new tables are added, the cache doesn't automatically refresh
- This is a known limitation of PostgREST's caching mechanism

## Solution: Reload PostgREST Schema Cache

### Method 1: Supabase Dashboard (Recommended - 30 seconds)

1. **Navigate to Project Settings**
   - Open [Supabase Dashboard](https://supabase.com/dashboard/project/egccqmlhzqiirovstpal)
   - Go to **Project Settings** (gear icon in sidebar)

2. **Reload API Schema**
   - Click on **API** section in left menu
   - Scroll down to **"Schema"** section
   - Click **"Reload schema"** button
   - Wait for confirmation toast

3. **Verify Fix**
   ```bash
   curl -X POST http://localhost:3000/api/admin/seed
   ```

### Method 2: PostgreSQL NOTIFY Command (Advanced)

If you have direct PostgreSQL access:

```sql
NOTIFY pgrst, 'reload schema';
```

### Method 3: Wait for Automatic Refresh (5-10 minutes)

PostgREST automatically refreshes its cache every 10 minutes. If you're not in a hurry, just wait and retry.

## Verification

After reloading, verify the tables are accessible:

```bash
# Check schema status
curl http://localhost:3000/api/admin/verify-schema | python3 -m json.tool

# Create seed data
curl -X POST http://localhost:3000/api/admin/seed
```

Expected output: Organizations and users created successfully.

## Prevention

For future migrations:
1. Always reload schema after running migrations
2. Or wait 10 minutes before using new tables
3. Or use Supabase CLI with auto-reload enabled

## Related Links

- [PostgREST Schema Cache Docs](https://postgrest.org/en/stable/references/schema_cache.html)
- [Supabase PostgREST Docs](https://supabase.com/docs/guides/api)
