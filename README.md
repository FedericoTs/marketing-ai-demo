# AI Marketing Platform Demo

A Next.js 15.5.4 application demonstrating AI-powered marketing automation with three core features: AI Copywriting, Direct Mail Campaigns, and AI Call Center Operations.

## 🚀 Features

### 1. **AI Copywriting Generator**
- Generate multiple marketing copy variations using OpenAI GPT-4
- Optimized for different audiences (B2B, B2C, Enterprise, SMB)
- Platform-specific variations (email, social media, web, print)
- One-click copy to clipboard

### 2. **Direct Mail Creative**
- Personalized direct mail generation with AI-generated backgrounds
- Unique QR codes linking to dedicated landing pages
- CSV batch processing for mass campaigns
- Print-ready PDF generation
- Variable data printing (VDP) with recipient personalization
- Trackable landing pages with appointment forms

### 3. **Call Center Operations**
- ElevenLabs AI-powered phone call automation
- Multiple agent scenarios (appointments, support, sales)
- Live browser-based agent testing with ConvAI widget
- Real-time call status monitoring
- Configurable agent personalities

## 🛠️ Technology Stack

- **Framework:** Next.js 15.5.4 (App Router, React 19)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Build Tool:** Turbopack
- **AI Services:**
  - OpenAI GPT-4 (copywriting)
  - OpenAI DALL-E (image generation)
  - ElevenLabs (voice AI & phone calls)
- **Additional Libraries:**
  - QRCode generation (`qrcode`)
  - CSV processing (`papaparse`)
  - PDF generation (`jspdf`)
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
   git clone <repository-url>
   cd marketing-ai-demo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create `.env.local` in the project root:
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your API keys:
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
   - Enter company information
   - Add API keys (OpenAI, ElevenLabs)
   - Configure brand voice and target audience
   - Add ElevenLabs agent configurations

### Using Copywriting

1. Go to **Copywriting** tab
2. Enter your marketing message
3. Click "Generate Variations"
4. Review AI-generated variations for different platforms/audiences
5. Click copy icon to use in your campaigns

### Creating Direct Mail

**Single DM:**
1. Go to **DM Creative** tab
2. Fill in recipient details (name, address, etc.)
3. Enter marketing message
4. Click "Generate Direct Mail"
5. Preview QR code and landing page
6. Download PDF for printing

**Batch Processing:**
1. Click "CSV Upload" tab in DM Creative
2. Upload CSV file (see `/public/templates/dm-template.csv` for format)
3. Review parsed data
4. Click "Generate Batch"
5. Download individual or all PDFs

### Call Center Operations

**Setup Agents:**
1. Go to **Settings** → AI Agent Scenarios
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
│   │   ├── copywriting/         # AI copywriting generation
│   │   ├── dm-creative/         # Direct mail generation
│   │   └── call/                # Phone call initiation
│   ├── copywriting/             # Copywriting page
│   ├── dm-creative/             # Direct mail page
│   ├── cc-operations/           # Call center page
│   ├── settings/                # Settings page
│   └── lp/[trackingId]/         # Dynamic landing pages
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── copywriting/             # Copywriting components
│   ├── dm-creative/             # DM components
│   ├── cc-operations/           # Call center components
│   ├── landing/                 # Landing page components
│   └── settings/                # Settings components
├── lib/
│   ├── ai/                      # AI service integrations
│   ├── contexts/                # React contexts
│   ├── dm-image-compositor-browser.ts  # Client-side image composition
│   ├── pdf-generator.ts         # PDF generation
│   ├── qr-generator.ts          # QR code generation
│   └── tracking.ts              # Tracking system
├── types/                       # TypeScript type definitions
├── public/
│   └── templates/               # CSV templates
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

### ElevenLabs Agent IDs
1. Go to [ElevenLabs Conversational AI](https://elevenlabs.io/app/conversational-ai)
2. Create agent with desired voice and prompt
3. Copy Agent ID from agent settings
4. Add to Settings → AI Agent Scenarios in the app

## 🐛 Common Issues & Solutions

### Canvas Native Module Error (Windows)
**Fixed:** The app now uses browser-based Canvas API for image composition, avoiding native module compilation issues.

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

## 📄 Documentation

- **CLAUDE.md** - Comprehensive architecture and implementation guide
- **DM_CREATIVE_TESTING.md** - Direct mail feature testing guide
- **DEMO_INSTRUCTIONS.md** - Demo presentation guide

## 🤝 Contributing

This is a demo project. For production use:
- Add database integration (PostgreSQL/Vercel Postgres)
- Implement user authentication
- Add analytics dashboard
- Implement webhook handlers for ElevenLabs
- Add comprehensive error logging
- Implement rate limiting

## 📝 License

MIT License - Free to use and modify

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- AI powered by [OpenAI](https://openai.com/) and [ElevenLabs](https://elevenlabs.io/)

---

**Built in 3 hours as a proof-of-concept for AI-powered marketing automation** 🚀
