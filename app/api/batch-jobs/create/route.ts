/**
 * API Route: Create Batch Job
 *
 * POST /api/batch-jobs/create
 * Creates a new batch job and adds it to the processing queue
 */

import { NextRequest, NextResponse } from "next/server";
import { createBatchJob } from "@/lib/database/batch-job-queries";
import { addBatchJob } from "@/lib/queue/batch-job-queue";
import type { BatchJobPayload } from "@/lib/queue/batch-job-queue";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      campaignId,
      templateId,
      recipients,
      userEmail,
      settings,
    } = body as BatchJobPayload;

    // Validation
    if (!campaignId || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        errorResponse(
          "Invalid batch job data: campaignId and recipients are required",
          "INVALID_BATCH_DATA"
        ),
        { status: 400 }
      );
    }

    // Create batch job in database
    const batchJob = createBatchJob({
      campaignId,
      templateId,
      userEmail,
      totalRecipients: recipients.length,
    });

    console.log(`✅ Batch job created: ${batchJob.id}`);

    // Prepare payload for queue
    const payload: BatchJobPayload = {
      batchJobId: batchJob.id,
      campaignId,
      templateId,
      recipients,
      userEmail,
      settings,
    };

    // Add job to queue (background processing)
    await addBatchJob(payload);

    console.log(`✅ Batch job added to queue: ${batchJob.id}`);

    return NextResponse.json(
      successResponse(
        {
          batchJobId: batchJob.id,
          campaignId: batchJob.campaign_id,
          status: batchJob.status,
          totalRecipients: batchJob.total_recipients,
          createdAt: batchJob.created_at,
        },
        "Batch job created and queued successfully"
      )
    );
  } catch (error) {
    console.error("❌ Error creating batch job:", error);

    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to create batch job",
        "CREATE_BATCH_ERROR"
      ),
      { status: 500 }
    );
  }
}
