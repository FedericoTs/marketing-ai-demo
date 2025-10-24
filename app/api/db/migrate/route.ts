import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/database/connection";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

/**
 * Manual database migration endpoint
 * Run batch table creation
 */
export async function POST() {
  try {
    const db = getDatabase();

    console.log("📦 Creating batch job tables...");

    // Drop existing tables if they have wrong schema
    db.exec(`DROP TABLE IF EXISTS user_notifications`);
    db.exec(`DROP TABLE IF EXISTS batch_job_progress`);
    db.exec(`DROP TABLE IF EXISTS batch_job_recipients`);
    db.exec(`DROP TABLE IF EXISTS batch_jobs`);

    // Create batch_jobs table (no template_id FK)
    db.exec(`
      CREATE TABLE batch_jobs (
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

    // Create batch_job_recipients table
    db.exec(`
      CREATE TABLE batch_job_recipients (
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

    // Create batch_job_progress table
    db.exec(`
      CREATE TABLE batch_job_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_job_id TEXT NOT NULL,
        progress_percent REAL NOT NULL,
        message TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (batch_job_id) REFERENCES batch_jobs(id)
      )
    `);
    console.log("✅ batch_job_progress table created");

    // Create user_notifications table
    db.exec(`
      CREATE TABLE user_notifications (
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

    // Create indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_jobs(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_batch_jobs_created_at ON batch_jobs(created_at DESC)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_batch_job_recipients_batch_status ON batch_job_recipients(batch_job_id, status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_user_notifications_email ON user_notifications(user_email, read_at)`);
    console.log("✅ Indexes created");

    return NextResponse.json(
      successResponse(null, "Batch job tables created successfully")
    );
  } catch (error) {
    console.error("❌ Migration failed:", error);
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : "Unknown error",
        "MIGRATION_ERROR"
      ),
      { status: 500 }
    );
  }
}
