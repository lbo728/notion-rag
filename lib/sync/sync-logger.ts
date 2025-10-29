import { logger } from "@/lib/utils/logger";
import { SyncResult } from "./notion-sync-service";

/**
 * Log sync job execution with structured data
 */
export function logSyncJob(
  jobId: string | undefined,
  jobType: string,
  result: SyncResult,
  durationMs: number
): void {
  logger.info("Sync job completed", {
    job_id: jobId,
    job_type: jobType,
    pages_processed: result.pagesProcessed,
    blocks_processed: result.blocksProcessed,
    embeddings_created: result.embeddingsCreated,
    errors_count: result.errors.length,
    duration_ms: durationMs,
    success: result.errors.length === 0,
  });

  if (result.errors.length > 0) {
    logger.warn("Sync job completed with errors", {
      job_id: jobId,
      errors: result.errors,
    });
  }
}

/**
 * Log sync job start
 */
export function logSyncJobStart(
  jobId: string | undefined,
  jobType: string,
  mode: "full" | "incremental"
): void {
  logger.info("Sync job started", {
    job_id: jobId,
    job_type: jobType,
    mode,
  });
}

/**
 * Log sync job error
 */
export function logSyncJobError(
  jobId: string | undefined,
  error: Error,
  context?: Record<string, unknown>
): void {
  logger.error("Sync job failed", {
    job_id: jobId,
    error: error.message,
    stack: error.stack,
    ...context,
  });
}

/**
 * Log page sync progress
 */
export function logPageSync(
  pageId: string,
  blocksProcessed: number,
  embeddingsCreated: number
): void {
  logger.debug("Page synced", {
    page_id: pageId,
    blocks_processed: blocksProcessed,
    embeddings_created: embeddingsCreated,
  });
}
