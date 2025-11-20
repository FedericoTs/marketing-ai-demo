/**
 * Batch Job Database Queries
 *
 * CRUD operations for batch job processing system
 */

import { nanoid } from "nanoid";
import { getDatabase } from "./connection";
import { dbLogger } from "./logger";
import { validateRequired, validateId, validateEnum, validateNumber, validateEmail } from "./validators";

// ==================== TYPES ====================

export type BatchJobStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";
export type BatchRecipientStatus = "pending" | "processing" | "completed" | "failed";

export interface BatchJob {
  id: string;
  campaign_id: string;
  template_id?: string;
  user_email?: string;
  status: BatchJobStatus;
  total_recipients: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  output_zip_path?: string;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface BatchJobRecipient {
  id: string;
  batch_job_id: string;
  recipient_id: string;
  status: BatchRecipientStatus;
  pdf_path?: string;
  error_message?: string;
  processed_at?: string;
}

export interface BatchJobProgress {
  id: number;
  batch_job_id: string;
  progress_percent: number;
  message?: string;
  created_at: string;
}

export interface UserNotification {
  id: string;
  user_email: string;
  notification_type: string;
  batch_job_id?: string;
  subject: string;
  message: string;
  sent_at?: string;
  read_at?: string;
  created_at: string;
}

// ==================== BATCH JOBS ====================

/**
 * Create a new batch job
 */
export function createBatchJob(data: {
  campaignId: string;
  templateId?: string;
  userEmail?: string;
  totalRecipients: number;
}): BatchJob {
  const operation = 'createBatchJob';

  // Validate required inputs
  validateId(data.campaignId, 'campaignId', operation);
  validateNumber(data.totalRecipients, 'totalRecipients', operation, { min: 1, integer: true });

  // Validate optional email if provided
  if (data.userEmail) {
    validateEmail(data.userEmail, 'userEmail', operation);
  }

  const db = createServiceClient();
  const id = nanoid(16);
  const created_at = new Date().toISOString();

  dbLogger.info(operation, 'batch_jobs', id, {
    campaignId: data.campaignId,
    totalRecipients: data.totalRecipients
  });

  const stmt = db.prepare(`
    INSERT INTO batch_jobs (
      id, campaign_id, template_id, user_email, status,
      total_recipients, processed_count, success_count, failed_count,
      created_at
    )
    VALUES (?, ?, ?, ?, 'pending', ?, 0, 0, 0, ?)
  `);

  try {
    stmt.run(
      id,
      data.campaignId,
      data.templateId || null,
      data.userEmail || null,
      data.totalRecipients,
      created_at
    );
    dbLogger.debug(`${operation} completed`, { id, totalRecipients: data.totalRecipients });
  } catch (error) {
    dbLogger.error(operation, error as Error, { campaignId: data.campaignId });
    throw error;
  }

  return {
    id,
    campaign_id: data.campaignId,
    template_id: data.templateId,
    user_email: data.userEmail,
    status: "pending",
    total_recipients: data.totalRecipients,
    processed_count: 0,
    success_count: 0,
    failed_count: 0,
    created_at,
  };
}

/**
 * Get batch job by ID
 */
export function getBatchJob(id: string): BatchJob | null {
  const operation = 'getBatchJob';

  // Validate input
  validateId(id, 'id', operation);

  const db = createServiceClient();
  const stmt = db.prepare("SELECT * FROM batch_jobs WHERE id = ?");

  try {
    const job = stmt.get(id) as BatchJob | null;
    if (job) {
      dbLogger.debug(`${operation} found`, { id, status: job.status });
    } else {
      dbLogger.debug(`${operation} not found`, { id });
    }
    return job;
  } catch (error) {
    dbLogger.error(operation, error as Error, { id });
    throw error;
  }
}

/**
 * Get all batch jobs (ordered by creation date)
 */
export function getAllBatchJobs(limit = 100): BatchJob[] {
  const db = createServiceClient();
  const stmt = db.prepare(`
    SELECT * FROM batch_jobs
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(limit) as BatchJob[];
}

/**
 * Get batch jobs by status
 */
export function getBatchJobsByStatus(status: BatchJobStatus): BatchJob[] {
  const db = createServiceClient();
  const stmt = db.prepare(`
    SELECT * FROM batch_jobs
    WHERE status = ?
    ORDER BY created_at DESC
  `);
  return stmt.all(status) as BatchJob[];
}

/**
 * Update batch job status
 */
export function updateBatchJobStatus(
  id: string,
  status: BatchJobStatus,
  options?: {
    errorMessage?: string;
    startedAt?: string;
    completedAt?: string;
  }
): boolean {
  const operation = 'updateBatchJobStatus';

  // Validate inputs
  validateId(id, 'id', operation);
  validateEnum(status, 'status', operation, ['pending', 'processing', 'completed', 'failed', 'cancelled'] as const);

  const db = createServiceClient();

  dbLogger.info(operation, 'batch_jobs', id, { status, hasError: !!options?.errorMessage });

  let sql = "UPDATE batch_jobs SET status = ?";
  const params: any[] = [status];

  if (options?.errorMessage !== undefined) {
    sql += ", error_message = ?";
    params.push(options.errorMessage);
  }

  if (options?.startedAt) {
    sql += ", started_at = ?";
    params.push(options.startedAt);
  }

  if (options?.completedAt) {
    sql += ", completed_at = ?";
    params.push(options.completedAt);
  }

  sql += " WHERE id = ?";
  params.push(id);

  const stmt = db.prepare(sql);

  try {
    const result = stmt.run(...params);
    const success = result.changes > 0;
    if (success) {
      dbLogger.debug(`${operation} completed`, { id, status });
    } else {
      dbLogger.warn(operation, 'No rows updated (job not found?)', { id, status });
    }
    return success;
  } catch (error) {
    dbLogger.error(operation, error as Error, { id, status });
    throw error;
  }
}

/**
 * Update batch job progress counters
 */
export function updateBatchJobProgress(
  id: string,
  data: {
    processedCount?: number;
    successCount?: number;
    failedCount?: number;
  }
): boolean {
  const db = createServiceClient();

  const updates: string[] = [];
  const params: any[] = [];

  if (data.processedCount !== undefined) {
    updates.push("processed_count = ?");
    params.push(data.processedCount);
  }

  if (data.successCount !== undefined) {
    updates.push("success_count = ?");
    params.push(data.successCount);
  }

  if (data.failedCount !== undefined) {
    updates.push("failed_count = ?");
    params.push(data.failedCount);
  }

  if (updates.length === 0) return false;

  const sql = `UPDATE batch_jobs SET ${updates.join(", ")} WHERE id = ?`;
  params.push(id);

  const stmt = db.prepare(sql);
  const result = stmt.run(...params);
  return result.changes > 0;
}

/**
 * Set output ZIP path for completed batch job
 */
export function setBatchJobOutputZip(id: string, zipPath: string): boolean {
  const db = createServiceClient();
  const stmt = db.prepare("UPDATE batch_jobs SET output_zip_path = ? WHERE id = ?");
  const result = stmt.run(zipPath, id);
  return result.changes > 0;
}

/**
 * Delete batch job and all related data
 */
export function deleteBatchJob(id: string): boolean {
  const db = createServiceClient();

  try {
    // Delete in correct order
    db.prepare("DELETE FROM batch_job_progress WHERE batch_job_id = ?").run(id);
    db.prepare("DELETE FROM batch_job_recipients WHERE batch_job_id = ?").run(id);
    db.prepare("DELETE FROM user_notifications WHERE batch_job_id = ?").run(id);
    const result = db.prepare("DELETE FROM batch_jobs WHERE id = ?").run(id);

    return result.changes > 0;
  } catch (error) {
    console.error("Error deleting batch job:", error);
    return false;
  }
}

// ==================== BATCH JOB RECIPIENTS ====================

/**
 * Create batch job recipient entry
 */
export function createBatchJobRecipient(data: {
  batchJobId: string;
  recipientId: string;
}): BatchJobRecipient {
  const db = createServiceClient();
  const id = nanoid(16);

  const stmt = db.prepare(`
    INSERT INTO batch_job_recipients (id, batch_job_id, recipient_id, status)
    VALUES (?, ?, ?, 'pending')
  `);

  stmt.run(id, data.batchJobId, data.recipientId);

  return {
    id,
    batch_job_id: data.batchJobId,
    recipient_id: data.recipientId,
    status: "pending",
  };
}

/**
 * Get all recipients for a batch job
 */
export function getBatchJobRecipients(batchJobId: string): BatchJobRecipient[] {
  const db = createServiceClient();
  const stmt = db.prepare(`
    SELECT * FROM batch_job_recipients
    WHERE batch_job_id = ?
    ORDER BY processed_at ASC
  `);
  return stmt.all(batchJobId) as BatchJobRecipient[];
}

/**
 * Get failed recipients for a batch job
 */
export function getFailedBatchRecipients(batchJobId: string): BatchJobRecipient[] {
  const db = createServiceClient();
  const stmt = db.prepare(`
    SELECT * FROM batch_job_recipients
    WHERE batch_job_id = ? AND status = 'failed'
    ORDER BY processed_at DESC
  `);
  return stmt.all(batchJobId) as BatchJobRecipient[];
}

/**
 * Update batch job recipient status
 */
export function updateBatchJobRecipientStatus(
  id: string,
  status: BatchRecipientStatus,
  options?: {
    pdfPath?: string;
    errorMessage?: string;
  }
): boolean {
  const db = createServiceClient();
  const processed_at = new Date().toISOString();

  let sql = "UPDATE batch_job_recipients SET status = ?, processed_at = ?";
  const params: any[] = [status, processed_at];

  if (options?.pdfPath) {
    sql += ", pdf_path = ?";
    params.push(options.pdfPath);
  }

  if (options?.errorMessage) {
    sql += ", error_message = ?";
    params.push(options.errorMessage);
  }

  sql += " WHERE id = ?";
  params.push(id);

  const stmt = db.prepare(sql);
  const result = stmt.run(...params);
  return result.changes > 0;
}

// ==================== BATCH JOB PROGRESS ====================

/**
 * Add progress snapshot
 */
export function addBatchJobProgress(data: {
  batchJobId: string;
  progressPercent: number;
  message?: string;
}): BatchJobProgress {
  const db = createServiceClient();
  const created_at = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO batch_job_progress (batch_job_id, progress_percent, message, created_at)
    VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(
    data.batchJobId,
    data.progressPercent,
    data.message || null,
    created_at
  );

  return {
    id: result.lastInsertRowid as number,
    batch_job_id: data.batchJobId,
    progress_percent: data.progressPercent,
    message: data.message,
    created_at,
  };
}

/**
 * Get latest progress for a batch job
 */
export function getLatestBatchJobProgress(batchJobId: string): BatchJobProgress | null {
  const db = createServiceClient();
  const stmt = db.prepare(`
    SELECT * FROM batch_job_progress
    WHERE batch_job_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `);
  return stmt.get(batchJobId) as BatchJobProgress | null;
}

/**
 * Get progress history for a batch job
 */
export function getBatchJobProgressHistory(batchJobId: string, limit = 50): BatchJobProgress[] {
  const db = createServiceClient();
  const stmt = db.prepare(`
    SELECT * FROM batch_job_progress
    WHERE batch_job_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(batchJobId, limit) as BatchJobProgress[];
}

// ==================== USER NOTIFICATIONS ====================

/**
 * Create user notification
 */
export function createUserNotification(data: {
  userEmail: string;
  notificationType: string;
  batchJobId?: string;
  subject: string;
  message: string;
}): UserNotification {
  const db = createServiceClient();
  const id = nanoid(16);
  const created_at = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO user_notifications (
      id, user_email, notification_type, batch_job_id,
      subject, message, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.userEmail,
    data.notificationType,
    data.batchJobId || null,
    data.subject,
    data.message,
    created_at
  );

  return {
    id,
    user_email: data.userEmail,
    notification_type: data.notificationType,
    batch_job_id: data.batchJobId,
    subject: data.subject,
    message: data.message,
    created_at,
  };
}

/**
 * Mark notification as sent
 */
export function markNotificationAsSent(id: string): boolean {
  const db = createServiceClient();
  const sent_at = new Date().toISOString();
  const stmt = db.prepare("UPDATE user_notifications SET sent_at = ? WHERE id = ?");
  const result = stmt.run(sent_at, id);
  return result.changes > 0;
}

/**
 * Mark notification as read
 */
export function markNotificationAsRead(id: string): boolean {
  const db = createServiceClient();
  const read_at = new Date().toISOString();
  const stmt = db.prepare("UPDATE user_notifications SET read_at = ? WHERE id = ?");
  const result = stmt.run(read_at, id);
  return result.changes > 0;
}

/**
 * Get unread notifications for user
 */
export function getUnreadNotifications(userEmail: string): UserNotification[] {
  const db = createServiceClient();
  const stmt = db.prepare(`
    SELECT * FROM user_notifications
    WHERE user_email = ? AND read_at IS NULL
    ORDER BY created_at DESC
  `);
  return stmt.all(userEmail) as UserNotification[];
}

/**
 * Get all notifications for user
 */
export function getUserNotifications(userEmail: string, limit = 50): UserNotification[] {
  const db = createServiceClient();
  const stmt = db.prepare(`
    SELECT * FROM user_notifications
    WHERE user_email = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(userEmail, limit) as UserNotification[];
}

// ==================== STATISTICS & ANALYTICS ====================

/**
 * Get batch job statistics
 */
export function getBatchJobStats(): {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  totalRecipients: number;
  totalProcessed: number;
} {
  const db = createServiceClient();

  const stmt = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
      SUM(total_recipients) as totalRecipients,
      SUM(processed_count) as totalProcessed
    FROM batch_jobs
  `);

  return stmt.get() as any;
}
