import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";
import { syncNotionPages } from "@/lib/sync/notion-sync-service";
import { supabase } from "@/lib/supabase/client";

/**
 * POST /api/sync
 *
 * Trigger manual sync of Notion pages
 */
export async function POST(request: NextRequest) {
  try {
    logger.info("Sync request received");

    // Start sync in background
    syncNotionPages().catch((error) => {
      logger.error("Background sync failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    });

    return NextResponse.json({
      message: "Sync initiated",
      status: "processing",
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
    const { data, error } = await supabase
      .from("sync_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return NextResponse.json({
        status: "idle",
        last_sync: null,
      });
    }

    return NextResponse.json({
      status: data.status || "idle",
      last_sync: data.completed_at,
      pages_processed: data.pages_processed || 0,
      blocks_processed: data.blocks_processed || 0,
      embeddings_created: data.embeddings_created || 0,
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
