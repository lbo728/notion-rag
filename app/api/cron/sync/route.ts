import { NextRequest, NextResponse } from "next/server";
import { incrementalSyncNotionPages } from "@/lib/sync/notion-sync-service";
import { logger } from "@/lib/utils/logger";

/**
 * GET /api/cron/sync
 *
 * Cron job endpoint for incremental sync.
 * This can be called by:
 * - Vercel Cron Jobs (recommended)
 * - External cron services (e.g., cron-job.org)
 * - Manual trigger for testing
 *
 * Security: Add authorization header check in production
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("Cron sync triggered");

    const result = await incrementalSyncNotionPages();

    logger.info("Cron sync completed", {
      pagesProcessed: result.pagesProcessed,
      blocksProcessed: result.blocksProcessed,
      embeddingsCreated: result.embeddingsCreated,
    });

    return NextResponse.json({
      success: true,
      result: {
        pagesProcessed: result.pagesProcessed,
        blocksProcessed: result.blocksProcessed,
        embeddingsCreated: result.embeddingsCreated,
        errors: result.errors.length,
      },
    });
  } catch (error) {
    logger.error("Cron sync failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
