# 🚀 Apply Database Migrations to Supabase

## ❌ Problem Identified

**Migrations were NEVER applied to your Supabase database.**

Diagnostic check confirmed:
- ❌ `organizations` table: NOT FOUND
- ❌ `user_profiles` table: NOT FOUND
- ❌ `design_templates` table: NOT FOUND
- ❌ `design_assets` table: NOT FOUND

## ✅ Solution: Apply Migrations Manually

### Step 1: Open Supabase SQL Editor (10 seconds)

1. Click this link: https://supabase.com/dashboard/project/egccqmlhzqiirovstpal/sql/new
2. You'll see a blank SQL editor

### Step 2: Copy Migration SQL (10 seconds)

**Option A: From File**
1. Open `supabase/all_migrations_combined.sql` in your code editor
2. Select ALL content (Ctrl+A / Cmd+A)
3. Copy (Ctrl+C / Cmd+C)

**Option B: From Command Line**
```bash
cat supabase/all_migrations_combined.sql | pbcopy  # Mac
cat supabase/all_migrations_combined.sql | clip.exe  # Windows/WSL
```

### Step 3: Paste and Run (20 seconds)

1. Paste into the Supabase SQL Editor (Ctrl+V / Cmd+V)
2. Click **"RUN"** button (bottom right corner)
3. Wait for execution (~15-20 seconds for 2352 lines)
4. Look for ✅ "Success. No rows returned" message

### Step 4: Verify Tables Created (5 seconds)

After successful execution, verify in Supabase Dashboard:

1. Go to **Table Editor**: https://supabase.com/dashboard/project/egccqmlhzqiirovstpal/editor
2. You should now see in the sidebar:
   - ✅ `organizations`
   - ✅ `user_profiles`
   - ✅ `design_templates`
   - ✅ `design_assets`
   - ✅ `brand_kits` (bonus table)
   - ✅ `campaigns` (bonus table)
   - ✅ `dm_generations` (bonus table)
   - ✅ `landing_pages` (bonus table)

### Step 5: Reload Schema Cache (10 seconds)

**Important**: After creating tables, PostgREST needs to refresh its cache.

1. Go to: https://supabase.com/dashboard/project/egccqmlhzqiirovstpal/settings/api
2. Scroll to **"Schema"** section
3. Click **"Reload schema"** button
4. Wait for confirmation toast

### Step 6: Verify Migrations Applied (10 seconds)

Run this command in your terminal:

```bash
bash scripts/check-actual-db.sh
```

**Expected output:**
```
✅ Table 'organizations' accessible
✅ Table 'user_profiles' accessible
```

---

## 🌱 Next Steps After Migrations

Once migrations are applied successfully:

### 1. Create Seed Data
```bash
node scripts/create-seed-data.js
```

This creates:
- ✅ 3 test organizations (Acme Corp, TechStart, Local Bakery)
- ✅ 6 test users (2 per organization: owner + admin)

### 2. Test Login
```bash
# Dev server should be running
npm run dev
```

Then open: http://localhost:3000/auth/login

**Test Credentials:**
- `owner@acme-corp.test` / `Test123456!`
- `admin@acme-corp.test` / `Test123456!`
- `owner@techstart.test` / `Test123456!`
- `admin@techstart.test` / `Test123456!`
- `owner@local-bakery.test` / `Test123456!`
- `admin@local-bakery.test` / `Test123456!`

### 3. Verify Multi-Tenant Isolation

1. Log in as `owner@acme-corp.test`
2. Check dashboard shows "Acme Corporation" data
3. Log out
4. Log in as `owner@techstart.test`
5. Check dashboard shows "TechStart Inc" data (NOT Acme data)

✅ If you see different organization data → RLS is working!

---

## 🐛 Troubleshooting

### Issue: "Success. No rows returned" but no tables visible

**Solution**: Refresh the Table Editor page (F5)

### Issue: SQL execution fails with error

**Common errors:**

1. **"relation already exists"**
   - Some tables were partially created
   - Solution: Delete existing tables first:
     ```sql
     DROP TABLE IF EXISTS dm_generations CASCADE;
     DROP TABLE IF EXISTS landing_pages CASCADE;
     DROP TABLE IF EXISTS campaigns CASCADE;
     DROP TABLE IF EXISTS design_assets CASCADE;
     DROP TABLE IF EXISTS design_templates CASCADE;
     DROP TABLE IF EXISTS user_profiles CASCADE;
     DROP TABLE IF EXISTS brand_kits CASCADE;
     DROP TABLE IF EXISTS organizations CASCADE;
     ```
   - Then re-run the migrations

2. **"permission denied"**
   - Check you're logged into the correct Supabase project
   - Verify project ID: `egccqmlhzqiirovstpal`

3. **"timeout"**
   - SQL file too large for one execution
   - Solution: Run migrations individually (001, 002, 003, 004)

### Issue: PostgREST still can't find tables

**Solution**: Wait 2-3 minutes OR reload schema cache manually (Step 5 above)

---

## 📊 What Gets Created

The migrations create **8 tables** with **full multi-tenancy**:

### Core Tables (Phase 1)
1. **organizations** - Multi-tenant root entity
2. **user_profiles** - User roles & permissions
3. **design_templates** - DM design templates
4. **design_assets** - Uploaded images/logos

### Extended Tables (Future Phases)
5. **brand_kits** - Brand identity storage
6. **campaigns** - Marketing campaign tracking
7. **dm_generations** - Direct mail generation history
8. **landing_pages** - Dynamic landing pages

### Security Features
- ✅ Row-Level Security (RLS) on all tables
- ✅ Granular permissions per role
- ✅ Data isolation between organizations
- ✅ Service role bypasses for admin operations

---

## ✅ Success Checklist

- [ ] Migrations SQL pasted and executed
- [ ] "Success. No rows returned" message shown
- [ ] Tables visible in Table Editor
- [ ] Schema cache reloaded
- [ ] Diagnostic script shows tables accessible
- [ ] Seed data created successfully
- [ ] Can log in with test credentials
- [ ] Dashboard shows organization-specific data

---

## 📞 Still Having Issues?

If migrations fail or tables don't appear:

1. **Check logs** in SQL Editor for specific error messages
2. **Verify project**: Make sure you're in `egccqmlhzqiirovstpal`
3. **Try individual migrations**: Run 001, 002, 003, 004 separately from `supabase/migrations/` folder
4. **Check permissions**: Ensure you have admin access to the Supabase project

---

**Total Time**: ~65 seconds (if everything goes smoothly)

**Current Status**: Waiting on you to apply migrations 🚀
