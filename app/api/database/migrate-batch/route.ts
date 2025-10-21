import { NextResponse } from "next/server";
import { initBatchJobTables } from "@/lib/database/init-batch-tables";

export async function POST() {
  try {
    initBatchJobTables();
    return NextResponse.json({
      success: true,
      message: "Batch job tables initialized successfully",
    });
  } catch (error) {
    console.error("Migration failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
