import Database from "better-sqlite3";
import path from "path";

// Database file location
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

  // Landing Pages table - Store complete landing page data
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

  console.log("✅ Database schema initialized successfully (including retail module tables)");
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
