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
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'completed'))
    );
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

  // Brand Profiles table (Phase 2: Brand Intelligence)
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
      is_active INTEGER NOT NULL DEFAULT 1
    );
  `);

  // Create index on company_name
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_brand_profiles_company
    ON brand_profiles(company_name);
  `);

  console.log("✅ Database schema initialized successfully");
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
