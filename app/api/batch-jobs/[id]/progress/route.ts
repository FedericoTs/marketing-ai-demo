/**
 * API Route: Get Batch Job Progress
 *
 * GET /api/batch-jobs/[id]/progress
 * Returns real-time progress for a batch job (for polling or SSE)
 */

import { NextRequest, NextResponse } from "next/server";
import { getBatchJob, getLatestBatchJobProgress } from "@/lib/database/batch-job-queries";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get batch job
    const batchJob = getBatchJob(id);

    if (!batchJob) {
      return NextResponse.json(
        errorResponse("Batch job not found", "BATCH_JOB_NOT_FOUND"),
        { status: 404 }
      );
    }

    // Get latest progress
    const latestProgress = getLatestBatchJobProgress(id);

    // Calculate progress percentage
    const progressPercent =
      batchJob.total_recipients > 0
        ? (batchJob.processed_count / batchJob.total_recipients) * 100
        : 0;

    // Estimate time remaining (simple calculation)
    let estimatedTimeRemaining: string | undefined;
    if (batchJob.status === "processing" && batchJob.started_at) {
      const startTime = new Date(batchJob.started_at).getTime();
      const currentTime = new Date().getTime();
      const elapsedMs = currentTime - startTime;
      const processedCount = batchJob.processed_count;

      if (processedCount > 0) {
        const msPerRecipient = elapsedMs / processedCount;
        const remaining = batchJob.total_recipients - processedCount;
        const remainingMs = remaining * msPerRecipient;

        const minutes = Math.floor(remainingMs / 60000);
        const seconds = Math.floor((remainingMs % 60000) / 1000);

        if (minutes > 60) {
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          estimatedTimeRemaining = `${hours}h ${mins}m`;
        } else if (minutes > 0) {
          estimatedTimeRemaining = `${minutes}m ${seconds}s`;
        } else {
          estimatedTimeRemaining = `${seconds}s`;
        }
      }
    }

    return NextResponse.json(
      successResponse(
        {
          batchJobId: batchJob.id,
          status: batchJob.status,
          totalRecipients: batchJob.total_recipients,
          processedCount: batchJob.processed_count,
          successCount: batchJob.success_count,
          failedCount: batchJob.failed_count,
          progressPercent: Math.round(progressPercent * 100) / 100,
          estimatedTimeRemaining,
          currentMessage: latestProgress?.message,
          startedAt: batchJob.started_at,
          completedAt: batchJob.completed_at,
        },
        "Progress retrieved successfully"
      )
    );
  } catch (error) {
    console.error("❌ Error fetching progress:", error);

    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to fetch progress",
        "FETCH_ERROR"
      ),
      { status: 500 }
    );
  }
}
