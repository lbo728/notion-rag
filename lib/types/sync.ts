/**
 * Sync job types for Notion synchronization
 */

export type SyncJobType = "scheduled" | "manual" | "retry";
export type SyncJobStatus = "running" | "completed" | "failed" | "cancelled";

export interface SyncJob {
  id: string;
  job_type: SyncJobType;
  status: SyncJobStatus;
  started_at: string;
  completed_at?: string | null;
  pages_processed?: number | null;
  blocks_processed?: number | null;
  embeddings_created?: number | null;
  error_message?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SyncJobCreate {
  job_type: SyncJobType;
  status?: SyncJobStatus;
}

export interface SyncJobUpdate {
  status?: SyncJobStatus;
  completed_at?: string | null;
  pages_processed?: number | null;
  blocks_processed?: number | null;
  embeddings_created?: number | null;
  error_message?: string | null;
}

export interface SyncStatus {
  status: SyncJobStatus | "idle";
  last_sync?: string | null;
  pages_processed?: number;
  blocks_processed?: number;
  embeddings_created?: number;
}

