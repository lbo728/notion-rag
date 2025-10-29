-- ========================================
-- Complete Supabase Migration Script
-- Execute this in Supabase Dashboard SQL Editor
-- ========================================

-- Step 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Create notion_pages table
CREATE TABLE IF NOT EXISTS notion_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id TEXT NOT NULL UNIQUE,
  title TEXT,
  url TEXT NOT NULL,
  properties JSONB,
  last_edited_time TIMESTAMPTZ,
  last_edited_by TEXT,
  created_time TIMESTAMPTZ,
  created_by TEXT,
  parent_page_id TEXT,
  workspace_id TEXT,
  synced_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notion_pages_last_edited_time ON notion_pages(last_edited_time);
CREATE INDEX IF NOT EXISTS idx_notion_pages_page_id ON notion_pages(page_id);
CREATE INDEX IF NOT EXISTS idx_notion_pages_workspace_id ON notion_pages(workspace_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for auto-update
DROP TRIGGER IF EXISTS update_notion_pages_updated_at ON notion_pages;
CREATE TRIGGER update_notion_pages_updated_at
  BEFORE UPDATE ON notion_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 3: Create notion_blocks table with pgvector support
CREATE TABLE IF NOT EXISTS notion_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id TEXT NOT NULL REFERENCES notion_pages(page_id),
  block_id TEXT NOT NULL,
  block_type TEXT,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimensions
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_page_block UNIQUE (page_id, block_id)
);

-- Create pgvector index for similarity search
CREATE INDEX IF NOT EXISTS idx_embedding_vector ON notion_blocks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_notion_blocks_page_id ON notion_blocks(page_id);
CREATE INDEX IF NOT EXISTS idx_notion_blocks_block_id ON notion_blocks(block_id);
CREATE INDEX IF NOT EXISTS idx_notion_blocks_block_type ON notion_blocks(block_type);

DROP TRIGGER IF EXISTS update_notion_blocks_updated_at ON notion_blocks;
CREATE TRIGGER update_notion_blocks_updated_at
  BEFORE UPDATE ON notion_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 4: Create chat tables
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  session_name TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_started_at ON chat_sessions(started_at);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON chat_messages(role);

CREATE TABLE IF NOT EXISTS chat_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES notion_blocks(id),
  page_id TEXT NOT NULL,
  block_id_text TEXT NOT NULL,
  title TEXT,
  url TEXT NOT NULL,
  snippet TEXT,
  relevance_score FLOAT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_citations_message_id ON chat_citations(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_citations_block_id ON chat_citations(block_id);

DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON chat_sessions;
CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 5: Create collections tables
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  conversation_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);

CREATE TABLE IF NOT EXISTS collection_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  tags TEXT[],
  notes TEXT,
  saved_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_collection_session UNIQUE (collection_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_conversations_collection_id ON collection_conversations(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_conversations_session_id ON collection_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_collection_conversations_tags ON collection_conversations USING GIN (tags);

DROP TRIGGER IF EXISTS update_collections_updated_at ON collections;
CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to increment conversation count
CREATE OR REPLACE FUNCTION increment_collection_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE collections
  SET conversation_count = conversation_count + 1
  WHERE id = NEW.collection_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS increment_collection_count_trigger ON collection_conversations;
CREATE TRIGGER increment_collection_count_trigger
  AFTER INSERT ON collection_conversations
  FOR EACH ROW
  EXECUTE FUNCTION increment_collection_count();

-- Step 6: Create sync_jobs table
CREATE TABLE IF NOT EXISTS sync_jobs (
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

CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_started_at ON sync_jobs(started_at);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_job_type ON sync_jobs(job_type);

-- Step 7: Create vector search function
CREATE OR REPLACE FUNCTION match_blocks (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  page_id text,
  block_id text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    notion_blocks.id,
    notion_blocks.page_id,
    notion_blocks.block_id,
    notion_blocks.content,
    notion_blocks.metadata,
    1 - (notion_blocks.embedding <=> query_embedding) as similarity
  FROM notion_blocks
  WHERE 1 - (notion_blocks.embedding <=> query_embedding) > match_threshold
  ORDER BY notion_blocks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


