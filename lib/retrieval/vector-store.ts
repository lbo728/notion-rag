import { supabase } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";

export interface VectorSearchResult {
  id: string;
  page_id: string;
  block_id: string;
  content: string;
  similarity: number;
  metadata: Record<string, unknown>;
  page_last_edited_time?: string | null;
  page_created_time?: string | null;
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
    metadata: Record<string, unknown>;
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
  filter?: Record<string, unknown>
): Promise<VectorSearchResult[]> {
  try {
    logger.info("Performing vector search", {
      fetchK,
      hasFilter: !!filter,
    });

    const { data, error } = await supabase.rpc("match_blocks", {
      query_embedding: queryEmbedding,
      match_threshold: 0.3, // Lower threshold for better recall (especially for Korean)
      match_count: fetchK,
    });

    if (error) {
      logger.error("Vector search failed", {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw new Error(
        `Vector search failed: ${error.message} (${error.code || "unknown"}). ${error.hint || ""} If match_blocks function doesn't exist, run the migration SQL.`
      );
    }

    logger.info("Vector search completed", {
      result_count: data?.length || 0,
    });

    // Fetch page date information for all unique page_ids
    const pageIds = [
      ...new Set((data || []).map((item: { page_id: string }) => item.page_id)),
    ];
    const pageDates: Record<
      string,
      { created_time?: string | null; last_edited_time?: string | null }
    > = {};

    if (pageIds.length > 0) {
      const { data: pagesData } = await supabase
        .from("notion_pages")
        .select("page_id, created_time, last_edited_time")
        .in("page_id", pageIds);

      if (pagesData) {
        pagesData.forEach(
          (page: {
            page_id: string;
            created_time?: string | null;
            last_edited_time?: string | null;
          }) => {
            pageDates[page.page_id] = {
              created_time: page.created_time,
              last_edited_time: page.last_edited_time,
            };
          }
        );
      }
    }

    return (
      data?.map(
        (item: {
          id: string;
          page_id: string;
          block_id: string;
          content: string;
          similarity?: number;
          metadata: Record<string, unknown>;
        }) => ({
          id: item.id,
          page_id: item.page_id,
          block_id: item.block_id,
          content: item.content,
          similarity: item.similarity || 0,
          metadata: item.metadata,
          page_last_edited_time:
            pageDates[item.page_id]?.last_edited_time || null,
          page_created_time: pageDates[item.page_id]?.created_time || null,
        })
      ) || []
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
