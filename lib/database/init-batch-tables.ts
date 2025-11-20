/**
 * Database Migration: Batch Job Processing Tables
 *
 * This script creates the necessary tables for scalable batch processing:
 * - batch_jobs: Tracks overall batch job status
 * - batch_job_recipients: Individual recipient processing status
 * - batch_job_progress: Real-time progress snapshots
 * - user_notifications: Email notification queue
 */

import { getDatabase } from "./connection";

export function initBatchJobTables(): void {
  const db = createServiceClient();

  console.log("📦 Initializing batch job tables...");

  // ==================== BATCH JOBS TABLE ====================
  // Note: template_id foreign key removed to allow batches without templates
  db.exec(`
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
  console.log("✅ batch_jobs table created");

  // ==================== BATCH JOB RECIPIENTS TABLE ====================
  db.exec(`
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
  console.log("✅ batch_job_recipients table created");

  // ==================== BATCH JOB PROGRESS TABLE ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS batch_job_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_job_id TEXT NOT NULL,
      progress_percent REAL NOT NULL,
      message TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (batch_job_id) REFERENCES batch_jobs(id)
    )
  `);
  console.log("✅ batch_job_progress table created");

  // ==================== USER NOTIFICATIONS TABLE ====================
  db.exec(`
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
  console.log("✅ user_notifications table created");

  // ==================== INDEXES FOR PERFORMANCE ====================
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_batch_jobs_status
    ON batch_jobs(status)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_batch_jobs_created_at
    ON batch_jobs(created_at DESC)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_batch_job_recipients_batch_status
    ON batch_job_recipients(batch_job_id, status)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_user_notifications_email
    ON user_notifications(user_email, read_at)
  `);

  console.log("✅ Indexes created");
  console.log("🎉 Batch job tables initialized successfully!");
}

/**
 * Run migration if executed directly
 */
if (require.main === module) {
  try {
    initBatchJobTables();
    console.log("✅ Migration completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}
