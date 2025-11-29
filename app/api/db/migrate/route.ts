import { NextResponse } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

/**
 * Manual database migration endpoint
 * NOTE: Supabase handles migrations via migration files in supabase/migrations/
 * This endpoint is no longer needed and kept for backwards compatibility only
 */
export async function POST() {
  try {
    console.log("📦 Migrations are handled by Supabase migration system");
    console.log("➡️ Create migration files in supabase/migrations/");

    return NextResponse.json(
      successResponse(
        {
          message: "Database migrations are now handled by Supabase. Use 'npx supabase db push' or create migration files in supabase/migrations/",
          documentation: "https://supabase.com/docs/guides/database/migrations"
        },
        "Migration system has been moved to Supabase"
      )
    );
  } catch (error) {
    console.error("❌ Migration endpoint error:", error);
    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : "Unknown error",
        "MIGRATION_ERROR"
      ),
      { status: 500 }
    );
  }
}
