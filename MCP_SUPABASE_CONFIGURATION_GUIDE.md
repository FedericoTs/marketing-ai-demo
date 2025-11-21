# Supabase MCP Server Configuration Guide

**Purpose**: Enable Claude Code to autonomously execute Supabase migrations and queries

---

## 🎯 Current Issue

The Supabase MCP server is returning "Unauthorized" when trying to execute SQL:

```
mcp__supabase__execute_sql → Error: Unauthorized
```

This means the MCP server doesn't have the correct Supabase credentials configured.

---

## 🔑 Required Credentials

From your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://egccqmlhzqiirovstpal.supabase.co
SUPABASE_SERVICE_ROLE_KEY=***REMOVED***
```

**Project ID**: `egccqmlhzqiirovstpal`

---

## ⚙️ MCP Server Configuration Methods

### Method 1: Claude Code Settings (Recommended)

The Supabase MCP server is configured through Claude Code's settings, which is separate from your project.

#### Step 1: Access Claude Code MCP Settings

**Location depends on your setup**:

- **VS Code Extension**: Settings → Extensions → Claude Code → MCP Servers
- **CLI**: `~/.config/claude-code/mcp.json` or similar
- **Desktop App**: Preferences → MCP Servers

#### Step 2: Configure Supabase MCP Server

Add or update the Supabase MCP server configuration:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server"],
      "env": {
        "SUPABASE_URL": "https://egccqmlhzqiirovstpal.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "***REMOVED***"
      }
    }
  }
}
```

#### Step 3: Restart Claude Code

After saving the configuration, restart Claude Code to reload the MCP servers.

#### Step 4: Verify Configuration

Test with a simple query:

```
Can you list all tables in my Supabase database?
```

Expected response should show tables like:
- organizations
- user_profiles
- design_templates
- etc.

---

### Method 2: Environment Variables

If Claude Code supports reading from environment variables:

```bash
# Add to your shell profile (~/.bashrc, ~/.zshrc, etc.)
export SUPABASE_URL="https://egccqmlhzqiirovstpal.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="***REMOVED***"

# Reload shell
source ~/.bashrc  # or ~/.zshrc
```

Then restart Claude Code.

---

### Method 3: Project-Local MCP Config

Some MCP implementations support project-local configuration:

Create `.mcp/config.json` in your project root:

```json
{
  "supabase": {
    "url": "https://egccqmlhzqiirovstpal.supabase.co",
    "serviceRoleKey": "***REMOVED***"
  }
}
```

---

## 🧪 Testing MCP Configuration

After configuration, test these commands:

### Test 1: List Tables
```
Show me all tables in the database
```

### Test 2: Simple Query
```sql
SELECT COUNT(*) FROM organizations;
```

### Test 3: Execute Function
```sql
SELECT proname FROM pg_proc WHERE proname = 'handle_new_user_signup';
```

If all work without "Unauthorized" errors, MCP is configured correctly! ✅

---

## ⚡ IMMEDIATE SOLUTION (While Configuring MCP)

**Don't wait for MCP configuration** - apply the migration now via Supabase Dashboard:

### Quick Steps (30 seconds):

1. **Go to**: https://supabase.com/dashboard/project/egccqmlhzqiirovstpal/sql/new

2. **Copy this SQL** (or from file `supabase/migrations/023_update_signup_credits_to_zero.sql`):

```sql
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  user_full_name TEXT;
  user_email TEXT;
  email_domain TEXT;
  org_name TEXT;
  org_slug TEXT;
  is_public_domain BOOLEAN;
  public_domains TEXT[] := ARRAY[
    'gmail.com', 'googlemail.com',
    'yahoo.com', 'yahoo.co.uk', 'yahoo.fr',
    'hotmail.com', 'outlook.com', 'live.com',
    'icloud.com', 'me.com', 'mac.com',
    'protonmail.com', 'proton.me',
    'mail.com', 'aol.com', 'zoho.com',
    'yandex.com', 'gmx.com', 'tutanota.com'
  ];
BEGIN
  user_email := NEW.email;
  email_domain := lower(split_part(user_email, '@', 2));
  user_full_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
    split_part(user_email, '@', 1)
  );
  is_public_domain := email_domain = ANY(public_domains);
  IF is_public_domain THEN
    org_name := user_full_name || '''s Workspace';
    email_domain := NULL;
  ELSE
    org_name := initcap(replace(regexp_replace(split_part(email_domain, '.', 1), '-', ' ', 'g'), '_', ' '));
  END IF;
  org_slug := generate_org_slug_from_email(user_email);

  BEGIN
    INSERT INTO organizations (
      name, slug, email_domain, plan_tier, billing_status, credits,
      monthly_design_limit, monthly_sends_limit, created_at, updated_at
    ) VALUES (
      org_name, org_slug, email_domain, 'free', 'incomplete', 0.00,
      0, 0, NOW(), NOW()
    ) RETURNING id INTO new_org_id;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Organization slug conflict. Please try signing up again.';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to create organization: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO user_profiles (
      id, organization_id, full_name, email, role, platform_role,
      can_create_designs, can_send_campaigns, can_manage_billing,
      can_invite_users, can_approve_designs, can_manage_templates,
      can_access_analytics, created_at, updated_at, last_active_at
    ) VALUES (
      NEW.id, new_org_id, user_full_name, user_email, 'owner', 'user',
      true, true, true, true, true, true, true, NOW(), NOW(), NOW()
    );
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE EXCEPTION 'Failed to link user to organization.';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to create user profile: %', SQLERRM;
  END;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'SIGNUP ERROR for email %: %', user_email, SQLERRM;
    RAISE EXCEPTION 'Account creation error. Please try again or contact support@droplab.com';
END;
$$;
```

3. **Click "▶ Run"**

4. **Verify Success** - You should see:
   - Query executed successfully
   - No errors

5. **Test**:
```sql
SELECT credits, monthly_design_limit, monthly_sends_limit, billing_status
FROM organizations
WHERE stripe_customer_id IS NOT NULL
ORDER BY created_at DESC LIMIT 1;
```

Expected (for NEW signups after migration):
```json
{
  "credits": "0.00",
  "monthly_design_limit": 0,
  "monthly_sends_limit": 0,
  "billing_status": "incomplete"
}
```

---

## 📚 Additional Resources

- **Supabase MCP Server**: https://github.com/supabase/mcp-server
- **Claude Code MCP Docs**: Check Claude Code documentation for MCP configuration
- **Your Dashboard**: https://supabase.com/dashboard/project/egccqmlhzqiirovstpal

---

## 🔍 Troubleshooting MCP

### Issue: Still getting "Unauthorized"

**Diagnostic Steps**:

1. Check MCP server logs (if available)
2. Verify service role key hasn't expired
3. Try regenerating service role key from Supabase Dashboard
4. Ensure no typos in configuration
5. Restart Claude Code completely

### Issue: MCP tools not appearing

**Diagnostic Steps**:

1. Check if `@supabase/mcp-server` is installed
2. Run: `npx -y @supabase/mcp-server --version`
3. If fails, install: `npm install -g @supabase/mcp-server`
4. Restart Claude Code

---

**Last Updated**: 2025-11-20
**Status**: ⏳ Awaiting User Configuration
**Quick Win**: Use Supabase Dashboard SQL Editor (30 seconds) while configuring MCP for future use
