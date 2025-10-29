import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";

/**
 * POST /api/sync
 *
 * Trigger manual sync of Notion pages
 * TODO: Implement full sync logic
 */
export async function POST(request: NextRequest) {
  try {
    logger.info("Sync request received");

    // TODO: Implement sync logic
    // 1. List all Notion pages
    // 2. Fetch page content
    // 3. Parse and chunk
    // 4. Generate embeddings
    // 5. Save to Supabase

    return NextResponse.json({
      message: "Sync initiated",
      status: "pending",
    });
  } catch (error) {
    logger.error("Error in sync endpoint", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Failed to sync",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync
 *
 * Get sync status
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Query sync_jobs table for latest status
    return NextResponse.json({
      status: "idle",
      last_sync: null,
    });
  } catch (error) {
    logger.error("Error getting sync status", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Failed to get sync status",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
