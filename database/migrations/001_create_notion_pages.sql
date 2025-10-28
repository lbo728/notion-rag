-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create notion_pages table
CREATE TABLE notion_pages (
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

-- Create indexes
CREATE INDEX idx_notion_pages_last_edited_time ON notion_pages(last_edited_time);
CREATE INDEX idx_notion_pages_page_id ON notion_pages(page_id);
CREATE INDEX idx_notion_pages_workspace_id ON notion_pages(workspace_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for auto-update
CREATE TRIGGER update_notion_pages_updated_at
  BEFORE UPDATE ON notion_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

