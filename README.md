# AI Marketing Platform Demo

A comprehensive Next.js 15.5.4 application demonstrating AI-powered marketing automation with integrated workflow, brand intelligence, and real-time analytics.

## 🚀 Features

### 1. **AI Copywriting Generator** (Enhanced)
- Generate multiple marketing campaign variations using OpenAI GPT-4o-mini
- **Unique campaign titles** (e.g., "Rediscover Family Moments", "Spring Hearing Health Initiative")
- Optimized for different audience segments (First-time Users 55-65, Adult Children, Active Seniors)
- Varied emotional tones (Warm & Reassuring, Empowering & Hopeful, Educational & Trustworthy)
- **"Use in Campaign" button** for seamless workflow to DM Creative
- **Brand Intelligence Integration** - uses extracted brand profile for consistency
- One-click copy to clipboard

### 2. **Direct Mail Creative** (Enhanced)
- **AI-generated background images** using DALL-E (gpt-image-1 model)
- Personalized direct mail with unique QR codes linking to dedicated landing pages
- **Auto-fill from Copywriting** - campaign name and message pre-populated
- **Auto-suggest campaign name** based on company and date
- **AI-generated copy indicator** with purple badge showing source
- CSV batch processing for mass campaigns
- Print-ready PDF generation with client-side image composition
- Variable data printing (VDP) with recipient personalization
- Campaign tracking with unique IDs
- Trackable landing pages with appointment forms and hearing questionnaires

### 3. **Brand Intelligence** (NEW - Phase 2)
- **AI-powered brand profile extraction**
  - Upload existing marketing content for analysis
  - Automatically extracts brand voice, tone, key phrases, and core values
  - Target audience identification
- **Auto-fill settings** with extracted brand data
- **Persistent storage** in SQLite database
- **Visual indicators** showing AI-extracted elements as chips
- Profile loaded badge and timestamp
- Seamlessly integrates with copywriting for brand-consistent content

### 4. **Analytics Dashboard** (NEW - Phase 3)
- **Overview Tab:**
  - Total campaigns, recipients, page views, conversions
  - Response rate and conversion rate metrics with visual progress bars
  - QR code scan tracking
  - Form submission tracking
- **Campaigns Tab:**
  - All campaigns with performance metrics
  - Recipients, visitors, conversions per campaign
  - Conversion rate visualization
  - Campaign status badges (active/paused/completed)
  - Campaign message preview
- **Activity Tab:**
  - Real-time event and conversion tracking
  - Auto-refresh every 30 seconds
  - Page views, QR scans, button clicks, form submissions
  - Appointment bookings, downloads, external links
  - Time-based activity grouping ("2m ago", "1h ago")
- **Database Integration:** SQLite with comprehensive tracking tables

### 5. **Call Center Operations**
- ElevenLabs AI-powered phone call automation
- Multiple agent scenarios (appointments, support, sales)
- Live browser-based agent testing with ConvAI widget
- Real-time call status monitoring
- Configurable agent personalities and management

### 6. **Settings** (Enhanced)
- **Two-tab interface:**
  - **Company & Brand Tab:**
    - Company information, industry, brand voice, target audience, tone
    - Brand Intelligence extraction interface
    - Visual display of AI-extracted brand elements
  - **Integrations Tab:**
    - API keys (OpenAI, ElevenLabs)
    - ElevenLabs agent management
    - Phone number configuration
- **Persistent storage:** Database + localStorage hybrid
- Used to personalize outputs across all features

## 🛠️ Technology Stack

- **Framework:** Next.js 15.5.4 (App Router, React 19)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Build Tool:** Turbopack
- **Database:** SQLite with better-sqlite3
- **AI Services:**
  - OpenAI GPT-4o-mini (copywriting)
  - OpenAI gpt-image-1 (DALL-E image generation)
  - ElevenLabs (voice AI & phone calls)
- **Additional Libraries:**
  - QRCode generation (`qrcode`)
  - CSV processing (`papaparse`)
  - PDF generation (`jspdf`)
  - Charts (`recharts`)
  - Form validation (`zod`, `react-hook-form`)
  - Toast notifications (`sonner`)

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key (for copywriting & image generation)
- ElevenLabs API key (for call center operations)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/FedericoTs/marketing-ai-demo.git
   cd marketing-ai-demo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create `.env.local` in the project root:
   ```env
   OPENAI_API_KEY=sk-proj-...
   ELEVENLABS_API_KEY=...
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 Quick Start Guide

### Initial Setup

1. **Navigate to Settings** (`/settings`)
   - **Company & Brand Tab:**
     - Enter company information (name, industry, target audience)
     - (Optional) Use Brand Intelligence to extract from existing content
     - Review and save
   - **Integrations Tab:**
     - Add API keys (OpenAI, ElevenLabs)
     - Configure ElevenLabs agents (optional)

### Complete Workflow: Copywriting → DM Creative → Analytics

1. **Generate Campaign Copy**
   - Go to **Copywriting** tab
   - Enter your marketing message or idea
   - Click "Generate Variations"
   - Review AI-generated campaign titles and copy
   - Click **"Use in Campaign"** button on your preferred variation

2. **Create Direct Mail**
   - DM Creative automatically opens with pre-filled:
     - Campaign name (the campaign title)
     - Marketing message (the AI-generated copy)
   - Fill in recipient details
   - Click "Generate Direct Mail"
   - Preview personalized DM with QR code
   - Download PDF for printing

3. **Track Performance**
   - Go to **Analytics** tab
   - View overview metrics (campaigns, recipients, conversions)
   - Monitor campaign-specific performance
   - Watch real-time activity feed

### Using Brand Intelligence

1. Go to **Settings** → **Company & Brand** tab
2. Scroll to "Brand Intelligence (AI-Powered)" section
3. Paste your existing marketing content (website copy, emails, brochures)
4. Click "Extract Brand Intelligence"
5. Review extracted brand voice, tone, key phrases, and values
6. Save settings
7. Future AI-generated copy will match your brand consistently

### Batch Processing Direct Mail

1. Go to **DM Creative** → **Batch Upload** tab
2. Download CSV template (or use `/public/templates/dm-template.csv`)
3. Fill in recipient data (name, lastname, address, etc.)
4. Upload CSV file
5. Review parsed data
6. Click "Generate Batch"
7. Download individual PDFs or all at once

### Call Center Operations

**Setup Agents:**
1. Go to **Settings** → **Integrations** → AI Agent Scenarios
2. Add agent with name, description, and ElevenLabs Agent ID
3. Save configuration

**Test Agent:**
1. Go to **CC Operations** tab
2. Select agent from dropdown
3. Use live chat widget to test conversationally
4. OR enter phone number to initiate real call

## 📁 Project Structure

```
marketing-ai-demo/
├── app/
│   ├── api/                     # API routes
│   │   ├── analytics/           # Analytics data endpoints
│   │   ├── brand/               # Brand intelligence extraction
│   │   ├── copywriting/         # AI copywriting generation
│   │   ├── dm-creative/         # Direct mail generation
│   │   ├── call/                # Phone call initiation
│   │   └── tracking/            # Campaign tracking endpoints
│   ├── analytics/               # Analytics dashboard
│   ├── copywriting/             # Copywriting page
│   ├── dm-creative/             # Direct mail page
│   ├── cc-operations/           # Call center page
│   ├── settings/                # Settings page
│   └── lp/[trackingId]/         # Dynamic landing pages
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── analytics/               # Analytics dashboard components
│   ├── copywriting/             # Copywriting components
│   ├── dm-creative/             # DM components
│   ├── cc-operations/           # Call center components
│   ├── landing/                 # Landing page components
│   └── settings/                # Settings components
├── lib/
│   ├── ai/                      # AI service integrations
│   ├── contexts/                # React contexts
│   ├── database/                # SQLite database connection & queries
│   ├── dm-image-compositor-browser.ts  # Client-side image composition
│   ├── pdf-generator.ts         # PDF generation
│   ├── qr-generator.ts          # QR code generation
│   └── tracking.ts              # Tracking system
├── types/                       # TypeScript type definitions
├── public/
│   └── templates/               # CSV templates
├── dm-tracking.db               # SQLite database (auto-created)
├── CLAUDE.md                    # Detailed architecture guide
└── README.md                    # This file
```

## 🔑 API Keys Setup

### OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create new secret key
3. Add to `.env.local` as `OPENAI_API_KEY`

### ElevenLabs API Key
1. Visit [ElevenLabs Dashboard](https://elevenlabs.io/app/settings/api-keys)
2. Generate API key
3. Add to `.env.local` as `ELEVENLABS_API_KEY`

### ElevenLabs Agent IDs (Optional)
1. Go to [ElevenLabs Conversational AI](https://elevenlabs.io/app/conversational-ai)
2. Create agent with desired voice and prompt
3. Copy Agent ID from agent settings
4. Add to Settings → Integrations → AI Agent Scenarios in the app

## 🐛 Common Issues & Solutions

### Canvas Native Module Error (Windows)
**Fixed:** The app uses browser-based Canvas API for image composition, avoiding native module compilation issues.

### Database Lock Issues
If you encounter database lock errors:
1. Stop the development server
2. Delete `dm-tracking.db` file
3. Restart the development server
4. Database will be recreated with the correct schema

### API Rate Limits
- OpenAI: Upgrade to higher tier or implement rate limiting
- ElevenLabs: Check plan limits for phone calls

### Port Already in Use
```bash
npm run dev -- -p 3001
```

### Environment Variables Not Loading
1. Ensure `.env.local` exists in project root
2. Restart development server
3. Verify variable names match exactly

## 📦 Build & Deploy

### Production Build
```bash
npm run build
npm start
```

### Deploy to Vercel
1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

**Note:** For production deployment, consider:
- Using PostgreSQL instead of SQLite
- Adding proper error logging
- Implementing rate limiting
- Setting up monitoring

## 📄 Documentation

- **CLAUDE.md** - Comprehensive architecture and implementation guide
- **README.md** - This file (user guide)

## 🎨 Design Philosophy

- **User-Friendly:** Intuitive workflows with clear visual indicators
- **Non-Breaking:** All enhancements preserve existing functionality
- **Seamless Integration:** Features work together intelligently
- **Real-Time:** Live tracking and analytics updates
- **Professional:** Enterprise-ready UI with polished design

## 🚦 Platform Workflow

```
1. Settings (Configure) →
2. Brand Intelligence (Extract) →
3. Copywriting (Generate) →
4. DM Creative (Execute) →
5. Analytics (Measure)
```

## 🤝 Contributing

This is a demo project. For production use, consider:
- Add user authentication
- Implement comprehensive error logging
- Add webhook handlers for ElevenLabs
- Implement scheduled reporting
- Add A/B testing capabilities
- Create campaign templates library

## 📝 License

MIT License - Free to use and modify

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- AI powered by [OpenAI](https://openai.com/) and [ElevenLabs](https://elevenlabs.io/)

---

**Developed with Claude Code as an AI-powered marketing automation platform** 🚀

🤖 Generated with [Claude Code](https://claude.com/claude-code)
