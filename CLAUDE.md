# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Mission

**DropLab** - AI-powered marketing automation platform for personalized direct mail campaigns, intelligent copywriting, and multi-channel customer engagement.

**Success Criteria**: Enterprise-ready platform with scalable batch processing, comprehensive analytics, and seamless AI integration.

## Master Transformation Plan

**⚠️ CRITICAL: Single Source of Truth for All Development**

All current and future development MUST follow the master transformation plan located at:

**📋 `DROPLAB_TRANSFORMATION_PLAN.md`** (Version 2.0 - Updated 2025-10-30)

**Strategic Vision**: Build the first "Figma meets Mailchimp for Physical Mail" platform - a monopolistic direct mail design platform with AI-powered features that Canva cannot replicate.

This master plan contains:
- **20-Week Implementation Roadmap** (10 phases)
- **Atomic Database Schema** (designed from first principles using Elon Musk methodology)
- **Fabric.js Canvas Editor** (300 DPI, VDP-ready)
- **AI Intelligence Layer** (postal compliance, response rate prediction)
- **Variable Data Printing Engine** (personalize 10,000+ designs at scale)
- **Template Marketplace** (network effects through performance-based ranking)
- **Real-time Collaboration** (Google Docs-style multi-user editing)
- **Developer API** (platform play for ecosystem growth)
- **Multi-tenancy with RLS** (Supabase PostgreSQL)
- **Competitive Moat Strategy** (data moat + regulatory expertise + network effects)

**Core Differentiators (vs Canva)**:
1. **Proprietary Performance Data**: Campaign results feed AI predictions → impossible to replicate
2. **Postal Compliance Validator**: Real-time USPS/international regulation checking → saves $500+ per failed print
3. **VDP at Scale**: Programmatic Fabric.js control → personalize 10,000 pieces in minutes
4. **End-to-End Pipeline**: Design → Validate → Print → Track → no external tools needed
5. **Marketplace Network Effects**: Templates ranked by proven response rates → flywheel growth

**Planning Guidelines:**
- ✅ DO: Reference and update the master plan for all development work
- ✅ DO: Mark tasks as completed with ✅ in the plan
- ✅ DO: Add new tasks discovered during implementation to the plan
- ✅ DO: Follow atomic implementation approach (break features into fundamental components)
- ❌ DO NOT: Create separate planning documents
- ❌ DO NOT: Deviate from the plan without updating it first
- ❌ DO NOT: Reference the old SQLite structure (this is a fresh A/B test approach)

**Additional Technical Documentation:**
- **Strategic Vision**: See `New_Supabase_Platform.md` for complete monopolistic platform strategy (15 key features, 90-day roadmap)
- **Data Axle Integration**: See `DATA_AXLE_INTEGRATION_SPEC.md` for complete technical specification (Phase 5 - Weeks 9-10)
  - Audience targeting with 250M+ contacts
  - FREE count preview (Data Axle Insights API)
  - AI-powered audience recommendations
  - Complete database schema, API routes, UI components
  - **Reference Guide**: `docs/DATA_AXLE_INTEGRATION_GUIDE.md` (API documentation, filter DSL, production code)
- **Database Patterns**: See `DATABASE_PATTERNS.md` for SQLite/Supabase query patterns (legacy reference only)

## Progress Tracking

**How to Track Implementation Progress:**

All tasks in `DROPLAB_TRANSFORMATION_PLAN.md` use checkboxes for progress tracking. Update as you complete work:

**Format**:
```markdown
- [ ] Task not started
- [x] Task completed
```

**Process**:
1. Open `DROPLAB_TRANSFORMATION_PLAN.md`
2. Navigate to current phase (e.g., Phase 1: Foundation)
3. Find specific task (e.g., "Task 1.1: Deploy Foundation Schema")
4. Mark checkboxes as completed: `- [ ]` → `- [x]`
5. Commit changes with message: `"chore: Update progress - Phase X Task Y completed"`

**Current Status**: See `DROPLAB_TRANSFORMATION_PLAN.md` for real-time progress

**Phases Overview**:
- **Phase 1** (Weeks 1-2): Foundation - Auth + Database ✅ **PARTIALLY COMPLETE**
- **Phase 2** (Weeks 3-4): Design Engine - Fabric.js editor ⏳ **NEXT**
- **Phase 3** (Weeks 5-6): VDP Engine - Batch personalization
- **Phase 4** (Weeks 7-8): AI Intelligence - Compliance + Predictions
- **Phase 5** (Weeks 9-10): Campaign Management + Data Axle - Audience targeting
- **Phase 6** (Weeks 11-12): Collaboration - Real-time editing
- **Phase 7** (Weeks 13-14): Marketplace - Template sharing
- **Phase 8** (Weeks 15-16): Developer API - Platform play
- **Phase 9** (Weeks 17-18): External Integrations - PostGrid, Stripe
- **Phase 10** (Weeks 19-20): Polish & Launch - Beta with 50 users

## Project Overview

**DropLab Platform** - Next.js 15.5.4 marketing automation application with:
- **Next.js App Router** (React 19) - Server and Client Components
- **TypeScript** with strict mode
- **Tailwind CSS v4** + shadcn/ui (New York style)
- **Turbopack** for fast development
- **AI APIs**: OpenAI GPT-4 (copywriting, background generation), ElevenLabs (voice AI)
- **Batch Processing**: BullMQ + Redis for scalable campaign generation
- **Database**: SQLite with better-sqlite3 for production-ready persistence
- **Image Processing**: Puppeteer + Canvas for high-quality DM rendering

## Core Features

### 1. Home Dashboard (NEW - Phase 4)
- Welcome section with personalized greeting
- Quick stats overview (campaigns, recipients, conversions)
- Recent campaigns widget
- Quick action cards for common tasks
- Recent activity feed preview
- Getting started guide for new users
- Platform status indicators

### 2. Copywriting Tab (Enhanced - Phase 1)
- Input: Marketing idea/message/campaign
- Output: Multiple AI-generated campaign variations with:
  - **Unique campaign titles** (e.g., "Rediscover Family Moments")
  - Different audience segments (First-time Users 55-65, Adult Children, etc.)
  - Varied emotional tones (Warm & Reassuring, Empowering, etc.)
- **"Use in Campaign" Button**: One-click transfer to DM Creative
- **Brand Intelligence Integration**: Uses extracted brand profile for consistency
- API: OpenAI GPT-4o-mini
- UI: Textarea input, Generate button, Cards with copy-to-clipboard and campaign transfer

### 3. DM Creative Tab (Enhanced - Phase 1)
- Input: Marketing message + recipient details OR AI-generated copy from Copywriting
- Output: Professional printable Direct Mail with:
  - AI-generated background images (DALL-E via gpt-image-1 model)
  - Personalized QR code → dedicated landing page
  - Variable fields (name, lastname, address, etc.)
  - CSV upload for batch processing
  - Campaign tracking with unique IDs
- Features:
  - **Auto-fill from Copywriting**: Campaign name and message pre-populated
  - **Auto-suggest campaign name**: "{Company} Campaign - {Month Year}"
  - **AI-generated copy indicator**: Purple badge showing source
  - Dynamic landing page generation at `/lp/[trackingId]`
  - Tracking code embedded in URLs
  - PDF preview/download capability
  - Batch variable substitution from CSV
  - Client-side image composition (avoiding native module issues)
- Libraries: qrcode, papaparse, jsPDF, browser Canvas API

### 4. Analytics Dashboard (NEW - Phase 3)
- **Overview Tab**:
  - Total campaigns, recipients, page views, conversions
  - Response rate and conversion rate metrics
  - QR code scan tracking
  - Form submission tracking
  - Visual progress bars and performance indicators
- **Campaigns Tab**:
  - All campaigns with performance metrics
  - Recipients, visitors, conversions per campaign
  - Conversion rate visualization
  - Campaign status badges (active/paused/completed)
- **Activity Tab**:
  - Real-time event and conversion tracking
  - Auto-refresh every 30 seconds
  - Page views, QR scans, button clicks, form submissions
  - Time-based activity grouping
- **Database Integration**: SQLite with comprehensive tracking tables
- **Call Tracking Integration**: ElevenLabs call metrics displayed in dashboard

### 4a. ElevenLabs Call Tracking (NEW - Phase 1 Complete)
- **API Integration**: Syncs call history from ElevenLabs Conversational AI
- **Database**: `elevenlabs_calls` table with full call metadata
- **Metrics Tracked**:
  - Total calls received
  - Successful vs failed calls
  - Average call duration
  - Call-to-conversion rate
  - Calls by time period (today/week/month)
- **Features**:
  - **Automatic Sync**: Manual trigger via API endpoint (`POST /api/jobs/sync-elevenlabs-calls`)
  - **Campaign Attribution**: Automatic phone number matching to recipients
  - **Conversion Detection**: Simple status-based (call_successful = 'success')
  - **Analytics Display**: Purple "Calls Received" card in dashboard
  - **Data Storage**: Full API response stored in `raw_data` for debugging
- **Architecture**:
  - API polling every sync (configurable)
  - Upsert logic prevents duplicates
  - Phone number normalization for attribution
  - Performance-optimized with database indexes
- **Files**:
  - `lib/elevenlabs/call-tracking.ts` - API client
  - `lib/elevenlabs/call-sync.ts` - Sync logic
  - `lib/database/call-tracking-queries.ts` - Database queries
  - `app/api/jobs/sync-elevenlabs-calls/route.ts` - Sync endpoint
- **Documentation**: See `PHASE1_IMPLEMENTATION_COMPLETE.md` for full details

### 5. CC Operations Tab
- Input: Phone number + call objective/script
- Output: Functional AI phone call agent
- API: ElevenLabs Conversational AI API
- Features:
  - Initiate real phone calls
  - Personalized assistance based on customer context
  - Call status monitoring
  - Demo mode with test numbers
  - Agent configuration management
- Note: Requires ElevenLabs API key with phone calling enabled

### 6. Settings Tab (Enhanced - Phase 2 + Brand Kit Update)
- **Four-tab interface**:
  - **Brand Intelligence Tab**:
    - **AI Website Analyzer** (NEW):
      - Enter any company website URL
      - AI automatically extracts complete brand identity:
        - Company name, industry, target audience
        - Brand voice, tone, key phrases, values
        - **Logo extraction** (via Clearbit API + HTML scraping fallback)
        - **Color palette** (primary, secondary, accent colors from website CSS)
        - **Typography** (heading and body fonts)
        - **Landing page template** recommendation
      - One-click auto-fill of all brand settings
      - **Logo Detection Strategy**:
        1. Clearbit Logo API (primary - 90% success rate)
        2. Smart HTML scraping (SVG-first, header/nav prioritization)
        3. Google Favicon (fallback)
      - **Smart filtering**: Rejects external logos (partner/customer), product images, hero banners
    - **Company Profile**:
      - Manual fields: Company name, industry, brand voice, target audience, tone
      - AI-extracted brand elements displayed as chips
      - Profile loaded indicator badge
    - **Visual Brand Kit**:
      - Logo upload with preview
      - Color pickers (primary, secondary, accent)
      - Font selection (Google Fonts)
      - Landing page template selection
      - Preview/Edit modes
    - **Persistent storage**: Database (brand profiles + brand kit) + localStorage (API keys)
  - **Integrations Tab**:
    - API keys (OpenAI, ElevenLabs)
    - ElevenLabs agent management
    - Phone number configuration
  - **Tracking Tab**:
    - Landing page tracking snippets
    - Analytics integration code
  - **Industry Modules Tab**:
    - Industry-specific features and templates
- Used to personalize outputs across all features
- **Auto-updates on website analysis**: Colors, logo, and fonts update immediately in UI

## Template System Architecture

### Overview
The platform includes a **reusable DM template system** that enables efficient batch processing of thousands/millions of direct mail pieces without regenerating AI backgrounds.

### Key Components

1. **Template Creation (`/dm-creative/editor`)**
   - Fabric.js v6 canvas editor for visual design
   - Drag-and-drop layout editing
   - Variable field markers for dynamic data replacement

2. **Template Storage (Database)**
   ```
   dm_templates table:
   - id: Template unique ID
   - canvas_json: Fabric.js canvas state (positions, styles, layers)
   - variable_mappings: Index-based map of variable markers (JSON)
   - background_image: AI-generated background (reused)
   - preview_image: Template thumbnail
   ```

3. **Variable Mappings (Separate Storage Pattern)**
   **Critical Architecture Decision**: Fabric.js v6 does NOT serialize custom properties via `toJSON()`.

   **Solution**: Store variable markers separately from canvas JSON.

   ```typescript
   // Save Phase - Extract markers from canvas objects
   const variableMappings: Record<string, { variableType?: string; isReusable?: boolean }> = {};
   objects.forEach((obj: any, idx: number) => {
     variableMappings[idx.toString()] = {
       variableType: obj.variableType,   // 'logo', 'message', 'qrCode', etc.
       isReusable: obj.isReusable        // true for logo, false for variable data
     };
   });
   // Store as JSON in database variable_mappings column

   // Load Phase - Apply markers back to canvas objects by index
   canvas.loadFromJSON(canvasJSON).then(() => {
     Object.entries(variableMappings).forEach(([idx, mapping]) => {
       objects[idx].variableType = mapping.variableType;
       objects[idx].isReusable = mapping.isReusable;
     });
   });
   ```

4. **Variable Types**
   - `logo` - Company logo (reusable, never replaced)
   - `message` - Marketing copy (from template)
   - `recipientName` - Personalized name field
   - `recipientAddress` - Personalized address field
   - `phoneNumber` - Contact number
   - `qrCode` - Unique tracking QR code (regenerated per recipient)

5. **Template Application Flow**
   ```
   1. User selects template from library
   2. Enters new recipient data
   3. System loads template canvasJSON + variableMappings
   4. Applies variable mappings to canvas objects by index
   5. Replaces variable fields with new recipient data
   6. Generates new QR code with unique tracking ID
   7. Preserves reusable elements (logo)
   8. Renders final DM without AI background regeneration
   ```

### Benefits
- **Cost Savings**: $0.00 per template use (vs $0.048 per AI background generation)
- **Time Savings**: ~3 seconds per DM (vs 25 seconds with AI generation)
- **Scalability**: Batch process thousands/millions of records efficiently
- **Consistency**: Same branding across all DMs
- **Personalization**: Each DM has unique recipient data and tracking QR code

### Known Issues & Fixes
See `BUGFIX_SEPARATE_VARIABLE_MAPPINGS.md` for complete documentation of:
- Fabric.js v6 custom property serialization limitation
- Separate variable mapping implementation
- QR code size preservation fix
- Canvas disposal/React StrictMode race condition fixes

## Technology Stack

### Required Dependencies
```bash
# AI & API Integration
npm install openai @anthropic-ai/sdk @elevenlabs/elevenlabs-js
# Note: Uses ElevenLabs JS SDK for both API calls and ConvAI widget

# Database (Phase 2 & 3)
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3

# QR Code Generation
npm install qrcode @types/qrcode

# CSV Processing
npm install papaparse @types/papaparse

# PDF Generation & Image Composition
npm install jspdf html2canvas nanoid

# Charts & Visualization (Phase 3)
npm install recharts

# Form Handling & Validation
npm install zod react-hook-form @hookform/resolvers

# shadcn/ui Components (install as needed)
npx shadcn@latest add button input textarea card tabs select label form toast

# Additional UI libraries
npm install sonner lucide-react next-themes
```

### Environment Variables
Create `.env.local`:
```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### TypeScript Configuration
**Important**: Create `global.d.ts` in project root for custom web components:
```typescript
// global.d.ts
declare namespace JSX {
  interface IntrinsicElements {
    'elevenlabs-convai': {
      'agent-id': string;
      children?: React.ReactNode;
    };
  }
}

export {};
```

This declaration is required for the ElevenLabs ConvAI widget to work with TypeScript.

## Development Commands

```bash
npm run dev      # Start development server with Turbopack (http://localhost:3000)
npm run build    # Build for production with Turbopack
npm start        # Start production server
npm run lint     # Run ESLint
```

## Architecture

### Directory Structure
```
app/
├── layout.tsx                 # Root layout with sidebar navigation
├── page.tsx                   # Redirect to /copywriting or dashboard
├── globals.css                # Tailwind CSS + custom styles
├── copywriting/
│   └── page.tsx              # Copywriting tab
├── dm-creative/
│   └── page.tsx              # Direct mail creation tab
├── cc-operations/
│   └── page.tsx              # Call center operations tab
├── settings/
│   └── page.tsx              # Settings tab
├── lp/
│   └── [trackingId]/
│       └── page.tsx          # Dynamic landing pages
└── api/
    ├── copywriting/
    │   └── route.ts          # POST - Generate copy variations
    ├── dm-creative/
    │   ├── generate/route.ts # POST - Generate DM with QR
    │   └── landing/route.ts  # POST - Create landing page data
    ├── call/
    │   └── initiate/route.ts # POST - Initiate ElevenLabs call
    └── settings/
        ├── route.ts          # GET/POST - Settings CRUD

components/
├── ui/                        # shadcn/ui components
│   ├── button.tsx
│   ├── input.tsx
│   ├── textarea.tsx
│   ├── card.tsx
│   ├── tabs.tsx
│   ├── select.tsx
│   ├── form.tsx
│   └── sonner.tsx            # Toast notifications
├── sidebar.tsx               # Main navigation sidebar
├── copywriting/
│   ├── copy-generator.tsx    # Main copywriting component
│   └── variation-card.tsx    # Individual variation display
├── dm-creative/
│   ├── dm-builder.tsx        # DM creation form
│   ├── csv-uploader.tsx      # CSV batch upload
│   ├── qr-preview.tsx        # QR code preview
│   └── batch-results.tsx     # Display batch DM results with download
├── cc-operations/
│   ├── call-initiator.tsx    # Call initiation form
│   ├── call-status.tsx       # Call monitoring
│   └── agent-widget.tsx      # ElevenLabs ConvAI web chat widget
├── landing/                   # Landing page components
│   ├── appointment-form.tsx  # Appointment booking form
│   └── hearing-questionnaire.tsx # Multi-step questionnaire
└── settings/
    └── agent-manager.tsx      # Manage ElevenLabs agent configurations

lib/
├── utils.ts                  # cn() utility + general helpers
├── ai/
│   ├── openai.ts            # OpenAI client and helpers
│   ├── anthropic.ts         # Anthropic client (alternative)
│   └── elevenlabs.ts        # ElevenLabs client
├── qr-generator.ts          # QR code generation logic
├── pdf-generator.ts         # PDF creation for DM
├── dm-image-compositor.ts   # Node-canvas image composition for DMs
├── csv-processor.ts         # CSV parsing and processing
├── tracking.ts              # Tracking code generation
├── storage.ts               # Settings persistence (localStorage wrapper)
└── contexts/
    └── settings-context.tsx # Global settings React context

public/
├── templates/
│   └── dm-template.html     # Base DM template
└── fonts/                   # Custom fonts for PDF if needed
```

### Data Flow

#### Copywriting Flow
1. User enters marketing message in textarea
2. Click "Generate Variations" → Client calls `/api/copywriting`
3. API route uses OpenAI/Claude to generate 4-6 variations
4. Response includes variations with metadata (audience, platform)
5. Display variations in cards with copy buttons

#### DM Creative Flow
1. User enters message + recipient details OR uploads CSV
2. Click "Generate DM" → Process variables
3. Generate unique tracking ID for each recipient
4. Create QR code pointing to `/lp/[trackingId]`
5. Generate landing page data stored in JSON/DB
6. Render DM preview with personalized content
7. Generate PDF for download/print
8. For batch: Process CSV rows, generate multiple DMs with unique codes

#### CC Operations Flow
1. User enters phone number + call objective
2. Optional: Load customer context from settings
3. Click "Initiate Call" → Call `/api/call/initiate`
4. API creates ElevenLabs agent with personalized prompt
5. API triggers phone call via ElevenLabs API
6. Display call status and monitor progress
7. Show call completion and summary

#### Settings Flow
1. Load settings from localStorage on mount
2. User edits company info, API keys, preferences
3. Save to localStorage (or API route for persistence)
4. Settings accessed by all other features via context/hooks

### State Management
- **Server Components** for initial data loading
- **Client Components** for interactive features
- **React Context** for global settings (company info, API keys)
- **localStorage** for settings persistence (quick implementation)
- Future: Upgrade to Vercel KV or database for production

### API Integration Patterns

#### OpenAI Integration (`lib/ai/openai.ts`)
```typescript
import OpenAI from 'openai';

export async function generateCopyVariations(prompt: string, context: CompanyContext) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: "You are an expert marketing copywriter..." },
      { role: "user", content: prompt }
    ],
    temperature: 0.8,
    n: 1, // Generate multiple in one call or loop
  });

  return parseVariations(completion.choices[0].message.content);
}
```

#### ElevenLabs Integration (`lib/ai/elevenlabs.ts`)
```typescript
import { ElevenLabsClient } from 'elevenlabs';

export async function initiateCall(phoneNumber: string, agentId: string, prompt: string) {
  const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

  // Use ElevenLabs Conversational AI API
  const call = await client.conversationalAI.initiateCall({
    agent_id: agentId,
    phone_number: phoneNumber,
    first_message: prompt,
  });

  return call;
}
```

#### QR Code Generation (`lib/qr-generator.ts`)
```typescript
import QRCode from 'qrcode';

export async function generateQRCode(url: string): Promise<string> {
  // Returns base64 data URL
  return await QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' }
  });
}
```

#### DM Image Composition (`lib/dm-image-compositor-browser.ts`)
```typescript
export async function composeDMImageBrowser(options: DMCompositeOptions): Promise<string> {
  // Uses browser Canvas API to create 1024x1024 image
  // - Loads AI-generated background with blue left panel
  // - Overlays company name, marketing message
  // - Adds personalized greeting with recipient name/address
  // - Embeds QR code in bottom right with orange border
  // - Returns base64 PNG data URL for PDF generation
}
```

**Key Features:**
- **Client-side image composition** using browser Canvas API (avoids native module issues)
- Professional layout with left text panel + right image area
- Text wrapping for long messages
- Orange accent colors (#FF6B35) for CTAs and borders
- Automatic positioning of QR codes and personalized data

**Note:** Originally used `lib/dm-image-compositor.ts` with node-canvas, but moved to browser-based composition to avoid native module compilation issues on Windows. The API route generates the AI background, then the client composes the final image with text overlays.

#### Landing Page Components

**Hearing Questionnaire** (`components/landing/hearing-questionnaire.tsx`):
- Multi-step form with 3 questions
- Progress indicator
- Single-select (auto-advance) and multi-select support
- Collects hearing difficulty, situations, and timeframe
- Returns structured results to appointment form

**Appointment Form** (`components/landing/appointment-form.tsx`):
- Schedule consultation with date/time picker
- Contact information capture (name, phone, email)
- Success state with confirmation message
- Pre-fills recipient name from tracking data
- Toast notifications for submission feedback

**Agent Manager** (`components/settings/agent-manager.tsx`):
- CRUD interface for ElevenLabs agent configurations
- Store multiple agent scenarios (appointments, support, sales)
- Each agent has: name, description, agentId
- Used in CC Operations to select agent for calls

**Agent Widget** (`components/cc-operations/agent-widget.tsx`):
- Embeds ElevenLabs ConvAI web chat widget
- Loads `@elevenlabs/convai-widget-embed` script dynamically
- Live browser-based testing of phone agents
- Requires `global.d.ts` TypeScript declaration

### Styling Approach
- **Tailwind CSS v4** for utility-first styling
- **shadcn/ui** for consistent, accessible components
- **CSS variables** for theming (can customize per company in settings)
- **Responsive design**: Mobile-first, works on all devices
- **Print styles**: Specific CSS for DM printing (`@media print`)

### Best Practices

#### API Routes
- Use Next.js Route Handlers (App Router)
- Validate input with Zod schemas
- Handle errors gracefully with try-catch
- Return consistent JSON responses
- Protect routes with API key validation
- Rate limiting for production (not critical for demo)

#### Type Safety
- Define interfaces for all data structures
- Use Zod for runtime validation
- Strict TypeScript mode enabled
- Type API responses

#### Error Handling
- User-friendly error messages
- Toast notifications for feedback
- Fallback UI for failed API calls
- Console logging for debugging
- API error responses with status codes

#### Performance
- Use Server Components where possible
- Client Components only for interactivity
- Lazy load heavy components (PDF viewer)
- Optimize images and assets
- Cache API responses when appropriate

---

## AUTONOMOUS IMPLEMENTATION PLAN

### Phase 1: Research & Setup (15 min)
**Objective**: Validate API availability, install dependencies, configure environment

**Steps**:
1. Research ElevenLabs API capabilities
   - Verify phone call feature availability
   - Check API documentation for Conversational AI
   - Identify required agent setup
   - Note any limitations or requirements

2. Research OpenAI best practices
   - Review prompt engineering for marketing copy
   - Identify optimal model (GPT-4 vs GPT-3.5-turbo)
   - Test rate limits and response times

3. Install all dependencies
   ```bash
   npm install openai elevenlabs qrcode papaparse jspdf html2canvas zod
   npm install @types/qrcode @types/papaparse
   npx shadcn@latest add button input textarea card tabs select label form toast
   ```

4. Create `.env.local` with placeholder keys
5. Set up project structure (create folders)

**Testing**: Verify all imports work, no dependency conflicts

**Success Criteria**: All packages installed, environment configured, no build errors

---

### Phase 2: Core Layout & Navigation (20 min)
**Objective**: Build sidebar navigation and routing structure

**Steps**:
1. Create `components/sidebar.tsx`
   - Use shadcn/ui Tabs or custom sidebar
   - Four navigation items: Copywriting, DM Creative, CC Operations, Settings
   - Responsive: Collapsible on mobile
   - Active state highlighting

2. Update `app/layout.tsx`
   - Integrate sidebar component
   - Set up global layout with sidebar + main content area
   - Add SettingsProvider context for global state

3. Create page routes
   - `app/copywriting/page.tsx` - Empty placeholder
   - `app/dm-creative/page.tsx` - Empty placeholder
   - `app/cc-operations/page.tsx` - Empty placeholder
   - `app/settings/page.tsx` - Empty placeholder
   - `app/page.tsx` - Redirect to /copywriting

4. Create settings context
   - `lib/contexts/settings-context.tsx`
   - localStorage integration
   - Default values

**Testing**:
- Navigate between tabs
- Verify routing works
- Check responsive behavior
- Confirm settings context loads

**Success Criteria**: Full navigation working, clean layout, no console errors

---

### Phase 3: Settings Implementation (20 min)
**Objective**: Build functional settings page for configuration

**Steps**:
1. Create `app/settings/page.tsx`
   - Form with shadcn/ui components
   - Fields: Company name, industry, brand voice, target audience
   - API key inputs (OpenAI, ElevenLabs) with masked display
   - Save button

2. Implement `lib/storage.ts`
   - localStorage wrapper functions
   - Type-safe get/set methods
   - Default values fallback

3. Connect form to storage
   - Load settings on mount
   - Save on submit
   - Show success toast

4. Create types
   - `types/settings.ts` with CompanySettings interface

**Testing**:
- Save settings and reload page
- Verify persistence
- Test with empty/invalid data
- Check API key masking

**Success Criteria**: Settings save and persist, accessible from context

---

### Phase 4: Copywriting Feature (30 min)
**Objective**: Build AI copywriting variation generator

**Steps**:
1. Create API route `app/api/copywriting/route.ts`
   - Accept POST with prompt and context
   - Integrate OpenAI client
   - Generate 5-6 variations with different angles:
     * Different audiences (B2B, B2C, enterprise)
     * Different platforms (email subject, social post, web banner)
   - Return structured JSON

2. Create `lib/ai/openai.ts`
   - OpenAI client initialization
   - `generateCopyVariations()` function
   - Prompt engineering for marketing copy
   - Parse and structure response

3. Create UI components
   - `components/copywriting/copy-generator.tsx`
     * Textarea for input
     * Generate button
     * Loading state
   - `components/copywriting/variation-card.tsx`
     * Display variation with metadata
     * Copy to clipboard button
     * Platform/audience badge

4. Create page `app/copywriting/page.tsx`
   - Integrate components
   - Handle API calls
   - Error handling with toast
   - Empty state message

5. Define types
   - `types/copywriting.ts` for request/response

**Testing**:
- Enter various prompts
- Verify AI responses quality
- Test copy to clipboard
- Check error handling (invalid API key, network error)
- Verify loading states

**Debug**:
- Log API requests/responses
- Check rate limits
- Validate prompt quality
- Fix any parsing errors

**Success Criteria**: Generate high-quality copy variations, smooth UX, proper error handling

---

### Phase 5: DM Creative - Basic Version (40 min)
**Objective**: Build direct mail generator with QR codes and landing pages

**Steps**:
1. Create tracking system `lib/tracking.ts`
   - Generate unique tracking IDs (nanoid or UUID)
   - Store landing page data structure

2. Create QR generator `lib/qr-generator.ts`
   - Generate QR codes for URLs
   - Return base64 image data

3. Create landing page route `app/lp/[trackingId]/page.tsx`
   - Dynamic route with tracking ID
   - Fetch landing page data from storage/JSON
   - Display personalized content
   - Track visit (console log for demo)
   - Professional, responsive design

4. Create API route `app/api/dm-creative/generate/route.ts`
   - Accept message, recipient details
   - Generate tracking ID
   - Create QR code
   - Store landing page data
   - Return DM data with QR

5. Create UI components
   - `components/dm-creative/dm-builder.tsx`
     * Form with fields: name, lastname, address, message
     * Generate button
     * Preview area
   - `components/dm-creative/qr-preview.tsx`
     * Display QR code
     * Show landing page URL
     * Test link button

6. Create simple PDF generator `lib/pdf-generator.ts`
   - Use jsPDF
   - Create basic DM layout
   - Embed QR code
   - Add personalized text
   - Return PDF blob

7. Create page `app/dm-creative/page.tsx`
   - Integrate builder component
   - Show QR preview
   - Download PDF button
   - Landing page link

**Testing**:
- Generate DM with sample data
- Scan QR code with phone
- Verify landing page opens with correct data
- Download and check PDF
- Test with different names/messages

**Debug**:
- Check QR code generation
- Verify landing page routing
- Fix PDF layout issues
- Ensure data persistence

**Success Criteria**: Generate printable DM with working QR code → functional landing page

---

### Phase 6: DM Creative - CSV Batch Processing (25 min)
**Objective**: Add CSV upload for batch DM generation

**Steps**:
1. Create CSV processor `lib/csv-processor.ts`
   - Parse CSV with papaparse
   - Validate columns (name, lastname, address, etc.)
   - Return array of recipients

2. Create UI component `components/dm-creative/csv-uploader.tsx`
   - File input
   - Upload button
   - Preview parsed data (table)
   - Validation feedback

3. Update `app/api/dm-creative/generate/route.ts`
   - Handle batch mode
   - Process array of recipients
   - Generate multiple DMs with unique tracking codes
   - Return ZIP file or array of PDFs

4. Update `app/dm-creative/page.tsx`
   - Add CSV upload section
   - Toggle between single/batch mode
   - Display batch results (list of generated DMs)
   - Bulk download option

5. Create sample CSV template
   - `public/templates/dm-template.csv`
   - Headers: name, lastname, address, city, zip, message_variable

**Testing**:
- Upload sample CSV with 5-10 rows
- Verify all DMs generated correctly
- Check unique tracking codes
- Test landing pages for each recipient
- Download batch results

**Debug**:
- CSV parsing errors
- Handle missing fields
- Validate data before processing
- Check memory usage with large batches

**Success Criteria**: Upload CSV → generate multiple personalized DMs with unique QR codes

---

### Phase 7: CC Operations (35 min)
**Objective**: Build ElevenLabs phone call integration

**Steps**:
1. Research ElevenLabs API
   - Read Conversational AI documentation
   - Understand agent creation process
   - Identify phone call initiation endpoint
   - Check required parameters

2. Create ElevenLabs client `lib/ai/elevenlabs.ts`
   - Initialize ElevenLabs client
   - `createAgent()` function (or use pre-created agent)
   - `initiateCall()` function
   - `getCallStatus()` function
   - Error handling

3. Create API route `app/api/call/initiate/route.ts`
   - Accept phone number, call objective, customer context
   - Build personalized agent prompt using settings
   - Initiate call via ElevenLabs
   - Return call ID and status

4. Create API route `app/api/call/status/[callId]/route.ts`
   - Fetch call status from ElevenLabs
   - Return current state

5. Create UI components
   - `components/cc-operations/call-initiator.tsx`
     * Phone number input (with validation)
     * Call objective textarea
     * Customer context fields (name, issue, etc.)
     * Initiate call button
     * Loading state
   - `components/cc-operations/call-status.tsx`
     * Display call status
     * Real-time updates (polling or webhooks)
     * Call summary when completed

6. Create page `app/cc-operations/page.tsx`
   - Integrate components
   - Handle call flow
   - Error handling
   - Demo mode warning (if using real numbers)

7. Add phone validation
   - Use regex or library for phone format
   - International format support

**Testing**:
- Test with demo phone number (if available from ElevenLabs)
- Verify call initiation
- Check status updates
- Test error cases (invalid number, API error)
- Ensure personalization works

**Debug**:
- Log API requests/responses
- Check ElevenLabs agent configuration
- Verify API key permissions
- Fix any call flow issues
- Handle edge cases (busy, no answer, etc.)

**Success Criteria**: Successfully initiate phone call with AI agent, monitor status, demo works end-to-end

---

### Phase 8: Polish & Integration (20 min)
**Objective**: Refine UI, add finishing touches, ensure cohesion

**Steps**:
1. Add toast notifications
   - Success messages for all actions
   - Error messages with helpful text
   - Loading indicators

2. Improve UI/UX
   - Consistent spacing and alignment
   - Add icons from lucide-react
   - Loading skeletons
   - Empty states
   - Help text/tooltips

3. Add demo data
   - Pre-fill settings with example company
   - Sample prompts for copywriting
   - Example DM message
   - Test phone number for CC operations

4. Create simple dashboard (optional)
   - `app/page.tsx` as landing dashboard
   - Quick stats or feature overview
   - Quick action buttons

5. Add README section for demo
   - How to run the demo
   - Required API keys
   - What to show CEO

6. Cross-feature integration
   - Use company settings in all features
   - Consistent branding/tone across outputs
   - Settings influence AI generation

**Testing**:
- Full user journey through all tabs
- Verify all features work together
- Check settings propagate everywhere
- Test error scenarios
- Responsive design check

**Success Criteria**: Polished, professional demo ready to present

---

### Phase 9: Build & Test (15 min)
**Objective**: Final build verification and comprehensive testing

**Steps**:
1. Run build
   ```bash
   npm run build
   ```

2. Fix TypeScript errors
   - Type issues
   - Missing imports
   - Unused variables

3. Fix build errors
   - Client/Server Component boundaries
   - Environment variable access
   - Dynamic imports if needed

4. Run production build locally
   ```bash
   npm start
   ```

5. Full feature testing
   - Test each tab thoroughly
   - Try edge cases
   - Verify error handling
   - Check performance

6. Browser testing
   - Chrome/Edge
   - Check console for errors
   - Network tab for API calls

**Testing Checklist**:
- [ ] Settings save and load correctly
- [ ] Copywriting generates quality variations
- [ ] DM single generation works
- [ ] DM CSV batch works
- [ ] QR codes scan correctly
- [ ] Landing pages load with right data
- [ ] Phone call initiates successfully
- [ ] All error states handled gracefully
- [ ] UI is responsive
- [ ] No console errors

**Debug**:
- Fix any remaining TypeScript errors
- Address build warnings
- Optimize slow API calls
- Fix UI glitches

**Success Criteria**: Clean build, all features working, production-ready

---

### Phase 10: Debug & Optimize Loop (Ongoing)
**Objective**: Continuously monitor, debug, and fix issues autonomously

**Process**:
1. **Monitor**: Watch for errors in console, network failures, UI glitches
2. **Analyze**: Identify root cause using error messages, logs, stack traces
3. **Fix**: Implement solution, test, verify
4. **Iterate**: Return to monitoring

**Common Issues & Solutions**:

| Issue | Solution |
|-------|----------|
| API rate limits | Add retry logic with exponential backoff |
| TypeScript errors | Fix type definitions, add proper interfaces |
| Client/Server component errors | Move `'use client'` to correct components |
| API key not found | Check .env.local, restart dev server |
| QR code not generating | Verify qrcode library import, check data URL format |
| PDF download fails | Check blob creation, add error handling |
| ElevenLabs call fails | Verify API key, check agent configuration, validate phone format |
| Landing page 404 | Check dynamic route setup, verify tracking ID storage |
| Settings not persisting | Check localStorage access, verify JSON serialization |
| Build fails | Fix TypeScript errors, check imports, verify server/client split |
| Canvas native module error (Windows) | Image composition moved to client-side (`dm-image-compositor-browser.ts`) |

**Debugging Commands**:
```bash
# Check build errors
npm run build

# View detailed error logs
npm run dev 2>&1 | tee debug.log

# Type check without building
npx tsc --noEmit

# Lint code
npm run lint
```

**Autonomous Debug Process**:
1. Error detected → Read error message
2. Identify file and line number
3. Read relevant code
4. Analyze root cause
5. Implement fix
6. Test fix
7. Verify no new errors introduced
8. Repeat if errors persist

---

## DEMO PRESENTATION CHECKLIST

### Before CEO Demo
- [ ] All API keys configured in `.env.local`
- [ ] Settings populated with company information
- [ ] Sample data ready (prompts, CSV, phone number)
- [ ] All features tested end-to-end
- [ ] No console errors
- [ ] Clean, professional UI
- [ ] Responsive on demo device

### Demo Flow (15 min)
1. **Introduction** (2 min)
   - Show dashboard/homepage
   - Explain three AI capabilities

2. **Copywriting Demo** (3 min)
   - Enter marketing message
   - Generate variations
   - Show different audiences/platforms
   - Highlight quality and speed

3. **DM Creative Demo** (5 min)
   - Create single DM with personalization
   - Show QR code generation
   - Scan QR with phone → landing page
   - Upload CSV for batch (3-5 records)
   - Show multiple DMs with unique tracking

4. **CC Operations Demo** (4 min)
   - Enter test phone number
   - Configure call objective
   - Initiate AI call
   - Show call status
   - Explain personalization capabilities

5. **Wrap-up** (1 min)
   - Show settings integration
   - Explain scalability
   - Discuss next steps

### Key Talking Points
- **Speed**: 3-hour build demonstrates rapid prototyping capability
- **AI Integration**: Multiple AI providers working together seamlessly
- **Personalization**: Every output customized to company and customer
- **Scalability**: Batch processing for enterprise scale
- **Real-world**: Functional QR codes, real phone calls, actual landing pages
- **Cost-effective**: API-based, no custom ML training required

---

## Troubleshooting

### Environment Issues
- **Missing API Keys**: Check `.env.local` exists and keys are valid
- **Port in use**: Change port with `npm run dev -- -p 3001`
- **Build fails**: Clear `.next` folder and rebuild

### API Issues
- **OpenAI 429 errors**: Rate limited, wait or upgrade plan
- **ElevenLabs call fails**: Verify phone number format, check API permissions
- **CORS errors**: Use API routes, not direct client calls

### Development Issues
- **Hot reload not working**: Restart dev server
- **Types not updating**: Restart TypeScript server in IDE
- **localStorage not working**: Check browser settings, use incognito mode

---

## SaaS Transformation (In Progress)

**⚠️ See `DROPLAB_TRANSFORMATION_PLAN.md` for complete roadmap**

The platform is undergoing a transformation from retail-focused demo to universal SaaS platform. Key features being added:

### Implemented in Transformation Plan:
- ✅ Supabase PostgreSQL database with multi-tenancy (Phase 1-2)
- ✅ User authentication with Supabase Auth (Phase 3)
- ✅ Data Axle integration - 250M+ contacts with smart filtering (Phase 4)
- ✅ PostGrid fulfillment - automated direct mail printing (Phase 5)
- ✅ Stripe billing - subscription + usage metering (Phase 6)
- ✅ Row-Level Security (RLS) for data isolation
- ✅ Database abstraction layer for safe migration

### Future Enhancements (Post-Launch):
- Email campaign integration
- SMS integration alongside phone calls
- A/B testing for copywriting variations
- Advanced campaign scheduling
- Integration with CRM systems (Salesforce, HubSpot)
- White-label capabilities for agencies
- Advanced reporting and ROI analytics
- Webhook integrations for automation
