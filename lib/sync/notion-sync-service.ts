import { listAllPages } from "@/lib/notion/list-pages";
import { notionClient } from "@/lib/notion/api-client";
import { supabase } from "@/lib/supabase/client";
import { generateEmbedding } from "@/lib/embeddings/openai";
import { chunkText, Chunk } from "@/lib/notion/chunker";
import { parseBlocks } from "@/lib/notion/parser";
import { extractTextFromBlocks } from "@/lib/notion/text-extractor";
import { saveEmbeddings } from "@/lib/retrieval/vector-store";
import { logger } from "@/lib/utils/logger";

export interface SyncResult {
  pagesProcessed: number;
  blocksProcessed: number;
  embeddingsCreated: number;
  errors: string[];
}

/**
 * Synchronize all Notion pages to Supabase
 */
export async function syncNotionPages(): Promise<SyncResult> {
  const result: SyncResult = {
    pagesProcessed: 0,
    blocksProcessed: 0,
    embeddingsCreated: 0,
    errors: [],
  };

  try {
    logger.info("Starting Notion sync");

    // Create sync job
    const { data: job } = await supabase
      .from("sync_jobs")
      .insert({
        job_type: "full_sync",
        status: "running",
      })
      .select()
      .single();

    const jobId = job?.id;

    // List all pages
    const pages = await listAllPages();
    result.pagesProcessed = pages.length;

    logger.info("Found pages to sync", { count: pages.length });

    for (const page of pages) {
      try {
        await syncPage(page.id, result);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error("Error syncing page", { pageId: page.id, error: errorMsg });
        result.errors.push(`Page ${page.id}: ${errorMsg}`);
      }
    }

    // Update sync job as completed
    if (jobId) {
      await supabase
        .from("sync_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          pages_processed: result.pagesProcessed,
          blocks_processed: result.blocksProcessed,
          embeddings_created: result.embeddingsCreated,
        })
        .eq("id", jobId);
    }

    logger.info("Notion sync completed", result);

    return result;
  } catch (error) {
    logger.error("Error in Notion sync", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Sync a single page
 */
async function syncPage(pageId: string, result: SyncResult) {
  // Fetch page details
  const page = await notionClient.pages.retrieve({ page_id: pageId });
  const title = extractTitle(page);
  const url = (page as any).url || `https://notion.so/${pageId.replace(/-/g, "")}`;

  // Save or update page
  await supabase.from("notion_pages").upsert({
    page_id: pageId,
    title,
    url,
    last_edited_time: page.last_edited_time,
    last_edited_by: page.last_edited_by?.id || page.last_edited_by?.name || null,
    properties: page.properties,
    parent_page_id: (page.parent as any)?.page_id || null,
    workspace_id: (page as any).workspace_id || null,
    synced_at: new Date().toISOString(),
  });

  // Fetch all blocks for this page
  const blocks = [];
  let cursor = undefined;
  
  do {
    const response = await notionClient.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
    });
    
    blocks.push(...response.results);
    cursor = response.next_cursor || undefined;
  } while (cursor);

  // Parse blocks
  const parsedBlocks = parseBlocks(blocks);
  const extractedTexts = extractTextFromBlocks(blocks);
  
  // Chunk text
  const chunks = chunkText(extractedTexts);
  result.blocksProcessed += chunks.length;

  // Generate embeddings
  logger.info("Generating embeddings", { chunkCount: chunks.length });
  
  for (const chunk of chunks) {
    try {
      const embedding = await generateEmbedding(chunk.text);
      
      await saveEmbeddings([
        {
          text: chunk.text,
          block_ids: chunk.block_ids,
          embedding,
          page_id: pageId,
          metadata: {
            title,
            block_type: chunk.block_ids[0],
            ...chunk.metadata,
          },
        },
      ]);
      
      result.embeddingsCreated++;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error("Error creating embedding", { error: errorMsg });
      result.errors.push(`Embedding error: ${errorMsg}`);
    }
  }

  logger.info("Page synced", { pageId, blocksProcessed: parsedBlocks.length });
}

/**
 * Extract title from page
 */
function extractTitle(page: any): string {
  if (page.properties?.title) {
    const titleProp = page.properties.title;
    if (titleProp.title && Array.isArray(titleProp.title)) {
      return titleProp.title.map((t: any) => t.plain_text).join("");
    }
  }
  
  // Fallback to page title
  if ((page as any).title) {
    return (page as any).title;
  }
  
  return "Untitled";
}

