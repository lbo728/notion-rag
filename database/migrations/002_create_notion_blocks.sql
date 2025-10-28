-- Create notion_blocks table with pgvector support
CREATE TABLE notion_blocks (
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
CREATE INDEX idx_embedding_vector ON notion_blocks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create additional indexes
CREATE INDEX idx_notion_blocks_page_id ON notion_blocks(page_id);
CREATE INDEX idx_notion_blocks_block_id ON notion_blocks(block_id);
CREATE INDEX idx_notion_blocks_block_type ON notion_blocks(block_type);

-- Create trigger for auto-update
CREATE TRIGGER update_notion_blocks_updated_at
  BEFORE UPDATE ON notion_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

