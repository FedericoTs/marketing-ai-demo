/**
 * Batch Job Database Queries
 *
 * STUBBED: Batch job tables not yet migrated to Supabase
 * All functions return mock/empty values to allow build to pass
 */

import { nanoid } from "nanoid";

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

// ==================== BATCH JOBS (STUBBED) ====================

/**
 * Create a new batch job
 * STUBBED: Returns mock batch job
 */
export function createBatchJob(data: {
  campaignId: string;
  templateId?: string;
  userEmail?: string;
  totalRecipients: number;
}): BatchJob {
  console.log('[batch-job-queries] createBatchJob stubbed - batch job tables not yet in Supabase');
  const id = nanoid(16);
  const created_at = new Date().toISOString();

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
 * STUBBED: Returns null
 */
export function getBatchJob(id: string): BatchJob | null {
  console.log('[batch-job-queries] getBatchJob stubbed - batch job tables not yet in Supabase');
  return null;
}

/**
 * Get all batch jobs (ordered by creation date)
 * STUBBED: Returns empty array
 */
export function getAllBatchJobs(limit = 100): BatchJob[] {
  console.log('[batch-job-queries] getAllBatchJobs stubbed - batch job tables not yet in Supabase');
  return [];
}

/**
 * Get batch jobs by status
 * STUBBED: Returns empty array
 */
export function getBatchJobsByStatus(status: BatchJobStatus): BatchJob[] {
  console.log('[batch-job-queries] getBatchJobsByStatus stubbed - batch job tables not yet in Supabase');
  return [];
}

/**
 * Update batch job status
 * STUBBED: Returns false
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
  console.log('[batch-job-queries] updateBatchJobStatus stubbed - batch job tables not yet in Supabase');
  return false;
}

/**
 * Update batch job progress counters
 * STUBBED: Returns false
 */
export function updateBatchJobProgress(
  id: string,
  data: {
    processedCount?: number;
    successCount?: number;
    failedCount?: number;
  }
): boolean {
  console.log('[batch-job-queries] updateBatchJobProgress stubbed - batch job tables not yet in Supabase');
  return false;
}

/**
 * Set output ZIP path for completed batch job
 * STUBBED: Returns false
 */
export function setBatchJobOutputZip(id: string, zipPath: string): boolean {
  console.log('[batch-job-queries] setBatchJobOutputZip stubbed - batch job tables not yet in Supabase');
  return false;
}

/**
 * Delete batch job and all related data
 * STUBBED: Returns false
 */
export function deleteBatchJob(id: string): boolean {
  console.log('[batch-job-queries] deleteBatchJob stubbed - batch job tables not yet in Supabase');
  return false;
}

// ==================== BATCH JOB RECIPIENTS (STUBBED) ====================

/**
 * Create batch job recipient entry
 * STUBBED: Returns mock recipient
 */
export function createBatchJobRecipient(data: {
  batchJobId: string;
  recipientId: string;
}): BatchJobRecipient {
  console.log('[batch-job-queries] createBatchJobRecipient stubbed - batch job tables not yet in Supabase');
  const id = nanoid(16);

  return {
    id,
    batch_job_id: data.batchJobId,
    recipient_id: data.recipientId,
    status: "pending",
  };
}

/**
 * Get all recipients for a batch job
 * STUBBED: Returns empty array
 */
export function getBatchJobRecipients(batchJobId: string): BatchJobRecipient[] {
  console.log('[batch-job-queries] getBatchJobRecipients stubbed - batch job tables not yet in Supabase');
  return [];
}

/**
 * Get failed recipients for a batch job
 * STUBBED: Returns empty array
 */
export function getFailedBatchRecipients(batchJobId: string): BatchJobRecipient[] {
  console.log('[batch-job-queries] getFailedBatchRecipients stubbed - batch job tables not yet in Supabase');
  return [];
}

/**
 * Update batch job recipient status
 * STUBBED: Returns false
 */
export function updateBatchJobRecipientStatus(
  id: string,
  status: BatchRecipientStatus,
  options?: {
    pdfPath?: string;
    errorMessage?: string;
  }
): boolean {
  console.log('[batch-job-queries] updateBatchJobRecipientStatus stubbed - batch job tables not yet in Supabase');
  return false;
}

// ==================== BATCH JOB PROGRESS (STUBBED) ====================

/**
 * Add progress snapshot
 * STUBBED: Returns mock progress
 */
export function addBatchJobProgress(data: {
  batchJobId: string;
  progressPercent: number;
  message?: string;
}): BatchJobProgress {
  console.log('[batch-job-queries] addBatchJobProgress stubbed - batch job tables not yet in Supabase');
  const created_at = new Date().toISOString();

  return {
    id: 0,
    batch_job_id: data.batchJobId,
    progress_percent: data.progressPercent,
    message: data.message,
    created_at,
  };
}

/**
 * Get latest progress for a batch job
 * STUBBED: Returns null
 */
export function getLatestBatchJobProgress(batchJobId: string): BatchJobProgress | null {
  console.log('[batch-job-queries] getLatestBatchJobProgress stubbed - batch job tables not yet in Supabase');
  return null;
}

/**
 * Get progress history for a batch job
 * STUBBED: Returns empty array
 */
export function getBatchJobProgressHistory(batchJobId: string, limit = 50): BatchJobProgress[] {
  console.log('[batch-job-queries] getBatchJobProgressHistory stubbed - batch job tables not yet in Supabase');
  return [];
}

// ==================== USER NOTIFICATIONS (STUBBED) ====================

/**
 * Create user notification
 * STUBBED: Returns mock notification
 */
export function createUserNotification(data: {
  userEmail: string;
  notificationType: string;
  batchJobId?: string;
  subject: string;
  message: string;
}): UserNotification {
  console.log('[batch-job-queries] createUserNotification stubbed - batch job tables not yet in Supabase');
  const id = nanoid(16);
  const created_at = new Date().toISOString();

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
 * STUBBED: Returns false
 */
export function markNotificationAsSent(id: string): boolean {
  console.log('[batch-job-queries] markNotificationAsSent stubbed - batch job tables not yet in Supabase');
  return false;
}

/**
 * Mark notification as read
 * STUBBED: Returns false
 */
export function markNotificationAsRead(id: string): boolean {
  console.log('[batch-job-queries] markNotificationAsRead stubbed - batch job tables not yet in Supabase');
  return false;
}

/**
 * Get unread notifications for user
 * STUBBED: Returns empty array
 */
export function getUnreadNotifications(userEmail: string): UserNotification[] {
  console.log('[batch-job-queries] getUnreadNotifications stubbed - batch job tables not yet in Supabase');
  return [];
}

/**
 * Get all notifications for user
 * STUBBED: Returns empty array
 */
export function getUserNotifications(userEmail: string, limit = 50): UserNotification[] {
  console.log('[batch-job-queries] getUserNotifications stubbed - batch job tables not yet in Supabase');
  return [];
}

// ==================== STATISTICS & ANALYTICS (STUBBED) ====================

/**
 * Get batch job statistics
 * STUBBED: Returns zeros
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
  console.log('[batch-job-queries] getBatchJobStats stubbed - batch job tables not yet in Supabase');
  return {
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    totalRecipients: 0,
    totalProcessed: 0,
  };
}
