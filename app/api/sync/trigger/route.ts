import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";
import { syncNotionPages, incrementalSyncNotionPages } from "@/lib/sync/notion-sync-service";

/**
 * POST /api/sync/trigger
 *
 * Trigger manual sync of Notion pages
 * Query params:
 * - mode: "full" (default) or "incremental"
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "full";

    logger.info("Manual sync triggered", { mode });

    // Start sync in background (non-blocking)
    const syncPromise =
      mode === "incremental"
        ? incrementalSyncNotionPages()
        : syncNotionPages();

    syncPromise.catch((error) => {
      logger.error("Background sync failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    });

    return NextResponse.json({
      message: `${mode} sync initiated`,
      status: "processing",
    });
  } catch (error) {
    logger.error("Error in sync trigger endpoint", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Failed to trigger sync",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

