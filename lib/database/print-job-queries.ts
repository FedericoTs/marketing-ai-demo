/**
 * Database Queries for Print Jobs
 *
 * CRUD operations for PostGrid print job tracking
 */

import { createServiceClient } from '@/lib/supabase/server'

// ==================== TYPES ====================

export interface PrintJob {
  id: string
  organization_id: string
  campaign_id: string
  created_by: string
  postgrid_job_id: string | null
  postgrid_batch_id: string | null
  api_environment: 'test' | 'live'
  format_type: string
  mail_type: string | null
  address_verification_enabled: boolean
  total_recipients: number
  recipients_submitted: number | null
  recipients_verified: number | null
  recipients_failed: number | null
  estimated_cost_per_piece: number | null
  estimated_total_cost: number | null
  actual_cost_per_piece: number | null
  actual_total_cost: number | null
  credits_reserved: number | null
  credits_charged: number | null
  status: PrintJobStatus
  error_message: string | null
  failed_recipients: any[]
  retry_count: number
  postgrid_response: any | null
  webhook_events: any[]
  submitted_at: string | null
  processing_started_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  submission_metadata: any
  created_at: string
  updated_at: string
}

export type PrintJobStatus =
  | 'draft'
  | 'submitting'
  | 'submitted'
  | 'processing'
  | 'in_production'
  | 'in_transit'
  | 'completed'
  | 'partially_failed'
  | 'failed'
  | 'cancelled'

export interface CreatePrintJobParams {
  organizationId: string
  campaignId: string
  createdBy: string | null  // TODO: Make required after implementing proper auth
  formatType: string
  totalRecipients: number
  estimatedCostPerPiece: number
  estimatedTotalCost: number
  apiEnvironment?: 'test' | 'live'
  mailType?: string
  addressVerificationEnabled?: boolean
}

export interface UpdatePrintJobParams {
  postgridJobId?: string
  postgridBatchId?: string
  recipientsSubmitted?: number
  recipientsVerified?: number
  recipientsFailed?: number
  actualCostPerPiece?: number
  actualTotalCost?: number
  creditsReserved?: number
  creditsCharged?: number
  status?: PrintJobStatus
  errorMessage?: string
  failedRecipients?: any[]
  postgridResponse?: any
  submittedAt?: string
  processingStartedAt?: string
  completedAt?: string
  cancelledAt?: string
}

// ==================== CREATE ====================

/**
 * Create a new print job (draft state)
 */
export async function createPrintJob(params: CreatePrintJobParams): Promise<PrintJob> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('print_jobs')
    .insert({
      organization_id: params.organizationId,
      campaign_id: params.campaignId,
      created_by: params.createdBy,
      format_type: params.formatType,
      total_recipients: params.totalRecipients,
      estimated_cost_per_piece: params.estimatedCostPerPiece,
      estimated_total_cost: params.estimatedTotalCost,
      api_environment: params.apiEnvironment || 'test',
      mail_type: params.mailType || 'usps_first_class',
      address_verification_enabled: params.addressVerificationEnabled ?? true,
      status: 'draft',
    })
    .select()
    .single()

  if (error) {
    console.error('[createPrintJob] Error:', error)
    throw new Error(`Failed to create print job: ${error.message}`)
  }

  return data
}

// ==================== READ ====================

/**
 * Get print job by ID
 */
export async function getPrintJobById(
  printJobId: string,
  organizationId: string
): Promise<PrintJob | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('print_jobs')
    .select('*')
    .eq('id', printJobId)
    .eq('organization_id', organizationId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    console.error('[getPrintJobById] Error:', error)
    throw new Error(`Failed to fetch print job: ${error.message}`)
  }

  return data
}

/**
 * Get all print jobs for a campaign
 */
export async function getPrintJobsByCampaignId(
  campaignId: string,
  organizationId: string
): Promise<PrintJob[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('print_jobs')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getPrintJobsByCampaignId] Error:', error)
    throw new Error(`Failed to fetch print jobs: ${error.message}`)
  }

  return data || []
}

/**
 * Get all print jobs for an organization
 */
export async function getPrintJobsByOrganizationId(
  organizationId: string,
  limit: number = 50
): Promise<PrintJob[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('print_jobs')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getPrintJobsByOrganizationId] Error:', error)
    throw new Error(`Failed to fetch print jobs: ${error.message}`)
  }

  return data || []
}

// ==================== UPDATE ====================

/**
 * Update print job
 */
export async function updatePrintJob(
  printJobId: string,
  organizationId: string,
  updates: UpdatePrintJobParams
): Promise<PrintJob> {
  const supabase = createServiceClient()

  // Map camelCase to snake_case for database columns
  const dbUpdates: any = {}
  if (updates.postgridJobId !== undefined) dbUpdates.postgrid_job_id = updates.postgridJobId
  if (updates.postgridBatchId !== undefined) dbUpdates.postgrid_batch_id = updates.postgridBatchId
  if (updates.recipientsSubmitted !== undefined) dbUpdates.recipients_submitted = updates.recipientsSubmitted
  if (updates.recipientsVerified !== undefined) dbUpdates.recipients_verified = updates.recipientsVerified
  if (updates.recipientsFailed !== undefined) dbUpdates.recipients_failed = updates.recipientsFailed
  if (updates.actualCostPerPiece !== undefined) dbUpdates.actual_cost_per_piece = updates.actualCostPerPiece
  if (updates.actualTotalCost !== undefined) dbUpdates.actual_total_cost = updates.actualTotalCost
  if (updates.creditsReserved !== undefined) dbUpdates.credits_reserved = updates.creditsReserved
  if (updates.creditsCharged !== undefined) dbUpdates.credits_charged = updates.creditsCharged
  if (updates.status !== undefined) dbUpdates.status = updates.status
  if (updates.errorMessage !== undefined) dbUpdates.error_message = updates.errorMessage
  if (updates.failedRecipients !== undefined) dbUpdates.failed_recipients = updates.failedRecipients
  if (updates.postgridResponse !== undefined) dbUpdates.postgrid_response = updates.postgridResponse
  if (updates.submittedAt !== undefined) dbUpdates.submitted_at = updates.submittedAt
  if (updates.processingStartedAt !== undefined) dbUpdates.processing_started_at = updates.processingStartedAt
  if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt
  if (updates.cancelledAt !== undefined) dbUpdates.cancelled_at = updates.cancelledAt

  const { data, error } = await supabase
    .from('print_jobs')
    .update({
      ...dbUpdates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', printJobId)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) {
    console.error('[updatePrintJob] Error:', error)
    throw new Error(`Failed to update print job: ${error.message}`)
  }

  return data
}

/**
 * Update print job status
 */
export async function updatePrintJobStatus(
  printJobId: string,
  organizationId: string,
  status: PrintJobStatus,
  errorMessage?: string
): Promise<PrintJob> {
  return updatePrintJob(printJobId, organizationId, {
    status,
    errorMessage,
  })
}

/**
 * Add webhook event to print job
 */
export async function addWebhookEvent(
  printJobId: string,
  organizationId: string,
  event: any
): Promise<PrintJob> {
  const supabase = createServiceClient()

  // First get existing webhook events
  const { data: existing } = await supabase
    .from('print_jobs')
    .select('webhook_events')
    .eq('id', printJobId)
    .eq('organization_id', organizationId)
    .single()

  const webhookEvents = [...(existing?.webhook_events || []), event]

  return updatePrintJob(printJobId, organizationId, {
    webhookEvents,
  })
}

// ==================== DELETE ====================

/**
 * Cancel print job (soft delete - marks as cancelled)
 */
export async function cancelPrintJob(
  printJobId: string,
  organizationId: string
): Promise<PrintJob> {
  return updatePrintJob(printJobId, organizationId, {
    status: 'cancelled',
    cancelledAt: new Date().toISOString(),
  })
}

// ==================== ANALYTICS ====================

/**
 * Get print job statistics for organization
 */
export async function getPrintJobStats(organizationId: string): Promise<{
  totalJobs: number
  totalRecipients: number
  totalSpent: number
  successRate: number
  jobsByStatus: Record<PrintJobStatus, number>
}> {
  const supabase = createServiceClient()

  const { data: jobs, error } = await supabase
    .from('print_jobs')
    .select('*')
    .eq('organization_id', organizationId)

  if (error) {
    console.error('[getPrintJobStats] Error:', error)
    throw new Error(`Failed to fetch print job stats: ${error.message}`)
  }

  const stats = {
    totalJobs: jobs.length,
    totalRecipients: jobs.reduce((sum, job) => sum + job.total_recipients, 0),
    totalSpent: jobs.reduce((sum, job) => sum + (job.actual_total_cost || 0), 0),
    successRate: 0,
    jobsByStatus: {} as Record<PrintJobStatus, number>,
  }

  // Count by status
  jobs.forEach((job) => {
    stats.jobsByStatus[job.status] = (stats.jobsByStatus[job.status] || 0) + 1
  })

  // Calculate success rate
  const completedJobs = jobs.filter((j) => j.status === 'completed' || j.status === 'in_transit')
  if (jobs.length > 0) {
    stats.successRate = (completedJobs.length / jobs.length) * 100
  }

  return stats
}
