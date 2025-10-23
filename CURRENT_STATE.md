# DropLab Marketing Platform - Current State

**Last Updated**: October 23, 2025

## Overview
AI-powered marketing automation platform for personalized direct mail campaigns, intelligent copywriting, and multi-channel customer engagement with comprehensive analytics.

## Quick Start
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your API keys: OPENAI_API_KEY, ELEVENLABS_API_KEY

# Run development server
npm run dev
```

**Windows/WSL Users**: See `WSL_BETTER_SQLITE3_FIX.md` for SQLite setup instructions.

---

## Current Features

### 1. **Home Dashboard**
- Welcome section with personalized greeting
- Quick stats overview (campaigns, recipients, conversions)
- Recent campaigns widget
- Quick action cards for common tasks

### 2. **Copywriting Tab**
- AI-generated campaign variations using GPT-4
- Multiple audience segments and tones
- "Use in Campaign" button for one-click transfer to DM Creative
- Brand Intelligence integration for consistent voice

### 3. **DM Creative Tab**
- AI-generated backgrounds (DALL-E)
- Personalized QR codes → unique landing pages
- CSV batch processing for thousands of recipients
- Template system for efficient reuse
- Campaign tracking with unique IDs

### 4. **Analytics Dashboard** ✨ *Recently Enhanced*

#### **Overview Tab**
- Total campaigns, recipients, page views, conversions
- **Sankey Diagram** - Customer journey flow visualization:
  - Multi-path conversion funnel (digital QR/Web + phone channels)
  - Date filtering support with accurate data
  - Real-time conversion tracking
- **Call Metrics** (purple card):
  - Total calls received
  - Average call duration (formatted as "1m 8s")
  - Call-to-conversion rate
- **Converted Metric**: All web CTAs (appointments, downloads, forms) + call appointments
- Response rate and conversion rate visualization
- QR code scan tracking

#### **Campaigns Tab**
- All campaigns with performance metrics
- Recipients, visitors, conversions per campaign
- Conversion rate visualization
- Campaign status badges

#### **Calls Tab** ✨ *NEW*
- **Call Metrics Dashboard**:
  - Total calls, successful calls, conversions
  - Average call duration, conversion rate
- **Recent Calls Table** with:
  - Pagination (10 calls per page)
  - Formatted phone numbers: `(123) 456-7890`
  - Duration in human-readable format: `1m 8s`
  - Call status, conversion status, timestamps
- **Manual Sync Button**: Immediate sync from ElevenLabs
- **Auto-refresh**: Database refresh every 30 seconds
- **Global ElevenLabs Sync**: Automatic sync every 2 minutes (works on all tabs)

#### **Charts Tab**
- Performance trend chart with toggles for different metrics
- Call volume trends
- Conversion trends over time

#### **Activity Tab**
- Real-time event tracking
- Auto-refresh every 30 seconds
- Page views, QR scans, button clicks, form submissions

### 5. **ElevenLabs Call Tracking** ✨ *Live Integration*
- **Automatic Sync**: Runs globally every 2 minutes on all Analytics tabs
- **Manual Sync**: Available on Calls tab for immediate updates
- **Campaign Attribution**: Automatic phone number matching to recipients
- **Conversion Detection**: Based on appointment bookings
- **Metrics Tracked**:
  - Total calls, successful calls, failed calls
  - Average call duration
  - Call-to-conversion rate
  - Calls by time period

### 6. **CC Operations Tab**
- Initiate AI phone calls via ElevenLabs Conversational AI
- Agent configuration management
- Call status monitoring
- Live agent chat widget

### 7. **Settings Tab**
- **Company & Brand**:
  - Company info, industry, brand voice
  - Brand Intelligence (AI-powered content analysis)
- **Integrations**:
  - API keys (OpenAI, ElevenLabs)
  - ElevenLabs agent management
  - Phone number configuration

---

## Recent Improvements

### Analytics & Conversion Tracking (Oct 23, 2025)
**Major Enhancements**:

1. **Sankey Diagram - Customer Journey Visualization**:
   - Multi-path funnel showing digital (QR/Web) and phone conversion paths
   - Fixed date filtering - now works correctly across all metrics
   - Converted SQL queries to prepared statements (SQL injection prevention)
   - Fixed column name bug (`event_time` → `created_at`)
   - Comprehensive 3-level debug logging (API, Query, Client)

2. **Conversion Tracking Improvements**:
   - **"Converted" Metric**: Now includes ALL web CTAs (appointments, downloads, forms) + call appointments
   - Removed "Total Appointments" (replaced with broader "Converted")
   - CTA-aligned tracking ensures accurate funnel analysis

3. **UI Cleanup**:
   - Removed "Performance Summary" card from analytics overview
   - Removed "Getting Started in 4 Steps" from Home page
   - Cleaner, more focused dashboard layout

4. **Call Analytics Enhancements**:
   - Global ElevenLabs sync (every 2 minutes on all tabs)
   - Pagination (10 calls per page)
   - Phone number formatting: `(123) 456-7890`
   - Duration formatting: `1m 8s`
   - Auto-refresh every 30 seconds

**Files Modified**:
- `lib/database/tracking-queries.ts` - Sankey queries, prepared statements
- `components/analytics/sankey-chart.tsx` - Converted metric, enhanced logging
- `components/analytics/dashboard-overview.tsx` - Removed Performance Summary
- `app/page.tsx` - Removed Getting Started section
- `app/analytics/page.tsx` - Global sync
- `lib/tracking-client.ts` - Appointment booking tracking

**Documentation**:
- Historical fixes archived in `docs/archive/2025-10-23/`
- See archived docs for detailed implementation notes

---

## Architecture

### Tech Stack
- **Framework**: Next.js 15.5.4 with App Router, React 19, Turbopack
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 + shadcn/ui (New York style)
- **Database**: SQLite with better-sqlite3
- **AI APIs**: OpenAI GPT-4, ElevenLabs Conversational AI
- **Batch Processing**: BullMQ + Redis (for scalable campaigns)
- **Image Processing**: Puppeteer + Canvas

### Directory Structure
```
app/
├── analytics/           # Analytics dashboard with tabs
├── copywriting/         # AI copywriting generator
├── dm-creative/         # Direct mail creation
├── cc-operations/       # Call center operations
├── settings/           # Configuration
└── api/                # API routes

components/
├── analytics/          # Dashboard, charts, calls view
├── copywriting/        # Copy generator components
├── dm-creative/        # DM builder components
├── cc-operations/      # Call initiator components
└── ui/                 # shadcn/ui components

lib/
├── ai/                 # OpenAI, ElevenLabs clients
├── database/           # SQLite queries
└── elevenlabs/         # Call tracking integration
```

### Database Schema
**Main Tables**:
- `campaigns` - Campaign metadata
- `recipients` - Recipient records with tracking IDs
- `tracking_events` - Page views, QR scans, conversions
- `elevenlabs_calls` - Call history from ElevenLabs API
- `settings` - Application configuration

---

## Known Issues & Solutions

### Function Hoisting Error (SOLVED)
**Issue**: `ReferenceError: Cannot access 'formatDuration' before initialization`

**Solution**: Move helper functions outside component scope:
```typescript
// ✅ CORRECT - Define before component
const formatDuration = (seconds?: number | null) => { ... };

export function CallsView() {
  // Use formatDuration here
}
```

### WSL SQLite Issues (SOLVED)
**Issue**: `better-sqlite3` native module compilation fails on Windows/WSL

**Solution**: See `WSL_BETTER_SQLITE3_FIX.md` for complete fix instructions.

### Auto-Sync Not Working (SOLVED)
**Issue**: New calls from ElevenLabs not appearing automatically

**Root Cause**: Sync only ran on Calls tab, not globally

**Solution**: Moved sync to `app/analytics/page.tsx` to run on all tabs every 2 minutes.

---

## Environment Variables
Create `.env.local`:
```bash
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Development Commands
```bash
npm run dev      # Development server with Turbopack
npm run build    # Production build
npm start        # Production server
npm run lint     # ESLint
```

---

## Testing Checklist

### Call Analytics
- [ ] Navigate to Analytics → Calls tab
- [ ] Verify metrics display correctly (total calls, conversions, duration)
- [ ] Check pagination works (if > 10 calls)
- [ ] Verify phone numbers formatted: `(123) 456-7890`
- [ ] Verify duration formatted: `1m 8s`
- [ ] Check auto-refresh works (every 30s)
- [ ] Make test call on ElevenLabs
- [ ] Wait up to 2 minutes for global sync
- [ ] Verify new call appears automatically
- [ ] Click "Sync Now" for immediate sync

### Campaign Flow
- [ ] Create campaign in Copywriting tab
- [ ] Transfer to DM Creative with "Use in Campaign"
- [ ] Generate DM with QR code
- [ ] Download PDF
- [ ] Scan QR code → landing page loads
- [ ] Submit appointment form
- [ ] Verify conversion tracked in Analytics

---

## Important Files

### Core Configuration
- `CLAUDE.md` - Project instructions for Claude Code
- `README.md` - Main project documentation
- `package.json` - Dependencies

### Setup Guides
- `WSL_BETTER_SQLITE3_FIX.md` - SQLite setup for Windows/WSL
- `QUICK_START.md` - Getting started guide
- `QUICK_START_WINDOWS.md` - Windows-specific setup

### Archived Documentation
- `docs/archive/2025-10-23/` - Recent fixes and improvements
- `docs/archive/2025-10-18/` - Older planning documents

---

## Next Steps & Roadmap

### Current Focus
Platform is stable and production-ready with comprehensive analytics, call tracking, and conversion measurement.

### Future Considerations
- DM workflow redesign (see `docs/archive/` for proposals)
- Enhanced template library with search/filter
- Batch processing UX improvements
- A/B testing for campaigns
- Email campaign integration
- CRM integrations (Salesforce, HubSpot)

---

## Support & Troubleshooting

### Debug Logging
Debug logs are commented out in production code but available for troubleshooting:

**Enable debug logs**:
1. Uncomment debug logs in:
   - `components/analytics/calls-view.tsx`
   - `components/analytics/dashboard-overview.tsx`
   - `app/analytics/page.tsx`
2. Restart dev server
3. Check browser console for detailed logs

**What to look for**:
- `[Analytics] GLOBAL auto-sync` - ElevenLabs sync running
- `[CallsView] Auto-refreshing data` - Database refresh
- `[DashboardOverview] Stats updated` - Metrics updating

### Common Issues
1. **Calls not syncing**: Check ElevenLabs API key in Settings
2. **Duration shows decimals**: Clear cache, hard refresh (Ctrl+Shift+R)
3. **Phone numbers show "Unknown"**: ElevenLabs may not provide caller ID for all calls
4. **Build fails**: Delete `.next` folder and rebuild

---

## Contact
For issues, feature requests, or questions, please create an issue in the project repository.

---

**Built with ❤️ using Next.js, OpenAI, and ElevenLabs**
