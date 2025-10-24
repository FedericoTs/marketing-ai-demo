import { NextResponse } from "next/server";
import { initBatchJobTables } from "@/lib/database/init-batch-tables";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function POST() {
  try {
    initBatchJobTables();
    return NextResponse.json(
      successResponse(null, "Batch job tables initialized successfully")
    );
  } catch (error) {
    console.error("Migration failed:", error);
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : "Unknown error",
        "MIGRATION_ERROR"
      ),
      { status: 500 }
    );
  }
}
