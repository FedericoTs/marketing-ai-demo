/**
 * API Route: Download Batch Job Results
 *
 * GET /api/batch-jobs/[id]/download
 * Downloads the ZIP file containing all generated PDFs
 */

import { NextRequest, NextResponse } from "next/server";
import { getBatchJob } from "@/lib/database/batch-job-queries";
import { errorResponse } from "@/lib/utils/api-response";
import * as fs from "fs";
import * as path from "path";

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
        errorResponse("Batch job not found", "JOB_NOT_FOUND"),
        { status: 404 }
      );
    }

    // Check if job is completed
    if (batchJob.status !== "completed") {
      return NextResponse.json(
        errorResponse(
          `Batch job is not completed yet. Current status: ${batchJob.status}`,
          "JOB_NOT_COMPLETED"
        ),
        { status: 400 }
      );
    }

    // Check if ZIP file exists
    if (!batchJob.output_zip_path) {
      return NextResponse.json(
        errorResponse("ZIP file not found for this batch job", "ZIP_NOT_FOUND"),
        { status: 404 }
      );
    }

    const zipPath = batchJob.output_zip_path;

    if (!fs.existsSync(zipPath)) {
      return NextResponse.json(
        errorResponse("ZIP file has been deleted or moved", "FILE_NOT_EXISTS"),
        { status: 404 }
      );
    }

    // Read ZIP file
    const fileBuffer = fs.readFileSync(zipPath);
    const fileName = path.basename(zipPath);

    // Return ZIP file as download
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("❌ Error downloading batch results:", error);

    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : "Failed to download batch results",
        "DOWNLOAD_ERROR"
      ),
      { status: 500 }
    );
  }
}
