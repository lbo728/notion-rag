import { supabase } from "@/lib/supabase/client";
import { NotionBlock } from "@/lib/supabase/types";
import { logger } from "@/lib/utils/logger";

export interface VectorSearchResult {
  id: string;
  page_id: string;
  block_id: string;
  content: string;
  similarity: number;
  metadata: Record<string, any>;
}

/**
 * Save embeddings to Supabase pgvector
 */
export async function saveEmbeddings(
  chunks: Array<{
    text: string;
    block_ids: string[];
    embedding: number[];
    page_id: string;
    metadata: any;
  }>
): Promise<void> {
  try {
    logger.info("Saving embeddings to vector store", {
      count: chunks.length,
    });
    
    const blocks = chunks.map((chunk, idx) => ({
      page_id: chunk.page_id,
      block_id: chunk.block_ids[0], // Primary block ID
      block_type: chunk.metadata.block_type || "paragraph",
      content: chunk.text,
      embedding: chunk.embedding,
      metadata: {
        block_ids: chunk.block_ids,
        ...chunk.metadata,
        position: idx,
      },
    }));
    
    const { error } = await supabase.from("notion_blocks").upsert(blocks, {
      onConflict: "page_id,block_id",
      ignoreDuplicates: false,
    });
    
    if (error) {
      logger.error("Failed to save embeddings", { error: error.message });
      throw error;
    }
    
    logger.info("Embeddings saved successfully", { count: blocks.length });
  } catch (error) {
    logger.error("Error saving embeddings", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Vector similarity search using pgvector
 */
export async function vectorSearch(
  queryEmbedding: number[],
  fetchK: number = 32,
  filter?: Record<string, any>
): Promise<VectorSearchResult[]> {
  try {
    logger.info("Performing vector search", {
      fetchK,
      hasFilter: !!filter,
    });
    
    let query = supabase
      .rpc("match_blocks", {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: fetchK,
      })
      .select("id, page_id, block_id, content, metadata");
    
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    const { data, error } = await query;
    
    if (error) {
      logger.error("Vector search failed", { 
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw new Error(`Vector search failed: ${error.message} (${error.code || 'unknown'}). ${error.hint || ''} If match_blocks function doesn't exist, run the migration SQL.`);
    }
    
    logger.info("Vector search completed", {
      result_count: data?.length || 0,
    });
    
    return (
      data?.map((item: any) => ({
        id: item.id,
        page_id: item.page_id,
        block_id: item.block_id,
        content: item.content,
        similarity: item.similarity || 0,
        metadata: item.metadata,
      })) || []
    );
  } catch (error) {
    logger.error("Error in vector search", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Create match_blocks function in Supabase (should be run as migration)
 * This enables vector similarity search
 */
export const CREATE_MATCH_BLOCKS_FUNCTION = `
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
`;

