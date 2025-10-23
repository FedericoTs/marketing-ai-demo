/**
 * POST /api/batch-jobs/[id]/cancel - Cancel a running batch job
 */

import { NextRequest, NextResponse } from "next/server";
import { updateBatchJobStatus, getBatchJob } from "@/lib/database/batch-job-queries";
import { cancelBatchJob } from "@/lib/queue/batch-job-queue";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if job exists in database
    const job = getBatchJob(id);
    if (!job) {
      return NextResponse.json(
        errorResponse("Batch job not found in database", "BATCH_JOB_NOT_FOUND"),
        { status: 404 }
      );
    }

    // Only allow canceling pending/processing jobs
    if (job.status !== "pending" && job.status !== "processing") {
      return NextResponse.json(
        errorResponse(
          `Cannot cancel ${job.status} job. Only pending or processing jobs can be cancelled.`,
          "INVALID_STATUS_FOR_CANCEL"
        ),
        { status: 400 }
      );
    }

    // Update database status FIRST
    const dbUpdated = updateBatchJobStatus(id, "cancelled");
    if (!dbUpdated) {
      return NextResponse.json(
        errorResponse("Failed to update database status", "UPDATE_ERROR"),
        { status: 500 }
      );
    }

    console.log(`✅ Database updated: Job ${id} marked as cancelled`);

    // Try to remove from BullMQ queue (best effort - job may already be processing)
    try {
      const queueRemoved = await cancelBatchJob(id);
      if (queueRemoved) {
        console.log(`✅ Removed job ${id} from BullMQ queue`);
      } else {
        console.warn(`⚠️  Job ${id} not found in queue (may already be processing or completed)`);
      }
    } catch (queueError) {
      // Non-critical - database is already updated, worker will check status
      console.warn(`⚠️  Could not remove job from queue (non-critical):`, queueError);
    }

    return NextResponse.json(
      successResponse(
        {
          note: "Job marked as cancelled. If already processing, it will stop at next checkpoint.",
        },
        "Batch job cancelled successfully"
      )
    );
  } catch (error) {
    console.error("❌ Error cancelling batch job:", error);
    return NextResponse.json(
      errorResponse("Failed to cancel batch job", "CANCEL_ERROR"),
      { status: 500 }
    );
  }
}
