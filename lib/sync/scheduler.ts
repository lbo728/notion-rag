import { incrementalSyncNotionPages } from "./notion-sync-service";
import { logger } from "@/lib/utils/logger";

const SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

let syncInterval: NodeJS.Timeout | null = null;

/**
 * Start scheduled incremental sync (every 10 minutes)
 */
export function startScheduledSync(): void {
  if (syncInterval) {
    logger.warn("Scheduled sync already running");
    return;
  }

  logger.info("Starting scheduled incremental sync", {
    intervalMinutes: SYNC_INTERVAL_MS / 60000,
  });

  // Run immediately on start
  runIncrementalSync();

  // Then schedule periodic sync
  syncInterval = setInterval(() => {
    runIncrementalSync();
  }, SYNC_INTERVAL_MS);
}

/**
 * Stop scheduled sync
 */
export function stopScheduledSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    logger.info("Stopped scheduled incremental sync");
  }
}

/**
 * Run incremental sync (internal)
 */
async function runIncrementalSync(): Promise<void> {
  try {
    logger.info("Running scheduled incremental sync");
    await incrementalSyncNotionPages();
    logger.info("Scheduled incremental sync completed");
  } catch (error) {
    logger.error("Scheduled incremental sync failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Check if scheduled sync is running
 */
export function isScheduledSyncRunning(): boolean {
  return syncInterval !== null;
}
