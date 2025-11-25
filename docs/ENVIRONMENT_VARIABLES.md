# Environment Variables Reference

**DropLab Marketing Platform** - Complete environment variable documentation

**Last Updated**: Phase 5 - Environment Configuration Documentation
**Total Variables**: 40+
**Phases Covered**: Core application + Phases 2-4 infrastructure

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Required Variables](#required-variables)
3. [Optional Variables](#optional-variables)
4. [Phase-Specific Variables](#phase-specific-variables)
5. [Development vs Production](#development-vs-production)
6. [Security Best Practices](#security-best-practices)
7. [Troubleshooting](#troubleshooting)
8. [Variable Reference](#variable-reference)

---

## Quick Start

### Minimum Configuration (Development)

```bash
# Copy example file
cp .env.example .env.local

# Edit .env.local and add at minimum:
OPENAI_API_KEY=sk-proj-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_TYPE=sqlite
```

### Full Configuration (Production)

```bash
# All required + recommended variables
OPENAI_API_KEY=sk-proj-...
NEXT_PUBLIC_APP_URL=https://yourdomain.com
DATABASE_TYPE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Required Variables

These variables are **required** for the application to function:

| Variable | Purpose | Example |
|----------|---------|---------|
| `OPENAI_API_KEY` | AI copywriting & image generation | `sk-proj-...` |
| `NEXT_PUBLIC_APP_URL` | Base URL for QR codes, webhooks | `http://localhost:3000` |
| `DATABASE_TYPE` | Choose `sqlite` or `supabase` | `sqlite` |

### Conditional Requirements

**If `DATABASE_TYPE=supabase`**, also required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**If using billing features**, also required:
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`

---

## Optional Variables

These variables enable additional features but are not required:

### AI & Automation
- `GEMINI_API_KEY` - Alternative AI model (fallback to OpenAI)
- `ELEVENLABS_API_KEY` - Voice AI and phone calls
- `ELEVENLABS_WEBHOOK_SECRET` - Call status webhooks

### Direct Mail Printing
- `POSTGRID_API_KEY_TEST` - Sandbox printing testing
- `POSTGRID_API_KEY_LIVE` - Production printing
- `POSTGRID_WEBHOOK_SECRET` - Delivery tracking

### Audience Targeting
- `DATA_AXLE_API_KEY` - 250M+ consumer contact database (uses mock data if missing)

### Email Notifications
- `RESEND_API_KEY` - Transactional email delivery
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` - Gmail SMTP (alternative to Resend)

### Batch Processing
- `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` - Queue management (falls back to in-memory)
- `BATCH_THRESHOLD` - Campaign count to trigger batch processing (default: 100)
- `BATCH_WORKER_CONCURRENCY` - Parallel workers (default: 2)
- `BATCH_OUTPUT_DIR` - Output directory (default: ./batch-output)
- `USE_PERSISTENT_RENDERING` - Keep browser instances alive (default: true)

### Feature Flags
- `IMAGE_GEN_VERSION` - Image generation quality/aspect ratio (v1 or v2, default: v2)

---

## Phase-Specific Variables

### Phase 2: Error Tracking

**Purpose**: Lightweight error monitoring with severity levels

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_ERROR_TRACKING_ENABLED` | `true` | Enable/disable error tracking |
| `NEXT_PUBLIC_ERROR_LOG_CONSOLE` | `true` (dev) | Log errors to console |
| `NEXT_PUBLIC_ERROR_SAMPLE_RATE` | `1.0` | Track 0.0-1.0 (0-100%) of errors |

**Usage**:
```bash
# Development: Track all errors with console output
NEXT_PUBLIC_ERROR_TRACKING_ENABLED=true
NEXT_PUBLIC_ERROR_LOG_CONSOLE=true
NEXT_PUBLIC_ERROR_SAMPLE_RATE=1.0

# Production: Track 10% of errors silently
NEXT_PUBLIC_ERROR_TRACKING_ENABLED=true
NEXT_PUBLIC_ERROR_LOG_CONSOLE=false
NEXT_PUBLIC_ERROR_SAMPLE_RATE=0.1
```

**Documentation**: `PHASE_2_COMPLETE.md`

---

### Phase 3: Logging Utility

**Purpose**: Structured logging with namespaces, levels, and context

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_LOGGING_ENABLED` | `true` (dev), `false` (prod) | Enable/disable logging |
| `NEXT_PUBLIC_LOG_LEVEL` | `INFO` | Minimum level: DEBUG, INFO, WARN, ERROR, SILENT |
| `NEXT_PUBLIC_LOG_CONTEXT` | `true` | Include context metadata in logs |

**Usage**:
```bash
# Development: Show all logs with context
NEXT_PUBLIC_LOGGING_ENABLED=true
NEXT_PUBLIC_LOG_LEVEL=DEBUG
NEXT_PUBLIC_LOG_CONTEXT=true

# Production: Only errors
NEXT_PUBLIC_LOGGING_ENABLED=true
NEXT_PUBLIC_LOG_LEVEL=ERROR
NEXT_PUBLIC_LOG_CONTEXT=false

# Production: Silent (no logging)
NEXT_PUBLIC_LOGGING_ENABLED=false
NEXT_PUBLIC_LOG_LEVEL=SILENT
```

**Log Levels**:
- `DEBUG` - Detailed debugging info (development only)
- `INFO` - General application flow (recommended default)
- `WARN` - Warning messages (potential issues)
- `ERROR` - Error messages only
- `SILENT` - No logging

**Documentation**: `PHASE_3_COMPLETE.md`

---

### Phase 4: Rate Limiting

**Purpose**: API protection against abuse with sliding window algorithm

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_RATE_LIMITING_ENABLED` | `false` | Enable/disable rate limiting (opt-in) |
| `NEXT_PUBLIC_RATE_LIMIT_MAX_REQUESTS` | `1000` | Max requests per window |
| `NEXT_PUBLIC_RATE_LIMIT_WINDOW_MS` | `60000` | Time window in milliseconds (1 min) |
| `NEXT_PUBLIC_RATE_LIMIT_MESSAGE` | Custom message | Message for rate-limited requests |

**Usage**:
```bash
# Disabled (default) - No rate limiting
NEXT_PUBLIC_RATE_LIMITING_ENABLED=false

# Very Permissive (initial deployment)
NEXT_PUBLIC_RATE_LIMITING_ENABLED=true
NEXT_PUBLIC_RATE_LIMIT_MAX_REQUESTS=1000
NEXT_PUBLIC_RATE_LIMIT_WINDOW_MS=60000

# Moderate Protection (standard production)
NEXT_PUBLIC_RATE_LIMITING_ENABLED=true
NEXT_PUBLIC_RATE_LIMIT_MAX_REQUESTS=100
NEXT_PUBLIC_RATE_LIMIT_WINDOW_MS=60000

# Strict Protection (high security)
NEXT_PUBLIC_RATE_LIMITING_ENABLED=true
NEXT_PUBLIC_RATE_LIMIT_MAX_REQUESTS=30
NEXT_PUBLIC_RATE_LIMIT_WINDOW_MS=60000

# Burst Protection (prevent rapid-fire attacks)
NEXT_PUBLIC_RATE_LIMITING_ENABLED=true
NEXT_PUBLIC_RATE_LIMIT_MAX_REQUESTS=10
NEXT_PUBLIC_RATE_LIMIT_WINDOW_MS=10000
```

**Headers Returned**:
- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Requests remaining
- `X-RateLimit-Reset` - Unix timestamp when limit resets
- `Retry-After` - Seconds to wait (only when rate limited)

**Documentation**: `PHASE_4_COMPLETE.md`

---

## Development vs Production

### Development Environment

```bash
# .env.local (development)

# Core
OPENAI_API_KEY=sk-proj-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_TYPE=sqlite

# Infrastructure (Phases 2-4)
NEXT_PUBLIC_ERROR_TRACKING_ENABLED=true
NEXT_PUBLIC_ERROR_LOG_CONSOLE=true
NEXT_PUBLIC_ERROR_SAMPLE_RATE=1.0
NEXT_PUBLIC_LOGGING_ENABLED=true
NEXT_PUBLIC_LOG_LEVEL=DEBUG
NEXT_PUBLIC_LOG_CONTEXT=true
NEXT_PUBLIC_RATE_LIMITING_ENABLED=false

# Testing Keys (No real charges)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
POSTGRID_API_KEY_TEST=test_sk_...
```

### Production Environment

```bash
# Environment variables in hosting provider (Vercel, Railway, etc.)

# Core
OPENAI_API_KEY=sk-proj-...
NEXT_PUBLIC_APP_URL=https://yourdomain.com
DATABASE_TYPE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# Billing
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Infrastructure (Optimized for production)
NEXT_PUBLIC_ERROR_TRACKING_ENABLED=true
NEXT_PUBLIC_ERROR_LOG_CONSOLE=false
NEXT_PUBLIC_ERROR_SAMPLE_RATE=0.1
NEXT_PUBLIC_LOGGING_ENABLED=true
NEXT_PUBLIC_LOG_LEVEL=ERROR
NEXT_PUBLIC_LOG_CONTEXT=false
NEXT_PUBLIC_RATE_LIMITING_ENABLED=true
NEXT_PUBLIC_RATE_LIMIT_MAX_REQUESTS=100
NEXT_PUBLIC_RATE_LIMIT_WINDOW_MS=60000

# Production Services
POSTGRID_API_KEY_LIVE=live_sk_...
DATA_AXLE_API_KEY=your-api-key-here
RESEND_API_KEY=re_...

# Production Infrastructure
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

---

## Security Best Practices

### 1. Never Commit Secrets

```bash
# ✅ GOOD: .env.local (in .gitignore)
OPENAI_API_KEY=sk-proj-abc123...

# ❌ BAD: Hardcoding in code
const apiKey = 'sk-proj-abc123...'; // NEVER DO THIS

# ✅ GOOD: Use environment variables
const apiKey = process.env.OPENAI_API_KEY;
```

### 2. Use NEXT_PUBLIC_ Prefix Correctly

```bash
# ✅ SAFE: Server-side only (secret)
STRIPE_SECRET_KEY=sk_test_...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# ✅ SAFE: Public (exposed to browser)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# ❌ DANGEROUS: Secret with NEXT_PUBLIC_ prefix
NEXT_PUBLIC_STRIPE_SECRET_KEY=sk_test_...  # EXPOSED TO BROWSER!
```

**Rule**: Only use `NEXT_PUBLIC_` for non-sensitive configuration values. Never use it for API keys, secrets, or credentials.

### 3. Separate Keys per Environment

```bash
# Development
STRIPE_SECRET_KEY=sk_test_...
POSTGRID_API_KEY_TEST=test_sk_...

# Staging
STRIPE_SECRET_KEY=sk_test_staging_...
POSTGRID_API_KEY_TEST=test_sk_staging_...

# Production
STRIPE_SECRET_KEY=sk_live_...
POSTGRID_API_KEY_LIVE=live_sk_...
```

### 4. Rotate Keys Regularly

| Key Type | Rotation Frequency |
|----------|-------------------|
| Stripe Webhook Secrets | After every deployment |
| Supabase Service Role Key | Quarterly (every 3 months) |
| Third-party API Keys | Annually (every 12 months) |
| OpenAI API Key | When compromised or annually |

### 5. Use Environment Variables in Hosting

**Vercel**:
1. Project Settings → Environment Variables
2. Add variables by environment (Development, Preview, Production)
3. Redeploy after adding variables

**Railway**:
1. Project → Variables
2. Add key-value pairs
3. Automatic redeployment

**Netlify**:
1. Site Settings → Build & Deploy → Environment
2. Add variables
3. Trigger deploy

---

## Troubleshooting

### Issue: "API key not found" error

**Cause**: Environment variable not loaded

**Solutions**:
1. Restart dev server: `npm run dev`
2. Check `.env.local` exists (not `.env`)
3. Verify variable name matches exactly (case-sensitive)
4. Check for typos in variable name

```bash
# ✅ Correct
OPENAI_API_KEY=sk-proj-...

# ❌ Wrong
OPENAI_API_KEY =sk-proj-...  # Extra space
openai_api_key=sk-proj-...   # Wrong case
OPENAI_KEY=sk-proj-...       # Wrong name
```

### Issue: "Invalid API key" error

**Cause**: API key is incorrect or expired

**Solutions**:
1. Copy key again from provider dashboard
2. Check for extra spaces or newlines
3. Verify key hasn't been rotated
4. Test key directly with provider's API

### Issue: Changes to .env.local not taking effect

**Cause**: Server caching old environment variables

**Solutions**:
1. Restart dev server (Ctrl+C, then `npm run dev`)
2. Clear `.next` cache: `rm -rf .next`
3. Rebuild: `npm run build`

### Issue: NEXT_PUBLIC_ variable is undefined in browser

**Cause**: Variable added after build

**Solutions**:
1. Restart dev server
2. Rebuild for production: `npm run build`
3. Check browser console for variable value: `console.log(process.env.NEXT_PUBLIC_APP_URL)`

### Issue: Rate limiting blocking legitimate requests

**Cause**: Limits too strict

**Solutions**:
```bash
# Option 1: Disable rate limiting
NEXT_PUBLIC_RATE_LIMITING_ENABLED=false

# Option 2: Increase limits
NEXT_PUBLIC_RATE_LIMIT_MAX_REQUESTS=10000
NEXT_PUBLIC_RATE_LIMIT_WINDOW_MS=60000

# Option 3: Increase window time
NEXT_PUBLIC_RATE_LIMIT_MAX_REQUESTS=100
NEXT_PUBLIC_RATE_LIMIT_WINDOW_MS=300000  # 5 minutes
```

### Issue: Logging not appearing in console

**Cause**: Logging disabled or wrong log level

**Solutions**:
```bash
# Enable logging
NEXT_PUBLIC_LOGGING_ENABLED=true

# Lower log level to see more logs
NEXT_PUBLIC_LOG_LEVEL=DEBUG

# Enable console output
NEXT_PUBLIC_ERROR_LOG_CONSOLE=true
```

---

## Variable Reference

### Complete Alphabetical List

| Variable | Type | Default | Phase |
|----------|------|---------|-------|
| `BATCH_OUTPUT_DIR` | Optional | `./batch-output` | Core |
| `BATCH_THRESHOLD` | Optional | `100` | Core |
| `BATCH_WORKER_CONCURRENCY` | Optional | `2` | Core |
| `DATABASE_TYPE` | Required | `sqlite` | Core |
| `DATA_AXLE_API_KEY` | Optional | None (mock data) | Core |
| `ELEVENLABS_API_KEY` | Optional | None | Core |
| `ELEVENLABS_WEBHOOK_SECRET` | Optional | None | Core |
| `GEMINI_API_KEY` | Optional | None | Core |
| `IMAGE_GEN_VERSION` | Optional | `v2` | Core |
| `NEXT_PUBLIC_APP_URL` | Required | `http://localhost:3000` | Core |
| `NEXT_PUBLIC_ERROR_LOG_CONSOLE` | Optional | `true` (dev) | Phase 2 |
| `NEXT_PUBLIC_ERROR_SAMPLE_RATE` | Optional | `1.0` | Phase 2 |
| `NEXT_PUBLIC_ERROR_TRACKING_ENABLED` | Optional | `true` | Phase 2 |
| `NEXT_PUBLIC_LOGGING_ENABLED` | Optional | `true` (dev) | Phase 3 |
| `NEXT_PUBLIC_LOG_CONTEXT` | Optional | `true` | Phase 3 |
| `NEXT_PUBLIC_LOG_LEVEL` | Optional | `INFO` | Phase 3 |
| `NEXT_PUBLIC_RATE_LIMITING_ENABLED` | Optional | `false` | Phase 4 |
| `NEXT_PUBLIC_RATE_LIMIT_MAX_REQUESTS` | Optional | `1000` | Phase 4 |
| `NEXT_PUBLIC_RATE_LIMIT_MESSAGE` | Optional | Default message | Phase 4 |
| `NEXT_PUBLIC_RATE_LIMIT_WINDOW_MS` | Optional | `60000` | Phase 4 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Conditional | None | Core |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Conditional | None | Core |
| `NEXT_PUBLIC_SUPABASE_URL` | Conditional | None | Core |
| `OPENAI_API_KEY` | Required | None | Core |
| `POSTGRID_API_KEY_LIVE` | Optional | None | Core |
| `POSTGRID_API_KEY_TEST` | Optional | None | Core |
| `POSTGRID_WEBHOOK_SECRET` | Optional | None | Core |
| `REDIS_HOST` | Optional | None | Core |
| `REDIS_PASSWORD` | Optional | None | Core |
| `REDIS_PORT` | Optional | None | Core |
| `RESEND_API_KEY` | Optional | None | Core |
| `SMTP_HOST` | Optional | None | Core |
| `SMTP_PASS` | Optional | None | Core |
| `SMTP_PORT` | Optional | None | Core |
| `SMTP_USER` | Optional | None | Core |
| `STRIPE_PRICE_ID` | Conditional | None | Core |
| `STRIPE_SECRET_KEY` | Conditional | None | Core |
| `STRIPE_WEBHOOK_SECRET` | Conditional | None | Core |
| `SUPABASE_SERVICE_ROLE_KEY` | Conditional | None | Core |
| `USE_PERSISTENT_RENDERING` | Optional | `true` | Core |

---

## Quick Reference Cards

### Minimum Development Setup

```bash
OPENAI_API_KEY=sk-proj-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_TYPE=sqlite
```

### Full Production Setup

```bash
# Core
OPENAI_API_KEY=sk-proj-...
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Database
DATABASE_TYPE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Billing
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Services
POSTGRID_API_KEY_LIVE=live_sk_...
DATA_AXLE_API_KEY=your-api-key
RESEND_API_KEY=re_...

# Infrastructure
NEXT_PUBLIC_ERROR_TRACKING_ENABLED=true
NEXT_PUBLIC_ERROR_LOG_CONSOLE=false
NEXT_PUBLIC_ERROR_SAMPLE_RATE=0.1
NEXT_PUBLIC_LOGGING_ENABLED=true
NEXT_PUBLIC_LOG_LEVEL=ERROR
NEXT_PUBLIC_RATE_LIMITING_ENABLED=true
NEXT_PUBLIC_RATE_LIMIT_MAX_REQUESTS=100
```

---

## Additional Resources

- **Setup Guide**: See `.env.example` for complete file with comments
- **Phase 2 Documentation**: `PHASE_2_COMPLETE.md` - Error Tracking
- **Phase 3 Documentation**: `PHASE_3_COMPLETE.md` - Logging Utility
- **Phase 4 Documentation**: `PHASE_4_COMPLETE.md` - Rate Limiting
- **Production Deployment**: See `docs/PRODUCTION_DEPLOYMENT.md`
- **Security Guide**: See `docs/SECURITY_BEST_PRACTICES.md` (to be created)

---

**Last Updated**: Phase 5 - Environment Configuration Documentation
**Maintained By**: DropLab Development Team
**Questions**: See individual phase documentation files
