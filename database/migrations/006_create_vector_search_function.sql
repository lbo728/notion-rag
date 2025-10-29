-- Create vector search function for similarity search
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


