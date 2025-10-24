import Database from "better-sqlite3";
import path from "path";

// Database file location
// REVERTED: dm-tracking.db is the CURRENT database with user-created DM templates
// marketing.db was old/backup data - switching to it caused user templates to disappear
const DB_PATH = path.join(process.cwd(), "dm-tracking.db");

// Singleton database instance
let db: Database.Database | null = null;

/**
 * Get or create database connection
 * @returns Database instance
 */
export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, { verbose: console.log });
    db.pragma("foreign_keys = ON");
    initializeSchema(db);
  }
  return db;
}

/**
 * Migrate brand_profiles table to add brand kit columns if they don't exist
 * @param database Database instance
 */
function migrateBrandProfiles(database: Database.Database): void {
  try {
    // Check if logo_url column exists
    const columns = database.prepare("PRAGMA table_info(brand_profiles)").all() as Array<{ name: string }>;
    const columnNames = columns.map((col) => col.name);

    if (!columnNames.includes('logo_url')) {
      console.log('🔄 Migrating brand_profiles table to add brand kit columns...');

      // SQLite doesn't support adding multiple columns in one statement
      // We need to add them one by one
      database.exec(`
        ALTER TABLE brand_profiles ADD COLUMN logo_url TEXT;
      `);
      database.exec(`
        ALTER TABLE brand_profiles ADD COLUMN logo_asset_id TEXT;
      `);
      database.exec(`
        ALTER TABLE brand_profiles ADD COLUMN primary_color TEXT DEFAULT '#1E3A8A';
      `);
      database.exec(`
        ALTER TABLE brand_profiles ADD COLUMN secondary_color TEXT DEFAULT '#FF6B35';
      `);
      database.exec(`
        ALTER TABLE brand_profiles ADD COLUMN accent_color TEXT DEFAULT '#10B981';
      `);
      database.exec(`
        ALTER TABLE brand_profiles ADD COLUMN background_color TEXT DEFAULT '#FFFFFF';
      `);
      database.exec(`
        ALTER TABLE brand_profiles ADD COLUMN text_color TEXT DEFAULT '#1F2937';
      `);
      database.exec(`
        ALTER TABLE brand_profiles ADD COLUMN heading_font TEXT DEFAULT 'Inter';
      `);
      database.exec(`
        ALTER TABLE brand_profiles ADD COLUMN body_font TEXT DEFAULT 'Open Sans';
      `);
      database.exec(`
        ALTER TABLE brand_profiles ADD COLUMN landing_page_template TEXT DEFAULT 'professional';
      `);
      database.exec(`
        ALTER TABLE brand_profiles ADD COLUMN website_url TEXT;
      `);
      database.exec(`
        ALTER TABLE brand_profiles ADD COLUMN last_updated_at TEXT;
      `);

      console.log('✅ Brand profiles table migrated successfully - all brand kit columns added');
    } else {
      console.log('✅ Brand profiles table already has brand kit columns - no migration needed');
    }
  } catch (error) {
    console.error('❌ Migration error:', error);
    // Don't throw - allow app to continue even if migration fails
  }
}

/**
 * Initialize database schema (SQLite-compatible, Supabase-ready)
 * @param database Database instance
 */
function initializeSchema(database: Database.Database): void {
  // Campaigns table
  database.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      message TEXT NOT NULL,
      company_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'completed', 'archived'))
    );
  `);

  // Campaign Templates table (Phase 11A)
  database.exec(`
    CREATE TABLE IF NOT EXISTS campaign_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'general' CHECK(category IN ('general', 'retail', 'seasonal', 'promotional')),
      template_data TEXT NOT NULL,
      is_system_template INTEGER DEFAULT 0,
      use_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // DM Templates table (for Template Library - Fabric.js canvases)
  database.exec(`
    CREATE TABLE IF NOT EXISTS dm_templates (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      canvas_session_id TEXT,
      campaign_template_id TEXT,
      name TEXT NOT NULL,
      canvas_json TEXT NOT NULL,
      background_image TEXT NOT NULL,
      canvas_width INTEGER NOT NULL,
      canvas_height INTEGER NOT NULL,
      preview_image TEXT,
      variable_mappings TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (campaign_template_id) REFERENCES campaign_templates(id)
    );
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_dm_templates_campaign
    ON dm_templates(campaign_id);
  `);

  // Campaign Assets table (Phase 11A - Asset Management)
  database.exec(`
    CREATE TABLE IF NOT EXISTS campaign_assets (
      id TEXT PRIMARY KEY,
      campaign_id TEXT,
      template_id TEXT,
      asset_type TEXT NOT NULL CHECK(asset_type IN ('background_image', 'qr_code', 'logo', 'custom_image', 'pdf')),
      asset_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (template_id) REFERENCES campaign_templates(id) ON DELETE CASCADE
    );
  `);

  // Create index for fast asset lookups
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_campaign_assets_campaign_id
    ON campaign_assets(campaign_id);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_campaign_assets_template_id
    ON campaign_assets(template_id);
  `);

  // Recipients table
  database.exec(`
    CREATE TABLE IF NOT EXISTS recipients (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      tracking_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      lastname TEXT NOT NULL,
      address TEXT,
      city TEXT,
      zip TEXT,
      email TEXT,
      phone TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    );
  `);

  // Landing Pages table - Store complete landing page data (OLD SYSTEM - recipient-based)
  database.exec(`
    CREATE TABLE IF NOT EXISTS landing_pages (
      id TEXT PRIMARY KEY,
      tracking_id TEXT UNIQUE NOT NULL,
      campaign_id TEXT NOT NULL,
      recipient_id TEXT NOT NULL,
      page_data TEXT NOT NULL,
      landing_page_url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tracking_id) REFERENCES recipients(tracking_id) ON DELETE CASCADE,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (recipient_id) REFERENCES recipients(id) ON DELETE CASCADE
    );
  `);

  // Campaign Landing Pages table - Campaign-based landing pages (NEW SYSTEM - Phase 1)
  // One landing page per campaign with dual mode: personalized (QR) + generic (direct URL)
  database.exec(`
    CREATE TABLE IF NOT EXISTS campaign_landing_pages (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      campaign_template_id TEXT,
      page_config TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    );
  `);

  // Create index on tracking_id for fast lookups
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_recipients_tracking_id
    ON recipients(tracking_id);
  `);

  // Create index on campaign_id for fast filtering
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_recipients_campaign_id
    ON recipients(campaign_id);
  `);

  // Create indexes for landing_pages table
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_landing_pages_tracking_id
    ON landing_pages(tracking_id);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_landing_pages_campaign_id
    ON landing_pages(campaign_id);
  `);

  // Create index for campaign_landing_pages table
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_campaign_landing_campaign
    ON campaign_landing_pages(campaign_id);
  `);

  // Landing Page Templates table (Simple Template System - Phase 11B)
  database.exec(`
    CREATE TABLE IF NOT EXISTS landing_page_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'prebuilt',
      template_type TEXT NOT NULL,
      is_system_template INTEGER DEFAULT 0,
      template_config TEXT NOT NULL,
      preview_image TEXT,
      use_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_templates_category
    ON landing_page_templates(category);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_templates_type
    ON landing_page_templates(template_type);
  `);

  // Analytics Tracking Snippets table (Google Analytics, Adobe, etc.)
  database.exec(`
    CREATE TABLE IF NOT EXISTS landing_page_tracking_snippets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      snippet_type TEXT NOT NULL,
      code TEXT NOT NULL,
      position TEXT NOT NULL DEFAULT 'body',
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_tracking_snippets_active
    ON landing_page_tracking_snippets(is_active);
  `);

  // Events table (page views, clicks, interactions)
  database.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      tracking_id TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK(event_type IN ('page_view', 'qr_scan', 'button_click', 'form_view', 'external_link')),
      event_data TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tracking_id) REFERENCES recipients(tracking_id) ON DELETE CASCADE
    );
  `);

  // Create index on tracking_id for event queries
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_events_tracking_id
    ON events(tracking_id);
  `);

  // Create index on event_type for analytics
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_events_type
    ON events(event_type);
  `);

  // Conversions table (form submissions, appointments)
  database.exec(`
    CREATE TABLE IF NOT EXISTS conversions (
      id TEXT PRIMARY KEY,
      tracking_id TEXT NOT NULL,
      conversion_type TEXT NOT NULL CHECK(conversion_type IN ('form_submission', 'appointment_booked', 'call_initiated', 'download')),
      conversion_data TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tracking_id) REFERENCES recipients(tracking_id) ON DELETE CASCADE
    );
  `);

  // Create index on tracking_id for conversion queries
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_conversions_tracking_id
    ON conversions(tracking_id);
  `);

  // Create index on conversion_type for analytics
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_conversions_type
    ON conversions(conversion_type);
  `);

  // Brand Profiles table (Phase 2: Brand Intelligence + Phase 12: Brand DNA)
  database.exec(`
    CREATE TABLE IF NOT EXISTS brand_profiles (
      id TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      brand_voice TEXT,
      tone TEXT,
      key_phrases TEXT,
      brand_values TEXT,
      target_audience TEXT,
      industry TEXT,
      extracted_at TEXT NOT NULL DEFAULT (datetime('now')),
      source_content TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      logo_url TEXT,
      logo_asset_id TEXT,
      primary_color TEXT DEFAULT '#1E3A8A',
      secondary_color TEXT DEFAULT '#FF6B35',
      accent_color TEXT DEFAULT '#10B981',
      background_color TEXT DEFAULT '#FFFFFF',
      text_color TEXT DEFAULT '#1F2937',
      heading_font TEXT DEFAULT 'Inter',
      body_font TEXT DEFAULT 'Open Sans',
      landing_page_template TEXT DEFAULT 'professional',
      website_url TEXT,
      last_updated_at TEXT
    );
  `);

  // Create index on company_name
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_brand_profiles_company
    ON brand_profiles(company_name);
  `);

  // Migrate brand_profiles table to add brand kit columns if missing
  migrateBrandProfiles(database);

  // ==================== RETAIL MODULE TABLES (Phase 8A) ====================
  // These tables are created but inactive until retail module is enabled in settings

  // Retail Stores table
  database.exec(`
    CREATE TABLE IF NOT EXISTS retail_stores (
      id TEXT PRIMARY KEY,
      store_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      region TEXT,
      district TEXT,
      size_category TEXT,
      demographic_profile TEXT,
      lat REAL,
      lng REAL,
      timezone TEXT DEFAULT 'America/New_York',
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_retail_stores_number
    ON retail_stores(store_number);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_retail_stores_region
    ON retail_stores(region);
  `);

  // Retail Age Groups table
  database.exec(`
    CREATE TABLE IF NOT EXISTS retail_age_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      min_age INTEGER,
      max_age INTEGER,
      description TEXT,
      is_active INTEGER DEFAULT 1
    );
  `);

  // Retail Creative Variants table
  database.exec(`
    CREATE TABLE IF NOT EXISTS retail_creative_variants (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      variant_code TEXT NOT NULL,
      variant_name TEXT,
      background_url TEXT,
      headline TEXT,
      body_copy TEXT,
      cta_text TEXT,
      design_tags TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    );
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_retail_variants_campaign
    ON retail_creative_variants(campaign_id);
  `);

  // Retail Campaign Deployments table
  database.exec(`
    CREATE TABLE IF NOT EXISTS retail_campaign_deployments (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      store_id TEXT NOT NULL,
      age_group_id TEXT,
      creative_variant_id TEXT,
      scheduled_date TEXT,
      sent_date TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'sending', 'sent', 'completed')),
      recipients_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (store_id) REFERENCES retail_stores(id),
      FOREIGN KEY (age_group_id) REFERENCES retail_age_groups(id),
      FOREIGN KEY (creative_variant_id) REFERENCES retail_creative_variants(id)
    );
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_retail_deployments_campaign
    ON retail_campaign_deployments(campaign_id);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_retail_deployments_store
    ON retail_campaign_deployments(store_id);
  `);

  // Retail Deployment Recipients table (links to existing recipients)
  database.exec(`
    CREATE TABLE IF NOT EXISTS retail_deployment_recipients (
      id TEXT PRIMARY KEY,
      deployment_id TEXT NOT NULL,
      recipient_id TEXT NOT NULL,
      FOREIGN KEY (deployment_id) REFERENCES retail_campaign_deployments(id) ON DELETE CASCADE,
      FOREIGN KEY (recipient_id) REFERENCES recipients(id) ON DELETE CASCADE
    );
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_retail_deployment_recipients_deployment
    ON retail_deployment_recipients(deployment_id);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_retail_deployment_recipients_recipient
    ON retail_deployment_recipients(recipient_id);
  `);

  // Retail Store Performance Aggregates table
  database.exec(`
    CREATE TABLE IF NOT EXISTS retail_store_performance_aggregates (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL,
      age_group_id TEXT,
      creative_variant_id TEXT,
      time_period TEXT,
      campaigns_count INTEGER DEFAULT 0,
      recipients_count INTEGER DEFAULT 0,
      visitors_count INTEGER DEFAULT 0,
      conversions_count INTEGER DEFAULT 0,
      conversion_rate REAL,
      avg_time_to_conversion REAL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (store_id) REFERENCES retail_stores(id)
    );
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_retail_performance_store
    ON retail_store_performance_aggregates(store_id);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_retail_performance_period
    ON retail_store_performance_aggregates(time_period);
  `);

  // Retail Creative Patterns table (ML insights)
  database.exec(`
    CREATE TABLE IF NOT EXISTS retail_creative_patterns (
      id TEXT PRIMARY KEY,
      pattern_type TEXT NOT NULL,
      pattern_value TEXT NOT NULL,
      success_score REAL,
      sample_size INTEGER,
      confidence_level REAL,
      applicable_stores TEXT,
      applicable_age_groups TEXT,
      examples TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_retail_patterns_type
    ON retail_creative_patterns(pattern_type);
  `);

  // Retail Campaign Recommendations table
  database.exec(`
    CREATE TABLE IF NOT EXISTS retail_recommendations (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL,
      age_group_id TEXT,
      recommended_variant_id TEXT,
      confidence_score REAL,
      reasoning TEXT,
      predicted_conversion_rate REAL,
      based_on_campaigns TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (store_id) REFERENCES retail_stores(id),
      FOREIGN KEY (recommended_variant_id) REFERENCES retail_creative_variants(id)
    );
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_retail_recommendations_store
    ON retail_recommendations(store_id);
  `);

  // ==================== CAMPAIGN ORDER SYSTEM (Week 1) ====================

  // Campaign Orders table
  database.exec(`
    CREATE TABLE IF NOT EXISTS campaign_orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'pending', 'sent', 'printing', 'shipped', 'delivered', 'cancelled')),
      total_stores INTEGER NOT NULL DEFAULT 0,
      total_quantity INTEGER NOT NULL DEFAULT 0,
      estimated_cost REAL DEFAULT 0.0,
      pdf_url TEXT,
      csv_url TEXT,
      notes TEXT,
      tracking_number TEXT,
      supplier_email TEXT,
      sent_at TEXT,
      delivered_at TEXT
    );
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_campaign_orders_number
    ON campaign_orders(order_number);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_campaign_orders_status
    ON campaign_orders(status);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_campaign_orders_created
    ON campaign_orders(created_at DESC);
  `);

  // Campaign Order Items table
  database.exec(`
    CREATE TABLE IF NOT EXISTS campaign_order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      store_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      recommended_quantity INTEGER NOT NULL DEFAULT 0,
      approved_quantity INTEGER NOT NULL DEFAULT 0,
      unit_cost REAL DEFAULT 0.25,
      total_cost REAL DEFAULT 0.0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES campaign_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (store_id) REFERENCES retail_stores(id),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
    );
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_campaign_order_items_order
    ON campaign_order_items(order_id);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_campaign_order_items_store
    ON campaign_order_items(store_id);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_campaign_order_items_campaign
    ON campaign_order_items(campaign_id);
  `);

  // ==================== BATCH PROCESSING TABLES ====================

  // Batch Jobs table
  database.exec(`
    CREATE TABLE IF NOT EXISTS batch_jobs (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      template_id TEXT,
      user_email TEXT,
      status TEXT DEFAULT 'pending',
      total_recipients INTEGER NOT NULL,
      processed_count INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      output_zip_path TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
    )
  `);

  // Batch Job Recipients table
  database.exec(`
    CREATE TABLE IF NOT EXISTS batch_job_recipients (
      id TEXT PRIMARY KEY,
      batch_job_id TEXT NOT NULL,
      recipient_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      pdf_path TEXT,
      error_message TEXT,
      processed_at TEXT,
      FOREIGN KEY (batch_job_id) REFERENCES batch_jobs(id),
      FOREIGN KEY (recipient_id) REFERENCES recipients(id)
    )
  `);

  // Batch Job Progress table
  database.exec(`
    CREATE TABLE IF NOT EXISTS batch_job_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_job_id TEXT NOT NULL,
      progress_percent REAL NOT NULL,
      message TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (batch_job_id) REFERENCES batch_jobs(id)
    )
  `);

  // User Notifications table
  database.exec(`
    CREATE TABLE IF NOT EXISTS user_notifications (
      id TEXT PRIMARY KEY,
      user_email TEXT NOT NULL,
      notification_type TEXT NOT NULL,
      batch_job_id TEXT,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      sent_at TEXT,
      read_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (batch_job_id) REFERENCES batch_jobs(id)
    )
  `);

  // ElevenLabs call tracking table
  database.exec(`
    CREATE TABLE IF NOT EXISTS elevenlabs_calls (
      id TEXT PRIMARY KEY,
      conversation_id TEXT UNIQUE NOT NULL,

      -- Agent & Phone
      agent_id TEXT,
      elevenlabs_phone_number TEXT,
      caller_phone_number TEXT,

      -- Timing
      call_started_at TEXT NOT NULL,
      call_ended_at TEXT,
      call_duration_seconds INTEGER,

      -- Status
      call_status TEXT NOT NULL,

      -- Campaign Attribution
      campaign_id TEXT,
      recipient_id TEXT,

      -- Conversion
      is_conversion BOOLEAN DEFAULT 0,

      -- Metadata
      raw_data TEXT,
      synced_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
      FOREIGN KEY (recipient_id) REFERENCES recipients(id)
    )
  `);

  // ElevenLabs call tracking indexes
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_elevenlabs_calls_campaign
    ON elevenlabs_calls(campaign_id);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_elevenlabs_calls_started
    ON elevenlabs_calls(call_started_at);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_elevenlabs_calls_status
    ON elevenlabs_calls(call_status);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_elevenlabs_calls_caller
    ON elevenlabs_calls(caller_phone_number);
  `);

  // Batch processing indexes
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_batch_jobs_status
    ON batch_jobs(status);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_batch_jobs_created_at
    ON batch_jobs(created_at DESC);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_batch_job_recipients_batch_status
    ON batch_job_recipients(batch_job_id, status);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_user_notifications_email
    ON user_notifications(user_email, read_at);
  `);

  // Store Groups tables (for saving frequently-used store selections)
  database.exec(`
    CREATE TABLE IF NOT EXISTS store_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      store_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS store_group_members (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      store_id TEXT NOT NULL,
      added_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (group_id) REFERENCES store_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (store_id) REFERENCES retail_stores(id) ON DELETE CASCADE,
      UNIQUE(group_id, store_id)
    );
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_store_groups_name
    ON store_groups(name);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_store_group_members_group
    ON store_group_members(group_id);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_store_group_members_store
    ON store_group_members(store_id);
  `);

  console.log("✅ Database schema initialized successfully (including retail, batch processing, and store groups tables)");

  // Seed pre-built templates if they don't exist
  seedPrebuiltTemplates(database);
}

/**
 * Seed pre-built landing page templates
 * @param database Database instance
 */
function seedPrebuiltTemplates(database: Database.Database): void {
  try {
    // Check if templates already seeded
    const count = database.prepare('SELECT COUNT(*) as count FROM landing_page_templates WHERE is_system_template = 1').get() as { count: number };

    if (count.count >= 8) {
      console.log('✅ Pre-built templates already seeded');
      return;
    }

    console.log('🌱 Seeding pre-built landing page templates...');

    // Import templates (lazy load to avoid circular dependencies)
    const { PREBUILT_TEMPLATES } = require('../templates/prebuilt-templates');
    const now = new Date().toISOString();

    for (const template of PREBUILT_TEMPLATES) {
      database.prepare(`
        INSERT OR REPLACE INTO landing_page_templates (
          id, name, description, category, template_type, is_system_template,
          template_config, preview_image, use_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        template.id,
        template.name,
        template.description,
        template.category,
        template.template_type,
        template.is_system_template,
        template.template_config,
        template.preview_image,
        template.use_count,
        now,
        now
      );
    }

    console.log(`✅ Seeded ${PREBUILT_TEMPLATES.length} pre-built templates`);
  } catch (error) {
    console.error('❌ Error seeding templates:', error);
    // Don't throw - allow app to continue
  }
}

/**
 * Close database connection (for graceful shutdown)
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log("Database connection closed");
  }
}

/**
 * Reset database (for testing purposes only)
 */
export function resetDatabase(): void {
  const database = getDatabase();
  database.exec("DROP TABLE IF EXISTS conversions;");
  database.exec("DROP TABLE IF EXISTS events;");
  database.exec("DROP TABLE IF EXISTS recipients;");
  database.exec("DROP TABLE IF EXISTS campaigns;");
  initializeSchema(database);
  console.log("✅ Database reset complete");
}
