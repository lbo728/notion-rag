-- Create sync_jobs table
CREATE TABLE sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  pages_processed INTEGER DEFAULT 0,
  blocks_processed INTEGER DEFAULT 0,
  embeddings_created INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for sync_jobs
CREATE INDEX idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX idx_sync_jobs_started_at ON sync_jobs(started_at);
CREATE INDEX idx_sync_jobs_job_type ON sync_jobs(job_type);

