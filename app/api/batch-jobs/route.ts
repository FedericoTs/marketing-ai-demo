/**
 * GET /api/batch-jobs - List all batch jobs with filtering
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllBatchJobs, getBatchJobsByStatus, getBatchJobStats, getLatestBatchJobProgress } from "@/lib/database/batch-job-queries";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "100");
    const includeStats = searchParams.get("stats") === "true";

    // Get jobs based on filter
    const dbJobs = status
      ? getBatchJobsByStatus(status as any)
      : getAllBatchJobs(limit);

    // Transform database jobs to frontend format (snake_case → camelCase)
    const jobs = dbJobs.map((job) => {
      // Get latest progress for this job
      const latestProgress = getLatestBatchJobProgress(job.id);
      const progressPercent = latestProgress?.progress_percent || 0;

      return {
        id: job.id,
        campaignId: job.campaign_id,
        status: job.status,
        totalRecipients: job.total_recipients,
        processedCount: job.processed_count,
        successCount: job.success_count,
        failedCount: job.failed_count,
        progressPercent: progressPercent,
        createdAt: job.created_at,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        outputZipPath: job.output_zip_path,
      };
    });

    // Optionally include stats
    const stats = includeStats ? getBatchJobStats() : undefined;

    return NextResponse.json(
      successResponse(
        { jobs, stats },
        "Batch jobs retrieved successfully"
      )
    );
  } catch (error) {
    console.error("Error fetching batch jobs:", error);
    return NextResponse.json(
      errorResponse("Failed to fetch batch jobs", "FETCH_ERROR"),
      { status: 500 }
    );
  }
}
